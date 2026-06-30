# 04 — Env: Connect Webhook Secret

## Summary
Add `STRIPE_CONNECT_WEBHOOK_SECRET` to environment variable validation and the example env file.

## Prerequisites
None.

## Changes

**File:** `src/lib/env.ts`

Add to `serverEnvSchema`:
```ts
STRIPE_CONNECT_WEBHOOK_SECRET: z.string().min(1).optional(),
```

Optional in development (Connect webhook can be tested via manual status polling). Required in production — add a warning in `checkEnv()` if missing.

**File:** `env.example`

Add:
```
# Stripe Connect (for merchant deposit routing)
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
```

**File:** `.env` (local dev)

Add placeholder:
```
STRIPE_CONNECT_WEBHOOK_SECRET=
```

## Acceptance
- App starts without the variable set (optional)
- `checkEnv()` warns if missing in development
- `env.example` documents the new variable
