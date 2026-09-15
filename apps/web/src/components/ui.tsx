import { freshnessLabel, isDemoSource, sourceLabel } from "../lib/format.ts";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <p>{label}</p>;
}

export function ErrorState({ error }: { error: Error }) {
  return <div className="banner error">{error.message}</div>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={active === tab.id ? "tab active" : "tab"}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** Provenance + freshness are separate badges (spec §3.2). Demo stays unmistakable. */
export function SourceFreshness({
  source,
  lastObservedAt,
  freshnessNote,
}: {
  source?: string | null;
  lastObservedAt?: string | null;
  freshnessNote?: string | null;
}) {
  const fresh = freshnessLabel({ lastObservedAt, freshnessNote });
  return (
    <span className="source-freshness">
      <span className={isDemoSource(source) ? "badge demo" : "badge"}>{sourceLabel(source)}</span>{" "}
      <span className={fresh.stale ? "badge warn" : "badge"} title={freshnessNote ?? undefined}>
        {fresh.label}
      </span>
    </span>
  );
}
