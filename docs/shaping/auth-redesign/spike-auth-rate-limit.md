# Spike: Better Auth Rate Limiting + Password Validation

**Goal:** Understand what rate limiting and password validation Better Auth v1.4.18 provides
out of the box, what storage it needs in serverless, and whether any schema migration is required.

---

## Questions

| # | Question |
|---|----------|
| S1-Q1 | Does Better Auth v1.4.18 expose `rateLimit` as a plugin or top-level option? |
| S1-Q2 | What storage backend does rate limiting require? In-memory vs Redis vs DB? |
| S1-Q3 | Does `emailAndPassword.minPasswordLength` enforce the limit server-side? |
| S1-Q4 | Can these be added to `auth.ts` without a schema migration? |

---

## Answers

### S1-Q1 — Rate limiting is a top-level core feature, not a plugin

Rate limiting is built into the core at `api/rate-limiter/index.mjs` and called on
**every request** inside `api/index.mjs`. It is configured via `betterAuth({ rateLimit: { ... } })`.

**Defaults (from `context/create-context.mjs`):**
```js
rateLimit: {
  enabled: isProduction,   // auto-on in prod, OFF in dev
  window: 10,              // 10-second rolling window
  max: 100,                // global: 100 req/window/IP
  storage: secondaryStorage ? "secondary-storage" : "memory"
}
```

**Hardcoded special rules** (3 req / 10 s per IP — tighter than global):
- `/sign-in/*`
- `/sign-up/*`
- `/change-password/*`
- `/change-email/*`

**Not covered by special rules:**
- `/request-password-reset` — the forgot-password endpoint
- `/reset-password` — the reset endpoint

These two fall under the global 100 req/10s limit, providing no meaningful
brute-force or abuse protection. A custom rule is required.

---

### S1-Q2 — Storage: memory by default; Redis needed for serverless

Three built-in storage backends:

| Storage | How selected | Behaviour |
|---------|-------------|-----------|
| `"memory"` | default (no `secondaryStorage`) | In-process `Map`. **Not shared across serverless instances.** Attacker routing to different instances bypasses limit entirely. |
| `"secondary-storage"` | auto when `secondaryStorage` is configured | Delegates to `secondaryStorage.get/set`. Shared across all instances. |
| Database | fallback when neither above | Writes to a `rateLimit` table. Needs a migration. |

**The project already has Upstash Redis** at `src/lib/redis.ts` (`@upstash/redis`).
Wiring it as `secondaryStorage` activates the `"secondary-storage"` path automatically —
no `rateLimit.storage` override needed.

Better Auth's `secondaryStorage` interface (from usage in rate-limiter):
```ts
interface SecondaryStorage {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
}
```

Upstash `Redis` from `@upstash/redis` provides compatible methods — needs a thin
adapter to normalise the `set` signature (Upstash uses `setex(key, ttl, value)`).

---

### S1-Q3 — `minPasswordLength` is already enforced server-side at the default of 8

From `context/create-context.mjs`:
```js
minPasswordLength: options.emailAndPassword?.minPasswordLength || 8
```

Enforced in:
- `api/routes/sign-up.mjs` — signup
- `api/routes/password.mjs` — reset-password
- `api/routes/update-user.mjs` — password change
- `plugins/admin/routes.mjs` — admin password change

**No configuration change needed.** The 8-char minimum is already enforced server-side by
default. Our client-side checks in `SignUpForm` and `ResetPasswordForm` are UX duplicates
of existing server-side enforcement — not a gap.

---

### S1-Q4 — No schema migration required

Using `secondaryStorage` (Redis) means the rate limiter writes to Redis, not the database.
No new table is needed. The only change is wiring the `secondaryStorage` adapter and enabling
rate limiting in all environments.

---

## Implementation Steps

| # | Step | File |
|---|------|------|
| 1 | Add `secondaryStorage` Redis adapter to `auth.ts` | `src/lib/auth.ts` |
| 2 | Add explicit `rateLimit` config: `enabled: true`, custom rules for `/request-password-reset` and `/reset-password` | `src/lib/auth.ts` |
| 3 | No migration needed | — |
| 4 | No change to `minPasswordLength` | — |

**Custom rule target:** `/request-password-reset` and `/reset-password` → 5 req / 60 s per IP.
Rationale: legitimate users rarely need more than a handful of reset attempts; 5/min is
generous for real use and blocks enumeration/abuse loops.

---

## Acceptance

Spike complete. We can describe:
- How rate limiting works in Better Auth v1.4.18 (built-in, top-level, IP-based)
- Which auth endpoints need custom rules and why (`/request-password-reset`, `/reset-password`)
- How to wire Upstash Redis as `secondaryStorage` without a migration
- That `minPasswordLength` is already enforced server-side at 8 — no action needed
