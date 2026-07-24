# 02 — Polar Environment Variables

## Summary
Add Polar credentials to the Zod-validated env schema.

## Prerequisites
None — can run in parallel with schema migration.

## Changes

### `src/lib/env.ts`
- Add to server env schema:
  - `POLAR_ACCESS_TOKEN`: `z.string().min(1)` (required)
  - `POLAR_WEBHOOK_SECRET`: `z.string().min(1)` (required in production, optional in dev — follow `STRIPE_CONNECT_WEBHOOK_SECRET` pattern)

### `.env.example`
- Add placeholder entries for both vars.

### Vercel environment variables
- Set `POLAR_ACCESS_TOKEN` and `POLAR_WEBHOOK_SECRET` in Vercel project settings (production + preview).

## Design brief
None — configuration only.
