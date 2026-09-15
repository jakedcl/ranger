import { describe, expect, it } from "vitest";
import {
  labelPrice,
  partitionByCurrency,
  removedAssignmentIsSavings,
  sumMoney,
} from "./costs.ts";

describe("costs", () => {
  it("never treats unknown prices as zero", () => {
    expect(labelPrice(null, "USD")).toBe("Unknown");
    expect(sumMoney([{ amount: null, currency: "USD" }]).ok).toBe(false);
  });

  it("keeps USD and EUR in separate buckets", () => {
    const result = partitionByCurrency([
      { amount: 10, currency: "USD" },
      { amount: 5, currency: "EUR" },
      { amount: null, currency: "USD" },
    ]);
    expect(result.byCurrency.get("USD")).toBe(10);
    expect(result.byCurrency.get("EUR")).toBe(5);
    expect(result.unknownCount).toBe(1);
  });

  it("does not count continuing purchase as savings when a seat ends", () => {
    expect(removedAssignmentIsSavings({ subscriptionContinuesUnchanged: true })).toBe(false);
    expect(removedAssignmentIsSavings({ subscriptionContinuesUnchanged: false })).toBe(true);
  });
});
