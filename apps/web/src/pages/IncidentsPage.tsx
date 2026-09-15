import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router";
import type { SessionUser } from "@ranger/contracts";
import {
  api,
  canMutateInventory,
  triggerDownload,
  type IncidentSeverity,
  type IncidentStatus,
  type InvestigationEntryKind,
} from "../lib/api.ts";
import { formatDate, labelStatus } from "../lib/format.ts";
import { CompanyScopeGate, useCompanyId } from "../lib/scope.tsx";
import { EmptyState, ErrorState, LoadingState } from "../components/ui.tsx";

const STATUSES: IncidentStatus[] = ["open", "investigating", "waiting", "resolved", "closed"];
const SEVERITIES: IncidentSeverity[] = ["low", "medium", "high", "critical"];
const ENTRY_KINDS: InvestigationEntryKind[] = [
  "observation",
  "hypothesis",
  "action",
  "result",
  "note",
];
const EVIDENCE_ACCEPT = ".txt,.log,.json,.jsonl,.csv,.png,.jpg,.jpeg";

function parsedSummaryText(summary: unknown): string | null {
  if (summary == null) return null;
  if (typeof summary === "string") return summary;
  try {
    return JSON.stringify(summary, null, 2);
  } catch {
    return String(summary);
  }
}

export function IncidentsPage() {
  const companyId = useCompanyId();
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const list = useQuery({
    queryKey: ["incidents", companyId, status],
    queryFn: () => api.listIncidents(companyId!, { status: status || undefined }),
    enabled: Boolean(companyId),
  });

  const create = useMutation({
    mutationFn: (body: {
      title: string;
      reportedSymptom: string;
      severity: IncidentSeverity;
      tags: string[];
    }) => api.createIncident(companyId!, body),
    onSuccess: async (result) => {
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["incidents", companyId] });
      void navigate(`/companies/${companyId}/incidents/${result.incident.id}`);
    },
  });

  return (
    <div className="stack">
      <h1>Incidents</h1>
      <p>
        Investigations with private evidence, timeline notes, related suggestions, and escalation export. Packages stay
        operator-only — not a client portal.
      </p>
      <CompanyScopeGate companyId={companyId} action="view and manage incidents">
        {companyId ? (
          <>
            <form
              className="toolbar"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const next = new URLSearchParams(params);
                next.set("status", String(data.get("status") ?? ""));
                setParams(next);
              }}
            >
              <label>
                Status
                <select name="status" defaultValue={status} aria-label="Filter incidents by status">
                  <option value="">All</option>
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {labelStatus(value)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button secondary" type="submit">
                Apply
              </button>
              {canMutate ? (
                <button className="button" type="button" onClick={() => setShowCreate((v) => !v)}>
                  {showCreate ? "Cancel" : "Create incident"}
                </button>
              ) : null}
            </form>

            {showCreate && canMutate ? (
              <form
                className="panel stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  const tags = String(data.get("tags") || "")
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                  create.mutate({
                    title: String(data.get("title")),
                    reportedSymptom: String(data.get("reportedSymptom")),
                    severity: String(data.get("severity")) as IncidentSeverity,
                    tags,
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
                    {SEVERITIES.map((value) => (
                      <option key={value} value={value}>
                        {labelStatus(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tags
                  <input name="tags" placeholder="comma-separated" />
                </label>
                {create.isError ? <ErrorState error={create.error} /> : null}
                <button className="button" type="submit" disabled={create.isPending}>
                  {create.isPending ? "Saving…" : "Create"}
                </button>
              </form>
            ) : null}

            {list.isLoading ? <LoadingState label="Loading incidents…" /> : null}
            {list.isError ? <ErrorState error={list.error} /> : null}
            {list.data?.incidents.length === 0 ? (
              <EmptyState>No incidents yet. Create one from a failed workflow step or manually.</EmptyState>
            ) : null}
            {list.data && list.data.incidents.length > 0 ? (
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
                    {list.data.incidents.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link
                            to={`/companies/${companyId}/incidents/${item.id}`}
                            data-tour={`incident-${item.id}`}
                          >
                            {item.title}
                          </Link>
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
          </>
        ) : null}
      </CompanyScopeGate>
    </div>
  );
}

export function IncidentDetailPage() {
  const { companyId = "", incidentId = "" } = useParams();
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const canExport = user.role === "admin" || user.role === "technician";
  const queryClient = useQueryClient();
  const [exportEvidenceIds, setExportEvidenceIds] = useState<Set<string>>(new Set());
  const [exportEntryIds, setExportEntryIds] = useState<Set<string>>(new Set());
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ["incident", companyId, incidentId],
    queryFn: () => api.getIncident(companyId, incidentId),
    enabled: Boolean(companyId && incidentId),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["incident", companyId, incidentId] });
    await queryClient.invalidateQueries({ queryKey: ["incidents", companyId] });
  };

  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.updateIncident(companyId, incidentId, {
        ...body,
        version: detail.data?.incident.version ?? 1,
      }),
    onSuccess: invalidate,
  });

  const addResource = useMutation({
    mutationFn: (body: { resourceType: string; resourceId: string; label?: string | null }) =>
      api.addIncidentResource(companyId, incidentId, body),
    onSuccess: invalidate,
  });

  const addEntry = useMutation({
    mutationFn: (body: {
      entryKind: string;
      body: string;
      occurredAt?: string | null;
      timePrecision?: string;
    }) => api.addInvestigationEntry(companyId, incidentId, body),
    onSuccess: invalidate,
  });

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadIncidentEvidence(companyId, incidentId, file),
    onSuccess: invalidate,
  });

  const redact = useMutation({
    mutationFn: (evidenceId: string) => api.redactEvidence(companyId, incidentId, evidenceId),
    onSuccess: invalidate,
  });

  const dismissRelated = useMutation({
    mutationFn: (suggestionId: string) => api.dismissRelated(companyId, incidentId, suggestionId),
    onSuccess: invalidate,
  });

  const linkRelated = useMutation({
    mutationFn: (suggestionId: string) => api.linkRelated(companyId, incidentId, suggestionId),
    onSuccess: invalidate,
  });

  const createProblem = useMutation({
    mutationFn: (body: { title: string; workingCause?: string | null; incidentIds: string[] }) =>
      api.createProblem(companyId, body),
    onSuccess: invalidate,
  });

  const createExport = useMutation({
    mutationFn: () =>
      api.createIncidentExport(companyId, incidentId, {
        evidenceIds: [...exportEvidenceIds],
        entryIds: exportEntryIds.size ? [...exportEntryIds] : undefined,
      }),
    onSuccess: async (result) => {
      setLastExportPath(result.export.downloadPath);
      await triggerDownload(result.export.downloadPath, `incident-export-${result.export.id}.zip`);
    },
  });

  const linkedIncidentIds = useMemo(() => {
    const linked = (detail.data?.related ?? [])
      .filter((r) => r.status === "linked")
      .map((r) => r.suggestedIncidentId);
    return [incidentId, ...linked];
  }, [detail.data?.related, incidentId]);

  if (detail.isLoading) return <LoadingState label="Loading incident…" />;
  if (detail.isError) return <ErrorState error={detail.error} />;
  const data = detail.data;
  if (!data) return <EmptyState>Incident not found.</EmptyState>;

  const { incident, affectedResources, evidence, entries, related, problems } = data;
  const pendingRelated = related.filter((r) => r.status === "suggested");
  const linkedRelated = related.filter((r) => r.status === "linked");

  const toggleId = (set: Set<string>, id: string, next: boolean) => {
    const copy = new Set(set);
    if (next) copy.add(id);
    else copy.delete(id);
    return copy;
  };

  return (
    <div className="stack">
      <p>
        <Link to={`/companies/${companyId}/incidents`}>← Incidents</Link>
      </p>
      <h1>{incident.title}</h1>
      <p>
        {labelStatus(incident.severity)} · {labelStatus(incident.status)} · Updated{" "}
        {formatDate(incident.updatedAt)}
      </p>
      {incident.providerError ? <div className="banner warn">{incident.providerError}</div> : null}
      {incident.workflowRunId ? (
        <p>
          From workflow{" "}
          <Link to={`/companies/${companyId}/workflows/${incident.workflowRunId}`}>
            {incident.workflowRunId}
          </Link>
          {incident.workflowStepKey ? ` · step ${incident.workflowStepKey}` : ""}
        </p>
      ) : null}

      <section className="panel stack">
        <h2>Symptom</h2>
        <p>{incident.reportedSymptom}</p>
        {incident.impactDescription ? <p>{incident.impactDescription}</p> : null}
        {incident.tags.length > 0 ? <p className="empty">Tags: {incident.tags.join(", ")}</p> : null}
      </section>

      {canMutate ? (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            update.mutate({
              status: String(form.get("status")),
              severity: String(form.get("severity")),
              resolutionSummary: String(form.get("resolutionSummary") || "") || null,
              resolutionKind: String(form.get("resolutionKind") || "") || null,
            });
          }}
        >
          <h2>Status & severity</h2>
          <label>
            Status
            <select name="status" defaultValue={incident.status}>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {labelStatus(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Severity
            <select name="severity" defaultValue={incident.severity}>
              {SEVERITIES.map((value) => (
                <option key={value} value={value}>
                  {labelStatus(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Resolution kind
            <select name="resolutionKind" defaultValue={incident.resolutionKind ?? ""}>
              <option value="">None</option>
              <option value="confirmed_cause">Confirmed cause</option>
              <option value="unresolved_hypothesis">Unresolved hypothesis</option>
            </select>
          </label>
          <label>
            Resolution summary
            <textarea
              name="resolutionSummary"
              rows={2}
              defaultValue={incident.resolutionSummary ?? ""}
            />
          </label>
          {update.isError ? <ErrorState error={update.error} /> : null}
          <button className="button" type="submit" disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </button>
        </form>
      ) : (
        <p className="empty">Viewers cannot update incidents.</p>
      )}

      <section className="panel stack">
        <h2>Affected resources</h2>
        {affectedResources.length === 0 ? <EmptyState>No affected resources linked.</EmptyState> : null}
        {affectedResources.length > 0 ? (
          <ul>
            {affectedResources.map((row) => (
              <li key={row.id}>
                {row.resourceType}: {row.label ?? row.resourceId}
                {row.resourceType === "person" ? (
                  <>
                    {" "}
                    <Link to={`/companies/${companyId}/people/${row.resourceId}`}>Open</Link>
                  </>
                ) : null}
                {row.resourceType === "workflow_run" ? (
                  <>
                    {" "}
                    <Link to={`/companies/${companyId}/workflows/${row.resourceId}`}>Open</Link>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {canMutate ? (
          <form
            className="actions"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              addResource.mutate({
                resourceType: String(form.get("resourceType")),
                resourceId: String(form.get("resourceId")),
                label: String(form.get("label") || "") || null,
              });
              event.currentTarget.reset();
            }}
          >
            <select name="resourceType" defaultValue="person" aria-label="Resource type">
              <option value="person">person</option>
              <option value="account">account</option>
              <option value="device">device</option>
              <option value="group">group</option>
              <option value="subscription">subscription</option>
              <option value="workflow_run">workflow_run</option>
            </select>
            <input name="resourceId" required placeholder="Resource id" />
            <input name="label" placeholder="Label (optional)" />
            <button className="button secondary" type="submit" disabled={addResource.isPending}>
              Add
            </button>
          </form>
        ) : null}
        {addResource.isError ? <ErrorState error={addResource.error} /> : null}
      </section>

      <section className="panel stack">
        <h2>Evidence</h2>
        {evidence.length === 0 ? <EmptyState>No evidence uploaded yet.</EmptyState> : null}
        {evidence.map((item) => {
          const summaryText = parsedSummaryText(item.parsedSummary);
          return (
            <div key={item.id} className="stack" style={{ marginBottom: "1rem" }}>
              <p>
                <strong>{item.sourceLabel}</strong>
                {item.originalFilename ? ` · ${item.originalFilename}` : ""}
                {item.isRedacted ? " · redacted" : ""}
                {item.byteSize != null ? ` · ${item.byteSize} bytes` : ""}
              </p>
              {(item.parseWarnings ?? []).length > 0 ? (
                <div className="banner warn">
                  Parse warnings: {(item.parseWarnings ?? []).join(" · ")}
                </div>
              ) : null}
              {summaryText ? (
                <pre className="empty" style={{ whiteSpace: "pre-wrap", overflow: "auto" }}>
                  {summaryText}
                </pre>
              ) : null}
              <div className="actions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() =>
                    void triggerDownload(
                      api.evidenceDownloadUrl(companyId, incidentId, item.id),
                      item.originalFilename ?? "evidence",
                    )
                  }
                >
                  Download
                </button>
                {canMutate && !item.isRedacted && item.kind !== "redacted_derivative" ? (
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => redact.mutate(item.id)}
                    disabled={redact.isPending}
                  >
                    Create redacted copy
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {canMutate ? (
          <form
            className="actions"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const file = form.get("file");
              if (file instanceof File && file.size > 0) {
                upload.mutate(file);
                event.currentTarget.reset();
              }
            }}
          >
            <input name="file" type="file" accept={EVIDENCE_ACCEPT} required />
            <button className="button" type="submit" disabled={upload.isPending}>
              {upload.isPending ? "Uploading…" : "Upload evidence"}
            </button>
          </form>
        ) : null}
        {upload.isError ? <ErrorState error={upload.error} /> : null}
        {redact.isError ? <ErrorState error={redact.error} /> : null}
      </section>

      <section className="panel stack">
        <h2>Investigation timeline</h2>
        {entries.length === 0 ? <EmptyState>No investigation entries yet.</EmptyState> : null}
        {entries.length > 0 ? (
          <ol>
            {entries.map((entry) => (
              <li key={entry.id} style={{ marginBottom: "0.75rem" }}>
                <strong>{labelStatus(entry.entryKind)}</strong>
                <span className="empty">
                  {" "}
                  · {entry.timePrecision ?? "unknown"}
                  {entry.occurredAt ? ` · ${formatDate(entry.occurredAt)}` : ""}
                  {" · "}
                  {formatDate(entry.createdAt)}
                </span>
                <pre style={{ whiteSpace: "pre-wrap", margin: "0.25rem 0 0" }}>{entry.body}</pre>
              </li>
            ))}
          </ol>
        ) : null}
        {canMutate ? (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              addEntry.mutate({
                entryKind: String(form.get("entryKind")),
                body: String(form.get("body")),
                occurredAt: String(form.get("occurredAt") || "") || null,
                timePrecision: String(form.get("timePrecision") || "unknown"),
              });
              event.currentTarget.reset();
            }}
          >
            <label>
              Kind
              <select name="entryKind" defaultValue="observation">
                {ENTRY_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {labelStatus(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="required">
              Body
              <textarea name="body" rows={3} required />
            </label>
            <label>
              Occurred at
              <input name="occurredAt" type="datetime-local" />
            </label>
            <label>
              Time precision
              <select name="timePrecision" defaultValue="unknown">
                <option value="exact">exact</option>
                <option value="approx">approx</option>
                <option value="unknown">unknown</option>
              </select>
            </label>
            {addEntry.isError ? <ErrorState error={addEntry.error} /> : null}
            <button className="button" type="submit" disabled={addEntry.isPending}>
              {addEntry.isPending ? "Saving…" : "Add entry"}
            </button>
          </form>
        ) : null}
      </section>

      <section className="panel stack">
        <h2 data-tour="incident-related">Related suggestions</h2>
        <p className="empty">
          Scores are suggestions only — temporal correlation is not root cause. Dismiss noise or link confirmed
          relatives.
        </p>
        {pendingRelated.length === 0 && linkedRelated.length === 0 ? (
          <EmptyState>No related suggestions yet. Upload evidence or add overlapping resources.</EmptyState>
        ) : null}
        {pendingRelated.map((row) => (
          <div key={row.id} className="stack" style={{ marginBottom: "0.75rem" }}>
            <p>
              <Link to={`/companies/${companyId}/incidents/${row.suggestedIncidentId}`}>
                {row.title ?? row.suggestedIncidentId}
              </Link>{" "}
              <span className="empty">score {row.score}</span>
            </p>
            <ul>
              {(row.reasons ?? []).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            {canMutate ? (
              <div className="actions">
                <button
                  className="button"
                  type="button"
                  onClick={() => linkRelated.mutate(row.id)}
                  disabled={linkRelated.isPending}
                >
                  Link
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => dismissRelated.mutate(row.id)}
                  disabled={dismissRelated.isPending}
                >
                  Dismiss
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {linkedRelated.length > 0 ? (
          <>
            <h3>Linked</h3>
            <ul>
              {linkedRelated.map((row) => (
                <li key={row.id}>
                  <Link to={`/companies/${companyId}/incidents/${row.suggestedIncidentId}`}>
                    {row.title ?? row.suggestedIncidentId}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {linkRelated.isError ? <ErrorState error={linkRelated.error} /> : null}
        {dismissRelated.isError ? <ErrorState error={dismissRelated.error} /> : null}

        {canMutate && linkedRelated.length > 0 ? (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              createProblem.mutate({
                title: String(form.get("title")),
                workingCause: String(form.get("workingCause") || "") || null,
                incidentIds: linkedIncidentIds,
              });
              event.currentTarget.reset();
            }}
          >
            <h3>Create Problem from linked incidents</h3>
            <label className="required">
              Title
              <input name="title" required />
            </label>
            <label>
              Working cause
              <textarea name="workingCause" rows={2} />
            </label>
            <p className="empty">Includes this incident plus {linkedRelated.length} linked relative(s).</p>
            {createProblem.isError ? <ErrorState error={createProblem.error} /> : null}
            <button className="button" type="submit" disabled={createProblem.isPending}>
              {createProblem.isPending ? "Creating…" : "Create Problem"}
            </button>
          </form>
        ) : null}
        {problems.length > 0 ? (
          <ul>
            {problems.map((problem) => (
              <li key={problem.id}>
                Problem: {problem.title} · {labelStatus(problem.status)}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {canExport ? (
        <section className="panel stack">
          <h2>Escalation export</h2>
          <p className="empty">
            Pick evidence and timeline entries. Prefer redacted derivatives — raw originals are dropped when a redacted
            twin is also selected.
          </p>
          <h3>Evidence</h3>
          {evidence.length === 0 ? <EmptyState>Upload evidence before exporting.</EmptyState> : null}
          {evidence.map((item) => (
            <label key={item.id} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={exportEvidenceIds.has(item.id)}
                onChange={(event) =>
                  setExportEvidenceIds((prev) => toggleId(prev, item.id, event.target.checked))
                }
              />{" "}
              {item.originalFilename ?? item.sourceLabel}
              {item.isRedacted ? " (redacted)" : ""}
            </label>
          ))}
          <h3>Timeline entries</h3>
          {entries.map((entry) => (
            <label key={entry.id} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={exportEntryIds.has(entry.id)}
                onChange={(event) =>
                  setExportEntryIds((prev) => toggleId(prev, entry.id, event.target.checked))
                }
              />{" "}
              {labelStatus(entry.entryKind)} — {entry.body.slice(0, 80)}
              {entry.body.length > 80 ? "…" : ""}
            </label>
          ))}
          {createExport.isError ? <ErrorState error={createExport.error} /> : null}
          <div className="actions">
            <button
              className="button"
              type="button"
              disabled={createExport.isPending || exportEvidenceIds.size === 0}
              onClick={() => createExport.mutate()}
            >
              {createExport.isPending ? "Generating…" : "Generate ZIP"}
            </button>
            {lastExportPath ? (
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  void triggerDownload(lastExportPath, `incident-export-${incidentId}.zip`)
                }
              >
                Re-download last package
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
