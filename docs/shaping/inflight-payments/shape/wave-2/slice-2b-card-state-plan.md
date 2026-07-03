# Slice 2b: Transfer Held Card State

**Spec**: 04 | **Priority**: P2 UI | **File**: `src/components/appointments/payment-card.tsx`

## Work

### 1. Add transferHeld prop to PaymentCardProps
- **Where**: `PaymentCardProps` type (~lines 3-14)
- Add: `transferHeld?: boolean`

### 2. Thread prop to FeeBreakdown
- **Where**: `FeeBreakdown` component internal props
- Add `transferHeld?: boolean` to FeeBreakdown's destructured props
- Pass from PaymentCard: `transferHeld={transferHeld}`

### 3. Render "Held" on payout line
- **Where**: FeeBreakdown payout row (~line where `£9.50` is rendered)
- **Precedence**: `refunded ? "£0.00" : transferHeld ? "Held" : formattedPayout`
- **Style for "Held"**: Amber/warning colour — use existing design token or inline `className`
- **Design reference**: Prototype `Appointment Fee Breakdown.html` → "Held" tab

### 4. Payout line styling
- "Held" text: amber/warning colour, right-aligned in value column
- Same font weight as normal payout amount
- Platform fee line: UNCHANGED (still shows −£0.50)
- Deposit line: UNCHANGED

## Visual checklist (from design prototype)
- [ ] Payout shows "Held" in amber when `transferHeld === true`
- [ ] Platform fee still shows "−£0.50" (not changed)
- [ ] Deposit still shows "£10.00"
- [ ] "Stripe Connect" badge unchanged
- [ ] Payment status: "Succeeded" green badge unchanged
- [ ] Outcome/Resolved metadata rows unchanged

## Acceptance criteria
- [ ] `transferHeld?: boolean` on `PaymentCardProps`
- [ ] `transferHeld` threaded to `FeeBreakdown`
- [ ] Payout shows "Held" (amber) when `transferHeld === true`
- [ ] Refunded takes precedence over transferHeld
- [ ] Normal rendering when `transferHeld` is false/absent
- [ ] lint + type-check pass

## Dependencies
- **Requires**: Slice 1b (transferHeld column exists to source the prop)
