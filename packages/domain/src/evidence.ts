/** Evidence upload limits and content validation (spec §9.3). */

export const EVIDENCE_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_MAX_FILES_PER_INCIDENT = 25;
export const EVIDENCE_MAX_TOTAL_BYTES = 100 * 1024 * 1024;
export const EVIDENCE_PARSER_VERSION = "ranger-log-parser-1";

const ALLOWED_EXTENSIONS = new Set([".txt", ".log", ".csv", ".json", ".jsonl", ".png", ".jpg", ".jpeg"]);
const ALLOWED_CONTENT_TYPES = new Set([
  "text/plain",
  "text/csv",
  "application/json",
  "application/x-ndjson",
  "image/png",
  "image/jpeg",
  "application/octet-stream",
]);

const REJECT_EXTENSIONS = new Set([
  ".html",
  ".htm",
  ".svg",
  ".exe",
  ".dll",
  ".zip",
  ".gz",
  ".tgz",
  ".rar",
  ".7z",
  ".js",
  ".mjs",
  ".sh",
  ".bat",
  ".cmd",
  ".ps1",
]);

export type EvidenceValidationResult =
  | { ok: true; extension: string; contentType: string }
  | { ok: false; reason: string };

export function validateEvidenceUpload(input: {
  filename: string;
  contentType: string;
  byteSize: number;
  existingFileCount: number;
  existingTotalBytes: number;
}): EvidenceValidationResult {
  if (input.existingFileCount >= EVIDENCE_MAX_FILES_PER_INCIDENT) {
    return { ok: false, reason: `At most ${EVIDENCE_MAX_FILES_PER_INCIDENT} files per incident` };
  }
  if (input.byteSize <= 0) {
    return { ok: false, reason: "Empty file rejected" };
  }
  if (input.byteSize > EVIDENCE_MAX_FILE_BYTES) {
    return { ok: false, reason: `File exceeds ${EVIDENCE_MAX_FILE_BYTES} byte limit` };
  }
  if (input.existingTotalBytes + input.byteSize > EVIDENCE_MAX_TOTAL_BYTES) {
    return { ok: false, reason: `Incident evidence exceeds ${EVIDENCE_MAX_TOTAL_BYTES} byte total` };
  }

  const lower = input.filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const extension = dot >= 0 ? lower.slice(dot) : "";
  if (REJECT_EXTENSIONS.has(extension)) {
    return { ok: false, reason: `File type ${extension || "(none)"} is not allowed` };
  }
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false, reason: `Unsupported extension ${extension || "(none)"}` };
  }

  const contentType = (input.contentType || "application/octet-stream").split(";")[0]!.trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType) && contentType !== "text/x-log") {
    // allow octet-stream for .log/.txt when browsers are vague
    if (!(contentType === "application/octet-stream" && ALLOWED_EXTENSIONS.has(extension))) {
      return { ok: false, reason: `Unsupported content type ${contentType}` };
    }
  }

  return { ok: true, extension, contentType };
}

export type ParsedLogRow = {
  line: number;
  timestamp: string | null;
  timestampPrecision: "exact" | "unknown" | "assumed_utc";
  errorCode: string | null;
  message: string;
  warning?: string;
};

export type ParseLogResult = {
  rows: ParsedLogRow[];
  warnings: string[];
  extractedErrorCodes: string[];
};

