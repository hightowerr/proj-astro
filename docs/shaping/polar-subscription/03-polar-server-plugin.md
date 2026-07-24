# 03 — Polar Server Plugin

## Summary
Wire the `@polar-sh/better-auth` server plugin into `auth.ts` with checkout and webhook configuration.

## Prerequisites
- **02-polar-env-vars** — needs `POLAR_ACCESS_TOKEN` and `POLAR_WEBHOOK_SECRET` available

## Changes

### `src/lib/auth.ts`
- Import `polar` from `@polar-sh/better-auth`
- Add to `plugins` array:
  - `polar({ client: polarClient })` with:
    - `createCustomerOnSignUp: true` (spike resolved: Polar docs recommend proactive creation at signup)
    - Checkout config: product ID for "ShowUp Pro", `authenticatedUsersOnly: true`
    - Webhooks config with `secret` from env
    - Named callbacks: `onSubscriptionActive`, `onSubscriptionUpdated`, `onSubscriptionRevoked`, `onSubscriptionCreated`, `onSubscriptionCanceled`, `onSubscriptionUncanceled`
    - Callbacks are stubs initially — actual logic in spec 05 (webhook handler)

### `src/lib/polar.ts` (new file)
- Polar SDK client singleton using `POLAR_ACCESS_TOKEN`
- Export for reuse in webhook handler and reconciliation

### Package install
- `npm install @polar-sh/better-auth @polar-sh/sdk`

## Spike dependency — RESOLVED
- Spike confirmed: `createCustomerOnSignUp: true` is the recommended approach. Customer exists before checkout, enabling reliable portal access and webhook customer ID resolution.

## Design brief
None — backend only.
