import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router";
import type { SessionUser } from "@ranger/contracts";
import { api, canMutateInventory, type IncidentSeverity } from "../lib/api.ts";
import { formatDate, formatMoney, labelStatus, personStatusLabel, timingSummary } from "../lib/format.ts";
import type { PersonItStatus } from "../lib/inventory-types.ts";
import { EmptyState, ErrorState, LoadingState, SourceFreshness, Tabs } from "../components/ui.tsx";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "accounts", label: "Accounts & groups" },
  { id: "apps", label: "Apps & subscriptions" },
  { id: "devices", label: "Devices" },
  { id: "work", label: "Work & incidents" },
  { id: "timeline", label: "Timeline" },
] as const;

export function PersonPage() {
  const { companyId = "", personId = "" } = useParams();
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [drawer, setDrawer] = useState<"edit" | "status" | "assign" | "archive" | "onboard" | "offboard" | null>(
    null,
  );
  const [showCreateIncident, setShowCreateIncident] = useState(false);

  const detail = useQuery({
    queryKey: ["person", companyId, personId],
    queryFn: () => api.getPerson(companyId, personId),
    enabled: Boolean(companyId && personId),
  });

  const personIncidents = useQuery({
    queryKey: ["incidents", companyId, "person", personId],
    queryFn: () => api.listIncidents(companyId, { personId }),
    enabled: Boolean(companyId && personId) && tab === "work",
  });

  const createPersonIncident = useMutation({
    mutationFn: (body: {
      title: string;
      reportedSymptom: string;
      severity: IncidentSeverity;
    }) =>
      api.createIncident(companyId, {
        ...body,
        affected: [
          {
            resourceType: "person",
            resourceId: personId,
            label: detail.data?.person.displayName ?? personId,
          },
        ],
      }),
    onSuccess: async (result) => {
      setShowCreateIncident(false);
      await queryClient.invalidateQueries({ queryKey: ["incidents", companyId] });
      void navigate(`/companies/${companyId}/incidents/${result.incident.id}`);
    },
  });

  const readiness = useQuery({
    queryKey: ["archive-readiness", companyId, personId],
    queryFn: () => api.archiveReadiness(companyId, personId),
    enabled: Boolean(companyId && personId) && drawer === "archive",
  });

  const subscriptions = useQuery({
    queryKey: ["subscriptions", companyId],
    queryFn: () => api.listSubscriptions(companyId),
    enabled: Boolean(companyId) && drawer === "assign" && canMutate,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["person", companyId, personId] });
    await queryClient.invalidateQueries({ queryKey: ["people", companyId] });
  };

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.updatePerson(companyId, personId, {
        ...body,
        version: detail.data?.person.version ?? 1,
      }),
    onSuccess: async () => {
      setDrawer(null);
      await invalidate();
    },
  });

  const assign = useMutation({
    mutationFn: (subscriptionId: string) =>
      api.assignSubscription(companyId, subscriptionId, { personId }),
    onSuccess: async () => {
      setDrawer(null);
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["subscriptions", companyId] });
    },
  });

  const templates = useQuery({
    queryKey: ["role-templates"],
    queryFn: api.listRoleTemplates,
    enabled: drawer === "onboard",
  });

  const runs = useQuery({
    queryKey: ["workflows", companyId, personId],
    queryFn: () => api.listWorkflows(companyId, personId),
    enabled: Boolean(companyId && personId),
  });

  const startOnboarding = useMutation({
    mutationFn: (body: { templateId: string; templateVersionId: string }) =>
      api.startWorkflow(companyId, personId, { kind: "onboarding", ...body, usageLocation: "US" }),
    onSuccess: async (result) => {
      setDrawer(null);
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["workflows", companyId] });
      void navigate(`/companies/${companyId}/workflows/${result.run.id}`);
    },
  });
  const startOffboarding = useMutation({
    mutationFn: async (departureDate?: string | null) => {
      if (departureDate) {
        await api.updatePerson(companyId, personId, {
          endDate: departureDate,
          version: detail.data?.person.version ?? 1,
        });
      }
      return api.startWorkflow(companyId, personId, { kind: "offboarding" });
    },
    onSuccess: async (result) => {
      setDrawer(null);
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["workflows", companyId] });
      void navigate(`/companies/${companyId}/workflows/${result.run.id}`);
    },
  });
  const startStatusChange = useMutation({
    mutationFn: (body: { toStatus: PersonItStatus; departureDate?: string | null }) =>
      api.startWorkflow(companyId, personId, {
        kind: "status_change",
        toStatus: body.toStatus,
        departureDate: body.departureDate,
      }),
    onSuccess: async (result) => {
      setDrawer(null);
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["workflows", companyId] });
      void navigate(`/companies/${companyId}/workflows/${result.run.id}`);
    },
  });

  const archive = useMutation({
    mutationFn: () => api.archivePerson(companyId, personId),
    onSuccess: async () => {
      setDrawer(null);
      await invalidate();
    },
  });

  if (detail.isLoading) return <LoadingState label="Loading person…" />;
  if (detail.isError) return <ErrorState error={detail.error} />;
  const data = detail.data;
  if (!data) return <EmptyState>Person not found.</EmptyState>;

  const person = data.person;
  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next);
  };

  return (
    <div className="stack">
      <p>
        <Link to={`/companies/${companyId}/people`}>← People</Link>
      </p>
      <header className="stack">
        <h1>{person.displayName}</h1>
        <p>
          <span className="badge demo">Demo</span> · Manual record · {person.workEmail} ·{" "}
          <span className="badge">{personStatusLabel(person)}</span>
        </p>
        <div className="actions">
          {canMutate ? (
            <>
              <button className="button secondary" type="button" onClick={() => setDrawer("edit")}>
                Edit IT details
              </button>
              <button className="button secondary" type="button" onClick={() => setDrawer("assign")}>
                Assign resource
              </button>
              <button
                className="button secondary"
                type="button"
                data-tour="change-status"
                onClick={() => setDrawer("status")}
              >
                Change status
              </button>
              <button
                className="button secondary"
                type="button"
                data-tour="start-onboarding"
                onClick={() => setDrawer("onboard")}
              >
                Start onboarding
              </button>
              <button className="button secondary" type="button" onClick={() => setDrawer("offboard")}>
                Start offboarding
              </button>
            </>
          ) : (
            <p className="empty">Viewers can inspect inventory but cannot change records.</p>
          )}
          <button className="button secondary" type="button" onClick={() => setDrawer("archive")}>
            View archive readiness
          </button>
        </div>
      </header>

      <Tabs tabs={[...TABS]} active={tab} onChange={setTab} />

      {tab === "overview" ? (
        <section className="panel stack">
          <h2>Overview</h2>
          <p>
            Role: {person.roleTitle ?? "—"} · Department: {person.department ?? "—"} · Sponsor:{" "}
            {person.sponsor ?? "—"}
          </p>
          <p>
            Start: {formatDate(person.startDate)} · End: {formatDate(person.endDate)}
          </p>
          <p className="empty" data-tour="person-timing">
            {timingSummary({ start: person.startDate, end: person.endDate })}
          </p>
          <p>
            Accounts: {data.accounts.length} · Active assignments:{" "}
            {data.assignments.filter((a) => a.status === "active").length} · Open work:{" "}
            {data.workItems.filter((w) => w.status !== "done" && w.status !== "canceled").length}
          </p>
          {data.costSummary && data.costSummary.length > 0 ? (
            <div>
              <h3>Cost summary</h3>
              <ul>
                {data.costSummary.map((row) => (
                  <li key={row.currency}>
                    Assigned share: {formatMoney(row.assignedShare, row.currency)}
                    {row.unknownPrices ? " (includes Unknown prices)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="empty">No cost allocation yet.</p>
          )}
          <h3>Open lifecycle runs</h3>
          {runs.isLoading ? <LoadingState label="Loading runs…" /> : null}
          {runs.isError ? <ErrorState error={runs.error} /> : null}
          {(runs.data?.runs ?? []).filter((r) => !["succeeded", "canceled"].includes(r.status)).length ===
          0 ? (
            <p className="empty">No open onboarding/offboarding/status runs for this person.</p>
          ) : (
            <ul>
              {(runs.data?.runs ?? [])
                .filter((r) => !["succeeded", "canceled"].includes(r.status))
                .map((run) => (
                  <li key={run.id}>
                    <Link to={`/companies/${companyId}/workflows/${run.id}`}>
                      {labelStatus(run.kind)} · {labelStatus(run.status)}
                    </Link>{" "}
                    <span className="empty">{formatDate(run.createdAt)}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "accounts" ? (
        <div className="stack">
          <section className="panel">
            <h2>Accounts</h2>
            {data.accounts.length === 0 ? (
              <EmptyState>No linked accounts. Create manual accounts under Resources.</EmptyState>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Login</th>
                      <th>Kind</th>
                      <th>State</th>
                      <th>Source / freshness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.accounts.map((account) => (
                      <tr key={account.id}>
                        <td>
                          <Link to={`/companies/${companyId}/accounts/${account.id}`}>
                            {account.loginName}
                          </Link>
                        </td>
                        <td>{labelStatus(account.accountKind)}</td>
                        <td>{labelStatus(account.enabledState)}</td>
                        <td>
                          <SourceFreshness
                            source={account.providerSource}
                            lastObservedAt={account.lastObservedAt}
                            freshnessNote={account.freshnessNote}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="panel">
            <h2>Groups</h2>
            {data.groupMemberships.length === 0 ? (
              <EmptyState>No group memberships.</EmptyState>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th>Type</th>
                      <th>Kind</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.groupMemberships.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <Link to={`/companies/${companyId}/groups/${row.groupId}`}>
                            {row.groupName ?? row.groupId}
                          </Link>
                        </td>
                        <td>{row.groupType ? labelStatus(row.groupType) : "—"}</td>
                        <td>{labelStatus(row.membershipKind)}</td>
                        <td>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="panel">
            <h2>Shared mailbox access</h2>
            {data.mailboxAccess.length === 0 ? (
              <EmptyState>No shared mailbox permissions.</EmptyState>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mailbox</th>
                      <th>Permission</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.mailboxAccess.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <Link to={`/companies/${companyId}/mailboxes/${row.mailboxId}`}>
                            {row.mailboxAddress ?? row.mailboxId}
                          </Link>
                        </td>
                        <td>{labelStatus(row.permissionKind)}</td>
                        <td>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === "apps" ? (
        <section className="panel">
          <h2>Apps & subscriptions</h2>
          {data.assignments.length === 0 ? (
            <EmptyState>No license assignments. Use Assign resource to add a seat.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Timing</th>
                    <th>Source</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        {assignment.subscriptionId ? (
                          <Link
                            to={`/companies/${companyId}/subscriptions/${assignment.subscriptionId}`}
                          >
                            {assignment.productName ?? assignment.productId}
                          </Link>
                        ) : (
                          (assignment.productName ?? assignment.productId)
                        )}
                      </td>
                      <td>{labelStatus(assignment.status)}</td>
                      <td>{formatDate(assignment.startEffectiveDate)}</td>
                      <td>{formatDate(assignment.endEffectiveDate)}</td>
                      <td>
                        {timingSummary({
                          start: assignment.startEffectiveDate,
                          end: assignment.endEffectiveDate,
                        })}
                      </td>
                      <td>
                        <SourceFreshness source={assignment.source} />
                      </td>
                      <td>
                        {canMutate &&
                        assignment.status === "active" &&
                        assignment.subscriptionId ? (
                          <EndAssignmentButton
                            companyId={companyId}
                            subscriptionId={assignment.subscriptionId}
                            assignmentId={assignment.id}
                            version={assignment.version}
                            onDone={invalidate}
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === "devices" ? (
        <section className="panel">
          <h2>Devices</h2>
          {data.devices.length === 0 ? (
            <EmptyState>No device assignments.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Issued</th>
                    <th>Returned</th>
                    <th>Status</th>
                    <th>Custody</th>
                  </tr>
                </thead>
                <tbody>
                  {data.devices.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link to={`/companies/${companyId}/devices/${row.deviceId}`}>
                          {row.device?.hostname ??
                            row.device?.assetTag ??
                            row.device?.serial ??
                            row.deviceId}
                        </Link>
                      </td>
                      <td>{formatDate(row.issuedAt)}</td>
                      <td>{formatDate(row.returnedAt)}</td>
                      <td>{row.status}</td>
                      <td>{row.custodyDisposition ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === "work" ? (
        <div className="stack">
          <section className="panel">
            <h2>Work</h2>
            {data.workItems.length === 0 ? (
              <EmptyState>No linked work items.</EmptyState>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.workItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link to={`/companies/${companyId}/work/${item.id}`}>{item.title}</Link>
                        </td>
                        <td>{item.type}</td>
                        <td>{labelStatus(item.status)}</td>
                        <td>{formatDate(item.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="panel stack">
            <h2>Incidents</h2>
            <div className="actions">
              {canMutate ? (
                <button
                  className="button"
                  type="button"
                  onClick={() => setShowCreateIncident((v) => !v)}
                >
                  {showCreateIncident ? "Cancel" : "Create incident"}
                </button>
              ) : null}
            </div>
            {showCreateIncident && canMutate ? (
              <form
                className="stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  createPersonIncident.mutate({
                    title: String(form.get("title")),
                    reportedSymptom: String(form.get("reportedSymptom")),
                    severity: String(form.get("severity")) as IncidentSeverity,
                  });
                }}
              >
                <label className="required">
                  Title
                  <input name="title" required />
                </label>
                <label className="required">
                  Reported symptom
                  <textarea name="reportedSymptom" rows={3} required />
                </label>
                <label>
                  Severity
                  <select name="severity" defaultValue="medium">
                    {(["low", "medium", "high", "critical"] as IncidentSeverity[]).map((value) => (
                      <option key={value} value={value}>
                        {labelStatus(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="empty">This person will be linked as an affected resource.</p>
                {createPersonIncident.isError ? (
                  <ErrorState error={createPersonIncident.error} />
                ) : null}
                <button className="button" type="submit" disabled={createPersonIncident.isPending}>
                  {createPersonIncident.isPending ? "Saving…" : "Create"}
                </button>
              </form>
            ) : null}
            {personIncidents.isLoading ? <LoadingState label="Loading incidents…" /> : null}
            {personIncidents.isError ? <ErrorState error={personIncidents.error} /> : null}
            {personIncidents.data?.incidents.length === 0 ? (
              <EmptyState>No incidents linked to this person.</EmptyState>
            ) : null}
            {personIncidents.data && personIncidents.data.incidents.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personIncidents.data.incidents.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link to={`/companies/${companyId}/incidents/${item.id}`}>{item.title}</Link>
                        </td>
                        <td>{labelStatus(item.severity)}</td>
                        <td>{labelStatus(item.status)}</td>
                        <td>{formatDate(item.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {tab === "timeline" ? (
        <section className="panel">
          <h2>Timeline</h2>
          {data.timeline.length === 0 ? (
            <EmptyState>No timeline events yet.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Recorded</th>
                    <th>Kind</th>
                    <th>Summary</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data.timeline.map((event) => (
                    <tr key={event.id}>
                      <td>{formatDate(event.recordedAt)}</td>
                      <td>{labelStatus(event.eventKind)}</td>
                      <td>{event.summary}</td>
                      <td>
                        <SourceFreshness source={event.source} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {drawer === "edit" && canMutate ? (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            patch.mutate({
              displayName: String(form.get("displayName")),
              workEmail: String(form.get("workEmail")),
              roleTitle: String(form.get("roleTitle") || "") || null,
              department: String(form.get("department") || "") || null,
              sponsor: String(form.get("sponsor") || "") || null,
              startDate: String(form.get("startDate") || "") || null,
              endDate: String(form.get("endDate") || "") || null,
            });
          }}
        >
          <h2>Edit IT details</h2>
          <label className="required">
            Display name
            <input name="displayName" defaultValue={person.displayName} required />
          </label>
          <label className="required">
            Work email
            <input name="workEmail" type="email" defaultValue={person.workEmail} required />
          </label>
          <label>
            Role
            <input name="roleTitle" defaultValue={person.roleTitle ?? ""} />
          </label>
          <label>
            Department
            <input name="department" defaultValue={person.department ?? ""} />
          </label>
          <label>
            Sponsor
            <input name="sponsor" defaultValue={person.sponsor ?? ""} />
          </label>
          <label>
            Start date
            <input name="startDate" type="date" defaultValue={person.startDate ?? ""} />
          </label>
          <label>
            End date
            <input name="endDate" type="date" defaultValue={person.endDate ?? ""} />
          </label>
          {patch.isError ? <ErrorState error={patch.error} /> : null}
          <div className="actions">
            <button className="button" type="submit" disabled={patch.isPending}>
              {patch.isPending ? "Saving…" : "Save"}
            </button>
            <button className="button secondary" type="button" onClick={() => setDrawer(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {drawer === "status" && canMutate ? (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const toStatus = String(form.get("itStatus")) as PersonItStatus;
            const departureDate = String(form.get("departureDate") || "") || null;
            if (toStatus === "departed") {
              startOffboarding.mutate(departureDate);
              return;
            }
            startStatusChange.mutate({ toStatus, departureDate });
          }}
        >
          <h2>Change status</h2>
          <p className="empty">
            Creates a frozen checklist run. Choosing Departed opens the full offboarding checklist so cleanup stays
            visible while status shows Departed after approve.
          </p>
          <label>
            IT status
            <select name="itStatus" defaultValue={person.itStatus}>
              {(["planned", "active", "on_leave", "departed"] as const).map((value) => (
                <option key={value} value={value}>
                  {labelStatus(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Departure / review date (optional)
            <input name="departureDate" type="date" defaultValue={person.endDate ?? ""} />
          </label>
          <p className="empty">Archived is separate — use archive readiness after offboarding obligations clear.</p>
          {startStatusChange.isError ? <ErrorState error={startStatusChange.error} /> : null}
          {startOffboarding.isError ? <ErrorState error={startOffboarding.error} /> : null}
          <div className="actions">
            <button
              className="button"
              type="submit"
              disabled={startStatusChange.isPending || startOffboarding.isPending}
            >
              {startStatusChange.isPending || startOffboarding.isPending ? "Opening…" : "Preview checklist"}
            </button>
            <button className="button secondary" type="button" onClick={() => setDrawer(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {drawer === "assign" && canMutate ? (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            assign.mutate(String(form.get("subscriptionId")));
          }}
        >
          <h2>Assign subscription seat</h2>
          {subscriptions.isLoading ? <LoadingState /> : null}
          {subscriptions.isError ? <ErrorState error={subscriptions.error} /> : null}
          <label className="required">
            Company subscription
            <select name="subscriptionId" required defaultValue="">
              <option value="" disabled>
                Select…
              </option>
              {(subscriptions.data?.subscriptions ?? [])
                .filter((sub) => sub.state === "active")
                .map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.productName ?? sub.productId} · {sub.purchasedQuantity} seats
                    {sub.availableCapacity != null ? ` · ${sub.availableCapacity} available` : ""}
                  </option>
                ))}
            </select>
          </label>
          {assign.isError ? <ErrorState error={assign.error} /> : null}
          <div className="actions">
            <button className="button" type="submit" disabled={assign.isPending}>
              {assign.isPending ? "Assigning…" : "Assign"}
            </button>
            <button className="button secondary" type="button" onClick={() => setDrawer(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {drawer === "archive" ? (
        <section className="panel stack">
          <h2>Archive readiness</h2>
          {readiness.isLoading ? <LoadingState label="Checking archive gate…" /> : null}
          {readiness.isError ? <ErrorState error={readiness.error} /> : null}
          {readiness.data ? (
            readiness.data.ready ? (
              <>
                <p>Ready to archive. This closes the active person record while preserving history.</p>
                {canMutate ? (
                  <div className="actions">
                    <button
                      className="button danger"
                      type="button"
                      disabled={archive.isPending || Boolean(person.archivedAt)}
                      onClick={() => archive.mutate()}
                    >
                      {archive.isPending ? "Archiving…" : "Archive person"}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="banner warn">
                  Archive is disabled until blockers are resolved.
                </div>
                <ul>
                  {readiness.data.blockers.map((blocker) => (
                    <li key={`${blocker.code}-${blocker.targetId ?? ""}`}>
                      {blocker.message}
                    </li>
                  ))}
                </ul>
                <button className="button" type="button" disabled>
                  Archive person
                </button>
              </>
            )
          ) : null}
          {archive.isError ? <ErrorState error={archive.error} /> : null}
          <div className="actions">
            <button className="button secondary" type="button" onClick={() => setDrawer(null)}>
              Close
            </button>
          </div>
        </section>
      ) : null}

      {drawer === "onboard" && canMutate ? (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const templateId = String(form.get("templateId"));
            const template = templates.data?.templates.find((item) => item.id === templateId);
            if (!template?.currentVersion) return;
            startOnboarding.mutate({
              templateId: template.id,
              templateVersionId: template.currentVersion.id,
            });
          }}
        >
          <h2>Onboarding preview</h2>
          <p>Select a role template. Company bindings map intents to Harbor groups and subscriptions.</p>
          {templates.isLoading ? <LoadingState /> : null}
          <label className="required">
            Role template
            <select name="templateId" required defaultValue="">
              <option value="" disabled>
                Select…
              </option>
              {(templates.data?.templates ?? []).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.currentVersion ? ` (v${template.currentVersion.versionNumber})` : ""}
                </option>
              ))}
            </select>
          </label>
          {startOnboarding.isError ? <ErrorState error={startOnboarding.error} /> : null}
          <div className="actions">
            <button className="button" type="submit" disabled={startOnboarding.isPending}>
              Preview plan
            </button>
            <button className="button secondary" type="button" onClick={() => setDrawer(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {drawer === "offboard" && canMutate ? (
        <section className="panel stack">
          <h2>Offboarding preview</h2>
          <p>
            Recording Departed is visible immediately even if cleanup is incomplete. Account deletion is not a
            routine step.
          </p>
          {startOffboarding.isError ? <ErrorState error={startOffboarding.error} /> : null}
          <div className="actions">
            <button
              className="button"
              type="button"
              disabled={startOffboarding.isPending}
              onClick={() => startOffboarding.mutate()}
            >
              Preview offboarding plan
            </button>
            <button className="button secondary" type="button" onClick={() => setDrawer(null)}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function EndAssignmentButton({
  companyId,
  subscriptionId,
  assignmentId,
  version,
  onDone,
}: {
  companyId: string;
  subscriptionId: string;
  assignmentId: string;
  version: number;
  onDone: () => Promise<void>;
}) {
  const mutation = useMutation({
    mutationFn: () =>
      api.endAssignment(companyId, subscriptionId, assignmentId, { version }),
    onSuccess: onDone,
  });
  return (
    <>
      <button
        className="button secondary"
        type="button"
        disabled={mutation.isPending}
        onClick={() => {
          if (window.confirm("Record manual seat removal? The purchased subscription remains.")) {
            mutation.mutate();
          }
        }}
      >
        {mutation.isPending ? "Ending…" : "End assignment"}
      </button>
      {mutation.isError ? <ErrorState error={mutation.error} /> : null}
    </>
  );
}
