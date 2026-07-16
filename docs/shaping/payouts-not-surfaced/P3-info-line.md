# P3 — Payouts verifying info box in ConnectedView

## Summary

When `payoutsEnabled=false`, display an informational box below the account details card explaining that Stripe is verifying payout details and deposits can still be accepted.

## Problem

The "Verifying" status dot (P2) tells the merchant *what* the state is, but not *what it means for them*. Without an info line, a merchant seeing "Verifying" next to payouts has no guidance: Are deposits still being accepted? Is money being lost? What should they do?

## Scope

**File:** `src/components/settings/stripe-connect-card.tsx`

### Changes

1. In `ConnectedView`, when `payoutsEnabled === false`, render an info box below the account details card (after the `rounded-xl p-4 space-y-3` div, before the "Open Stripe Dashboard" button).
2. Style per design prototype (differs from VerifyingView):
   - Container: `rounded-xl`, `padding: 14px 16px`, `gap: 11px`, `margin-top: 16px`, `background: var(--al-surface-container)`
   - Icon: `info` material symbol (20px) in `var(--al-on-surface-variant)`, `flex: none`
   - Text: `font-size: 13.5px`, `line-height: 1.55`, `color: var(--al-on-surface-variant)`
3. Copy: **"Stripe is verifying your payout details — this usually takes a few minutes. You can still accept deposits in the meantime."**

### Copy rationale

- **"Stripe is verifying your payout details"** — leads with what's happening, attributes to Stripe.
- **"this usually takes a few minutes"** — sets a soft expectation without a hard promise.
- **"You can still accept deposits in the meantime"** — reassurance that money isn't being lost.

### Design note

The info box tokens differ from VerifyingView's info box:
- Background: `--al-surface-container` (not `--al-surface-container-low`)
- Icon color: `--al-on-surface-variant` (not `--al-primary`)
- Spacing: `padding: 14px 16px`, `gap: 11px` (not `p-4 gap-3`)
These are intentional per the design prototype — the connected-state info box is subtler than the verifying-state one.

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
- Info box uses `var(--al-surface-container)` background, `var(--al-on-surface-variant)` icon and text.
- Copy matches spec exactly: "Stripe is verifying your payout details — this usually takes a few minutes. You can still accept deposits in the meantime."
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
