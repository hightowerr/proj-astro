# MCC Hardcoded — Slices

## Wave Structure

2 implementation waves + 1 post-deploy wave. Spec 05 (codebase audit) is documentation-only and already complete.

### Wave 1 — Foundation (specs 01 + 05)

| Slice | Spec | Description | Files | Parallel? |
|-------|------|-------------|-------|-----------|
| 1-1 | 01 | MCC mapping module | `src/lib/mcc-mapping.ts` (new) | YES |
| 1-2 | 05 | Codebase businessType audit | Documentation only | YES (already complete) |

No file contention — fully parallel.

### Wave 2 — Integration + Guard (specs 02 + 03)

| Slice | Spec | Description | Files | Parallel? |
|-------|------|-------------|-------|-----------|
| 2-1 | 02 | Route integration | `create-account/route.ts` | YES |
| 2-2 | 03 | Schema guard test | `src/lib/mcc-mapping.test.ts` (new) | YES |

No file contention — fully parallel. Both depend on spec 01 (wave 1).

### Wave 3 — Post-Deploy (spec 04)

| Slice | Spec | Description | Files | Parallel? |
|-------|------|-------------|-------|-----------|
| 3-1 | 04 | Existing shop MCC audit | `scripts/audit-mcc.ts` (new) | N/A |

**Deferred** — requires deployment of waves 1-2 first. Can only be run against production Stripe accounts.

## Critical Path

```
Wave 1 (spec 01) → Wave 2 (specs 02 + 03) → Wave 3 (spec 04, post-deploy)
```

## Implementation Notes

- **No UI slices** — all backend/test code. No design system, no visual verification.
- **No file contention within any wave** — all slices within a wave touch different files.
- **Wave 3 is optional for loop completion** — it's a post-deploy verification script, not a code change. The loop can exit after wave 2 verification.
