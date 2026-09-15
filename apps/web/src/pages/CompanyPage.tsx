import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useOutletContext, useParams } from "react-router";
import type { SessionUser } from "@ranger/contracts";
import { api } from "../lib/api.ts";
import { formatMoney, SCENARIO_DATE_NOTE } from "../lib/format.ts";
import { ErrorState, LoadingState } from "../components/ui.tsx";

export function CompanyPage() {
  const { companyId = "" } = useParams();
  const { user } = useOutletContext<{ user: SessionUser }>();
  const queryClient = useQueryClient();
  const company = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => api.company(companyId),
    enabled: Boolean(companyId),
  });
  const costs = useQuery({
    queryKey: ["company-costs", companyId],
    queryFn: () => api.companyCosts(companyId),
    enabled: Boolean(companyId),
  });
  const [notes, setNotes] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () =>
      api.updateNotes(
        companyId,
        notes ?? company.data?.company.itNotes ?? null,
        company.data?.company.version ?? 1,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  if (company.isLoading) {
    return <LoadingState label="Loading company…" />;
  }
  if (company.isError) {
    return <ErrorState error={company.error} />;
  }
  const record = company.data?.company;
  if (!record) {
    return <p className="empty">Company not found.</p>;
  }

  const canEdit = user.role !== "viewer";
  const costPayload = costs.data?.costs;
  return (
    <div className="stack">
      <h1>{record.name}</h1>
      <p>
        <span className="badge demo">Demo</span> · {record.domains.join(", ")}
      </p>
      <p className="empty">{SCENARIO_DATE_NOTE}</p>
      <section className="panel">
        <h2>Summary</h2>
        <p>
          IT contact: {record.itContactName ?? "Unknown"} ({record.itContactEmail ?? "Unknown"})
        </p>
        <p className="empty">
          People, Resources, Work, Automations, Integrations, and Incidents operate on this company.
          Demo Microsoft sync is on Integrations; live Graph stays blocked without a tenant.
        </p>
      </section>
      <section className="panel stack">
        <h2>Cost summary</h2>
        {costs.isLoading ? <LoadingState label="Loading costs…" /> : null}
        {costs.isError ? <ErrorState error={costs.error} /> : null}
        {costPayload && costPayload.byCurrency.length === 0 && costPayload.unknownCount === 0 ? (
          <p className="empty">No active subscription costs recorded.</p>
        ) : null}
        {costPayload?.byCurrency.map((row) => (
          <p key={row.currency}>
            {formatMoney(row.total, row.currency)} purchased (known unit prices × quantity)
          </p>
        ))}
        {costPayload && costPayload.unknownCount > 0 ? (
          <p className="empty">
            {costPayload.unknownCount} subscription price(s) Unknown — not treated as $0.
          </p>
        ) : null}
      </section>
      <section className="panel">
        <h2>IT notes</h2>
        {canEdit ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <textarea
              aria-label="IT notes"
              rows={5}
              value={notes ?? record.itNotes ?? ""}
              onChange={(event) => setNotes(event.target.value)}
            />
            {save.isError ? <div className="banner error">{save.error.message}</div> : null}
            <div className="actions">
              <button className="button" type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save notes"}
              </button>
            </div>
          </form>
        ) : (
          <p>{record.itNotes ?? "No notes. Viewers cannot edit."}</p>
        )}
      </section>
      <p>
        <Link to={`/companies/${companyId}/people`}>People</Link> ·{" "}
        <Link to={`/companies/${companyId}/resources`}>Resources</Link> ·{" "}
        <Link to={`/companies/${companyId}/work`}>Work</Link> ·{" "}
        <Link to={`/companies/${companyId}/incidents`}>Incidents</Link> ·{" "}
        <Link to={`/companies/${companyId}/import`}>Import</Link>
      </p>
    </div>
  );
}
