# Spec 11: Unit Tests — Transfer Held Card State

**Priority**: P2 (ships with specs 04-05)

## Summary
Unit tests for the transfer held modifier on payment card (specs 04 and 05).

## Test cases
1. **transferHeld false** — normal payout line, no held indicator
2. **transferHeld true + connect** — payout shows "Held", amber styling, helper text shows pause message
3. **transferHeld true + waived** — same held display (modifier overrides waived payout)
4. **transferHeld true + refunded** — refunded takes precedence, held state not shown
5. **transferHeld true + legacy** — legacy path unchanged (no FeeBreakdown rendered)
6. **Helper text swap** — correct icon (`pause_circle`) and copy rendered

## Scope
- **File**: test file for payment-card component
- Render tests with various prop combinations

## Dependencies
- **Requires**: Spec 04, Spec 05 (components under test)

## Out of scope
- Dashboard action item testing (see spec 12)
