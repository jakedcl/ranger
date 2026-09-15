import { betterAuth } from "better-auth";
import type { Pool } from "pg";
import type { Env } from "./env.ts";
import { localDevOrigins } from "./origins.ts";

export function createAuth(pool: Pool, env: Env) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    database: pool,
    trustedOrigins: localDevOrigins(env.WEB_ORIGIN),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 60,
    },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: env.WEB_ORIGIN.startsWith("https://"),
        path: "/",
      },
    },
    rateLimit: {
      enabled: false,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
