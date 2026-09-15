import {
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
  buildOffboardingPlan,
  buildOnboardingPlan,
  buildStatusChangePlan,
  deriveRunStatus,
  executableStepKeys,
  planIsApprovable,
  type FrozenPlan,
  type PersonItStatus,
  type TemplateIntent,
  type WorkflowStepStatus,
} from "@ranger/domain";
import { DemoLifecycleProvider, MicrosoftLifecycleProvider, type LifecycleProvider } from "@ranger/integrations";
import {
  assignLicense,
  createAccount,
  createGroupMembership,
  endGroupMembership,
  endLicenseAssignment,
  getGroup,
  getPerson,
  insertTimelineEvent,
  listAccounts,
  listGroups,
  loadPersonProfile,
  updateAccount,
  updatePerson,
} from "./inventory.ts";
import {
  getTemplateVersion,
  getWorkflowRun,
  insertNotification,
  insertStepAttempt,
  insertWelcomePreview,
  insertWorkflowRun,
  listCompanyBindings,
  listWorkflowSteps,
  updateRunStatus,
  updateStepStatus,
  type WorkflowRunRow,
  type WorkflowStepRow,
} from "./lifecycle.ts";
import { getMembership } from "./queries.ts";
import type { DbClient } from "./pool.ts";

const demoByOrg = new Map<string, DemoLifecycleProvider>();

export function demoLifecycleFor(organizationId: string): DemoLifecycleProvider {
  const existing = demoByOrg.get(organizationId);
  if (existing) return existing;
  const created = new DemoLifecycleProvider();
  demoByOrg.set(organizationId, created);
  return created;
}

export function resetDemoLifecycle(organizationId?: string): void {
  if (organizationId) demoByOrg.delete(organizationId);
  else demoByOrg.clear();
}

export function lifecycleProviderFor(kind: "demo" | "microsoft"): LifecycleProvider {
  if (kind === "microsoft") {
    const tenantId = process.env.MICROSOFT_TENANT_ID;
    const clientId = process.env.MICROSOFT_INVENTORY_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_INVENTORY_CLIENT_SECRET;
    if (tenantId && clientId && clientSecret) {
      return new MicrosoftLifecycleProvider({
        credentials: { tenantId, clientId, clientSecret },
      });
    }
    return new MicrosoftLifecycleProvider();
  }
  return demoLifecycleFor("default");
}

async function subscriptionCapacity(
  client: DbClient,
  organizationId: string,
  companyId: string,
): Promise<Array<{ id: string; productId: string; productName: string | null; purchasedQuantity: number; consumedQuantity: number }>> {
  const result = await client.query<{
    id: string;
    product_id: string;
    product_name: string | null;
    purchased_quantity: number;
    consumed: string;
  }>(
    `SELECT s.id, s.product_id, p.name AS product_name, s.purchased_quantity,
            (SELECT COUNT(*)::text FROM license_assignments la
             WHERE la.subscription_id = s.id AND la.status IN ('active', 'removal_pending')) AS consumed
     FROM subscriptions s
     JOIN products p ON p.id = s.product_id
     WHERE s.organization_id = $1 AND s.company_id = $2 AND s.state = 'active'`,
    [organizationId, companyId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    purchasedQuantity: row.purchased_quantity,
    consumedQuantity: Number(row.consumed),
  }));
}

export async function previewOnboarding(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    personId: string;
    templateId: string;
    templateVersionId: string;
    actorStaffUserId: string;
    usageLocation?: string | null;
    idempotencyKey: string;
    correlationId?: string;
  },
): Promise<{ run: WorkflowRunRow; plan: FrozenPlan }> {
  const person = await getPerson(client, input.organizationId, input.companyId, input.personId);
  if (!person) throw new NotFoundError("Person not found");
  const version = await getTemplateVersion(client, input.organizationId, input.templateVersionId);
  if (!version || version.template_id !== input.templateId) {
    throw new NotFoundError("Template version not found");
  }
  const bindings = await listCompanyBindings(
    client,
    input.organizationId,
    input.companyId,
    input.templateId,
  );
  const groups = await listGroups(client, input.organizationId, input.companyId);
  const plan = buildOnboardingPlan({
    companyId: input.companyId,
    personId: input.personId,
    personEmail: person.work_email,
    personDisplayName: person.display_name,
    templateId: input.templateId,
    templateVersionId: version.id,
    templateVersionNumber: version.version_number,
    intents: version.intents as TemplateIntent[],
    bindings: bindings.map((b) => ({
      bindingKey: b.binding_key,
      resourceType: b.resource_type,
      resourceId: b.resource_id,
    })),
    groups: groups.map((g) => ({
      id: g.id,
      displayName: g.display_name,
      groupType: g.group_type,
      membershipCapability: g.membership_capability,
      externalId: g.external_id,
    })),
    subscriptions: await subscriptionCapacity(client, input.organizationId, input.companyId),
    usageLocation: input.usageLocation ?? "US",
  });
  const run = await insertWorkflowRun(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    personId: input.personId,
    kind: "onboarding",
    templateId: input.templateId,
    templateVersionId: version.id,
    frozenPlan: plan,
    idempotencyKey: input.idempotencyKey,
    actorStaffUserId: input.actorStaffUserId,
    correlationId: input.correlationId,
  });
  return { run, plan };
}

