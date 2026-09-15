/**
 * Display helpers for IT date intervals.
 * Days first; after 30 days show approximate month units (~1.2 mo).
 * Never invent a missing start/end — return Unknown instead.
 */

const DAY_MS = 86_400_000;

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Whole calendar days between two date-only values (end − start). */
export function daysBetween(start: string, end: string): number | null {
  const a = parseDateOnly(start);
  const b = parseDateOnly(end);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/**
 * Format a day count for technicians.
 * ≤30 → "13 days"; >30 → "~1.2 mo" (30-day months, reading aid only — not a billing unit).
 */
export function formatDurationDays(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days)) return "Unknown";
  const rounded = Math.round(days);
  const abs = Math.abs(rounded);
  if (abs <= 30) {
    return `${abs} day${abs === 1 ? "" : "s"}`;
  }
  const months = abs / 30;
  const shown = Math.round(months * 10) / 10;
  return `~${shown} mo`;
}

export type IntervalProgress = {
  asOf: string;
  start: string | null;
  end: string | null;
  elapsedDays: number | null;
  remainingDays: number | null;
  elapsedLabel: string;
  remainingLabel: string | null;
  /** One-line summary for tables. */
  summary: string;
};

export function intervalProgress(input: {
  start?: string | null;
  end?: string | null;
  asOf: string;
}): IntervalProgress {
  const start = input.start ?? null;
  const end = input.end ?? null;
  const asOf = input.asOf;

  if (!start) {
    return {
      asOf,
      start: null,
      end,
      elapsedDays: null,
      remainingDays: end ? daysBetween(asOf, end) : null,
      elapsedLabel: "Unknown",
      remainingLabel: end ? formatDurationDays(daysBetween(asOf, end)) : null,
      summary: end ? `End ${end} · remaining ${formatDurationDays(daysBetween(asOf, end))}` : "Dates unknown",
    };
  }

  const elapsedDays = daysBetween(start, asOf);
  const remainingDays = end ? daysBetween(asOf, end) : null;
  const elapsedLabel = formatDurationDays(elapsedDays);
  const remainingLabel = end ? formatDurationDays(remainingDays) : null;

  let summary = `Start ${start} · ${elapsedLabel} in`;
  if (end && remainingDays != null) {
    if (remainingDays < 0) {
      summary = `Start ${start} · ended ${formatDurationDays(Math.abs(remainingDays))} ago (${end})`;
    } else {
      summary = `Start ${start} · ${elapsedLabel} in · ${remainingLabel} left`;
    }
  } else if (elapsedDays != null && elapsedDays < 0) {
    summary = `Starts in ${formatDurationDays(Math.abs(elapsedDays))} (${start})`;
  }

  return {
    asOf,
    start,
    end,
    elapsedDays,
    remainingDays,
    elapsedLabel,
    remainingLabel,
    summary,
  };
}
