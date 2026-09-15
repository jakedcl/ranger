export type NamedSeatCapacityInput = {
  /** Purchased named seats for the subscription or pool. */
  purchasedQuantity: number;
  /** Current active + removal_pending assignments consuming seats. */
  consumedQuantity: number;
  /** Seats requested by the pending fulfillment (usually 1). */
  requestedQuantity?: number;
};

export type NamedSeatCapacityResult = {
  ok: boolean;
  available: number;
  requested: number;
  reason?: "insufficient_capacity" | "invalid_quantity";
};

/**
 * Named-user seat check for manual subscriptions.
 * Only Active and Removal pending assignments consume capacity (Ended does not).
 */
export function checkNamedSeatCapacity(input: NamedSeatCapacityInput): NamedSeatCapacityResult {
  const requested = input.requestedQuantity ?? 1;
  if (
    !Number.isInteger(input.purchasedQuantity) ||
    !Number.isInteger(input.consumedQuantity) ||
    !Number.isInteger(requested) ||
    input.purchasedQuantity < 0 ||
    input.consumedQuantity < 0 ||
    requested <= 0
  ) {
    return {
      ok: false,
      available: Math.max(0, input.purchasedQuantity - input.consumedQuantity),
      requested,
      reason: "invalid_quantity",
    };
  }

  const available = input.purchasedQuantity - input.consumedQuantity;
  if (requested > available) {
    return {
      ok: false,
      available,
      requested,
      reason: "insufficient_capacity",
    };
  }

  return { ok: true, available, requested };
}

export function countConsumingAssignments(
  statuses: ReadonlyArray<"active" | "removal_pending" | "ended">,
): number {
  return statuses.filter((status) => status === "active" || status === "removal_pending").length;
}
