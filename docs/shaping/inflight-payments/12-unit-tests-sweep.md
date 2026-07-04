# Spec 12: Unit Tests — Suspension Sweep

**Priority**: P3 (ships with specs 07-08)

## Summary
Unit tests for the suspension sweep logic added in specs 07 and 08.

## Test cases — Cancel pending (spec 07)
1. **No pending appointments** — sweep runs, no Stripe calls made
2. **Pending appointments cancelled** — 2 pending appointments with PI IDs → both PI.cancel() called
3. **PI already succeeded in race** — cancel throws "already succeeded" → logged, continues to next
4. **PI already cancelled** — cancel is idempotent → no error
5. **Non-suspension status change** — charges_enabled stays true → sweep not triggered

## Test cases — Flag recent (spec 08)
6. **No recent payments** — no appointments match 1-hour window → no updates
7. **Recent payment flagged** — paid appointment within 1 hour → transferHeld set to true
8. **Old payment not flagged** — paid appointment 2 hours ago → not touched
9. **Already flagged** — transferHeld already true → no double-update

## Scope
- **File**: test file for connect-webhook handler
- Mock Stripe API and DB queries

## Dependencies
- **Requires**: Spec 07, Spec 08 (code under test)

## Out of scope
- Integration test with real webhooks (see spec 13)
