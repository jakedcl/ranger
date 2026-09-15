/** Related-incident scoring (spec §9.6). Same-company only. */

export const RELATED_SCORING_VERSION = 1;
export const RELATED_SCORE_MINIMUM = 4;

export type RelatedScoreInput = {
  errorCode?: string | null;
  applicationIds?: string[];
  deviceIds?: string[];
  tags?: string[];
};

export type RelatedScoreReason = {
  code: string;
  points: number;
  detail: string;
};

export function scoreRelatedIncidents(
  a: RelatedScoreInput,
  b: RelatedScoreInput,
): { score: number; reasons: RelatedScoreReason[] } {
  const reasons: RelatedScoreReason[] = [];
  let score = 0;

  const errA = normalizeToken(a.errorCode);
  const errB = normalizeToken(b.errorCode);
  if (errA && errB && errA === errB) {
    reasons.push({ code: "same_error_code", points: 4, detail: `Same error code: ${errA}` });
    score += 4;
  }

  const apps = intersect(a.applicationIds ?? [], b.applicationIds ?? []);
  if (apps.length > 0) {
    reasons.push({
      code: "same_application",
      points: 2,
      detail: `Shared application resource(s): ${apps.slice(0, 3).join(", ")}`,
    });
    score += 2;
  }

  const devices = intersect(a.deviceIds ?? [], b.deviceIds ?? []);
  if (devices.length > 0) {
    reasons.push({
      code: "same_device",
      points: 3,
      detail: `Shared device(s): ${devices.slice(0, 3).join(", ")}`,
    });
    score += 3;
  }

  const tags = intersect(
    (a.tags ?? []).map((t) => t.toLowerCase()),
    (b.tags ?? []).map((t) => t.toLowerCase()),
  );
  if (tags.length > 0) {
    const tagPoints = Math.min(3, tags.length);
    reasons.push({
      code: "shared_tags",
      points: tagPoints,
      detail: `Shared symptom tags (+1 each, cap 3): ${tags.slice(0, 5).join(", ")}`,
    });
    score += tagPoints;
  }

  return { score, reasons };
}

export function isRelatedSuggestion(score: number): boolean {
  return score >= RELATED_SCORE_MINIMUM;
}

function normalizeToken(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function intersect(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((x) => x.toLowerCase()));
  return [...new Set(a.filter((x) => setB.has(x.toLowerCase())))];
}
