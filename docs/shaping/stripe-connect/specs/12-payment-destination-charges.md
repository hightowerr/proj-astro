# 12 — Payment: Destination Charges

## Summary
Modify PaymentIntent creation to route customer deposits to the merchant's connected Stripe account, with a 50p platform application fee. Includes appointment detail UI for fee transparency.

## Design references
- Brief: `design/design-05-appointment-fee-breakdown.md`
- Mock: `design/design files/Appointment Fee Breakdown.dc.html`
- Screenshots: `design/design files/screenshots/mobile.png`, `design/design files/screenshots/mobile2.png`

## Prerequisites
- Depends on: 01 (schema), 02 (migration)

## Changes

**File:** `src/lib/queries/appointments.ts` (~line 1098-1116)

### Before (current)
```ts
paymentIntent = await stripe.paymentIntents.create({
  amount: created.amountCents,
  currency: created.currency,
  metadata: { ... },
  automatic_payment_methods: { enabled: true },
});
```

### After
```ts
// Look up shop's Connect status (already available in the transaction context)
const connectAccount = await tx.query.shops.findFirst({
  where: (table, { eq }) => eq(table.id, input.shopId),
  columns: { stripeAccountId: true, stripeOnboardingStatus: true },
});

const piParams: Stripe.PaymentIntentCreateParams = {
  amount: created.amountCents,
  currency: created.currency,
  metadata: { ... },
  automatic_payment_methods: { enabled: true },
};

if (connectAccount?.stripeAccountId && connectAccount.stripeOnboardingStatus === "complete") {
  piParams.transfer_data = { destination: connectAccount.stripeAccountId };
  piParams.application_fee_amount = 50; // 50 pence flat fee
  piParams.on_behalf_of = connectAccount.stripeAccountId;
}

paymentIntent = await stripe.paymentIntents.create(piParams);
```

### Why destination charges (not direct charges)
- Charge is created on the platform account — simpler webhook handling (events arrive at platform endpoint)
- After charge succeeds, Stripe automatically transfers funds minus the application fee to the connected account
- The `on_behalf_of` makes the connected account the business of record (statement descriptors, receipts, disputes attributed to merchant)
- No client-side changes needed — publishable key stays as the platform's

### Edge case: amount <= application fee
If the deposit amount is 50p or less, the application fee would consume the entire payment. Add a guard:
```ts
if (created.amountCents <= 50) {
  // Skip application fee — not worth it for micro-payments
  delete piParams.application_fee_amount;
}
```

### Mock system
The mock path (lines 1075-1095) generates fake `pi_test_` IDs and skips Stripe entirely. No Connect logic needed there — mocks don't route real money.

### Fee visibility in the app
The 50p platform fee must be visible to the shop owner in the appointment detail view, not just in Stripe's dashboard. Add `applicationFeeAmount` to the payment metadata or store it alongside the payment record.

Without this, shop owners discover discrepancies between what customers paid and what they received, then lose trust. The System 1/System 2 principle (Blinkist case study) shows that hidden fees trigger "deceptive T&C" pattern recognition — even when the fee was disclosed upfront, if it's not visible at the point of transaction the user feels deceived.

### Payment card — 5 states on appointment detail

**Design references:** `design/design-05-appointment-fee-breakdown.md`, `design/design files/Appointment Fee Breakdown.dc.html`, `design/design files/screenshots/mobile.png`

The appointment detail page (`/app/app/appointments/[id]`) Payment card renders one of five states based on the payment context. The card uses the existing admin card pattern (`rounded-lg border p-4 space-y-2`).

**State 1: `connect`** — Stripe Connect payment with fee breakdown
- Header shows "Stripe Connect" badge with `account_balance` icon
- Ledger rows (right-aligned mono amounts for scanability):
  ```
  Deposit          10.00
  Platform fee     -0.50
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  Your payout       9.50   ← dashed-top border, 19px weight 800, al-primary, mono
  ```
- "Platform fee" line: minus prefix, `text-al-on-surface-variant` (muted) — not red (it's a deduction, not an error)
- "Your payout" line: `font-semibold` or `font-bold` — this is the number the owner cares about
- Footer: "Payout routed to your connected bank account." with `north_east` icon
- Below: payment status pill ("Succeeded" green), Outcome, Resolved timestamp

**State 2: `waived`** — fee waived (deposit ≤50p)
```
Deposit          0.50
Platform fee     Waived     ← italic, text-al-on-surface-variant
Your payout      0.50
```
Show "Waived" rather than silently omitting the line. Consistency prevents confusion when the owner compares transactions.

**State 3: `legacy`** — pre-Connect payment (no transfer_data)
```
Amount           10.00      ← single row, no fee breakdown, no badge
```
Use "Amount" label (not "Deposit") since money went to the platform account, not the merchant's connected account. Maintains backward compatibility with pre-Connect records.

**State 4: `skipped`** — no deposit collected due to Connect not set up
- Notice mode with `link_off` icon
- Title: **"No deposit collected"** — bold/semibold
- Body: "Stripe was not connected when this booking was made, so no deposit could be held." — `text-al-on-surface-variant`, `text-sm`
- "Connect Stripe →" link: only shown if `stripeOnboardingStatus !== "complete"` at view time. `text-al-primary` with arrow. Disappears after owner connects (no nagging on historical records)
- No red/error styling — factual record, neutral card styling

**State 5: `policy`** — no deposit required by shop policy
- Notice mode with `check_circle` icon
- Title: **"No deposit required"**
- Body: "This booking followed your payment policy, which does not collect a deposit."
- No connect link

### State routing logic
```
if (payment exists && payment.transfer_data):
  if (applicationFeeAmount > 0): → "connect"
  else: → "waived"
elif (payment exists && !payment.transfer_data): → "legacy"
elif (depositSkipped === "connect_not_complete"): → "skipped"
elif (depositSkipped === "policy_none"): → "policy"
```

## Acceptance
- PaymentIntents for connected shops include `transfer_data.destination` and `application_fee_amount: 50`
- PaymentIntents for non-connected shops create without `transfer_data` (fallback, shouldn't happen in production due to guard spec 14)
- Stripe Dashboard shows the payment on the platform account with a transfer to the connected account
- 50p application fee visible in Stripe Dashboard
- Application fee amount is stored/retrievable for display in the appointment detail view
- Appointment detail payment card renders correct state (connect/waived/legacy/skipped/policy)
- Fee breakdown shows right-aligned mono amounts with dashed separator before payout total
- "Connect Stripe" link in skipped state only appears when owner hasn't connected yet
- Pre-Connect payment records show "Amount" (not "Deposit") with no fee breakdown
