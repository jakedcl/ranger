import { describe, expect, it } from "vitest";
import {
  dedupeObservationsById,
  mergeObservationsById,
  parseObservedUser,
  parseUserPage,
  shouldApplyObservation,
} from "./index.ts";

describe("observation idempotency helpers", () => {
  it("dedupes duplicate observations by id keeping the latest", () => {
    const rows = dedupeObservationsById([
      {
        observedAt: "2026-09-30T10:00:00.000Z",
        value: { id: "u1", name: "old" },
      },
      {
        observedAt: "2026-09-30T11:00:00.000Z",
        value: { id: "u1", name: "new" },
      },
      {
        observedAt: "2026-09-30T10:30:00.000Z",
        value: { id: "u2", name: "other" },
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.value.id === "u1")?.value.name).toBe("new");
  });

  it("mergeObservationsById does not let older overwrite newer", () => {
    const existing = [
      {
        observedAt: "2026-09-30T12:00:00.000Z",
        value: { id: "u1", name: "current" },
      },
    ];
    const merged = mergeObservationsById(existing, [
      {
        observedAt: "2026-09-30T11:00:00.000Z",
        value: { id: "u1", name: "stale" },
      },
    ]);
    expect(merged[0]?.value.name).toBe("current");
  });

  it("shouldApplyObservation rejects strictly older observations", () => {
    expect(shouldApplyObservation(null, "2026-09-30T12:00:00.000Z")).toBe(true);
    expect(
      shouldApplyObservation("2026-09-30T12:00:00.000Z", "2026-09-30T12:00:00.000Z"),
    ).toBe(true);
    expect(
      shouldApplyObservation("2026-09-30T12:00:00.000Z", "2026-09-30T11:59:59.000Z"),
    ).toBe(false);
  });
});

describe("Graph parse tolerance", () => {
  it("accepts users with missing optional fields", () => {
    const user = parseObservedUser({
      id: "x",
      userPrincipalName: "sparse@harbor.example",
    });
    expect(user).toEqual({
      id: "x",
      userPrincipalName: "sparse@harbor.example",
      mail: null,
      displayName: null,
      accountEnabled: null,
      assignedLicenses: [],
    });
  });

  it("skips malformed rows in a page without failing the collection", () => {
    const page = parseUserPage({
      value: [
        { id: "ok", userPrincipalName: "ok@harbor.example", displayName: "Ok" },
        { displayName: "missing ids" },
        null,
      ],
      "@odata.nextLink": null,
    });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe("ok");
  });
});
