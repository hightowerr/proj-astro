# P2 — Data-driven payouts status row in ConnectedView

## Summary

The `ConnectedView` sub-component (`stripe-connect-card.tsx:378-398`) hardcodes "Payouts enabled: Active" with a green dot — static markup, not data-driven. This must become conditional on the `payoutsEnabled` prop.

## Problem

A merchant can be `complete` (`charges_enabled=true`, `details_submitted=true`) but have `payouts_enabled=false` (bank details pending Stripe verification). The hardcoded green "Active" status is an explicit trust contract — the platform promises payouts are working when they may not be.

## Scope

**File:** `src/components/settings/stripe-connect-card.tsx`

### Changes

1. Add `payoutsEnabled?: boolean` to `StripeConnectCardProps` (defaults to `true` for backwards compat).
2. Thread `payoutsEnabled` from `StripeConnectCard` through to `ConnectedView` props.
3. Replace the hardcoded "Payouts enabled" row (lines 378-398) with a conditional:
   - `payoutsEnabled === true` — green dot (`var(--al-status-positive)`) + "Payouts enabled" in `var(--al-on-surface)` (current display, now truthful)
   - `payoutsEnabled === false` — neutral dot (`var(--al-outline-variant)`) + "Payouts verifying" in `var(--al-on-surface-variant)` (process language, not error language)

### Constraints

- **"Payouts verifying" not "Disabled"** — nothing has failed. Stripe is completing a process.
- **Neutral dot, not amber/red** — this is a process state, not an error or warning.
- **No time estimate** — "usually 1-3 days" creates a new trust contract that could break.

## Dependencies

- **Requires P1** — the `payoutsEnabled` prop must be passed from the page component.

## Acceptance criteria

- When `payoutsEnabled=true`: green dot (`--al-status-positive`) + "Payouts enabled" in `--al-on-surface` (identical to current display).
- When `payoutsEnabled=false`: neutral dot (`--al-outline-variant`) + "Payouts verifying" in `--al-on-surface-variant`.
- Prop defaults to `true` — no visual regression if prop is omitted.
- No changes to Charges enabled row or any other row.

## Decision log

| Considered | Rejected because |
|---|---|
| "Disabled" label | Error language; nothing has failed — this is a normal process state |
| Amber/warning dot color | Implies something is wrong; Stripe is completing verification normally |
| "Pending" label | Too generic, doesn't communicate what's happening |
