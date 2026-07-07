# MCC Hardcoded — Build Order

## Dependency Graph

```
01 mcc-mapping-module ──┬── 02 route-integration ── 04 existing-shop-audit
                        └── 03 schema-guard-test

05 codebase-businesstype-audit (independent)
```

## Phased Build Order

### Phase 1 — Foundation (no dependencies, all parallel)

| Spec | Description | Files | Est. |
|------|-------------|-------|------|
| 01 | MCC mapping module — lookup table + helper | `src/lib/mcc-mapping.ts` (new) | S |
| 05 | Codebase-wide businessType audit — document findings | Documentation only | S |

### Phase 2 — Integration + Guard (depends on Phase 1)

| Spec | Description | Files | Est. |
|------|-------------|-------|------|
| 02 | Route integration — replace hardcoded MCC | `src/app/api/settings/stripe-connect/create-account/route.ts` | S |
| 03 | Schema guard test — prevent recurrence | `src/lib/mcc-mapping.test.ts` (new) | S |

### Phase 3 — Post-Deploy Verification (depends on Phase 2 deployed)

| Spec | Description | Files | Est. |
|------|-------------|-------|------|
| 04 | Existing shop MCC audit — one-time script | `scripts/audit-mcc.ts` (new) | S |

## Critical Path

```
01 mcc-mapping-module → 02 route-integration → 04 existing-shop-audit
```

Longest sequential chain: **3 specs across 3 phases**.

## Design Brief

### Design impact: NONE

This is a **backend-only change**. No UI pages are added, modified, or removed. No visual changes to any screen.

| Page | Impact | Designer action |
|------|--------|-----------------|
| Onboarding — Business Type Step | None — already collects `businessType` correctly | No mockup needed |
| Settings — Stripe Connect | None — MCC is internal to Stripe, not displayed in the app | No mockup needed |
| Booking page | None — no customer-facing change | No mockup needed |
| Dashboard | None — no display change | No mockup needed |

### Why no design work

The MCC (Merchant Category Code) is a Stripe-internal classification that affects:
- Card issuer fraud scoring
- Interchange fee tables
- Regulatory categorisation

It is never displayed to merchants or customers in the app. The fix routes an existing data point (`shop.businessType`, already collected in onboarding Step 1) to an existing API parameter (`business_profile.mcc`, already sent to Stripe). No new UI, no copy changes, no state changes.

### Future design considerations (parked)

If/when the "Stripe MCC feedback loop" roadmap item ships (reconciliation of platform MCC vs Stripe-assigned MCC), there may be a need to surface MCC discrepancies to an admin view. Not in scope for this feature.

## Files Changed Summary

| File | Change type | Spec |
|------|-------------|------|
| `src/lib/mcc-mapping.ts` | New | 01 |
| `src/app/api/settings/stripe-connect/create-account/route.ts` | Modified (1 line + 1 import) | 02 |
| `src/lib/mcc-mapping.test.ts` | New | 03 |
| `scripts/audit-mcc.ts` | New (one-time, disposable) | 04 |
| `docs/shaping/stripe-connect/specs/05-api-create-connect-account.md` | Updated (document dynamic MCC) | 05 |
