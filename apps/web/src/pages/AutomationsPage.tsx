import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useOutletContext, useParams } from "react-router";
import type { SessionUser } from "@ranger/contracts";
import { api, canMutateInventory } from "../lib/api.ts";
import { CompanyScopeGate } from "../lib/scope.tsx";
import { EmptyState, ErrorState, LoadingState } from "../components/ui.tsx";
import { formatDate, labelStatus } from "../lib/format.ts";

export function AutomationsPage() {
  const { user } = useOutletContext<{ user: SessionUser }>();
  const { companyId = "" } = useParams();
  const canMutate = canMutateInventory(user.role);
  const templates = useQuery({ queryKey: ["role-templates"], queryFn: api.listRoleTemplates });
  const runs = useQuery({
    queryKey: ["workflows", companyId],
    queryFn: () => api.listWorkflows(companyId),
    enabled: Boolean(companyId),
  });
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: api.listNotifications });

  return (
    <div className="stack">
      <h1>Automations</h1>
      <p>
        Versioned role templates and frozen workflow runs. Editing a template later does not change an already
        approved plan. Live Microsoft writes stay blocked without tenant credentials — demo execution is synthetic.
      </p>
      {!user.automationExecute && user.role === "technician" ? (
        <div className="banner warn">
          Your account can preview and fulfill manual steps, but queued Graph writes will not run until automation
          execute is granted.
        </div>
      ) : null}
      <CompanyScopeGate companyId={companyId} action="manage automations">
        {templates.isLoading || runs.isLoading ? <LoadingState /> : null}
        {templates.isError ? <ErrorState error={templates.error} /> : null}
        {runs.isError ? <ErrorState error={runs.error} /> : null}

        <section className="panel stack">
          <h2>Role templates</h2>
          {(templates.data?.templates ?? []).length === 0 ? (
            <EmptyState>No templates seeded.</EmptyState>
          ) : (
            <ul>
              {(templates.data?.templates ?? []).map((template) => (
                <li key={template.id}>
                  <strong>{template.name}</strong>
                  {template.currentVersion ? ` · v${template.currentVersion.versionNumber}` : ""}
                  {template.description ? ` — ${template.description}` : ""}
                </li>
              ))}
            </ul>
          )}
          {!canMutate ? <p className="empty">Viewers can inspect templates but cannot start runs.</p> : null}
        </section>

        <section className="panel stack">
          <h2>Workflow runs</h2>
          {(runs.data?.runs ?? []).length === 0 ? (
            <EmptyState>No runs yet. Start onboarding or offboarding from a person profile.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Kind</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(runs.data?.runs ?? []).map((run) => (
                    <tr key={run.id}>
                      <td>{labelStatus(run.kind)}</td>
                      <td>{labelStatus(run.status)}</td>
                      <td>{formatDate(run.createdAt)}</td>
                      <td>
                        <Link to={`/companies/${companyId}/workflows/${run.id}`}>Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel stack">
          <h2>Notifications</h2>
          {(notifications.data?.notifications ?? []).length === 0 ? (
            <EmptyState>No in-app notifications.</EmptyState>
          ) : (
            <ul>
              {(notifications.data?.notifications ?? []).map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong> — {item.body}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CompanyScopeGate>
    </div>
  );
}

export function WorkflowRunPage() {
  const { companyId = "", runId = "" } = useParams();
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const canExecute = user.role === "admin" || user.automationExecute;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["workflow", companyId, runId],
    queryFn: () => api.getWorkflow(companyId, runId),
    enabled: Boolean(companyId && runId),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["workflow", companyId, runId] });
    await queryClient.invalidateQueries({ queryKey: ["workflows", companyId] });
  };

  const approve = useMutation({
    mutationFn: () => api.approveWorkflow(companyId, runId),
    onSuccess: invalidate,
  });
  const execute = useMutation({
    mutationFn: () => api.executeWorkflow(companyId, runId),
    onSuccess: invalidate,
  });
  const retry = useMutation({
    mutationFn: () => api.retryWorkflow(companyId, runId),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: () => api.cancelWorkflow(companyId, runId),
    onSuccess: invalidate,
  });
  const fulfill = useMutation({
    mutationFn: ({ stepId, evidence }: { stepId: string; evidence: string }) =>
      api.fulfillWorkflowStep(companyId, runId, stepId, evidence),
    onSuccess: invalidate,
  });
  const createIncidentFromStep = useMutation({
    mutationFn: (step: { key: string; summary: string; error: string | null }) => {
      const personId = detail.data?.run.personId;
      return api.createIncident(companyId, {
        title: `Workflow step failed: ${step.key}`,
        reportedSymptom: step.error ?? step.summary,
        severity: "high",
        workflowRunId: runId,
        workflowStepKey: step.key,
        providerError: step.error,
        affected: [
          ...(personId
            ? [{ resourceType: "person", resourceId: personId, label: "Affected person" }]
            : []),
          {
            resourceType: "workflow_run",
            resourceId: runId,
            label: detail.data?.run.kind ?? "workflow_run",
          },
        ],
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["incidents", companyId] });
      void navigate(`/companies/${companyId}/incidents/${result.incident.id}`);
    },
  });

  if (detail.isLoading) return <LoadingState />;
  if (detail.isError) return <ErrorState error={detail.error} />;
  const run = detail.data?.run;
  const steps = detail.data?.steps ?? [];
  if (!run) return <EmptyState>Run not found.</EmptyState>;

  const doneCount = steps.filter((s) => s.status === "succeeded" || s.status === "skipped").length;
  const mark = (status: string) => {
    if (status === "succeeded" || status === "skipped") return "☑";
    if (status === "failed") return "☒";
    if (status === "awaiting_manual" || status === "running") return "☐";
    return "☐";
  };

  return (
    <div className="stack">
      <p>
        <Link to={`/companies/${companyId}/people/${run.personId}`}>← Person</Link>
        {" · "}
        <Link to={`/companies/${companyId}/automations`}>Automations</Link>
      </p>
      <h1>
        {labelStatus(run.kind)} checklist · {labelStatus(run.status)}
      </h1>
      <p>
        {doneCount}/{steps.length} complete
        {run.frozenPlan.templateVersionNumber != null
          ? ` · frozen template v${run.frozenPlan.templateVersionNumber}`
          : ""}
      </p>
      <p className="empty">
        Work the list top to bottom. Automated steps run when you execute; manual steps need evidence (mailbox,
        distro, invite). Cancel stops remaining work — it does not undo finished steps.
      </p>
      {run.frozenPlan.issues.length > 0 ? (
        <div className="banner warn">
          {run.frozenPlan.issues.map((issue) => issue.message).join(" · ")}
        </div>
      ) : null}
      {canMutate ? (
        <div className="actions">
          {run.status === "preview" ? (
            <button className="button" type="button" onClick={() => approve.mutate()} disabled={approve.isPending}>
              Approve plan
            </button>
          ) : null}
          {canExecute && ["approved", "running", "partial", "failed", "waiting_manual"].includes(run.status) ? (
            <button className="button" type="button" onClick={() => execute.mutate()} disabled={execute.isPending}>
              Run ready automated steps
            </button>
          ) : null}
          {canExecute && (run.status === "failed" || run.status === "partial") ? (
            <button className="button secondary" type="button" onClick={() => retry.mutate()} disabled={retry.isPending}>
              Retry failed
            </button>
          ) : null}
          {run.status !== "canceled" && run.status !== "succeeded" ? (
            <button className="button secondary" type="button" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              Cancel remaining
            </button>
          ) : null}
        </div>
      ) : null}
      {approve.isError ? <ErrorState error={approve.error} /> : null}
      {execute.isError ? <ErrorState error={execute.error} /> : null}
      {retry.isError ? <ErrorState error={retry.error} /> : null}
      {createIncidentFromStep.isError ? <ErrorState error={createIncidentFromStep.error} /> : null}

      <section className="panel stack">
        <h2>Checklist</h2>
        {steps.length === 0 ? (
          <EmptyState>No steps on this plan.</EmptyState>
        ) : (
          <ol className="checklist">
            {steps.map((step, index) => (
              <li key={step.id} className={`checklist-item status-${step.status}`}>
                <div className="checklist-row">
                  <span className="checklist-mark" aria-hidden>
                    {mark(step.status)}
                  </span>
                  <div className="stack" style={{ flex: 1 }}>
                    <strong>
                      {index + 1}. {step.summary}
                    </strong>
                    <span className="empty">
                      {labelStatus(step.executionMethod)}
                      {step.executionMethod === "manual" ? " · operator evidence required" : " · automated"}
                      {" · "}
                      {labelStatus(step.status)}
                    </span>
                    {step.evidence ? <p>{step.evidence}</p> : null}
                    {step.error ? <div className="banner error">{step.error}</div> : null}
                    {canMutate && step.status === "failed" ? (
                      <div className="actions">
                        <button
                          className="button secondary"
                          type="button"
                          disabled={createIncidentFromStep.isPending}
                          onClick={() =>
                            createIncidentFromStep.mutate({
                              key: step.key,
                              summary: step.summary,
                              error: step.error,
                            })
                          }
                        >
                          Create incident
                        </button>
                      </div>
                    ) : null}
                    {canMutate && step.executionMethod === "manual" && step.status === "awaiting_manual" ? (
                      <form
                        className="actions"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const evidence = String(new FormData(event.currentTarget).get("evidence") ?? "");
                          fulfill.mutate({ stepId: step.id, evidence });
                        }}
                      >
                        <input
                          name="evidence"
                          required
                          placeholder="Who / when / method / outcome"
                          style={{ flex: 1, minWidth: 200 }}
                        />
                        <button className="button" type="submit" disabled={fulfill.isPending}>
                          Tick with evidence
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
