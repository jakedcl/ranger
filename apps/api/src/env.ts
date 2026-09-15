import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  WEB_ORIGIN: z.string().url(),
  API_HOST: z.string().default("127.0.0.1"),
  API_PORT: z.coerce.number().default(4000),
  RANGER_MODE: z.enum(["private", "demo"]).default("private"),
  /** Required for local seed scripts; unused by the HTTP server at runtime. */
  SEED_STAFF_PASSWORD: z.string().min(8).default("unused-at-runtime"),
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof schema>;

function withPlatformDefaults(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const next: NodeJS.ProcessEnv = { ...source };
  const onVercel = next.VERCEL === "1" || next.VERCEL === "true";
  if (!onVercel) {
    return next;
  }
  const host = next.VERCEL_PROJECT_PRODUCTION_URL || next.VERCEL_URL;
  if (host) {
    const origin = host.startsWith("http") ? host : `https://${host}`;
    next.WEB_ORIGIN ??= origin;
    next.BETTER_AUTH_URL ??= origin;
  }
  next.RANGER_MODE ??= "demo";
  next.EVIDENCE_STORAGE_DIR ??= "/tmp/ranger-evidence";
  return next;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return schema.parse(withPlatformDefaults(source));
}
