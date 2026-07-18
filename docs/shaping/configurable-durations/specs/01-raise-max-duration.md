# Spec 01 — Raise MAX_SERVICE_DURATION_MINUTES to 480

**Priority**: P0 (foundation — other specs reference this constant)
**Type**: Constant change
**Risk**: Trivial

## Change

`src/app/app/settings/services/constants.ts` line 1:

```diff
- export const MAX_SERVICE_DURATION_MINUTES = 240;
+ export const MAX_SERVICE_DURATION_MINUTES = 480;
```

## Dependencies

None.

## Acceptance Criteria

1. `MAX_SERVICE_DURATION_MINUTES` equals `480`.
2. The Zod schema in `actions.ts` line 39-41 inherits the new max via the existing `MAX_SERVICE_DURATION_MINUTES` reference — no separate change needed.
3. `pnpm check` clean.