export async function previewOffboarding(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    personId: string;
    actorStaffUserId: string;
    idempotencyKey: string;
    correlationId?: string;
  },
): Promise<{ run: WorkflowRunRow; plan: FrozenPlan }> {
  const profile = await loadPersonProfile(client, input.organizationId, input.companyId, input.personId);
  if (!profile) throw new NotFoundError("Person not found");
  const groups = await listGroups(client, input.organizationId, input.companyId);
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const plan = buildOffboardingPlan({
    companyId: input.companyId,
    personId: input.personId,
    accounts: profile.accounts.map((a) => ({
      id: a.id,
      loginName: a.login_name,
      accountKind: a.account_kind,
      enabledState: a.enabled_state,
      externalId: a.external_id,
    })),
    memberships: profile.groupMemberships
      .filter((m) => m.status === "active")
      .map((m) => ({
        id: m.id,
        groupId: m.group_id,
        groupName: m.group_name,
        groupType: m.group_type,
        membershipCapability: groupById.get(m.group_id)?.membership_capability ?? "direct",
        membershipKind: m.membership_kind,
        accountId: m.account_id,
      })),
    assignments: profile.assignments.map((a) => ({
      id: a.id,
      productName: a.product_name,
      assignedByGroup: false,
      status: a.status,
    })),
    mailboxAccess: profile.mailboxAccess
      .filter((m) => m.status === "active")
      .map((m) => ({ id: m.id, mailboxAddress: m.mailbox_address })),
  });
  const run = await insertWorkflowRun(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    personId: input.personId,
    kind: "offboarding",
    frozenPlan: plan,
    idempotencyKey: input.idempotencyKey,
    actorStaffUserId: input.actorStaffUserId,
    correlationId: input.correlationId,
  });
  return { run, plan };
}

export async function previewStatusChange(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    personId: string;
    toStatus: PersonItStatus;
    departureDate?: string | null;
    actorStaffUserId: string;
    idempotencyKey: string;
  },
): Promise<{ run: WorkflowRunRow; plan: FrozenPlan }> {
  const person = await getPerson(client, input.organizationId, input.companyId, input.personId);
  if (!person) throw new NotFoundError("Person not found");
  const plan = buildStatusChangePlan({
    companyId: input.companyId,
    personId: input.personId,
    fromStatus: person.it_status,
    toStatus: input.toStatus,
    departureDate: input.departureDate,
  });
  const run = await insertWorkflowRun(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    personId: input.personId,
    kind: "status_change",
    frozenPlan: plan,
    idempotencyKey: input.idempotencyKey,
    actorStaffUserId: input.actorStaffUserId,
  });
  return { run, plan };
}

export async function approveWorkflowRun(
  client: DbClient,
  input: { organizationId: string; companyId: string; runId: string },
): Promise<WorkflowRunRow> {
  const run = await getWorkflowRun(client, input.organizationId, input.companyId, input.runId);
  if (!run) throw new NotFoundError("Workflow run not found");
  if (run.status !== "preview") throw new UnprocessableError("Only a previewed run can be approved");
  if (!planIsApprovable(run.frozen_plan)) {
    throw new UnprocessableError("Plan has blocking issues and cannot be approved");
  }
  await updateRunStatus(client, run.id, "approved", { approvedAt: true });
  const person = await getPerson(client, input.organizationId, input.companyId, run.person_id);
  if (person && (run.kind === "offboarding" || run.kind === "onboarding")) {
    const badge = run.kind === "offboarding" ? "offboarding_in_progress" : "onboarding_in_progress";
    const itStatus = run.kind === "offboarding" ? "departed" : person.it_status;
    await updatePerson(client, {
      organizationId: input.organizationId,
      companyId: input.companyId,
      personId: person.id,
      version: person.version,
      itStatus,
      workflowBadge: badge,
    });
  }
  await insertTimelineEvent(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    entityType: "workflow_run",
    entityId: run.id,
    eventKind: "workflow.approved",
    actorStaffUserId: run.actor_staff_user_id,
    source: "workflow",
    summary: `Approved ${run.kind} plan (template version ${run.frozen_plan.templateVersionNumber ?? "none"} frozen)`,
  });
  const updated = await getWorkflowRun(client, input.organizationId, input.companyId, run.id);
  return updated!;
}

