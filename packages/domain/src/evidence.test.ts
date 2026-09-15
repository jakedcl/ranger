import { describe, expect, it } from "vitest";
import { isRelatedSuggestion, scoreRelatedIncidents } from "./related-incidents.ts";
import { parseEvidenceText, validateEvidenceUpload } from "./evidence.ts";

describe("related incident scoring", () => {
  it("scores same error + application above threshold", () => {
    const { score, reasons } = scoreRelatedIncidents(
      { errorCode: "LicenseAssignmentFailed", applicationIds: ["app-1"], tags: ["onboarding"] },
      { errorCode: "LicenseAssignmentFailed", applicationIds: ["app-1"], tags: ["onboarding"] },
    );
    expect(score).toBeGreaterThanOrEqual(4);
    expect(isRelatedSuggestion(score)).toBe(true);
    expect(reasons.some((r) => r.code === "same_error_code")).toBe(true);
  });

  it("does not suggest on weak tag-only overlap", () => {
    const { score } = scoreRelatedIncidents({ tags: ["wifi"] }, { tags: ["wifi"] });
    expect(isRelatedSuggestion(score)).toBe(false);
  });
});

describe("evidence validation", () => {
  it("rejects html and oversized files", () => {
    expect(
      validateEvidenceUpload({
        filename: "x.html",
        contentType: "text/html",
        byteSize: 10,
        existingFileCount: 0,
        existingTotalBytes: 0,
      }).ok,
    ).toBe(false);
    expect(
      validateEvidenceUpload({
        filename: "x.log",
        contentType: "text/plain",
        byteSize: 11 * 1024 * 1024,
        existingFileCount: 0,
        existingTotalBytes: 0,
      }).ok,
    ).toBe(false);
  });

  it("parses jsonl and flags missing timezone", () => {
    const result = parseEvidenceText(
      "events.jsonl",
      `${JSON.stringify({ timestamp: "2026-09-30T12:00:00", errorCode: "AuthFailed", message: "boom" })}\n`,
    );
    expect(result.extractedErrorCodes).toContain("AuthFailed");
    expect(result.rows[0]?.timestampPrecision).toBe("assumed_utc");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
