# Wave 1 — Slice 1b: Polar Environment Variables

## Spec

02-polar-env-vars.md

## Files to create/modify

- **Modify**: `src/lib/env.ts` — add `POLAR_ACCESS_TOKEN` and `POLAR_WEBHOOK_SECRET` to server env schema

## Dependencies

None. This slice runs in parallel with slice 1a.

## Acceptance Criteria

1. Add `POLAR_ACCESS_TOKEN` to `serverEnvSchema` as `z.string().min(1)`.
2. Add `POLAR_WEBHOOK_SECRET` to `serverEnvSchema` as `z.string().min(1).optional()` — follow the `STRIPE_CONNECT_WEBHOOK_SECRET` pattern.
3. Add a production guard in `checkEnv()` that throws if `POLAR_WEBHOOK_SECRET` is missing in production.
4. Add a development warning in `checkEnv()` when `POLAR_WEBHOOK_SECRET` is absent.
5. `pnpm check` passes with zero new errors.
