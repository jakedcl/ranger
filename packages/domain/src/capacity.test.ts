import { describe, expect, it } from "vitest";
import { checkNamedSeatCapacity, countConsumingAssignments } from "./capacity.ts";

describe("named seat capacity", () => {
  it("allows assignment when seats remain", () => {
    expect(
      checkNamedSeatCapacity({
        purchasedQuantity: 5,
        consumedQuantity: 4,
        requestedQuantity: 1,
      }),
    ).toEqual({ ok: true, available: 1, requested: 1 });
  });

  it("rejects over-allocation", () => {
    const result = checkNamedSeatCapacity({
      purchasedQuantity: 5,
      consumedQuantity: 5,
      requestedQuantity: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("insufficient_capacity");
    expect(result.available).toBe(0);
  });

  it("counts active and removal_pending as consuming seats", () => {
    expect(countConsumingAssignments(["active", "removal_pending", "ended", "active"])).toBe(3);
  });

  it("rejects invalid quantities", () => {
    expect(
      checkNamedSeatCapacity({
        purchasedQuantity: -1,
        consumedQuantity: 0,
      }).reason,
    ).toBe("invalid_quantity");
  });
});
