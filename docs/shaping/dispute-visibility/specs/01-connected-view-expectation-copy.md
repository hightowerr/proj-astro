# Spec 01 — P1: Expectation-setting copy in ConnectedView

## Priority

P1 — HIGH. Independent. Ship standalone.

## Summary

Add a single line of expectation-setting copy to `ConnectedView` so merchants know they handle disputes through their Stripe Dashboard. Progressive disclosure — placed below the celebration copy, not in onboarding (would kill conversion for a rare event).

## Changes

- **File:** `src/components/settings/stripe-connect-card.tsx`
- **Location:** `ConnectedView` component, between the account details card (line ~425) and the "Review your deposit policy" link (line ~476). Insert after the `!payoutsEnabled` info box block.
- **New element:**
  ```tsx
  <p
    className="mt-4 text-xs leading-relaxed"
    style={{ color: "var(--al-on-surface-variant)", opacity: 0.7 }}
  >
    Since deposits go directly to you, you&apos;ll handle any customer
    disputes through your Stripe Dashboard.
  </p>
  ```

## Design Notes

- **Styling:** `text-xs leading-relaxed` + `--al-on-surface-variant` + `opacity: 0.7` — matches the "50p platform fee" line in `StartView` (line 57-61). Informational, not alarming.
- **Placement:** Below celebration copy and account details card, above "Review your deposit policy" link. The celebrate copy ("You're all set!") is NOT modified — expectation-setting goes below it.
- **Do NOT** add dispute copy to `StartView` (kills conversion at highest-friction moment).

### Pages impacted

- `/app/settings/stripe-connect` — `ConnectedView` within `StripeConnectCard`

## Acceptance Criteria

- [ ] Copy renders in `ConnectedView` below the account details card
- [ ] Styled as `text-xs`, `--al-on-surface-variant`, `opacity: 0.7`
- [ ] Does NOT appear in `StartView`, `PendingView`, or `VerifyingView`
- [ ] `pnpm check` passes

## Prerequisites

None.

## Dependencies

None — fully independent.