export async function cancelWorkflowRun(
  client: DbClient,
  input: { organizationId: string; companyId: string; runId: string },
): Promise<void> {
  const run = await getWorkflowRun(client, input.organizationId, input.companyId, input.runId);
  if (!run) throw new NotFoundError("Workflow run not found");
  const steps = await listWorkflowSteps(client, run.id);
  for (const step of steps) {
    if (step.status === "succeeded" || step.status === "skipped") continue;
    await updateStepStatus(client, step.id, "canceled", {
      error: "Canceled; completed work was not rolled back",
    });
  }
  await updateRunStatus(client, run.id, "canceled", { canceledAt: true });
}

async function assertExecutePermission(client: DbClient, staffUserId: string): Promise<void> {
  const membership = await getMembership(client, staffUserId);
  if (!membership?.active) throw new ForbiddenError("Staff membership is inactive");
  if (membership.role !== "admin" && !membership.automation_execute) {
    throw new ForbiddenError("Automation execute permission is not granted");
  }
}

async function refreshRunStatus(client: DbClient, run: WorkflowRunRow): Promise<void> {
  const steps = await listWorkflowSteps(client, run.id);
  const status = deriveRunStatus(steps.map((s) => s.status));
  await updateRunStatus(client, run.id, status);
}

export async function fulfillManualStep(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    runId: string;
    stepId: string;
    actorStaffUserId: string;
    evidence: string;
  },
): Promise<void> {
  const run = await getWorkflowRun(client, input.organizationId, input.companyId, input.runId);
  if (!run) throw new NotFoundError("Workflow run not found");
  const steps = await listWorkflowSteps(client, run.id);
  const step = steps.find((s) => s.id === input.stepId);
  if (!step) throw new NotFoundError("Step not found");
  if (step.execution_method !== "manual") {
    throw new UnprocessableError("Only manual steps can be fulfilled with evidence");
  }
  const evidence = `${input.evidence} · actor=${input.actorStaffUserId} · at=${new Date().toISOString()} · method=operator_attestation`;
  await updateStepStatus(client, step.id, "succeeded", { evidence });
  await insertStepAttempt(client, {
    organizationId: input.organizationId,
    companyId: input.companyId,
    runId: run.id,
    stepId: step.id,
    status: "succeeded",
    providerAccepted: false,
    verified: false,
    evidence,
  });
  await refreshRunStatus(client, run);
}

export async function executeWorkflowRun(
  client: DbClient,
  input: {
    organizationId: string;
    companyId: string;
    runId: string;
    provider?: LifecycleProvider;
  },
): Promise<WorkflowRunRow> {
  const run = await getWorkflowRun(client, input.organizationId, input.companyId, input.runId);
  if (!run) throw new NotFoundError("Workflow run not found");
  if (run.status === "canceled" || run.status === "preview") {
    throw new UnprocessableError("Run is not executable in its current status");
  }
  try {
    await assertExecutePermission(client, run.actor_staff_user_id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execute permission denied";
    await insertNotification(client, {
      organizationId: input.organizationId,
      staffUserId: run.actor_staff_user_id,
      companyId: input.companyId,
      title: "Workflow blocked",
      body: message,
      runId: run.id,
    });
    throw error;
  }

  const provider = input.provider ?? demoLifecycleFor(input.organizationId);
  const plan = run.frozen_plan;
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    const steps = await listWorkflowSteps(client, run.id);
    const statusMap: Record<string, WorkflowStepStatus> = {};
    for (const step of steps) statusMap[step.step_key] = step.status;
    const readyKeys = executableStepKeys(plan.steps, statusMap);
    const readyAuto = steps.filter((s) => readyKeys.includes(s.step_key) && s.execution_method !== "manual");
    const readyManual = steps.filter((s) => readyKeys.includes(s.step_key) && s.execution_method === "manual");
    for (const step of readyManual) {
      await updateStepStatus(client, step.id, "awaiting_manual");
    }
    if (readyAuto.length === 0) break;
    await updateRunStatus(client, run.id, "running");
    for (const step of readyAuto) {
      await executeOneStep(client, { run, step, provider, plan });
    }
  }
  await refreshRunStatus(client, run);
  const updated = await getWorkflowRun(client, input.organizationId, input.companyId, run.id);
  return updated!;
}

