import { UnprocessableError } from "./errors.ts";
import type { PersonItStatus } from "./person-status.ts";

export type WorkflowKind = "onboarding" | "offboarding" | "status_change";

export type WorkflowStepKind =
  | "create_account"
  | "add_group_membership"
  | "assign_license"
  | "disable_account"
  | "remove_group_membership"
  | "remove_license"
  | "revoke_sessions"
  | "manual_mailbox"
  | "manual_distribution_group"
  | "manual_application"
  | "set_it_status";

export type StepExecutionMethod = "graph" | "manual" | "local";

export type WorkflowRunStatus =
  | "preview"
  | "approved"
  | "running"
  | "waiting_manual"
  | "succeeded"
  | "partial"
  | "failed"
  | "canceled";

export type WorkflowStepStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled"
  | "awaiting_manual"
  | "skipped";

export type TemplateIntent =
  | { key: string; kind: "create_account"; usageLocation?: string }
  | { key: string; kind: "group_membership"; bindingKey: string }
  | { key: string; kind: "license"; bindingKey: string }
  | { key: string; kind: "manual_mailbox" }
  | { key: string; kind: "manual_distribution_group"; bindingKey: string }
  | { key: string; kind: "manual_application"; label: string };

export type CompanyBinding = {
  bindingKey: string;
  resourceType: "group" | "subscription";
  resourceId: string;
};

export type PlannedStep = {
  key: string;
  kind: WorkflowStepKind;
  executionMethod: StepExecutionMethod;
  dependsOn: string[];
  summary: string;
  params: Record<string, unknown>;
};

export type PlanIssue = {
  code: string;
  message: string;
  stepKey?: string;
};

export type FrozenPlan = {
  kind: WorkflowKind;
  templateId: string | null;
  templateVersionId: string | null;
  templateVersionNumber: number | null;
  companyId: string;
  personId: string;
  usageLocation: string | null;
  steps: PlannedStep[];
  issues: PlanIssue[];
};

export type GroupSnapshot = {
  id: string;
  displayName: string;
  groupType: string;
  membershipCapability: string;
  externalId?: string | null;
};

export type SubscriptionSnapshot = {
  id: string;
  productId: string;
  productName?: string | null;
  purchasedQuantity: number;
  consumedQuantity: number;
};

export function groupMutationAllowed(group: GroupSnapshot): PlanIssue | null {
  if (group.membershipCapability === "dynamic") {
    return {
      code: "unsupported_group",
      message: `Cannot mutate dynamic group ${group.displayName}`,
    };
  }
  if (group.membershipCapability === "unsupported") {
    return {
      code: "unsupported_group",
      message: `Group ${group.displayName} does not support membership writes`,
    };
  }
  if (group.groupType === "distribution") {
    return {
      code: "manual_distribution_group",
      message: `${group.displayName} is a distribution group — membership is a manual step`,
    };
  }
  return null;
}

