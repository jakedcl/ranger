/**
 * Helpers for applying provider observations idempotently.
 * Duplicate external IDs collapse; older observations do not overwrite newer ones.
 */

export type TimestampedObservation<T extends { id: string }> = {
  observedAt: string;
  value: T;
};

/**
 * Merge observations keyed by stable external `id`.
 * Later `observedAt` wins; equal timestamps keep the existing value (first-write).
 */
export function mergeObservationsById<T extends { id: string }>(
  existing: readonly TimestampedObservation<T>[],
  incoming: readonly TimestampedObservation<T>[],
): TimestampedObservation<T>[] {
  const map = new Map<string, TimestampedObservation<T>>();
  for (const row of existing) {
    map.set(row.value.id, row);
  }
  for (const row of incoming) {
    const prev = map.get(row.value.id);
    if (!prev || row.observedAt > prev.observedAt) {
      map.set(row.value.id, row);
    }
  }
  return [...map.values()];
}

/**
 * Deduplicate a flat list of observations by id, keeping the latest observedAt.
 * Useful when pagination or retries emit the same object twice.
 */
export function dedupeObservationsById<T extends { id: string }>(
  rows: readonly TimestampedObservation<T>[],
): TimestampedObservation<T>[] {
  return mergeObservationsById([], rows);
}

/**
 * Reject applying an observation when a newer confirmed observation already exists
 * for the same id (spec §7.5 out-of-order guard).
 */
export function shouldApplyObservation(
  existingObservedAt: string | null | undefined,
  incomingObservedAt: string,
): boolean {
  if (!existingObservedAt) return true;
  return incomingObservedAt >= existingObservedAt;
}
