# Slice 4a: Unit Tests — Transfer Held Card State

**Spec**: 11 | **Priority**: P2 | **File**: Test file for payment-card component

## Work

### Test approach
Logic tests only — no component render tests (no-component-test-infra friction signal). Visual verification deferred to Phase 3 Playwright.

### Test cases
1. **transferHeld false**: normal payout line, no held indicator
2. **transferHeld true + connect**: payout value is "Held" (not numeric amount)
3. **transferHeld true + waived**: same held display (modifier overrides waived payout)
4. **transferHeld true + refunded**: refunded takes precedence, held state not shown
5. **transferHeld true + legacy**: legacy path unchanged (no FeeBreakdown rendered)
6. **Helper text**: correct icon (`pause_circle`) and copy rendered when held

### Mocking strategy
- Test the conditional logic for payout display and helper text icon/copy
- If `determineFeeState()` or similar pure functions are used, test directly
- Follow patterns from refund-state test file

## Acceptance criteria
- [ ] 6 test cases covering all FeeState × transferHeld combinations
- [ ] Precedence tested: refunded > transferHeld > normal
- [ ] Helper text swap tested (icon + copy)
- [ ] All tests pass, lint + type-check pass

## Dependencies
- **Requires**: Slices 2b + 3a (payment card held state + helper text)