/** Conservative text/JSON/JSONL/CSV parsing — never executes content. */
export function parseEvidenceText(filename: string, text: string): ParseLogResult {
  const warnings: string[] = [];
  const rows: ParsedLogRow[] = [];
  const errorCodes = new Set<string>();
  const lower = filename.toLowerCase();

  if (/<script|javascript:|onerror=/i.test(text)) {
    warnings.push("Content contains script-like text; rendered inertly as data only");
  }

  if (lower.endsWith(".json")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (let i = 0; i < items.length; i++) {
        const row = objectToRow(i + 1, items[i]);
        rows.push(row);
        if (row.errorCode) errorCodes.add(row.errorCode);
        if (row.warning) warnings.push(row.warning);
      }
    } catch {
      warnings.push("JSON parse failed; raw text retained without structured rows");
    }
    return { rows, warnings, extractedErrorCodes: [...errorCodes] };
  }

  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lower.endsWith(".jsonl")) {
    for (let i = 0; i < lines.length; i++) {
      try {
        const row = objectToRow(i + 1, JSON.parse(lines[i]!));
        rows.push(row);
        if (row.errorCode) errorCodes.add(row.errorCode);
        if (row.warning) warnings.push(row.warning);
      } catch {
        rows.push({
          line: i + 1,
          timestamp: null,
          timestampPrecision: "unknown",
          errorCode: null,
          message: lines[i]!.slice(0, 500),
          warning: "Malformed JSONL row retained as raw text",
        });
        warnings.push(`Line ${i + 1}: malformed JSONL`);
      }
    }
    return { rows, warnings, extractedErrorCodes: [...errorCodes] };
  }

  // .txt / .log / .csv — line scrape for ISO timestamps and error-looking tokens
  for (let i = 0; i < Math.min(lines.length, 2000); i++) {
    const line = lines[i]!;
    const tsMatch = line.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/);
    const errMatch = line.match(/\b([A-Z][A-Z0-9_]{2,}|ErrorCode[=:]\s*\S+|0x[0-9a-fA-F]+)\b/);
    let precision: ParsedLogRow["timestampPrecision"] = "unknown";
    let timestamp: string | null = null;
    if (tsMatch) {
      timestamp = tsMatch[0]!;
      precision = /(?:Z|[+-]\d{2}:?\d{2})$/.test(timestamp) ? "exact" : "assumed_utc";
      if (precision === "assumed_utc") {
        warnings.push(`Line ${i + 1}: timestamp lacks explicit offset; labeled assumed_utc`);
      }
    }
    const errorCode = errMatch ? errMatch[1]!.replace(/^ErrorCode[=:]\s*/i, "") : null;
    if (errorCode) errorCodes.add(errorCode);
    rows.push({
      line: i + 1,
      timestamp,
      timestampPrecision: precision,
      errorCode,
      message: line.slice(0, 500),
    });
  }
  if (lines.length > 2000) {
    warnings.push(`Only first 2000 of ${lines.length} lines were structured; raw file preserved`);
  }
  return { rows, warnings, extractedErrorCodes: [...errorCodes] };
}

function objectToRow(line: number, value: unknown): ParsedLogRow {
  if (!value || typeof value !== "object") {
    return {
      line,
      timestamp: null,
      timestampPrecision: "unknown",
      errorCode: null,
      message: String(value).slice(0, 500),
    };
  }
  const obj = value as Record<string, unknown>;
  const ts =
    (typeof obj.timestamp === "string" && obj.timestamp) ||
    (typeof obj.time === "string" && obj.time) ||
    (typeof obj.ts === "string" && obj.ts) ||
    null;
  const errorCode =
    (typeof obj.errorCode === "string" && obj.errorCode) ||
    (typeof obj.error_code === "string" && obj.error_code) ||
    (typeof obj.code === "string" && obj.code) ||
    null;
  const message =
    (typeof obj.message === "string" && obj.message) ||
    (typeof obj.msg === "string" && obj.msg) ||
    JSON.stringify(obj).slice(0, 500);
  let precision: ParsedLogRow["timestampPrecision"] = "unknown";
  let warning: string | undefined;
  if (ts) {
    precision = /(?:Z|[+-]\d{2}:?\d{2})$/.test(ts) ? "exact" : "assumed_utc";
    if (precision === "assumed_utc") {
      warning = `Row ${line}: timestamp lacks explicit offset; labeled assumed_utc`;
    }
  }
  return { line, timestamp: ts, timestampPrecision: precision, errorCode, message, warning };
}
