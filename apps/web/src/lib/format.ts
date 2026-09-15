import { formatDurationDays, intervalProgress } from "@ranger/domain";
import type { PersonItStatus, RecordSource } from "./inventory-types.ts";

export function labelStatus(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function personStatusLabel(person: {
  itStatus: PersonItStatus;
  archivedAt?: string | null;
  workflowBadge?: string | null;
}): string {
  if (person.archivedAt) return "Archived";
  const base = labelStatus(person.itStatus);
  if (!person.workflowBadge) return base;
  return `${base} · ${labelStatus(person.workflowBadge)}`;
}

export function formatMoney(amount: string | null | undefined, currency?: string | null): string {
  if (amount == null || amount === "") return "Unknown";
  return currency ? `${amount} ${currency}` : amount;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export const SCENARIO_DATE_NOTE = "Scenario date: Sep 30, 2026";
/** Matches seed scenario clock — duration math for demo inventory uses this, not wall clock. */
export const DEMO_AS_OF = "2026-09-30";

export { formatDurationDays, intervalProgress };

export function timingSummary(input: {
  start?: string | null;
  end?: string | null;
  asOf?: string;
}): string {
  return intervalProgress({
    start: input.start,
    end: input.end,
    asOf: input.asOf ?? DEMO_AS_OF,
  }).summary;
}

/** Source is provenance; freshness is observation age — keep them separate (spec §3.2). */
export function sourceLabel(source: string | null | undefined): string {
  if (!source) return "Unknown source";
  if (source === "demo") return "Demo";
  if (source === "microsoft") return "Microsoft";
  if (source === "manual") return "Manual";
  if (source === "import") return "Import";
  if (source === "workflow") return "Workflow";
  return labelStatus(source);
}

export function freshnessLabel(input: {
  lastObservedAt?: string | null;
  freshnessNote?: string | null;
  maxAgeHours?: number;
}): { label: string; stale: boolean } {
  const maxAgeHours = input.maxAgeHours ?? 24;
  if (input.lastObservedAt) {
    const ageMs = Date.now() - new Date(input.lastObservedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs >= 0) {
      const hours = ageMs / 3_600_000;
      if (hours > maxAgeHours) {
        return { label: `Stale · last observed ${formatDate(input.lastObservedAt)}`, stale: true };
      }
      return { label: `Fresh · last observed ${formatDate(input.lastObservedAt)}`, stale: false };
    }
  }
  if (input.freshnessNote) {
    return { label: input.freshnessNote, stale: /stale|unknown|fail/i.test(input.freshnessNote) };
  }
  return { label: "Freshness unknown", stale: true };
}

export function isDemoSource(source: string | null | undefined): boolean {
  return source === "demo";
}

export type { RecordSource };
