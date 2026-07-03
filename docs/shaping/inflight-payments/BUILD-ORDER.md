# In-Flight Payments During Connect Suspension — Build Order

## Dependency Graph

```
01-refund-fallback-catch ───────────────────────────────────────→ 09-unit-tests-refund-fallback ──┐
                                                                                                  │
02-transfer-held-schema ──┬─→ 03-detection-guard ──→ 10-unit-tests-detection-guard ──┐            │
                          │                                                          │            │
                          ├─→ 04-transfer-held-card-state ──→ 05-transfer-held-helper-text ──┐   │
                          │                                                                  │   │
                          │                                       11-unit-tests-card-state ←─┘   │
                          │                                                                  │   │
                          ├─→ 06-dashboard-action-item                                       │   │
                          │                                                                  │   │
                          └─→ 08-sweep-flag-recent ──┐                                       │   │
                                                     ├─→ 12-unit-tests-sweep ────────────────┤   │
07-sweep-cancel-pending ─────────────────────────────┘                                       │   │
                                                                                             │   │
                                                        13-integration-test ←────────────────┴───┘
```

## Phased Build Order

### Phase 1 — Foundations (no dependencies, all parallel)

| Spec | Title | Priority | Deps | File(s) |
|------|-------|----------|------|---------|
| 01 | Refund fallback catch clause | P1 CRITICAL | None | `stripe-refund.ts` |
| 02 | Transfer held schema migration | Foundation | None | `schema.ts`, migration SQL |
| 07 | Sweep — cancel pending PaymentIntents | P3 | None | `connect-webhook/route.ts` |

### Phase 2 — Core logic + P1 tests (depends on Phase 1)

| Spec | Title | Priority | Deps | File(s) |
|------|-------|----------|------|---------|
| 03 | Detection guard at payment_intent.succeeded | P2 | 02 | `webhook/route.ts` |
| 04 | Transfer held card state | P2 UI | 02 | `payment-card.tsx` |
| 06 | Dashboard action item for held transfers | P2 UI | 02 | Dashboard page |
| 08 | Sweep — flag recently-succeeded payments | P3 | 02 | `connect-webhook/route.ts` |
| 09 | Unit tests — refund fallback | P1 | 01 | Test file |

### Phase 3 — UI completion + backend tests (depends on Phase 2)

| Spec | Title | Priority | Deps | File(s) |
|------|-------|----------|------|---------|
| 05 | Transfer held helper text | P2 UI | 04 | `payment-card.tsx` |
| 10 | Unit tests — detection guard | P2 | 03 | Test file |
| 12 | Unit tests — suspension sweep | P3 | 07, 08 | Test file |

### Phase 4 — Final tests (depends on Phase 3)

| Spec | Title | Priority | Deps | File(s) |
|------|-------|----------|------|---------|
| 11 | Unit tests — card state | P2 | 04, 05 | Test file |
| 13 | Integration test — end-to-end | All | 01, 03, 07, 08 | Test file |

## Critical Path

```
02-transfer-held-schema → 04-transfer-held-card-state → 05-transfer-held-helper-text → 11-unit-tests-card-state
```

**Length**: 4 specs across 4 phases. P1 fix (spec 01) ships in Phase 1 — zero dependencies, can deploy immediately.

## Design Brief for Designer

### Designs needed (2 screens, 3 states)

| Design | Spec | Page impacted | What to design |
|--------|------|---------------|----------------|
| Transfer held card variant | 04 | Appointment detail — payment card | Payout line shows "Held" in amber/warning. Must work with `connect` and `waived` FeeState variants. Same card layout as existing refund state — orthogonal modifier, not a new card type. |
| Transfer held helper text | 05 | Appointment detail — payment card | Helper text below fee breakdown: `pause_circle` icon (amber), copy: "Payment received but transfer paused — Stripe is reviewing your account." Same position as refund helper text. |
| Dashboard action item | 06 | Shop dashboard — alerts area | Warning-style action item card. Title: "{count} payment(s) with held transfers". Body text + link to appointment(s). Disappears when resolved. Use existing alert/card system if one exists. |

### Pages impacted (summary)

| Page | Specs | Nature of change |
|------|-------|------------------|
| `payment-card.tsx` (appointment detail) | 04, 05, 11 | New modifier state (amber held), helper text swap |
| `webhook/route.ts` | 03 | Backend guard — no UI |
| `connect-webhook/route.ts` | 07, 08 | Backend sweep — no UI |
| `stripe-refund.ts` | 01 | Backend catch clause — no UI |
| `schema.ts` + migration | 02 | New column — no UI |
| Dashboard page | 06 | New action item card component |

### No design needed

| Spec | Why |
|------|-----|
| 01, 02, 03, 07, 08 | Pure backend — no visual changes |
| 09, 10, 12, 13 | Tests — no visual changes |
