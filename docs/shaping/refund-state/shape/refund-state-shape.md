# Refund State — Shape

## Origin

Issue #1 from Stripe Connect post-loop design review (`current-issues.md`). The 5-state payment card doesn't reflect refund reversals in the fee breakdown.

**Mental models analysis**: 12 models, all converge on modifier approach. Report at `mcp-go/Mental Models/WorkSpace/26-06-30_11-39-14_refund_state_payment_card/analysis-report.md`.

## Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R0 | Derive `refunded: boolean` from existing `financialOutcome` prop | Decision in current-issues.md |
| R1 | Show "Platform fee: Returned" (italic) + "Your payout: £0.00" (bold) when refunded | Design prototype |
| R2 | Swap helper text icon `north_east` → `undo` and copy to "Payout reversed to customer." | Design prototype |
| R3 | Waived+refunded renders identically to connect+refunded (modifier flattens distinction) | Design prototype |
| R4 | Legacy+refunded collapses card to "Payment" header + "Outcome: Refunded" only | Design prototype |
| R5 | Do NOT add a 6th FeeState — refund is a temporal modifier, not a structural state | Architecture decision (12 models converge) |
| R6 | `determineFeeState()` remains pure — no coupling to mutable DB state | Architecture decision |
| R7 | Metadata rows (payment status, outcome, resolved) unchanged for connect/waived | Design prototype |
| R8 | Unit + integration tests cover all 3 variants + regression guards | Standard quality |

## Shape A — Modifier prop (selected)

Single approach — all 12 mental models converge, no alternative shapes evaluated.

- Add `refunded?: boolean` to `FeeBreakdownProps`, derived from `financialOutcome === "refunded"` in `PaymentCard`
- `FeeBreakdown` conditionally renders reversal amounts when `refunded === true`
- Helper text row swaps icon and copy (replacement, not append)
- Legacy path gates at `PaymentCard` level — `FeeBreakdown` never renders
- `determineFeeState()` untouched

### Fit check

| Req | Shape A | Notes |
|-----|---------|-------|
| R0 | ✅ | Single expression: `financialOutcome === "refunded"` |
| R1 | ✅ | Conditional branch in `FeeBreakdown` render |
| R2 | ✅ | Icon + text swap in existing helper text row |
| R3 | ✅ | `refunded` takes precedence over `waived` for fee label |
| R4 | ✅ | Conditional at `PaymentCard` level, before `FeeBreakdown` |
| R5 | ✅ | No enum changes — orthogonal boolean prop |
| R6 | ✅ | `determineFeeState()` not modified |
| R7 | ✅ | Metadata rows outside `FeeBreakdown` scope |
| R8 | ✅ | 8 unit tests + 5 integration tests across 3 specs |

All requirements satisfied. No spikes needed — the data path, component interface, and rendering logic are all well-understood from the stripe-connect implementation.

## Architecture mapping

- `payment-card.tsx` — already has `financialOutcome` prop (line ~120), `FeeBreakdown` internal component (line ~39), `determineFeeState()` (line ~18)
- No new DB fields, no schema changes, no API changes
- No new dependencies
- Signals check: `agent-skips-visual-polish` friction signal → specs now include explicit styling (italic, bold, icon names) per design prototype

## Design

Interactive prototype: `docs/shaping/refund-state/Appointment Fee Breakdown.html`
Design brief: `docs/shaping/refund-state/DESIGN-BRIEF.md`

Three variants documented with full visual details from prototype review.
