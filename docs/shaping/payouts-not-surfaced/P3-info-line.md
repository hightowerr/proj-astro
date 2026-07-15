# P3 — Payouts verifying info box in ConnectedView

## Summary

When `payoutsEnabled=false`, display an informational box below the account details card explaining that deposits are being collected but Stripe is still verifying bank details for payouts.

## Problem

The "Verifying" status dot (P2) tells the merchant *what* the state is, but not *what it means for them*. Without an info line, a merchant seeing "Verifying" next to payouts has no guidance: Are deposits still being accepted? Is money being lost? What should they do?

## Scope

**File:** `src/components/settings/stripe-connect-card.tsx`

### Changes

1. In `ConnectedView`, when `payoutsEnabled === false`, render an info box below the account details card (after the `rounded-xl p-4 space-y-3` div, before the "Open Stripe Dashboard" button).
2. Match the existing `VerifyingView` info box pattern (lines 243-261):
   - Container: `rounded-xl p-4`, `background: var(--al-surface-container-low)`
   - Icon: `info` material symbol in `var(--al-primary)`
   - Text: `var(--al-on-surface-variant)`, `text-sm leading-relaxed`
3. Copy: **"Deposits are being collected. Stripe is still verifying your bank details for payouts — check your Stripe Dashboard."**

### Copy rationale

- **"Deposits are being collected"** — leads with reassurance (money isn't being lost).
- **"Stripe is still verifying your bank details"** — explains the state, attributes it to Stripe.
- **"for payouts"** — clarifies what's being verified (not the whole account).
- **"still"** — implies progress, not stuck state.
- **"check your Stripe Dashboard"** — provides an action path.
- **No time estimate** — avoids creating a new promise that could break.

### Constraints

- **Informational styling only** — not amber/warning, not red/error. Nothing has failed.
- **Does NOT modify celebrate copy** — "You're all set!" remains. The info line below sets expectations without undermining the celebration moment.
- **`aria-live="polite"`** on the info container for accessibility.

## Dependencies

- **Requires P1** — the `payoutsEnabled` prop must be passed from the page component.
- **Requires P2** — the component must accept and thread the `payoutsEnabled` prop.

## Acceptance criteria

- When `payoutsEnabled=false`: info box appears below account details, above the Dashboard button.
- When `payoutsEnabled=true`: info box does not render.
- Info box uses `var(--al-surface-container-low)` background, `var(--al-primary)` icon, `var(--al-on-surface-variant)` text.
- Copy matches spec exactly.
- Box has `aria-live="polite"`.
- Celebrate state ("You're all set!") is unchanged.

## Decision log

| Considered | Rejected because |
|---|---|
| Amber/warning styling | Nothing has failed — this is a process state |
| Red/error styling | Even more inappropriate — no error has occurred |
| Time estimate ("usually 1-3 days") | Creates a new trust contract that could break |
| Modify celebrate copy "You're all set!" | Info line below sets expectations without undermining celebration |
| Block deposits while `payouts_enabled=false` | Disproportionate — merchant can accept payments, Stripe releases funds automatically |
