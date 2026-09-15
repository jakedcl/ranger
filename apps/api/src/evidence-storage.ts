import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function evidenceRoot(envDir?: string): string {
  if (envDir && envDir.length > 0) {
    return envDir;
  }
  if (process.env.VERCEL) {
    return "/tmp/ranger-evidence";
  }
  return path.join(process.cwd(), "data", "evidence");
}

export async function storeEvidenceBytes(
  root: string,
  organizationId: string,
  companyId: string,
  fileId: string,
  bytes: Buffer,
): Promise<{ storageKey: string; sha256: string }> {
  const storageKey = path.posix.join(organizationId, companyId, fileId);
  const dir = path.join(root, organizationId, companyId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(root, ...storageKey.split("/")), bytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { storageKey, sha256 };
}

export async function readEvidenceBytes(root: string, storageKey: string): Promise<Buffer> {
  return readFile(path.join(root, ...storageKey.split("/")));
}

export function redactTextAssistance(text: string): { text: string; note: string } {
  const redacted = text
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/password["\s:=]+[^\s"',}]+/gi, "password=[REDACTED]")
    .replace(/client_secret["\s:=]+[^\s"',}]+/gi, "client_secret=[REDACTED]");
  return {
    text: redacted,
    note: "Redaction helpers are assistance, not a guarantee that all secrets were removed.",
  };
}
