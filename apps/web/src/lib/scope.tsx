import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.ts";

/** Prefer route companyId; fall back to none (caller must gate mutations). */
export function useCompanyId(): string | undefined {
  const { companyId } = useParams();
  return companyId || undefined;
}

export function CompanyScopeGate({
  companyId,
  children,
  action = "manage inventory",
}: {
  companyId?: string;
  children: React.ReactNode;
  action?: string;
}) {
  const companies = useQuery({ queryKey: ["companies"], queryFn: api.companies });

  if (companyId) {
    return <>{children}</>;
  }

  if (companies.isLoading) {
    return <p>Loading companies…</p>;
  }
  if (companies.isError) {
    return <div className="banner error">{companies.error.message}</div>;
  }

  const rows = companies.data?.companies ?? [];
  return (
    <div className="stack">
      <div className="banner warn">
        Select a company scope to {action}. Mutations require a single company context.
      </div>
      {rows.length === 0 ? (
        <p className="empty">No companies are available for this staff account.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Domains</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((company) => (
                <tr key={company.id}>
                  <td>
                    <Link to={`/companies/${company.id}/people`}>{company.name}</Link>
                  </td>
                  <td>{company.domains.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
