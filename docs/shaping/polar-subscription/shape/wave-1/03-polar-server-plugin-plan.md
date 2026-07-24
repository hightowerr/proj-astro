# Wave 1 — Slice 1c: Polar Server Plugin

## Spec

03-polar-server-plugin.md

## Files to create/modify

- **Modify**: `src/lib/auth.ts` — add Polar plugin to Better Auth plugins array
- **Create**: `src/lib/polar.ts` — Polar SDK client singleton
- **Install**: `@polar-sh/better-auth`, `@polar-sh/sdk`

## Dependencies

- Slice 1b (02-polar-env-vars) — needs `POLAR_ACCESS_TOKEN` and `POLAR_WEBHOOK_SECRET` in env schema.

## Acceptance Criteria

1. Install `@polar-sh/better-auth` and `@polar-sh/sdk` via `pnpm add`.
2. Create `src/lib/polar.ts` that exports a Polar SDK client singleton using `POLAR_ACCESS_TOKEN` from env.
3. Import and add the `polar()` plugin to the `betterAuth` plugins array in `auth.ts`.
4. Set `createCustomerOnSignUp: true` in the plugin config (per spike finding).
5. Configure checkout with the ShowUp Pro product ID and `authenticatedUsersOnly: true`.
6. Configure webhooks with `secret` from `POLAR_WEBHOOK_SECRET` env var.
7. Add 6 named webhook callback stubs: `onSubscriptionActive`, `onSubscriptionUpdated`, `onSubscriptionRevoked`, `onSubscriptionCreated`, `onSubscriptionCanceled`, `onSubscriptionUncanceled`. Each stub logs at info level and returns.
8. `pnpm check` passes with zero new errors.
