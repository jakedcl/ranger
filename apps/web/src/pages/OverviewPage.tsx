import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { api } from "../lib/api.ts";
import { labelStatus, SCENARIO_DATE_NOTE } from "../lib/format.ts";
import { useDemoTour } from "../tour/DemoTour.tsx";

function StartTourButton() {
  const tour = useDemoTour();
  return (
    <button className="button" type="button" data-tour="start-demo-tour" onClick={() => tour.start()}>
      {tour.active ? "Tour running…" : "Start guided demo"}
    </button>
  );
}

type LifecyclePerson = {
  id: string;
  companyId: string;
  companyName: string;
  displayName: string;
  itStatus: string;
  workflowBadge: string | null;
  timing: string;
};

type LifecycleRun = {
  id: string;
  companyId: string;
  companyName: string;
  personId: string;
  personName: string;
  kind: string;
  status: string;
};

type LifecycleSeat = {
  id: string;
  companyId: string;
  personId: string;
  personName: string;
  productName: string | null;
  timing: string;
  status: string;
};

export function OverviewPage() {
  const { companyId } = useParams();
  const overview = useQuery({
    queryKey: ["overview", companyId ?? "all"],
    queryFn: () => api.overview(companyId),
  });

  if (overview.isLoading) {
    return <p>Loading overview…</p>;
  }
  if (overview.isError) {
    return <div className="banner error">{overview.error.message}</div>;
  }
  const data = overview.data;
  if (!data) {
    return <p className="empty">No overview data.</p>;
  }

  const lifecycle = (data as typeof data & {
    lifecycle?: {
      startsSoon: LifecyclePerson[];
      leavesSoon: LifecyclePerson[];
      offboarding: LifecyclePerson[];
      waitingRuns: LifecycleRun[];
      activeSeats: LifecycleSeat[];
    };
    asOf?: string;
  }).lifecycle;
  const asOf = (data as { asOf?: string }).asOf ?? "2026-09-30";

  return (
    <div className="stack">
      <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Overview</h1>
        <StartTourButton />
      </div>
      <p>
        {data.organization.name} · <span className="badge demo" data-tour="demo-badge">Demo</span>
      </p>
      <p className="empty">
        {SCENARIO_DATE_NOTE} — joiner/leaver board as of {asOf}. Days first; after 30 days shown as ~months.
      </p>

      <div className="grid" data-tour="overview-queues">
        <section className="panel">
          <h2>Waiting / failed steps</h2>
          <p>{data.queues.failedWorkflowSteps}</p>
          <p className="empty">
            {companyId ? (
              <Link to={`/companies/${companyId}/automations`}>Open runs</Link>
            ) : (
              "Checklist steps awaiting evidence or retry."
            )}
          </p>
        </section>
        <section className="panel">
          <h2>Offboarding</h2>
          <p>{data.queues.peopleOffboarding}</p>
          <p className="empty">Departed or offboarding in progress — cleanup may still be open.</p>
        </section>
        <section className="panel">
          <h2>Starts / ends in 14 days</h2>
          <p>{data.queues.upcomingContractorReviews}</p>
          <p className="empty">People with a start or end date in the next two weeks.</p>
        </section>
        <section className="panel">
          <h2>Stale connections</h2>
          <p>{data.queues.staleConnections}</p>
          <p className="empty">
            {companyId ? <Link to={`/companies/${companyId}/integrations`}>Integrations</Link> : "Provider sync health."}
          </p>
        </section>
        <section className="panel">
          <h2>Open incidents</h2>
          <p>{data.queues.openIncidents}</p>
          <p className="empty">
            {companyId ? <Link to={`/companies/${companyId}/incidents`}>Incidents</Link> : "Investigations in scope."}
          </p>
        </section>
      </div>

      <div data-tour="lifecycle-board" className="stack">
      <LifecycleTable
        title="Starting soon"
        empty="No starts in the next 14 days."
        people={lifecycle?.startsSoon ?? []}
      />
      <LifecycleTable
        title="Leaving soon"
        empty="No end dates in the next 14 days."
        people={lifecycle?.leavesSoon ?? []}
      />
      <LifecycleTable
        title="Offboarding open"
        empty="No departed / offboarding people in scope."
        people={lifecycle?.offboarding ?? []}
      />
      </div>

      <section className="panel stack">
        <h2>Open lifecycle runs</h2>
        {(lifecycle?.waitingRuns ?? []).length === 0 ? (
          <p className="empty">No open onboarding/offboarding runs. Start one from a person profile.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Company</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(lifecycle?.waitingRuns ?? []).map((run) => (
                  <tr key={run.id}>
                    <td>
                      <Link to={`/companies/${run.companyId}/people/${run.personId}`}>{run.personName}</Link>
                    </td>
                    <td>{run.companyName}</td>
                    <td>{labelStatus(run.kind)}</td>
                    <td>{labelStatus(run.status)}</td>
                    <td>
                      <Link to={`/companies/${run.companyId}/workflows/${run.id}`}>Checklist</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel stack">
        <h2>Active seats (timing)</h2>
        {(lifecycle?.activeSeats ?? []).length === 0 ? (
          <p className="empty">No active personal assignments in scope.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Timing</th>
                </tr>
              </thead>
              <tbody>
                {(lifecycle?.activeSeats ?? []).map((seat) => (
                  <tr key={seat.id}>
                    <td>
                      <Link to={`/companies/${seat.companyId}/people/${seat.personId}`}>{seat.personName}</Link>
                    </td>
                    <td>{seat.productName ?? "—"}</td>
                    <td>{labelStatus(seat.status)}</td>
                    <td>{seat.timing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Companies in scope</h2>
        {data.companies.length === 0 ? (
          <p className="empty">No companies are visible with the current grant.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Domains</th>
                  <th>IT contact</th>
                </tr>
              </thead>
              <tbody>
                {data.companies.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <Link to={`/companies/${company.id}`}>{company.name}</Link>
                    </td>
                    <td>{company.domains.join(", ")}</td>
                    <td>{company.itContactEmail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function LifecycleTable({
  title,
  empty,
  people,
}: {
  title: string;
  empty: string;
  people: LifecyclePerson[];
}) {
  return (
    <section className="panel stack">
      <h2>{title}</h2>
      {people.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Company</th>
                <th>Status</th>
                <th>Timing</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td>
                    <Link to={`/companies/${person.companyId}/people/${person.id}`}>{person.displayName}</Link>
                  </td>
                  <td>{person.companyName}</td>
                  <td>
                    {labelStatus(person.itStatus)}
                    {person.workflowBadge ? ` · ${labelStatus(person.workflowBadge)}` : ""}
                  </td>
                  <td>{person.timing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
