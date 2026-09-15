import { describe, expect, it } from "vitest";
import { daysBetween, formatDurationDays, intervalProgress } from "./dates.ts";

describe("formatDurationDays", () => {
  it("uses day units at or under 30", () => {
    expect(formatDurationDays(1)).toBe("1 day");
    expect(formatDurationDays(13)).toBe("13 days");
    expect(formatDurationDays(30)).toBe("30 days");
  });

  it("switches to approximate months after 30 days", () => {
    expect(formatDurationDays(31)).toBe("~1 mo");
    expect(formatDurationDays(45)).toBe("~1.5 mo");
    expect(formatDurationDays(90)).toBe("~3 mo");
  });

  it("does not invent values for null", () => {
    expect(formatDurationDays(null)).toBe("Unknown");
  });
});

describe("intervalProgress", () => {
  it("shows elapsed and remaining against an as-of date", () => {
    const result = intervalProgress({
      start: "2026-09-03",
      end: "2026-09-17",
      asOf: "2026-09-14",
    });
    expect(result.elapsedDays).toBe(11);
    expect(result.remainingDays).toBe(3);
    expect(result.elapsedLabel).toBe("11 days");
    expect(result.remainingLabel).toBe("3 days");
    expect(result.summary).toContain("11 days in");
    expect(result.summary).toContain("3 days left");
  });

  it("keeps Unknown when start is missing", () => {
    const result = intervalProgress({ start: null, end: "2026-10-01", asOf: "2026-09-14" });
    expect(result.elapsedLabel).toBe("Unknown");
    expect(result.elapsedDays).toBeNull();
  });

  it("daysBetween is null without parseable dates", () => {
    expect(daysBetween("nope", "2026-01-01")).toBeNull();
  });
});
