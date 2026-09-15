import type { Company, Overview, SessionUser } from "@ranger/contracts";
import type {
  Account,
  ArchiveReadiness,
  Device,
  DeviceAssignment,
  Group,
  GroupMembership,
  ImportBatch,
  LicenseAssignment,
  Paginated,
  Person,
  PersonDetail,
  PersonItStatus,
  Product,
  SharedMailbox,
  MailboxAccess,
  Subscription,
  TimelineEvent,
  WorkItem,
} from "./inventory-types.ts";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined;
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      ...(hasBody ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const error = new Error(body?.error?.message ?? `Request failed (${response.status})`);
    (error as Error & { status: number }).status = response.status;
    throw error;
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** Multipart upload — cookies only; let the browser set multipart boundary (no JSON Content-Type). */
async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const error = new Error(body?.error?.message ?? `Request failed (${response.status})`);
    (error as Error & { status: number }).status = response.status;
    throw error;
  }
  return (await response.json()) as T;
}

async function fetchBlob(path: string): Promise<Blob> {
  const response = await fetch(path, { credentials: "include" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const error = new Error(body?.error?.message ?? `Request failed (${response.status})`);
    (error as Error & { status: number }).status = response.status;
    throw error;
  }
  return response.blob();
}

export async function triggerDownload(path: string, filename: string): Promise<void> {
  const blob = await fetchBlob(path);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "investigating" | "waiting" | "resolved" | "closed";
export type InvestigationEntryKind = "observation" | "hypothesis" | "action" | "result" | "note";

export type Incident = {
  id: string;
  organizationId: string;
  companyId: string;
  title: string;
  reportedSymptom: string;
  impactDescription: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  ownerStaffUserId: string | null;
  onsetAt: string | null;
  externalTicketRef: string | null;
  tags: string[];
  resolutionSummary: string | null;
  resolutionKind: "confirmed_cause" | "unresolved_hypothesis" | null;
  resolvedAt: string | null;
  closedAt: string | null;
  workflowRunId: string | null;
  workflowStepKey: string | null;
  correlationId: string | null;
  providerError: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type IncidentEvidence = {
  id: string;
  kind: string;
  sourceLabel: string;
  originalFilename: string | null;
  contentType: string | null;
  byteSize: number | null;
  sha256: string | null;
  collectionTime: string | null;
  timestampPrecision: string | null;
  parserVersion: string | null;
  parseWarnings: string[];
  parsedSummary: unknown;
  isRedacted: boolean;
  redactedFromEvidenceId: string | null;
  rangerEventRef: string | null;
  createdAt: string;
};

export type InvestigationEntry = {
  id: string;
  entryKind: string;
  body: string;
  occurredAt: string | null;
  timePrecision: string | null;
  authorStaffUserId: string | null;
  linkedEvidenceIds: string[];
  createdAt: string;
};

export type RelatedSuggestion = {
  id: string;
  suggestedIncidentId: string;
  scoringVersion: string;
  score: number;
  reasons: string[];
  status: string;
  title: string | null;
  providerError: string | null;
};

export type Problem = {
  id: string;
  title: string;
  workingCause: string | null;
  resolution?: string | null;
  status: string;
  incidentIds: string[];
};

export type IncidentDetail = {
  incident: Incident;
  affectedResources: Array<{
    id: string;
    resourceType: string;
    resourceId: string;
    label: string | null;
  }>;
  evidence: IncidentEvidence[];
  entries: InvestigationEntry[];
  related: RelatedSuggestion[];
  problems: Problem[];
};

export type CreateIncidentBody = {
  title: string;
  reportedSymptom: string;
  impactDescription?: string | null;
  severity?: IncidentSeverity;
  tags?: string[];
  workflowRunId?: string | null;
  workflowStepKey?: string | null;
  correlationId?: string | null;
  providerError?: string | null;
  affected?: Array<{ resourceType: string; resourceId: string; label?: string | null }>;
};

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export type ListPeopleParams = {
  q?: string;
  status?: PersonItStatus | "archived" | "";
  page?: number;
  pageSize?: number;
};

export const api = {
  session: () => request<{ user: SessionUser }>("/api/v1/session"),
  overview: (companyId?: string | null) =>
    request<Overview>(companyId ? `/api/v1/overview?companyId=${companyId}` : "/api/v1/overview"),
  companies: () => request<{ companies: Company[] }>("/api/v1/companies"),
  company: (id: string) => request<{ company: Company }>(`/api/v1/companies/${id}`),
  companyCosts: (companyId: string) =>
    request<{
      costs: { byCurrency: Array<{ currency: string; total: string }>; unknownCount: number };
    }>(`/api/v1/companies/${companyId}/costs`),
  updateNotes: (id: string, itNotes: string | null, version: number) =>
    request<{ company: Company }>(`/api/v1/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ itNotes, version }),
    }),
  search: (q: string) =>
    request<{ results: Array<{ type: string; id: string; title: string; company: string; companyId?: string }> }>(
      `/api/v1/search?q=${encodeURIComponent(q)}`,
    ),
  enterDemo: () =>
    request<{ environment: string }>("/api/v1/demo/sessions", {
      method: "POST",
      body: "{}",
    }),

  // --- People ---
  listPeople: (companyId: string, params: ListPeopleParams = {}) =>
    request<Paginated<Person> & { people?: Person[] }>(
      `/api/v1/companies/${companyId}/people${qs(params)}`,
    ).then((res) => ({
      people: res.people ?? res.items ?? [],
      page: res.page ?? { page: 1, pageSize: 50, total: (res.people ?? res.items ?? []).length },
    })),
  createPerson: (
    companyId: string,
    body: {
      displayName: string;
      workEmail: string;
      roleTitle?: string | null;
      department?: string | null;
      sponsor?: string | null;
      itStatus?: PersonItStatus;
      startDate?: string | null;
      endDate?: string | null;
    },
  ) =>
    request<{ person: Person }>(`/api/v1/companies/${companyId}/people`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getPerson: (companyId: string, personId: string) =>
    request<PersonDetail & { licenseAssignments?: LicenseAssignment[]; costs?: unknown }>(
      `/api/v1/companies/${companyId}/people/${personId}`,
    ).then((res) => {
      const assignments = res.assignments?.length
        ? res.assignments
        : (res.licenseAssignments ?? []);
      return {
        person: res.person,
        accounts: res.accounts ?? [],
        groupMemberships: res.groupMemberships ?? [],
        mailboxAccess: res.mailboxAccess ?? [],
        assignments,
        devices: res.devices ?? [],
        workItems: res.workItems ?? [],
        timeline: res.timeline ?? [],
        costSummary: res.costSummary,
      } satisfies PersonDetail;
    }),
  updatePerson: (
    companyId: string,
    personId: string,
    body: Partial<{
      displayName: string;
      workEmail: string;
      roleTitle: string | null;
      department: string | null;
      sponsor: string | null;
      itStatus: PersonItStatus;
      startDate: string | null;
      endDate: string | null;
      workflowBadge: string | null;
      version: number;
    }>,
  ) =>
    request<{ person: Person }>(`/api/v1/companies/${companyId}/people/${personId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  archiveReadiness: (companyId: string, personId: string) =>
    request<ArchiveReadiness>(`/api/v1/companies/${companyId}/people/${personId}/archive-readiness`),
  archivePerson: (companyId: string, personId: string) =>
    request<{ person: Person }>(`/api/v1/companies/${companyId}/people/${personId}/archive`, {
      method: "POST",
      body: "{}",
    }),
  personTimeline: (companyId: string, personId: string) =>
    request<{ events: TimelineEvent[] }>(
      `/api/v1/companies/${companyId}/people/${personId}/timeline`,
    ),

  // --- Accounts ---
  listAccounts: (companyId: string, params: { q?: string; page?: number } = {}) =>
    request<Paginated<Account> & { accounts?: Account[] }>(
      `/api/v1/companies/${companyId}/accounts${qs(params)}`,
    ).then((res) => ({ accounts: res.accounts ?? res.items ?? [], page: res.page })),
  createAccount: (
    companyId: string,
    body: {
      loginName: string;
      accountKind: Account["accountKind"];
      enabledState?: Account["enabledState"];
      personId?: string | null;
      externalId?: string | null;
      providerSource?: Account["providerSource"];
    },
  ) =>
    request<{ account: Account }>(`/api/v1/companies/${companyId}/accounts`, {
      method: "POST",
      body: JSON.stringify({ providerSource: "manual", enabledState: "unknown", ...body }),
    }),
  getAccount: (companyId: string, accountId: string) =>
    request<{ account: Account }>(`/api/v1/companies/${companyId}/accounts/${accountId}`),
  updateAccount: (companyId: string, accountId: string, body: Record<string, unknown>) =>
    request<{ account: Account }>(`/api/v1/companies/${companyId}/accounts/${accountId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  // --- Products (org catalog) ---
  listProducts: (params: { q?: string; includeRetired?: boolean } = {}) =>
    request<Paginated<Product> & { products?: Product[] }>(`/api/v1/products${qs(params)}`).then(
      (res) => ({ products: res.products ?? res.items ?? [], page: res.page }),
    ),
  createProduct: (body: {
    name: string;
    vendor: string;
    category: string;
    assignmentModel: Product["assignmentModel"];
    documentationUrl?: string | null;
  }) =>
    request<{ product: Product }>("/api/v1/products", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getProduct: (productId: string) => request<{ product: Product }>(`/api/v1/products/${productId}`),
  updateProduct: (productId: string, body: Record<string, unknown>) =>
    request<{ product: Product }>(`/api/v1/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  retireProduct: (productId: string, version: number) =>
    request<{ product: Product }>(`/api/v1/products/${productId}/retire`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),

  // --- Subscriptions ---
  listSubscriptions: (companyId: string, params: { q?: string } = {}) =>
    request<Paginated<Subscription> & { subscriptions?: Subscription[] }>(
      `/api/v1/companies/${companyId}/subscriptions${qs(params)}`,
    ).then((res) => ({ subscriptions: res.subscriptions ?? res.items ?? [], page: res.page })),
  createSubscription: (
    companyId: string,
    body: {
      productId: string;
      purchasedQuantity: number;
      currency: string;
      payer: Subscription["payer"];
      billingCadence: string;
      supplier?: string | null;
      externalReference?: string | null;
      commitmentStart?: string | null;
      commitmentEnd?: string | null;
      renewalDate?: string | null;
      unitPrice?: string | null;
      priceKind?: "unit" | "flat";
    },
  ) =>
    request<{ subscription: Subscription }>(`/api/v1/companies/${companyId}/subscriptions`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getSubscription: (companyId: string, subscriptionId: string) =>
    request<{ subscription: Subscription }>(
      `/api/v1/companies/${companyId}/subscriptions/${subscriptionId}`,
    ),
  updateSubscription: (companyId: string, subscriptionId: string, body: Record<string, unknown>) =>
    request<{ subscription: Subscription }>(
      `/api/v1/companies/${companyId}/subscriptions/${subscriptionId}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  assignSubscription: (
    companyId: string,
    subscriptionId: string,
    body: { personId: string; accountId?: string | null; startEffectiveDate?: string | null },
  ) =>
    request<{ assignment: LicenseAssignment }>(
      `/api/v1/companies/${companyId}/subscriptions/${subscriptionId}/assignments`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  endAssignment: (
    companyId: string,
    subscriptionId: string,
    assignmentId: string,
    body: { endEffectiveDate?: string | null; version: number } = { version: 1 },
  ) =>
    request<{ assignment: LicenseAssignment }>(
      `/api/v1/companies/${companyId}/subscriptions/${subscriptionId}/assignments/${assignmentId}/end`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  // --- Groups ---
  listGroups: (companyId: string, params: { q?: string } = {}) =>
    request<Paginated<Group> & { groups?: Group[] }>(
      `/api/v1/companies/${companyId}/groups${qs(params)}`,
    ).then((res) => ({ groups: res.groups ?? res.items ?? [], page: res.page })),
  createGroup: (
    companyId: string,
    body: {
      displayName: string;
      groupType: Group["groupType"];
      emailAddress?: string | null;
      membershipCapability?: Group["membershipCapability"];
    },
  ) =>
    request<{ group: Group }>(`/api/v1/companies/${companyId}/groups`, {
      method: "POST",
      body: JSON.stringify({ source: "manual", membershipCapability: "direct", ...body }),
    }),
  getGroup: (companyId: string, groupId: string) =>
    request<{ group: Group; memberships: GroupMembership[] }>(
      `/api/v1/companies/${companyId}/groups/${groupId}`,
    ),
  addGroupMember: (companyId: string, groupId: string, body: { accountId: string }) =>
    request<{ membership: GroupMembership }>(
      `/api/v1/companies/${companyId}/groups/${groupId}/memberships`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  // --- Mailboxes ---
  listMailboxes: (companyId: string, params: { q?: string } = {}) =>
    request<Paginated<SharedMailbox> & { mailboxes?: SharedMailbox[] }>(
      `/api/v1/companies/${companyId}/mailboxes${qs(params)}`,
    ).then((res) => ({ mailboxes: res.mailboxes ?? res.items ?? [], page: res.page })),
  createMailbox: (
    companyId: string,
    body: { address: string; state?: string; ownerPersonId?: string | null },
  ) =>
    request<{ mailbox: SharedMailbox }>(`/api/v1/companies/${companyId}/mailboxes`, {
      method: "POST",
      body: JSON.stringify({ source: "manual", state: "active", ...body }),
    }),
  getMailbox: (companyId: string, mailboxId: string) =>
    request<{ mailbox: SharedMailbox; access: MailboxAccess[] }>(
      `/api/v1/companies/${companyId}/mailboxes/${mailboxId}`,
    ),
  addMailboxAccess: (
    companyId: string,
    mailboxId: string,
    body: { accountId: string; permissionKind: MailboxAccess["permissionKind"] },
  ) =>
    request<{ access: MailboxAccess }>(
      `/api/v1/companies/${companyId}/mailboxes/${mailboxId}/access`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  // --- Devices ---
  listDevices: (companyId: string, params: { q?: string } = {}) =>
    request<Paginated<Device> & { devices?: Device[] }>(
      `/api/v1/companies/${companyId}/devices${qs(params)}`,
    ).then((res) => ({ devices: res.devices ?? res.items ?? [], page: res.page })),
  createDevice: (
    companyId: string,
    body: {
      deviceType: string;
      assetTag?: string | null;
      serial?: string | null;
      hostname?: string | null;
      model?: string | null;
      state?: Device["state"];
    },
  ) =>
    request<{ device: Device }>(`/api/v1/companies/${companyId}/devices`, {
      method: "POST",
      body: JSON.stringify({ source: "manual", state: "available", ...body }),
    }),
  getDevice: (companyId: string, deviceId: string) =>
    request<{ device: Device; assignments: DeviceAssignment[] }>(
      `/api/v1/companies/${companyId}/devices/${deviceId}`,
    ),
  assignDevice: (companyId: string, deviceId: string, body: { personId: string; issuedAt?: string }) =>
    request<{ assignment: DeviceAssignment }>(
      `/api/v1/companies/${companyId}/devices/${deviceId}/assignments`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  returnDevice: (
    companyId: string,
    deviceId: string,
    assignmentId: string,
    body: { returnedAt?: string; custodyDisposition?: string | null; evidenceNote?: string | null },
  ) =>
    request<{ assignment: DeviceAssignment }>(
      `/api/v1/companies/${companyId}/devices/${deviceId}/assignments/${assignmentId}/return`,
      { method: "POST", body: JSON.stringify(body) },
    ),

  // --- Work items ---
  listWorkItems: (companyId: string, params: { status?: string; q?: string } = {}) =>
    request<Paginated<WorkItem> & { workItems?: WorkItem[] }>(
      `/api/v1/companies/${companyId}/work-items${qs(params)}`,
    ).then((res) => ({ workItems: res.workItems ?? res.items ?? [], page: res.page })),
  createWorkItem: (
    companyId: string,
    body: {
      title: string;
      type: string;
      status?: WorkItem["status"];
      targetPersonId?: string | null;
      dueDate?: string | null;
      description?: string | null;
    },
  ) =>
    request<{ workItem: WorkItem }>(`/api/v1/companies/${companyId}/work-items`, {
      method: "POST",
      body: JSON.stringify({ status: "open", ...body }),
    }),
  getWorkItem: (companyId: string, workItemId: string) =>
    request<{ workItem: WorkItem }>(`/api/v1/companies/${companyId}/work-items/${workItemId}`),
  updateWorkItem: (companyId: string, workItemId: string, body: Record<string, unknown>) =>
    request<{ workItem: WorkItem }>(`/api/v1/companies/${companyId}/work-items/${workItemId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  // --- Import ---
  previewImport: (companyId: string, body: { resourceKind: string; filename: string; csvText: string }) =>
    request<{ batch: ImportBatch }>(`/api/v1/companies/${companyId}/imports/preview`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  applyImport: (companyId: string, batchId: string) =>
    request<{ batch: ImportBatch; applied?: number; noop?: number; failed?: number }>(
      `/api/v1/companies/${companyId}/imports/${batchId}/apply`,
      {
        method: "POST",
        body: "{}",
      },
    ),
  getImport: (companyId: string, batchId: string) =>
    request<{ batch: ImportBatch }>(`/api/v1/companies/${companyId}/imports/${batchId}`),

  // --- Integrations (M2) ---
  listConnections: (companyId: string) =>
    request<{
      connections: Array<{
        id: string;
        displayName: string;
        providerKind: "demo" | "microsoft";
        status: string;
        tenantId: string | null;
        lastSuccessAt: string | null;
        lastError: string | null;
        version: number;
      }>;
    }>(`/api/v1/companies/${companyId}/connections`),
  createConnection: (
    companyId: string,
    body: {
      providerKind: "demo" | "microsoft";
      displayName: string;
      tenantId?: string | null;
      credentialRef?: string | null;
      failureMode?: string | null;
    },
  ) =>
    request<{ connection: { id: string } }>(`/api/v1/companies/${companyId}/connections`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  syncConnection: (companyId: string, connectionId: string) =>
    request<{
      sync: {
        runs: Array<{ collection: string; status: string; itemCount: number; error?: string }>;
      };
    }>(`/api/v1/companies/${companyId}/connections/${connectionId}/sync`, {
      method: "POST",
      body: "{}",
    }),
  listSyncRuns: (companyId: string, connectionId?: string) =>
    request<{
      syncRuns: Array<{
        id: string;
        collection: string;
        status: string;
        itemCount: number;
        pageCount: number;
        errorMessage: string | null;
        createdAt: string;
      }>;
    }>(
      connectionId
        ? `/api/v1/companies/${companyId}/connections/${connectionId}/sync-runs`
        : `/api/v1/companies/${companyId}/sync-runs`,
    ),

  listRoleTemplates: () =>
    request<{
      templates: Array<{
        id: string;
        name: string;
        description: string | null;
        currentVersion: { id: string; versionNumber: number; intents: unknown[] } | null;
      }>;
    }>("/api/v1/role-templates"),
  listNotifications: () =>
    request<{
      notifications: Array<{ id: string; title: string; body: string; runId: string | null; createdAt: string }>;
    }>("/api/v1/notifications"),
  listTemplateBindings: (companyId: string, templateId: string) =>
    request<{
      bindings: Array<{ id: string; bindingKey: string; resourceType: string; resourceId: string }>;
    }>(`/api/v1/companies/${companyId}/template-bindings?templateId=${templateId}`),
  listWorkflows: (companyId: string, personId?: string) =>
    request<{
      runs: Array<{
        id: string;
        kind: string;
        status: string;
        personId: string;
        createdAt: string;
        frozenPlan: { issues: Array<{ code: string; message: string }>; steps: unknown[] };
      }>;
    }>(`/api/v1/companies/${companyId}/workflows${personId ? `?personId=${personId}` : ""}`),
  getWorkflow: (companyId: string, runId: string) =>
    request<{
      run: {
        id: string;
        kind: string;
        status: string;
        personId: string;
        frozenPlan: { issues: Array<{ code: string; message: string }>; templateVersionNumber: number | null };
      };
      steps: Array<{
        id: string;
        key: string;
        kind: string;
        executionMethod: string;
        status: string;
        summary: string;
        evidence: string | null;
        error: string | null;
      }>;
    }>(`/api/v1/companies/${companyId}/workflows/${runId}`),
  startWorkflow: (
    companyId: string,
    personId: string,
    body: {
      kind: "onboarding" | "offboarding" | "status_change";
      templateId?: string;
      templateVersionId?: string;
      usageLocation?: string;
      toStatus?: string;
      departureDate?: string | null;
    },
  ) =>
    request<{ run: { id: string; status: string }; plan: { issues: Array<{ message: string }> } }>(
      `/api/v1/companies/${companyId}/people/${personId}/workflows`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  approveWorkflow: (companyId: string, runId: string) =>
    request<{ run: { id: string; status: string } }>(
      `/api/v1/companies/${companyId}/workflows/${runId}/approve`,
      { method: "POST", body: "{}" },
    ),
  executeWorkflow: (companyId: string, runId: string) =>
    request<{ run: { id: string; status: string } }>(
      `/api/v1/companies/${companyId}/workflows/${runId}/execute`,
      { method: "POST", body: "{}" },
    ),
  retryWorkflow: (companyId: string, runId: string) =>
    request<{ run: { id: string; status: string } }>(
      `/api/v1/companies/${companyId}/workflows/${runId}/retry`,
      { method: "POST", body: "{}" },
    ),
  cancelWorkflow: (companyId: string, runId: string) =>
    request<{ run: { id: string; status: string } }>(
      `/api/v1/companies/${companyId}/workflows/${runId}/cancel`,
      { method: "POST", body: "{}" },
    ),
  fulfillWorkflowStep: (companyId: string, runId: string, stepId: string, evidence: string) =>
    request<{ run: { id: string; status: string } }>(
      `/api/v1/companies/${companyId}/workflows/${runId}/steps/${stepId}/fulfill`,
      { method: "POST", body: JSON.stringify({ evidence }) },
    ),

  // --- Incidents (M4) ---
  listIncidents: (companyId: string, params: { status?: string; personId?: string } = {}) =>
    request<{ incidents: Incident[] }>(`/api/v1/companies/${companyId}/incidents${qs(params)}`),
  getIncident: (companyId: string, incidentId: string) =>
    request<IncidentDetail>(`/api/v1/companies/${companyId}/incidents/${incidentId}`),
  createIncident: (companyId: string, body: CreateIncidentBody) =>
    request<{ incident: Incident }>(`/api/v1/companies/${companyId}/incidents`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateIncident: (
    companyId: string,
    incidentId: string,
    body: Partial<{
      version: number;
      title: string;
      reportedSymptom: string;
      impactDescription: string | null;
      severity: IncidentSeverity;
      status: IncidentStatus;
      tags: string[];
      resolutionSummary: string | null;
      resolutionKind: "confirmed_cause" | "unresolved_hypothesis" | null;
    }>,
  ) =>
    request<{ incident: Incident }>(`/api/v1/companies/${companyId}/incidents/${incidentId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  addIncidentResource: (
    companyId: string,
    incidentId: string,
    body: { resourceType: string; resourceId: string; label?: string | null },
  ) =>
    request<{ ok: true }>(`/api/v1/companies/${companyId}/incidents/${incidentId}/resources`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  addInvestigationEntry: (
    companyId: string,
    incidentId: string,
    body: {
      entryKind: InvestigationEntryKind | string;
      body: string;
      occurredAt?: string | null;
      timePrecision?: string;
      linkedEvidenceIds?: string[];
    },
  ) =>
    request<{ entry: InvestigationEntry }>(
      `/api/v1/companies/${companyId}/incidents/${incidentId}/entries`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  uploadIncidentEvidence: (companyId: string, incidentId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return requestFormData<{ evidence: IncidentEvidence }>(
      `/api/v1/companies/${companyId}/incidents/${incidentId}/evidence/upload`,
      form,
    );
  },
  redactEvidence: (companyId: string, incidentId: string, evidenceId: string) =>
    request<{ evidence: IncidentEvidence }>(
      `/api/v1/companies/${companyId}/incidents/${incidentId}/evidence/${evidenceId}/redact`,
      { method: "POST", body: "{}" },
    ),
  evidenceDownloadUrl: (companyId: string, incidentId: string, evidenceId: string) =>
    `/api/v1/companies/${companyId}/incidents/${incidentId}/evidence/${evidenceId}/download`,
  downloadEvidence: (companyId: string, incidentId: string, evidenceId: string) =>
    fetchBlob(
      `/api/v1/companies/${companyId}/incidents/${incidentId}/evidence/${evidenceId}/download`,
    ),
  linkRangerEvents: (
    companyId: string,
    incidentId: string,
    body: { entityType: string; entityId: string; eventIds?: string[] },
  ) =>
    request<{ evidence: IncidentEvidence[] }>(
      `/api/v1/companies/${companyId}/incidents/${incidentId}/evidence/ranger-events`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  dismissRelated: (companyId: string, incidentId: string, suggestionId: string) =>
    request<{ ok: true }>(
      `/api/v1/companies/${companyId}/incidents/${incidentId}/related/${suggestionId}/dismiss`,
      { method: "POST", body: "{}" },
    ),
  linkRelated: (companyId: string, incidentId: string, suggestionId: string) =>
    request<{ ok: true }>(
      `/api/v1/companies/${companyId}/incidents/${incidentId}/related/${suggestionId}/link`,
      { method: "POST", body: "{}" },
    ),
  listProblems: (companyId: string) =>
    request<{ problems: Problem[] }>(`/api/v1/companies/${companyId}/problems`),
  createProblem: (
    companyId: string,
    body: {
      title: string;
      workingCause?: string | null;
      incidentIds: string[];
      permanentFixWorkItemId?: string | null;
    },
  ) =>
    request<{ problem: { id: string; title?: string } }>(`/api/v1/companies/${companyId}/problems`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createIncidentExport: (
    companyId: string,
    incidentId: string,
    body: { evidenceIds: string[]; entryIds?: string[]; excludedFields?: string[] },
  ) =>
    request<{
      export: {
        id: string;
        sha256: string | null;
        byteSize: number;
        createdAt: string;
        downloadPath: string;
      };
      reportMarkdown: string;
    }>(`/api/v1/companies/${companyId}/incidents/${incidentId}/exports`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  incidentExportDownloadUrl: (companyId: string, exportId: string) =>
    `/api/v1/companies/${companyId}/incident-exports/${exportId}/download`,
  listResourceIncidents: (companyId: string, resourceType: string, resourceId: string) =>
    request<{ incidents: Incident[] }>(
      `/api/v1/companies/${companyId}/resources/${resourceType}/${resourceId}/incidents`,
    ),
};

export function canMutateInventory(role: SessionUser["role"]): boolean {
  return role === "admin" || role === "technician";
}

export function canEditProductCatalog(role: SessionUser["role"]): boolean {
  return role === "admin";
}
