# Kicksnare Migration — Build Order

## Dependency Graph

```
Spec 01 (dashboard fallback)     Spec 02 (appointments fallback)
         │                                │
         └───── no dependencies ──────────┘
              (fully independent)
```

No inter-dependencies. Both specs modify different files with identical logic.

## Phased Build

### Phase 1 — Query fallbacks (parallel)

| Spec | File | Change | Depends on |
|------|------|--------|------------|
| 01 | `dashboard/page.tsx` | Add `OR (isNull(depositSkipped) AND paymentStatus = 'unpaid')` to unprotected count query | — |
| 02 | `appointments/page.tsx` | Same OR clause on the appointments inline banner query | — |

Both specs can be implemented **in parallel** — zero shared state, different files, identical pattern.

## Critical Path

```
Spec 01 (or Spec 02)
```

**Length: 1 step.** Both specs are leaves with no dependencies. The critical path is a single spec (either one). Total feature is 1 phase.

## Scope

- **Files modified:** 2 (`dashboard/page.tsx`, `appointments/page.tsx`)
- **Lines changed per file:** ~8 (import addition + WHERE clause expansion + comment)
- **New files:** 0
- **Schema changes:** 0
- **Migrations:** 0
- **Tests:** 0 (query correctness is verified by visual state change — Tier 1→Tier 2 on dashboard, banner appears on appointments)

## Cross-dependency (not in scope)

The `transferHeldWhere` query on `dashboard/page.tsx:45-49` also filters appointments but uses different columns (`transferHeld`, `financialOutcome`). No interaction with the `depositSkipped` fallback.

## Architecture doc updates needed

See `architecture-updates.md` in this directory.
