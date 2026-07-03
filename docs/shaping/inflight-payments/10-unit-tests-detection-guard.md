# Spec 10: Unit Tests — Detection Guard

**Priority**: P2 (ships with spec 03)

## Summary
Unit tests for the detection guard added in spec 03.

## Test cases
1. **Shop not suspended** — payment_intent.succeeded + shop status "complete" → transferHeld stays false
2. **Shop suspended** — payment_intent.succeeded + shop status "suspended" → transferHeld set to true
3. **Shop pending** — payment_intent.succeeded + shop status "pending" → transferHeld stays false (pending ≠ suspended)
4. **No connected account** — payment without transfer_data (legacy/direct) → guard skipped entirely
5. **Guard is post-success** — appointment already updated to "paid" before guard runs (order of operations)

## Scope
- **File**: test file for webhook handler
- Mock shop lookup and appointment update

## Dependencies
- **Requires**: Spec 03 (code under test)

## Out of scope
- UI rendering of transferHeld (tested in spec 11)