async function executeOneStep(
  client: DbClient,
  input: { run: WorkflowRunRow; step: WorkflowStepRow; provider: LifecycleProvider; plan: FrozenPlan },
): Promise<void> {
  const { run, step, provider } = input;
  if (step.status === "succeeded" || step.status === "skipped") return;
  await updateStepStatus(client, step.id, "running");
  await insertStepAttempt(client, {
    organizationId: run.organization_id,
    companyId: run.company_id,
    runId: run.id,
    stepId: step.id,
    status: "running",
  });
  try {
    const evidence = await applyStep(client, provider, run, step);
    await updateStepStatus(client, step.id, "succeeded", { evidence });
    await insertStepAttempt(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      runId: run.id,
      stepId: step.id,
      status: "succeeded",
      providerAccepted: true,
      verified: evidence.includes("verified") || evidence.includes("Reconciled"),
      evidence,
    });
    await insertTimelineEvent(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      entityType: "workflow_step",
      entityId: step.id,
      eventKind: `workflow.${step.kind}`,
      actorStaffUserId: run.actor_staff_user_id,
      source: "workflow",
      summary: step.summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateStepStatus(client, step.id, "failed", { error: message });
    await insertStepAttempt(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      runId: run.id,
      stepId: step.id,
      status: "failed",
      error: message,
    });
    await insertNotification(client, {
      organizationId: run.organization_id,
      staffUserId: run.actor_staff_user_id,
      companyId: run.company_id,
      title: "Workflow step failed",
      body: `${step.summary}: ${message}`,
      runId: run.id,
    });
  }
}

async function linkedAccount(client: DbClient, run: WorkflowRunRow) {
  const accounts = await listAccounts(client, run.organization_id, run.company_id, {
    personId: run.person_id,
  });
  return accounts[0] ?? null;
}

