import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { api } from "../lib/api.ts";
import { authClient } from "../lib/auth-client.ts";
import { useDemoTour } from "../tour/DemoTour.tsx";

const primary = [
  ["people", "People"],
  ["resources", "Resources"],
  ["work", "Work"],
] as const;

const later = [
  ["incidents", "Incidents"],
  ["automations", "Automations"],
  ["integrations", "Integrations"],
] as const;

const tourNavAttr: Record<string, string> = {
  people: "nav-people",
  incidents: "nav-incidents",
  automations: "nav-automations",
};

function sectionFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "companies" && parts.length >= 3) {
    return parts[2] ?? null;
  }
  const root = parts[0];
  if (
    root &&
    ["people", "resources", "work", "incidents", "automations", "integrations", "products", "settings"].includes(root)
  ) {
    return root;
  }
  return null;
}

export function AppShell() {
  const session = useQuery({ queryKey: ["session"], queryFn: api.session });
  const companies = useQuery({ queryKey: ["companies"], queryFn: api.companies });
  const navigate = useNavigate();
  const location = useLocation();
  const { companyId } = useParams();
  const [searchParams] = useSearchParams();
  const user = session.data?.user;
  const tour = useDemoTour();

  useEffect(() => {
    if (!session.isLoading && (session.isError || !user)) {
      void navigate("/login", { replace: true, state: { from: location.pathname } });
    }
  }, [session.isLoading, session.isError, user, navigate, location.pathname]);

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem("ranger-start-tour") !== "1") return;
    sessionStorage.removeItem("ranger-start-tour");
    tour.start();
    // Intentionally once after login — do not rebind when tour identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (session.isLoading) {
    return <main className="main">Loading session…</main>;
  }
  if (session.isError || !user) {
    return <main className="main">Redirecting to sign in…</main>;
  }

  const selected = companyId ?? "";
  const scopedName = companies.data?.companies.find((company) => company.id === selected)?.name;
  const crumbs = [user.organizationName, scopedName ?? "All companies"].join(" / ");

  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <aside className="sidebar">
        <p className="brand">RANGER</p>
        <nav className="nav" aria-label="Primary">
          <NavLink to={selected ? `/companies/${selected}` : "/"} end>
            Overview
          </NavLink>
          <NavLink to="/companies">Companies</NavLink>
          {primary.map(([path, label]) => (
            <NavLink
              key={path}
              to={selected ? `/companies/${selected}/${path}` : `/${path}`}
              data-tour={tourNavAttr[path]}
            >
              {label}
            </NavLink>
          ))}
          <NavLink to="/products">Products</NavLink>
          {later.map(([path, label]) => (
            <NavLink
              key={path}
              to={selected ? `/companies/${selected}/${path}` : `/${path}`}
              data-tour={tourNavAttr[path]}
            >
              {label}
            </NavLink>
          ))}
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <button
          className="button secondary tour-launch"
          type="button"
          data-tour="start-demo-tour"
          onClick={() => tour.start()}
        >
          Guided demo
        </button>
      </aside>
      <div>
        <header className="topbar">
          <label data-tour="company-scope">
            Company scope
            <select
              aria-label="Company scope"
              value={selected}
              onChange={(event) => {
                const value = event.target.value;
                const section = sectionFromPath(location.pathname);
                const inventorySections = ["people", "resources", "work", "incidents", "automations", "integrations"];
                if (!value) {
                  void navigate(section && inventorySections.includes(section) ? `/${section}` : "/");
                  return;
                }
                if (section && inventorySections.includes(section)) {
                  void navigate(`/companies/${value}/${section}`);
                  return;
                }
                void navigate(`/companies/${value}`);
              }}
            >
              <option value="">All companies</option>
              {(companies.data?.companies ?? []).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <form
            className="search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              const q = new FormData(event.currentTarget).get("q");
              void navigate(`/search?q=${encodeURIComponent(String(q ?? ""))}`);
            }}
          >
            <input name="q" aria-label="Search" placeholder="Search" defaultValue={searchParams.get("q") ?? ""} />
          </form>
          <div className="user-meta">
            <span className="badge demo" data-tour="demo-badge">
              {user.environment === "live" ? "Live" : "Demo"}
            </span>{" "}
            {user.name} · {user.role}{" "}
            <button
              className="button secondary"
              type="button"
              onClick={async () => {
                await authClient.signOut();
                void navigate("/login");
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main id="main" className="main">
          <p className="crumbs">{crumbs}</p>
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
