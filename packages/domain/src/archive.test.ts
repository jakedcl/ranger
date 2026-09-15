import { describe, expect, it } from "vitest";
import { evaluateArchiveReadiness } from "./archive.ts";

const departed = {
  itStatus: "departed" as const,
  archivedAt: null,
};

describe("evaluateArchiveReadiness", () => {
  it("is ready when departed with no remaining access obligations", () => {
    const result = evaluateArchiveReadiness({
      person: departed,
      licenseAssignments: [{ id: "la-1", status: "ended" }],
      mailboxAccess: [{ id: "mb-1", status: "ended" }],
      obligations: [
        {
          id: "ob-1",
          obligationKind: "mailbox",
          targetType: "mailbox_access",
          targetId: "mb-1",
          status: "resolved",
        },
      ],
      linkedAccounts: [{ id: "ac-1", accountKind: "human", enabledState: "disabled" }],
      deviceAssignments: [
        { id: "da-1", status: "historical", custodyDisposition: "returned" },
      ],
    });
    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("fails when person is not departed", () => {
    const result = evaluateArchiveReadiness({
      person: { itStatus: "active", archivedAt: null },
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.map((b) => b.code)).toContain("not_departed");
  });

  it("fails when already archived", () => {
    const result = evaluateArchiveReadiness({
      person: { itStatus: "departed", archivedAt: "2026-01-01T00:00:00Z" },
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.map((b) => b.code)).toContain("already_archived");
  });

  it("fails on active or removal_pending license assignments", () => {
    const result = evaluateArchiveReadiness({
      person: departed,
      licenseAssignments: [
        { id: "la-active", status: "active" },
        { id: "la-pending", status: "removal_pending" },
      ],
      linkedAccounts: [{ id: "ac-1", accountKind: "human", enabledState: "disabled" }],
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.map((b) => b.code)).toEqual(
      expect.arrayContaining(["active_license_assignment", "removal_pending_license_assignment"]),
    );
  });

  it("fails on unresolved mailbox access even if unrelated work is done", () => {
    const result = evaluateArchiveReadiness({
      person: departed,
      mailboxAccess: [{ id: "mb-open", status: "active" }],
      obligations: [
        {
          id: "ob-done",
          obligationKind: "checklist",
          targetType: "work_item",
          targetId: "wi-1",
          status: "resolved",
        },
      ],
      linkedAccounts: [{ id: "ac-1", accountKind: "human", enabledState: "disabled" }],
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.map((b) => b.code)).toContain("unresolved_mailbox_access");
  });

  it("fails on open offboarding obligations", () => {
    const result = evaluateArchiveReadiness({
      person: departed,
      obligations: [
        {
          id: "ob-open",
          obligationKind: "group",
          targetType: "group_membership",
          targetId: "gm-1",
          status: "open",
        },
      ],
      linkedAccounts: [{ id: "ac-1", accountKind: "human", enabledState: "disabled" }],
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.map((b) => b.code)).toContain("unresolved_obligation");
  });
});