export function buildOnboardingPlan(input: {
  companyId: string;
  personId: string;
  personEmail: string;
  personDisplayName: string;
  templateId: string;
  templateVersionId: string;
  templateVersionNumber: number;
  intents: TemplateIntent[];
  bindings: CompanyBinding[];
  groups: GroupSnapshot[];
  subscriptions: SubscriptionSnapshot[];
  usageLocation?: string | null;
}): FrozenPlan {
  const bindingByKey = new Map(input.bindings.map((b) => [b.bindingKey, b]));
  const groupById = new Map(input.groups.map((g) => [g.id, g]));
  const subById = new Map(input.subscriptions.map((s) => [s.id, s]));
  const steps: PlannedStep[] = [];
  const issues: PlanIssue[] = [];
  let previousKey: string | null = null;

  const usageLocation = input.usageLocation ?? null;

  for (const intent of input.intents) {
    const dependsOn = previousKey ? [previousKey] : [];
    if (intent.kind === "create_account") {
      const location = intent.usageLocation ?? usageLocation;
      if (!location) {
        issues.push({
          code: "usage_location_required",
          message: "Licensing requires a usage location at account creation",
          stepKey: intent.key,
        });
      }
      steps.push({
        key: intent.key,
        kind: "create_account",
        executionMethod: "graph",
        dependsOn,
        summary: `Create cloud account for ${input.personDisplayName}`,
        params: {
          loginName: input.personEmail,
          displayName: input.personDisplayName,
          usageLocation: location,
        },
      });
      previousKey = intent.key;
      continue;
    }

    if (intent.kind === "group_membership") {
      const binding = bindingByKey.get(intent.bindingKey);
      if (!binding || binding.resourceType !== "group") {
        issues.push({
          code: "missing_binding",
          message: `Company binding missing for group intent ${intent.bindingKey}`,
          stepKey: intent.key,
        });
        continue;
      }
      const group = groupById.get(binding.resourceId);
      if (!group) {
        issues.push({
          code: "missing_resource",
          message: `Bound group ${binding.resourceId} is not in this company`,
          stepKey: intent.key,
        });
        continue;
      }
      const mutation = groupMutationAllowed(group);
      if (mutation?.code === "manual_distribution_group") {
        steps.push({
          key: intent.key,
          kind: "manual_distribution_group",
          executionMethod: "manual",
          dependsOn,
          summary: `Manually add ${input.personDisplayName} to ${group.displayName}`,
          params: { groupId: group.id, groupName: group.displayName },
        });
        previousKey = intent.key;
        continue;
      }
      if (mutation) {
        issues.push({ ...mutation, stepKey: intent.key });
        continue;
      }
      steps.push({
        key: intent.key,
        kind: "add_group_membership",
        executionMethod: "graph",
        dependsOn,
        summary: `Add to ${group.displayName}`,
        params: {
          groupId: group.id,
          groupName: group.displayName,
          groupExternalId: group.externalId ?? null,
        },
      });
      previousKey = intent.key;
      continue;
    }

    if (intent.kind === "license") {
      const binding = bindingByKey.get(intent.bindingKey);
      if (!binding || binding.resourceType !== "subscription") {
        issues.push({
          code: "missing_binding",
          message: `Company binding missing for license intent ${intent.bindingKey}`,
          stepKey: intent.key,
        });
        continue;
      }
      const sub = subById.get(binding.resourceId);
      if (!sub) {
        issues.push({
          code: "missing_resource",
          message: `Bound subscription ${binding.resourceId} is not in this company`,
          stepKey: intent.key,
        });
        continue;
      }
      const available = sub.purchasedQuantity - sub.consumedQuantity;
      if (available < 1) {
        issues.push({
          code: "insufficient_capacity",
          message: `No named seats available on ${sub.productName ?? sub.id} (${available} remaining)`,
          stepKey: intent.key,
        });
      }
      steps.push({
        key: intent.key,
        kind: "assign_license",
        executionMethod: "graph",
        dependsOn,
        summary: `Assign ${sub.productName ?? "license"}`,
        params: {
          subscriptionId: sub.id,
          productId: sub.productId,
          productName: sub.productName ?? null,
        },
      });
      previousKey = intent.key;
      continue;
    }

    if (intent.kind === "manual_mailbox") {
      steps.push({
        key: intent.key,
        kind: "manual_mailbox",
        executionMethod: "manual",
        dependsOn,
        summary: "Verify mailbox readiness (mail attribute is not proof of a usable mailbox)",
        params: {},
      });
      previousKey = intent.key;
      continue;
    }

    if (intent.kind === "manual_distribution_group") {
      const binding = bindingByKey.get(intent.bindingKey);
      steps.push({
        key: intent.key,
        kind: "manual_distribution_group",
        executionMethod: "manual",
        dependsOn,
        summary: "Manually update distribution group membership",
        params: { groupId: binding?.resourceId ?? null },
      });
      previousKey = intent.key;
      continue;
    }

    steps.push({
      key: intent.key,
      kind: "manual_application",
      executionMethod: "manual",
      dependsOn,
      summary: intent.label,
      params: { label: intent.label },
    });
    previousKey = intent.key;
  }

  return {
    kind: "onboarding",
    templateId: input.templateId,
    templateVersionId: input.templateVersionId,
    templateVersionNumber: input.templateVersionNumber,
    companyId: input.companyId,
    personId: input.personId,
    usageLocation,
    steps,
    issues,
  };
}

