# T1 — Add tripwire comment on createAppointment paymentsEnabled default

## Classification
**Type:** Defensive documentation — future-caller safety net
**Risk:** None — comment only
**File:** `src/lib/queries/appointments.ts`

## Problem
`createAppointment()` at line ~828 defaults `paymentsEnabled` to `true` when the caller omits it:
```typescript
const paymentsEnabled = input.paymentsEnabled ?? true;
```

Any new entry point (admin tool, API integration, automated rebooking) that forgets to derive `paymentsEnabled` from Connect status will silently get `true`, potentially misrouting payments. This is a latent anti-pattern.

## Change
Add a comment above line ~828:

```typescript
// TRIPWIRE: paymentsEnabled defaults to true. Any new caller MUST derive this
// from shop.stripeOnboardingStatus === "complete". Hardcoding true bypasses the
// Connect guard and can route deposits to the platform account instead of the
// merchant. See: docs/shaping/connect-guard/F1-money-routing.md
const paymentsEnabled = input.paymentsEnabled ?? true;
```

## Dependencies
- **Requires:** nothing
- **Blocks:** nothing
- **Independent of:** all other specs

## Verification
- `pnpm check` passes (comment-only change)

## Design impact
None.
