# 02 — Route Integration: Dynamic MCC Assignment

## Summary
Replace the hardcoded `mcc: "7241"` in the Connect account creation route with a dynamic lookup from `shop.businessType`.

## Prerequisites
- Depends on: 01 (mcc-mapping-module)

## Changes

**Modified file:** `src/app/api/settings/stripe-connect/create-account/route.ts`

### Before (line 50)
```ts
business_profile: {
  mcc: "7241",
  url: `${appUrl}/book/${shop.slug}`,
},
```

### After
```ts
import { getMccForBusinessType } from "@/lib/mcc-mapping";

// ...

business_profile: {
  mcc: getMccForBusinessType(shop.businessType),
  url: `${appUrl}/book/${shop.slug}`,
},
```

### Behaviour change

| `shop.businessType` | Before | After |
|---------------------|--------|-------|
| `"hair"` | 7241 | 7241 (unchanged) |
| `"beauty"` | 7241 | 7230 |
| `"spa-massage"` | 7241 | 7297 |
| `"health-clinic"` | 7241 | 8099 |
| `"personal-trainer"` | 7241 | 7941 |
| `"general-services"` | 7241 | 7299 |
| `null` (pre-migration) | 7241 | 7299 (default) |

### Risk
- **Existing shops are unaffected** — MCC is set only at account creation time (`stripe.accounts.create`). Shops with an existing `stripeAccountId` skip this code path (line 38 check).
- **Stripe may override** — During Express verification, Stripe can auto-assign a different MCC. The platform's assignment is a best-effort starting point. See roadmap item "Stripe MCC feedback loop" for reconciliation.

### UX note
No user-facing change. The MCC is internal to Stripe's risk and interchange systems. Merchants never see it in the app.

## Acceptance
- New Express accounts are created with the correct MCC for their `businessType`
- `hair` merchants still get `7241` (no regression)
- A shop with `null` businessType gets `7299` (safe fallback)
- No changes to existing shops' Stripe accounts
