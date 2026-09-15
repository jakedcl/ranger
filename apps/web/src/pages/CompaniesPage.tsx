import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { api } from "../lib/api.ts";

export function CompaniesPage() {
  const companies = useQuery({ queryKey: ["companies"], queryFn: api.companies });
  if (companies.isLoading) {
    return <p>Loading companies…</p>;
  }
  if (companies.isError) {
    return <div className="banner error">{companies.error.message}</div>;
  }
  const rows = companies.data?.companies ?? [];
  return (
    <div className="stack">
      <h1>Companies</h1>
      <p>IT data boundaries only. Company archival is deferred.</p>
      {rows.length === 0 ? (
        <p className="empty">No companies are available for this staff account.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Domains</th>
                <th>IT contact</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((company) => (
                <tr key={company.id}>
                  <td>
                    <Link to={`/companies/${company.id}`}>{company.name}</Link>
                  </td>
                  <td>{company.domains.join(", ")}</td>
                  <td>{company.itContactName ?? "—"}</td>
                  <td>{company.itNotes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