export function buildOffboardingPlan(input: {
  companyId: string;
  personId: string;
  accounts: Array<{
    id: string;
    loginName: string;
    accountKind: string;
    enabledState: string;
    externalId?: string | null;
  }>;
  memberships: Array<{
    id: string;
    groupId: string;
    groupName: string;
    groupType: string;
    membershipCapability: string;
    membershipKind: string;
    accountId: string;
  }>;
  assignments: Array<{
    id: string;
    productName?: string | null;
    assignedByGroup?: boolean;
    status: string;
  }>;
  mailboxAccess: Array<{ id: string; mailboxAddress?: string | null }>;
}): FrozenPlan {
  const steps: PlannedStep[] = [];
  const issues: PlanIssue[] = [];
  let previous: string | null = null;
  const dep = () => (previous ? [previous] : []);
  const push = (step: PlannedStep) => {
    steps.push(step);
    previous = step.key;
  };

  for (const account of input.accounts) {
    if (account.accountKind !== "human") {
      issues.push({
        code: "unclassified_account",
        message: `${account.loginName} is not an ordinary human account and requires review`,
      });
      continue;
    }
    push({
      key: `disable:${account.id}`,
      kind: "disable_account",
      executionMethod: "graph",
      dependsOn: dep(),
      summary: `Disable ${account.loginName}`,
      params: { accountId: account.id, externalId: account.externalId ?? null, loginName: account.loginName },
    });
    push({
      key: `revoke:${account.id}`,
      kind: "revoke_sessions",
      executionMethod: "graph",
      dependsOn: dep(),
      summary: `Request session revocation for ${account.loginName} (acceptance ≠ instant global sign-out)`,
      params: { accountId: account.id, externalId: account.externalId ?? null },
    });
  }

  for (const membership of input.memberships) {
    if (membership.membershipKind !== "direct") {
      steps.push({
        key: `membership-manual:${membership.id}`,
        kind: "manual_application",
        executionMethod: "manual",
        dependsOn: dep(),
        summary: `Inherited/dynamic membership on ${membership.groupName} cannot be removed as a direct member`,
        params: { membershipId: membership.id, groupId: membership.groupId },
      });
      previous = `membership-manual:${membership.id}`;
      continue;
    }
    const group = {
      id: membership.groupId,
      displayName: membership.groupName,
      groupType: membership.groupType,
      membershipCapability: membership.membershipCapability,
    };
    const mutation = groupMutationAllowed(group);
    if (mutation?.code === "manual_distribution_group") {
      push({
        key: `remove-dist:${membership.id}`,
        kind: "manual_distribution_group",
        executionMethod: "manual",
        dependsOn: dep(),
        summary: `Manually remove from ${membership.groupName}`,
        params: { membershipId: membership.id, groupId: membership.groupId },
      });
      continue;
    }
    if (mutation) {
      issues.push({ ...mutation, stepKey: `remove:${membership.id}` });
      continue;
    }
    push({
      key: `remove-member:${membership.id}`,
      kind: "remove_group_membership",
      executionMethod: "graph",
      dependsOn: dep(),
      summary: `Remove from ${membership.groupName} via members/$ref`,
      params: { membershipId: membership.id, groupId: membership.groupId, accountId: membership.accountId },
    });
  }

  for (const assignment of input.assignments) {
    if (assignment.status !== "active" && assignment.status !== "removal_pending") continue;
    if (assignment.assignedByGroup) {
      push({
        key: `license-manual:${assignment.id}`,
        kind: "manual_application",
        executionMethod: "manual",
        dependsOn: dep(),
        summary: `Direct license removal would not resolve group-inherited ${assignment.productName ?? "entitlement"}`,
        params: { assignmentId: assignment.id },
      });
      continue;
    }
    push({
      key: `remove-license:${assignment.id}`,
      kind: "remove_license",
      executionMethod: "graph",
      dependsOn: dep(),
      summary: `Remove ${assignment.productName ?? "license"} assignment`,
      params: { assignmentId: assignment.id },
    });
  }

  for (const access of input.mailboxAccess) {
    push({
      key: `mailbox:${access.id}`,
      kind: "manual_mailbox",
      executionMethod: "manual",
      dependsOn: dep(),
      summary: `Record mailbox permission evidence (${access.mailboxAddress ?? access.id})`,
      params: { mailboxAccessId: access.id },
    });
  }

  return {
    kind: "offboarding",
    templateId: null,
    templateVersionId: null,
    templateVersionNumber: null,
    companyId: input.companyId,
    personId: input.personId,
    usageLocation: null,
    steps,
    issues,
  };
}

export function buildStatusChangePlan(input: {
  companyId: string;
  personId: string;
  fromStatus: PersonItStatus;
  toStatus: PersonItStatus;
  departureDate?: string | null;
}): FrozenPlan {
  if (input.toStatus === "departed" && input.fromStatus === "departed") {
    throw new UnprocessableError("Person is already Departed");
  }
  return {
    kind: "status_change",
    templateId: null,
    templateVersionId: null,
    templateVersionNumber: null,
    companyId: input.companyId,
    personId: input.personId,
    usageLocation: null,
    steps: [
      {
        key: "set-status",
        kind: "set_it_status",
        executionMethod: "local",
        dependsOn: [],
        summary: `Set IT status to ${input.toStatus}${input.toStatus === "departed" ? " (visible even if cleanup is incomplete)" : ""}`,
        params: { toStatus: input.toStatus, departureDate: input.departureDate ?? null },
      },
    ],
    issues: [],
  };
}

export function executableStepKeys(
  steps: PlannedStep[],
  statuses: Record<string, WorkflowStepStatus>,
): string[] {
  const ready: string[] = [];
  for (const step of steps) {
    const status = statuses[step.key] ?? "pending";
    if (status !== "pending") continue;
    const depsOk = step.dependsOn.every((dep) => statuses[dep] === "succeeded" || statuses[dep] === "skipped");
    if (depsOk) ready.push(step.key);
  }
  return ready;
}

export function deriveRunStatus(stepStatuses: WorkflowStepStatus[]): WorkflowRunStatus {
  if (stepStatuses.some((s) => s === "canceled")) {
    if (stepStatuses.some((s) => s === "succeeded")) return "canceled";
    return "canceled";
  }
  if (stepStatuses.some((s) => s === "running")) return "running";
  if (stepStatuses.some((s) => s === "awaiting_manual")) return "waiting_manual";
  if (stepStatuses.some((s) => s === "failed")) {
    return stepStatuses.some((s) => s === "succeeded") ? "partial" : "failed";
  }
  if (stepStatuses.every((s) => s === "succeeded" || s === "skipped")) return "succeeded";
  if (stepStatuses.some((s) => s === "succeeded")) return "running";
  return "approved";
}

export function cancelLeavesCompletedWork(status: WorkflowStepStatus): boolean {
  return status === "succeeded";
}

export function planIsApprovable(plan: FrozenPlan): boolean {
  return plan.issues.length === 0 && plan.steps.length > 0;
}
