# Spike: `paymentsEnabled` Threading

## Context
Spec 14 changes `paymentsEnabled` from hardcoded `true` to dynamic based on Connect status. Need to verify exact locations and branching.

## Findings

### S3-Q1: Hardcoded locations confirmed
`src/app/book/[slug]/page.tsx` — `paymentsEnabled={true}` appears **3 times**:
- **Line 79**: `<BookingForm>` when `?service=` query param selects a specific service
- **Line 111**: `<BookingForm>` when exactly 1 active event type (auto-select)
- **Line 158**: `<ServiceSelector>` when 2+ active event types (multi-service picker)

### S3-Q2: `getShopBySlug()` column selection
`src/lib/queries/shops.ts:56-60`:
```ts
export const getShopBySlug = async (slug: string) => {
  return await db.query.shops.findFirst({
    where: (table, { eq }) => eq(table.slug, slug),
  });
};
```
**No explicit column selection** — returns ALL columns from `shops`. New columns (like `stripeOnboardingStatus`) will be automatically available after migration. No query change needed.

### S3-Q3: Branching in booking-form.tsx
`src/components/booking/booking-form.tsx` — prop declared optional, defaults to `false` (line 38/418). Five decision points:

1. **Line 759-761 (endpoint selection)**: `paymentsEnabled ? "/api/bookings/create" : "/api/appointments"` — the core fork between paid and free flow
2. **Line 814-817 (bookingUrl)**: only stores redirect URL if `paymentsEnabled && data.paymentRequired`
3. **Lines 829-847 (browser URL replace)**: only does `history.replaceState` if paid + required
4. **Lines 849-864 (payment init)**: only sets `clientSecret`, `paymentAmountCents`, etc. if paid
5. **Line 956 (Stripe Elements render)**: `if (paymentsEnabled && clientSecret)` renders the full payment UI block (lines 956-1063)

When `false`: form submits to `/api/appointments`, immediately sets `success = true`, shows confirmation. **Clean, complete branching — no broken states.**

### S3-Q4: ServiceSelector
`src/components/booking/service-selector.tsx` — pure pass-through. Declares `paymentsEnabled: boolean` in props (line 21), passes to `<BookingForm>` (line 76). No branching on the value.

## Decision
The change is surgical:
```tsx
// In page.tsx, after fetching shop:
const canAcceptPayments = shop.stripeOnboardingStatus === "complete";
// Replace all 3 instances of paymentsEnabled={true} with paymentsEnabled={canAcceptPayments}
```
No query change needed (`getShopBySlug` returns all columns). Downstream components already handle `false` gracefully.
