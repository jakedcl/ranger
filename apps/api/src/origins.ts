/**
 * localhost and 127.0.0.1 are different origins to the browser.
 * Locally we accept both so signing in works whichever host you type.
 * On Vercel, also trust deployment / production alias URLs from env.
 */
export function localDevOrigins(primary: string): string[] {
  const origins = new Set<string>([primary]);
  try {
    const url = new URL(primary);
    if (url.hostname === "127.0.0.1") {
      url.hostname = "localhost";
      origins.add(url.origin);
    } else if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
      origins.add(url.origin);
    }
  } catch {
    // keep primary only
  }
  for (const key of ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"] as const) {
    const value = process.env[key];
    if (!value) continue;
    origins.add(value.startsWith("http") ? new URL(value).origin : `https://${value}`);
  }
  return [...origins];
}

export function isAllowedWebOrigin(origin: string | undefined, referer: string | undefined, primary: string): boolean {
  const allowed = localDevOrigins(primary);
  if (origin && allowed.includes(origin)) return true;
  if (typeof referer === "string") {
    return allowed.some((base) => referer === base || referer.startsWith(`${base}/`));
  }
  return false;
}
