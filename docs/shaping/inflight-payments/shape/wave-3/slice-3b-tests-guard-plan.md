# Slice 3b: Unit Tests — Detection Guard

**Spec**: 10 | **Priority**: P2 | **File**: Test file for webhook handler

## Work

### Test cases
1. **Shop not suspended**: `payment_intent.succeeded` + shop status `"complete"` → `transferHeld` stays false
2. **Shop suspended**: `payment_intent.succeeded` + shop status `"suspended"` → `transferHeld` set to true
3. **Shop pending**: status `"pending"` → `transferHeld` stays false (pending ≠ suspended)
4. **No connected account**: payment without `transfer_data` → guard skipped, no shop lookup
5. **Order of operations**: appointment already updated to `"paid"` before guard checks suspension

### Mocking strategy
- Mock `tx.query.shops.findFirst()` to return shop with desired status
- Mock appointment update to verify `transferHeld` is set
- Follow existing webhook test patterns from `connect-webhook/route.test.ts`

## Acceptance criteria
- [ ] 5 test cases covering all branches
- [ ] Shop lookup mocked via `stripeAccountId`
- [ ] Guard does NOT prevent payment from being marked "paid"
- [ ] Non-Connect payments skip guard entirely
- [ ] All tests pass, lint + type-check pass

## Dependencies
- **Requires**: Slice 2a (detection guard code under test)