async function applyStep(
  client: DbClient,
  provider: LifecycleProvider,
  run: WorkflowRunRow,
  step: WorkflowStepRow,
): Promise<string> {
  const person = await getPerson(client, run.organization_id, run.company_id, run.person_id);
  if (!person) throw new NotFoundError("Person not found");
  const params = step.params;

  if (step.kind === "create_account") {
    const loginName = String(params.loginName ?? person.work_email);
    const existing = (await listAccounts(client, run.organization_id, run.company_id, { personId: person.id })).find(
      (a) => a.login_name.toLowerCase() === loginName.toLowerCase(),
    );
    if (existing) {
      return `Reconciled existing account ${existing.id}; createUser not repeated`;
    }
    const found = await provider.findUserByUpn(loginName);
    const created = found
      ? { accepted: true, verified: true, externalId: found.id, evidence: `Reconciled provider user ${found.id}` }
      : await provider.createUser({
          userPrincipalName: loginName,
          displayName: String(params.displayName ?? person.display_name),
          mailNickname: loginName.split("@")[0] ?? "user",
          usageLocation: params.usageLocation ? String(params.usageLocation) : "US",
        });
    await createAccount(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      personId: person.id,
      loginName,
      accountKind: "human",
      providerSource: "workflow",
      externalId: created.externalId ?? null,
      enabledState: "enabled",
      freshnessNote: created.evidence,
    });
    await insertWelcomePreview(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      runId: run.id,
      personId: person.id,
      displayName: person.display_name,
      loginName,
    });
    return created.evidence;
  }

  if (step.kind === "add_group_membership") {
    const account = await linkedAccount(client, run);
    if (!account) throw new UnprocessableError("Account does not exist yet");
    const groupId = String(params.groupId);
    const group = await getGroup(client, run.organization_id, run.company_id, groupId);
    if (!group) throw new NotFoundError("Group not found");
    if (group.membership_capability !== "direct" || group.group_type === "distribution") {
      throw new UnprocessableError("Unsupported group mutation");
    }
    const already = await client.query<{ id: string }>(
      `SELECT id FROM group_memberships
       WHERE organization_id = $1 AND company_id = $2 AND group_id = $3 AND account_id = $4 AND status = 'active'`,
      [run.organization_id, run.company_id, groupId, account.id],
    );
    if (already.rows[0]) {
      return `Membership already present (${already.rows[0].id}); addGroupMember not repeated`;
    }
    const userId = account.external_id ?? account.id;
    const result = await provider.addGroupMember(group.external_id ?? group.id, userId);
    await createGroupMembership(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      groupId,
      accountId: account.id,
      membershipKind: "direct",
      verificationSource: "workflow",
    });
    return result.evidence;
  }

  if (step.kind === "assign_license") {
    const account = await linkedAccount(client, run);
    const subscriptionId = params.subscriptionId ? String(params.subscriptionId) : null;
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM license_assignments
       WHERE organization_id = $1 AND company_id = $2 AND person_id = $3
         AND product_id = $4 AND status IN ('active', 'removal_pending')
         AND ($5::uuid IS NULL OR subscription_id = $5)
       LIMIT 1`,
      [run.organization_id, run.company_id, run.person_id, String(params.productId), subscriptionId],
    );
    if (existing.rows[0]) {
      return `Assignment ${existing.rows[0].id} already active; assignLicense not repeated`;
    }
    const result = await provider.assignLicense(
      account?.external_id ?? account?.id ?? "unknown",
      String(params.productId),
    );
    await assignLicense(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      personId: run.person_id,
      accountId: account?.id ?? null,
      productId: String(params.productId),
      subscriptionId: params.subscriptionId ? String(params.subscriptionId) : null,
      source: "workflow",
      actorStaffUserId: run.actor_staff_user_id,
    });
    return result.evidence;
  }

  if (step.kind === "disable_account") {
    const accountId = String(params.accountId);
    const account = (await listAccounts(client, run.organization_id, run.company_id)).find((a) => a.id === accountId);
    if (!account) throw new NotFoundError("Account not found");
    const result = await provider.disableAccount(account.external_id ?? account.id);
    await updateAccount(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      accountId: account.id,
      version: account.version,
      enabledState: "disabled",
      freshnessNote: result.evidence,
    });
    return result.evidence;
  }

  if (step.kind === "revoke_sessions") {
    const accountId = String(params.accountId);
    const account = (await listAccounts(client, run.organization_id, run.company_id)).find((a) => a.id === accountId);
    const result = await provider.revokeSessions(account?.external_id ?? accountId);
    return result.evidence;
  }

  if (step.kind === "remove_group_membership") {
    const membershipId = String(params.membershipId);
    const groupId = String(params.groupId);
    const accountId = String(params.accountId);
    const account = (await listAccounts(client, run.organization_id, run.company_id)).find((a) => a.id === accountId);
    const group = await getGroup(client, run.organization_id, run.company_id, groupId);
    const result = await provider.removeGroupMember(
      group?.external_id ?? groupId,
      account?.external_id ?? accountId,
    );
    await endGroupMembership(client, run.organization_id, run.company_id, membershipId);
    return result.evidence;
  }

  if (step.kind === "remove_license") {
    const assignmentId = String(params.assignmentId);
    const assignment = await client.query<{ version: number }>(
      `SELECT version FROM license_assignments WHERE id = $1`,
      [assignmentId],
    );
    const version = assignment.rows[0]?.version;
    if (version == null) throw new NotFoundError("Assignment not found");
    const account = await linkedAccount(client, run);
    const result = await provider.removeLicense(account?.external_id ?? account?.id ?? "unknown", assignmentId);
    await endLicenseAssignment(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      assignmentId,
      version,
      status: "ended",
      actorStaffUserId: run.actor_staff_user_id,
    });
    return result.evidence;
  }

  if (step.kind === "set_it_status") {
    const toStatus = String(params.toStatus) as PersonItStatus;
    const badge =
      toStatus === "departed"
        ? "offboarding_in_progress"
        : toStatus === "active"
          ? null
          : person.workflow_badge;
    await updatePerson(client, {
      organizationId: run.organization_id,
      companyId: run.company_id,
      personId: person.id,
      version: person.version,
      itStatus: toStatus,
      endDate: params.departureDate ? String(params.departureDate) : undefined,
      workflowBadge: badge,
    });
    return `IT status set to ${toStatus}`;
  }

  throw new UnprocessableError(`Unsupported automated step ${step.kind}`);
}

export async function retryFailedSteps(
  client: DbClient,
  input: { organizationId: string; companyId: string; runId: string; provider?: LifecycleProvider },
): Promise<WorkflowRunRow> {
  const steps = await listWorkflowSteps(client, input.runId);
  for (const step of steps) {
    if (step.status === "failed") {
      await updateStepStatus(client, step.id, "pending", { error: null });
    }
  }
  return executeWorkflowRun(client, input);
}
