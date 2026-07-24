# 04 — Polar Client Plugin

## Summary
Wire the `@polar-sh/better-auth` client plugin into `auth-client.ts` so checkout and portal are available client-side.

## Prerequisites
- **03-polar-server-plugin** — client plugin must match server plugin

## Changes

### `src/lib/auth-client.ts`
- Import `polar` from `@polar-sh/better-auth/client`
- Add to `createAuthClient` plugins array
- Exposes `authClient.checkout()` and `authClient.customerPortal()` for use in paywall and billing pages

## Design brief
None — wiring only. Consumed by specs 09 (paywall) and billing settings page.
