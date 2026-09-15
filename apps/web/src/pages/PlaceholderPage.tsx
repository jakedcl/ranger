import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { api } from "../lib/api.ts";

const copy: Record<string, { title: string; body: string }> = {
  settings: {
    title: "Settings",
    body: "Staff provisioning uses the private `npm run provision:admin` command. Public self-registration is disabled. There is no in-app settings editor in this release.",
  },
};

export function PlaceholderPage({ section }: { section: string }) {
  const content = copy[section] ?? {
    title: section,
    body: "This route is not part of the current RANGER surface. Use Overview or the company switcher.",
  };
  return (
    <div className="stack">
      <h1>{content.title}</h1>
      <p className="empty">{content.body}</p>
    </div>
  );
}

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const search = useQuery({
    queryKey: ["search", q],
    queryFn: () => api.search(q),
    enabled: q.length > 0,
  });
  return (
    <div className="stack">
      <h1>Search</h1>
      {q.length === 0 ? <p className="empty">Enter a company name.</p> : null}
      {search.isLoading ? <p>Loading…</p> : null}
      {search.isError ? <div className="banner error">{search.error.message}</div> : null}
      <ul>
        {(search.data?.results ?? []).map((result) => (
          <li key={result.id}>
            <span className="badge">{result.type}</span>{" "}
            <Link to={`/companies/${result.id}`}>{result.title}</Link> · {result.company}
          </li>
        ))}
      </ul>
      {q && search.data?.results.length === 0 ? <p className="empty">No permitted matches.</p> : null}
    </div>
  );
}
