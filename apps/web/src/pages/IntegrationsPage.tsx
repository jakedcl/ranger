import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useOutletContext, useParams, useSearchParams } from "react-router";
import type { SessionUser } from "@ranger/contracts";
import { api } from "../lib/api.ts";
import { CompanyScopeGate } from "../lib/scope.tsx";
import { EmptyState, ErrorState, LoadingState } from "../components/ui.tsx";

export function IntegrationsPage() {
  const { user } = useOutletContext<{ user: SessionUser }>();
  const params = useParams();
  const [search] = useSearchParams();
  const companyId = params.companyId ?? search.get("companyId") ?? undefined;
  const queryClient = useQueryClient();
  const canAdmin = user.role === "admin";
  const canSync = user.role === "admin" || user.role === "technician";

  const connections = useQuery({
    queryKey: ["connections", companyId],
    queryFn: () => api.listConnections(companyId!),
    enabled: Boolean(companyId),
  });

  const syncRuns = useQuery({
    queryKey: ["sync-runs", companyId],
    queryFn: () => api.listSyncRuns(companyId!),
    enabled: Boolean(companyId),
  });

  const createDemo = useMutation({
    mutationFn: () =>
      api.createConnection(companyId!, {
        providerKind: "demo",
        displayName: "Harbor demo Microsoft adapter",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["connections", companyId] });
    },
  });

  const syncNow = useMutation({
    mutationFn: (connectionId: string) => api.syncConnection(companyId!, connectionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["connections", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["sync-runs", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["accounts", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["groups", companyId] });
    },
  });

  return (
    <CompanyScopeGate companyId={companyId} action="manage integrations">
      {!companyId ? null : connections.isLoading ? (
        <LoadingState label="Loading connections…" />
      ) : connections.isError ? (
        <ErrorState error={connections.error} />
      ) : (
        <div className="stack">
          <h1>Integrations</h1>
          <div className="banner warn">
            Live Microsoft smoke is blocked until an authorized test tenant is provided. Use the demo
            adapter for fixture-backed sync. Credentials never enter the browser.
          </div>
          <p>
            Company scope: <Link to={`/companies/${companyId}`}>open company</Link>
          </p>

          <section className="panel stack">
            <h2>Connections</h2>
            {(connections.data?.connections ?? []).length === 0 ? (
              <EmptyState>
                No connections yet. Admins can add a demo adapter to exercise sync.
              </EmptyState>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Kind</th>
                      <th>Status</th>
                      <th>Last success</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(connections.data?.connections ?? []).map((connection) => (
                      <tr key={connection.id}>
                        <td>{connection.displayName}</td>
                        <td>
                          <span className="badge demo">{connection.providerKind}</span>
                        </td>
                        <td>{connection.status}</td>
                        <td>{connection.lastSuccessAt ?? "—"}</td>
                        <td>
                          {canSync ? (
                            <button
                              className="button"
                              type="button"
                              disabled={syncNow.isPending}
                              onClick={() => syncNow.mutate(connection.id)}
                            >
                              {syncNow.isPending ? "Syncing…" : "Sync now"}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(connections.data?.connections ?? []).some((c) => c.lastError) ? (
              <div className="banner error">
                Last connection error:{" "}
                {(connections.data?.connections ?? []).find((c) => c.lastError)?.lastError}
              </div>
            ) : null}
            {syncNow.isError ? <ErrorState error={syncNow.error} /> : null}
            {syncNow.data ? (
              <p className="empty">
                Last sync:{" "}
                {syncNow.data.sync.runs
                  .map((run) => `${run.collection}=${run.status}(${run.itemCount})`)
                  .join(", ")}
              </p>
            ) : null}
            {canAdmin ? (
              <div className="actions">
                <button
                  className="button"
                  type="button"
                  disabled={
                    createDemo.isPending ||
                    (connections.data?.connections ?? []).some((c) => c.providerKind === "demo")
                  }
                  onClick={() => createDemo.mutate()}
                >
                  {createDemo.isPending ? "Creating…" : "Add demo Microsoft adapter"}
                </button>
              </div>
            ) : (
              <p className="empty">Only admins can create connections. Technicians can Sync now.</p>
            )}
            {createDemo.isError ? <ErrorState error={createDemo.error} /> : null}
          </section>

          <section className="panel stack">
            <h2>Sync history</h2>
            {syncRuns.isLoading ? <LoadingState label="Loading runs…" /> : null}
            {syncRuns.isError ? <ErrorState error={syncRuns.error} /> : null}
            {(syncRuns.data?.syncRuns ?? []).length === 0 ? (
              <EmptyState>No sync runs yet.</EmptyState>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Collection</th>
                      <th>Status</th>
                      <th>Items</th>
                      <th>Pages</th>
                      <th>Error</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(syncRuns.data?.syncRuns ?? []).map((run) => (
                      <tr key={run.id}>
                        <td>{run.collection}</td>
                        <td>{run.status}</td>
                        <td>{run.itemCount}</td>
                        <td>{run.pageCount}</td>
                        <td>{run.errorMessage ?? "—"}</td>
                        <td>{run.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel stack">
            <h2>Capability guidance</h2>
            <ul>
              <li>
                App-only inventory uses <code>/users</code> (with assignedLicenses) and{" "}
                <code>/subscribedSkus</code> — not <code>/users/{"{id}"}/licenseDetails</code>.
              </li>
              <li>Devices stay manual in M2; Intune permissions are not requested.</li>
              <li>Partial group sync never deletes unobserved memberships.</li>
              <li>Manual subscription pricing stays separate from observed SKU pools.</li>
            </ul>
          </section>
        </div>
      )}
    </CompanyScopeGate>
  );
}
