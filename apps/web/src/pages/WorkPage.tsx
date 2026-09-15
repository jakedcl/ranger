import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useOutletContext, useParams, useSearchParams } from "react-router";
import type { SessionUser } from "@ranger/contracts";
import { api, canMutateInventory } from "../lib/api.ts";
import { formatDate, labelStatus } from "../lib/format.ts";
import type { WorkItemStatus } from "../lib/inventory-types.ts";
import { CompanyScopeGate, useCompanyId } from "../lib/scope.tsx";
import { EmptyState, ErrorState, LoadingState } from "../components/ui.tsx";

export function WorkPage() {
  const companyId = useCompanyId();
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const work = useQuery({
    queryKey: ["work-items", companyId, status],
    queryFn: () => api.listWorkItems(companyId!, { status: status || undefined }),
    enabled: Boolean(companyId),
  });

  const people = useQuery({
    queryKey: ["people", companyId],
    queryFn: () => api.listPeople(companyId!),
    enabled: Boolean(companyId) && showCreate && canMutate,
  });

  const create = useMutation({
    mutationFn: (body: {
      title: string;
      type: string;
      targetPersonId?: string | null;
      dueDate?: string | null;
      description?: string | null;
    }) => api.createWorkItem(companyId!, body),
    onSuccess: async () => {
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["work-items", companyId] });
    },
  });

  return (
    <div className="stack">
      <h1>Work</h1>
      <p>IT tasks for this company. Lifecycle runs live under Automations.</p>
      <CompanyScopeGate companyId={companyId} action="view and manage work items">
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
                <select name="status" defaultValue={status} aria-label="Filter work by status">
                  <option value="">All</option>
                  {(["open", "in_progress", "blocked", "done", "canceled"] as WorkItemStatus[]).map(
                    (value) => (
                      <option key={value} value={value}>
                        {labelStatus(value)}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <button className="button secondary" type="submit">
                Apply
              </button>
              {canMutate ? (
                <button className="button" type="button" onClick={() => setShowCreate((v) => !v)}>
                  {showCreate ? "Cancel" : "Create work item"}
                </button>
              ) : null}
            </form>

            {showCreate && canMutate ? (
              <form
                className="panel stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  create.mutate({
                    title: String(data.get("title")),
                    type: String(data.get("type")),
                    targetPersonId: String(data.get("targetPersonId") || "") || null,
                    dueDate: String(data.get("dueDate") || "") || null,
                    description: String(data.get("description") || "") || null,
                  });
                }}
              >
                <label className="required">
                  Title
                  <input name="title" required />
                </label>
                <label className="required">
                  Type
                  <input name="type" required placeholder="access_request" />
                </label>
                <label>
                  Target person
                  <select name="targetPersonId" defaultValue="">
                    <option value="">None</option>
                    {(people.data?.people ?? []).map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Due date
                  <input name="dueDate" type="date" />
                </label>
                <label>
                  Description
                  <textarea name="description" rows={3} />
                </label>
                {create.isError ? <ErrorState error={create.error} /> : null}
                <button className="button" type="submit" disabled={create.isPending}>
                  {create.isPending ? "Saving…" : "Create"}
                </button>
              </form>
            ) : null}

            {work.isLoading ? <LoadingState label="Loading work…" /> : null}
            {work.isError ? <ErrorState error={work.error} /> : null}
            {work.data?.workItems.length === 0 ? (
              <EmptyState>No work items. Create a task for access changes or reviews.</EmptyState>
            ) : null}
            {work.data && work.data.workItems.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Target</th>
                      <th>Status</th>
                      <th>Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {work.data.workItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link to={`/companies/${companyId}/work/${item.id}`}>{item.title}</Link>
                        </td>
                        <td>{item.type}</td>
                        <td>
                          {item.targetPersonId ? (
                            <Link to={`/companies/${companyId}/people/${item.targetPersonId}`}>
                              {item.targetPersonName ?? "Person"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{labelStatus(item.status)}</td>
                        <td>{formatDate(item.dueDate)}</td>
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

export function WorkDetailPage() {
  const { companyId = "", workItemId = "" } = useParams();
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["work-item", companyId, workItemId],
    queryFn: () => api.getWorkItem(companyId, workItemId),
    enabled: Boolean(companyId && workItemId),
  });
  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.updateWorkItem(companyId, workItemId, {
        ...body,
        version: detail.data?.workItem.version ?? 1,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["work-item", companyId, workItemId] });
      await queryClient.invalidateQueries({ queryKey: ["work-items", companyId] });
    },
  });

  if (detail.isLoading) return <LoadingState />;
  if (detail.isError) return <ErrorState error={detail.error} />;
  const item = detail.data?.workItem;
  if (!item) return <EmptyState>Work item not found.</EmptyState>;

  return (
    <div className="stack">
      <p>
        <Link to={`/companies/${companyId}/work`}>← Work</Link>
      </p>
      <h1>{item.title}</h1>
      <p>
        {item.type} · {labelStatus(item.status)} · Due {formatDate(item.dueDate)}
      </p>
      <section className="panel">
        <h2>Details</h2>
        <p>{item.description ?? "No description."}</p>
        <p>
          Target:{" "}
          {item.targetPersonId ? (
            <Link to={`/companies/${companyId}/people/${item.targetPersonId}`}>
              {item.targetPersonName ?? item.targetPersonId}
            </Link>
          ) : (
            "—"
          )}
        </p>
        <p>Completion evidence: {item.completionEvidence ?? "—"}</p>
      </section>
      {canMutate ? (
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            update.mutate({
              status: String(data.get("status")),
              completionEvidence: String(data.get("completionEvidence") || "") || null,
            });
          }}
        >
          <h2>Update</h2>
          <label>
            Status
            <select name="status" defaultValue={item.status}>
              {(["open", "in_progress", "blocked", "done", "canceled"] as WorkItemStatus[]).map(
                (value) => (
                  <option key={value} value={value}>
                    {labelStatus(value)}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            Completion evidence
            <textarea name="completionEvidence" rows={3} defaultValue={item.completionEvidence ?? ""} />
          </label>
          {update.isError ? <ErrorState error={update.error} /> : null}
          <button className="button" type="submit" disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </button>
        </form>
      ) : (
        <p className="empty">Viewers cannot update work items.</p>
      )}
    </div>
  );
}
