# Slice 1 — Raise MAX_SERVICE_DURATION_MINUTES to 480

**Spec**: 01
**Wave**: 1 (foundation)
**Effort**: Trivial (1 line)

## Change

`src/app/app/settings/services/constants.ts`:

```diff
- export const MAX_SERVICE_DURATION_MINUTES = 240;
+ export const MAX_SERVICE_DURATION_MINUTES = 480;
```

## Files to modify

| File | Change |
|------|--------|
| `src/app/app/settings/services/constants.ts` | Change `240` → `480` |

## Acceptance criteria

1. `MAX_SERVICE_DURATION_MINUTES` equals `480`
2. The Zod schema in `actions.ts` (line ~39-41) inherits the new max via the existing reference — no separate change needed
3. `pnpm check` clean

## Dependencies

None — this is the foundation slice.
