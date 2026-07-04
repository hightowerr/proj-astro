# Spec 08: Suspension Sweep — Flag Recently-Succeeded Payments

**Priority**: P3 (MEDIUM)

## Summary
When `charges_enabled` flips to `false` in `connect-webhook/route.ts`, also scan for recently-succeeded payments (last 1 hour) for this shop and flag them with `transferHeld: true`. These are payments that completed in the race window between suspension and webhook delivery.

## Behaviour
- Trigger: same `account.updated` event as spec 07 (co-located in the same handler)
- Query: appointments for this shop where `paymentStatus === "paid"` AND `updatedAt > (now - 1 hour)` AND `transferHeld === false`
- For each matching appointment:
  1. Update: `transferHeld: true`
  2. `console.warn("Flagged recent payment %s as transferHeld — shop %s suspended", appointmentId, shopId)`
- 1-hour window is conservative — covers webhook delivery delay + payment processing time

## Scope
- **File**: `src/app/api/stripe/connect-webhook/route.ts` — `account.updated` handler, after spec 07's cancellation logic
- Single DB update query (batch-capable)

## Dependencies
- **Requires**: Spec 02 (transferHeld column exists)

## Out of scope
- UI display of flagged payments (handled by specs 04, 05, 06)
- Cancelling pending PaymentIntents (see spec 07 — separate concern)
