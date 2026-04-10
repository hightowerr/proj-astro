import { Redis } from "@upstash/redis"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { getTrustedAuthOrigins } from "./auth-origins"
import { db } from "./db"

const isPlaywrightE2E = process.env.PLAYWRIGHT === "true"
const trustedOrigins = getTrustedAuthOrigins()

// Build a secondaryStorage adapter from Upstash Redis when credentials are
// present. Better Auth uses this for session caching and rate-limit counters,
// making limits shared across all serverless instances instead of per-process.
function buildRedisStorage() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return undefined

  const redis = new Redis({ url, token })
  return {
    get: (key: string) => redis.get<string>(key),
    set: (key: string, value: string, ttl?: number) =>
      ttl ? redis.setex(key, ttl, value).then(() => undefined) : redis.set(key, value).then(() => undefined),
    delete: (key: string) => redis.del(key).then(() => undefined),
  }
}

const secondaryStorage = buildRedisStorage()

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  ...(trustedOrigins ? { trustedOrigins } : {}),
  ...(secondaryStorage ? { secondaryStorage } : {}),
  // Rate limiting is built into Better Auth core (IP-based, per-endpoint).
  // Enabled in all environments so dev/staging behave consistently with prod.
  // Storage is auto-selected as "secondary-storage" (Redis) when secondaryStorage
  // is configured above, falling back to in-process memory if Redis is absent.
  // Built-in special rules already apply 3 req/10 s to /sign-in and /sign-up.
  // Custom rules below tighten /request-password-reset and /reset-password.
  rateLimit: {
    enabled: !isPlaywrightE2E,
    customRules: {
      "/request-password-reset": { window: 60, max: 5 },
      "/reset-password":         { window: 60, max: 5 },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Invalidate all existing sessions when a password is reset so a
    // compromised-email attacker cannot hold a parallel live session.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Log password reset URL to terminal (no email integration yet)
      // eslint-disable-next-line no-console
      console.log(`\n${"=".repeat(60)}\nPASSWORD RESET REQUEST\nUser: ${user.email}\nReset URL: ${url}\n${"=".repeat(60)}\n`)
    },
  },
  emailVerification: {
    // E2E tests use a dev server and expect immediate post-signup access.
    sendOnSignUp: !isPlaywrightE2E,
    sendVerificationEmail: async ({ user, url }) => {
      // Log verification URL to terminal (no email integration yet)
      // eslint-disable-next-line no-console
      console.log(`\n${"=".repeat(60)}\nEMAIL VERIFICATION\nUser: ${user.email}\nVerification URL: ${url}\n${"=".repeat(60)}\n`)
    },
  },
})
