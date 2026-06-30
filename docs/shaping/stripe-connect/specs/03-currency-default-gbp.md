# 03 — Currency: USD to GBP Default

## Summary
Change the hardcoded default currency from `"USD"` to `"GBP"` across the codebase. Existing shop policies in the DB retain their currency; only new shops default to GBP.

## Prerequisites
None.

## Changes

| File | Line(s) | Change |
|------|---------|--------|
| `src/lib/queries/appointments.ts` | 51 | `DEFAULT_PAYMENT_POLICY.currency`: `"USD"` -> `"GBP"` |
| `src/lib/queries/appointments.ts` | 802 | `let currency = "USD"` -> `"GBP"` |
| `src/components/booking/booking-form.tsx` | 445 | `useState("USD")` -> `useState("GBP")` |

GBP is already in the currency symbol maps at:
- `src/components/payments/tier-policy-form.tsx:65` (`GBP: "\u00A3"`)
- `src/components/payments/payment-policy-form.tsx:29` (`GBP: "\u00A3"`)

No changes needed there.

## Not changed
- Existing `shopPolicies` / `policyVersions` rows in the DB — they represent historical terms
- Test fixtures — update separately if tests break (most tests explicitly set currency)
- Kicksnare's existing policy — handled by spec 15 (guard-dashboard-warning is wrong, it's a separate migration concern)

## Acceptance
- New shops created via onboarding default to GBP currency
- Existing shops retain their configured currency
- Booking form displays GBP symbol for new shops
