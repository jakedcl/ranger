import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router";
import type { SessionUser } from "@ranger/contracts";
import { api, canMutateInventory } from "../lib/api.ts";
import { personStatusLabel } from "../lib/format.ts";
import type { PersonItStatus } from "../lib/inventory-types.ts";
import { CompanyScopeGate, useCompanyId } from "../lib/scope.tsx";
import { EmptyState, ErrorState, LoadingState } from "../components/ui.tsx";

const STATUSES: Array<PersonItStatus | ""> = ["", "planned", "active", "on_leave", "departed"];

export function PeoplePage() {
  const companyId = useCompanyId();
  const { user } = useOutletContext<{ user: SessionUser }>();
  const canMutate = canMutateInventory(user.role);
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const status = (params.get("status") ?? "") as PersonItStatus | "";
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const people = useQuery({
    queryKey: ["people", companyId, q, status],
    queryFn: () => api.listPeople(companyId!, { q, status }),
    enabled: Boolean(companyId),
  });

  const create = useMutation({
    mutationFn: (body: { displayName: string; workEmail: string; itStatus: PersonItStatus }) =>
      api.createPerson(companyId!, body),
    onSuccess: async () => {
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["people", companyId] });
    },
  });

  return (
    <div className="stack">
      <h1>People</h1>
      <CompanyScopeGate companyId={companyId} action="view and manage people">
        {companyId ? (
          <>
            <form
              className="toolbar"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const next = new URLSearchParams(params);
                next.set("q", String(data.get("q") ?? ""));
                next.set("status", String(data.get("status") ?? ""));
                setParams(next);
              }}
            >
              <label>
                Search
                <input name="q" defaultValue={q} placeholder="Name or email" aria-label="Search people" />
              </label>
              <label>
                Status
                <select name="status" defaultValue={status} aria-label="Filter by status">
                  {STATUSES.map((value) => (
                    <option key={value || "all"} value={value}>
                      {value ? value.replaceAll("_", " ") : "All"}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button secondary" type="submit">
                Apply
              </button>
              {canMutate ? (
                <button className="button" type="button" onClick={() => setShowCreate((v) => !v)}>
                  {showCreate ? "Cancel" : "Add person"}
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
                    displayName: String(data.get("displayName")),
                    workEmail: String(data.get("workEmail")),
                    itStatus: String(data.get("itStatus")) as PersonItStatus,
                  });
                }}
              >
                <h2>Create person</h2>
                <label className="required">
                  Display name
                  <input name="displayName" required />
                </label>
                <label className="required">
                  Work email
                  <input name="workEmail" type="email" required />
                </label>
                <label>
                  IT status
                  <select name="itStatus" defaultValue="active">
                    {STATUSES.filter(Boolean).map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                {create.isError ? <ErrorState error={create.error} /> : null}
                <div className="actions">
                  <button className="button" type="submit" disabled={create.isPending}>
                    {create.isPending ? "Saving…" : "Create"}
                  </button>
                </div>
              </form>
            ) : null}

            {people.isLoading ? <LoadingState label="Loading people…" /> : null}
            {people.isError ? <ErrorState error={people.error} /> : null}
            {people.data && people.data.people.length === 0 ? (
              <EmptyState>
                No people yet. {canMutate ? "Add a person or import a CSV from Resources." : "Ask a technician to add records."}
              </EmptyState>
            ) : null}
            {people.data && people.data.people.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Work email</th>
                      <th>Status</th>
                      <th>Department</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.data.people.map((person) => (
                      <tr key={person.id}>
                        <td>
                          <Link
                            to={`/companies/${companyId}/people/${person.id}`}
                            data-tour={`person-${person.id}`}
                          >
                            {person.displayName}
                          </Link>
                        </td>
                        <td>{person.workEmail}</td>
                        <td>
                          <span className="badge">{personStatusLabel(person)}</span>
                        </td>
                        <td>{person.department ?? "—"}</td>
                        <td>{person.roleTitle ?? "—"}</td>
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
