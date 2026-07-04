# Slice 3a: Transfer Held Helper Text

**Spec**: 05 | **Priority**: P2 UI | **File**: `src/components/appointments/payment-card.tsx`

## Work

### 1. Add helper text conditional for transferHeld
- **Where**: Helper text row in FeeBreakdown (~lines 169-175, same area as refund icon swap)
- **Precedence chain**: `refunded ? refundedHelper : transferHeld ? heldHelper : normalHelper`
- **Icon**: `pause_circle` (Material Symbols) — amber colour
- **Copy**: "Payment received but transfer paused — Stripe is reviewing your account."
- **Design reference**: Prototype `Appointment Fee Breakdown.html` → "Held" tab

### 2. Styling
- Same muted/secondary colour as existing helper text row
- Icon colour: amber (match the "Held" label from slice 2b)
- Replaces normal helper text (swap, not append)

## Visual checklist (from design prototype)
- [ ] `pause_circle` icon renders in amber
- [ ] Copy: "Payment received but transfer paused — Stripe is reviewing your account."
- [ ] Replaces "Payout routed to your connected bank account." (not appended)
- [ ] Refunded helper text takes precedence when both flags true

## Acceptance criteria
- [ ] Helper text shows `pause_circle` + held copy when `transferHeld === true`
- [ ] Refunded state takes precedence (`refunded && transferHeld` → refund helper)
- [ ] Normal helper text when both flags false
- [ ] Icon colour: amber
- [ ] lint + type-check pass

## Dependencies
- **Requires**: Slice 2b (transferHeld prop threaded to FeeBreakdown)
