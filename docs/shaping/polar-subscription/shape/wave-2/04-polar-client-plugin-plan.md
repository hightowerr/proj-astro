# Wave 2 — Slice 2a: Polar Client Plugin

## Spec

04-polar-client-plugin.md

## Files to create/modify

- **Modify**: `src/lib/auth-client.ts` — add Polar client plugin to createAuthClient

## Dependencies

- Wave 1 slice 1c (03-polar-server-plugin) — client plugin must match server plugin.

## Acceptance Criteria

1. Import `polar` from `@polar-sh/better-auth/client`.
2. Add `polar()` to the `createAuthClient` plugins array.
3. Export `authClient.checkout` and `authClient.customerPortal` (either directly or via the authClient object).
4. `pnpm check` passes with zero new errors.
