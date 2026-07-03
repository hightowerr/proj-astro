# In-Flight Payments — Shape

## Origin

Issue from Stripe Connect post-loop design review (`current-issues.md`): race condition where merchant's `charges_enabled` revoked while customer has live `clientSecret`. Platform charge succeeds, automatic transfer fails. Compounding cascade: stuck funds → broken refunds → chargebacks.

**Mental models analysis**: Margin of Safety, Second-Order Thinking, Feedback Loops — all converge. Report at `mcp-go/Mental Models/WorkSpace/26-06-30_13-38-53_inflight_payment_connect_suspension/analysis_report.md`.

## Requirements

| ID | Requirement | Source | Priority |
|----|-------------|--------|----------|
| R0 | Refund path must not fail when no transfer exists to reverse | Mental models (cascade breaking) | P1 CRITICAL |
| R1 | `stripe-refund.ts` catch block detects "no transfer to reverse" and retries without `reverse_transfer`/`refund_application_fee` | Spec 01 | P1 |
| R2 | `transferHeld` boolean column on appointments, orthogonal to `paymentStatus`/`financialOutcome` | Architecture (modifier-over-enum pattern) | Foundation |
| R3 | Detection guard at `payment_intent.succeeded` checks shop `stripeOnboardingStatus`; flags `transferHeld: true` if suspended | Spec 03 | P2 |
| R4 | Payment card shows "Held" (amber) on payout line + `pause_circle` helper text when `transferHeld === true` | Design prototype | P2 |
| R5 | `transferHeld` is an orthogonal modifier — do NOT add a 6th `FeeState` | Architecture (R5 from refund-state) | P2 |
| R6 | Dashboard surfaces held transfers as amber warning card below ConnectCard | Design prototype | P2 |
| R7 | Suspension sweep cancels in-flight PaymentIntents when `charges_enabled` flips false | Spec 07 | P3 |
| R8 | Suspension sweep flags recently-succeeded payments (1h window) with `transferHeld: true` | Spec 08 | P3 |
| R9 | Refunded takes precedence over transferHeld in UI rendering | Design prototype | P2 |
| R10 | All logging uses `console.warn` (lint blocks `console.info`) | Spike 7 / friction signal | All |

## Shape A — Orthogonal modifier + guard + sweep (selected)

Single approach — mental models analysis + modifier-over-enum pattern from refund-state converge.

- **P1**: Catch clause in `stripe-refund.ts` — 5-line error detection + retry fallback. New `isReverseTransferFailedError()` helper following `isAlreadyRefundedError()` pattern.
- **P2**: Boolean `transferHeld` column + detection guard in webhook + UI modifier on PaymentCard. Guard queries shop via `stripeAccountId` from `intent.transfer_data?.destination` (spike finding: webhook has no shop context, need direct lookup).
- **P3**: Sweep in `connect-webhook/route.ts` — cancel pending PIs + flag recent successes.
- **P4**: Reinstatement recovery — parked in roadmap (not specced).

### Fit check

| Req | Shape A | Notes |
|-----|---------|-------|
| R0 | ✓ | `isReverseTransferFailedError()` + retry without reverse_transfer |
| R1 | ✓ | Follows `isAlreadyRefundedError()` pattern, idempotency key: `refund-fallback-${appointment.id}` |
| R2 | ✓ | `boolean("transfer_held").default(false).notNull()` — migration 0039 |
| R3 | ✓ | Shop lookup via `intent.transfer_data.destination` → `shops.findFirst(stripeAccountId)` |
| R4 | ✓ | Follow refunded prop threading: `transferHeld?: boolean` on FeeBreakdown |
| R5 | ✓ | No enum changes — orthogonal boolean prop (confirmed by modifier-over-enum pattern) |
| R6 | ✓ | New `TransferHeldCard` component between ConnectCard and SummaryCards |
| R7 | ✓ | `stripe.paymentIntents.cancel()` per pending appointment, idempotent |
| R8 | ✓ | Batch update `transferHeld: true` for paid appointments within 1h window |
| R9 | ✓ | Conditional precedence: `refunded ? refundedUI : transferHeld ? heldUI : normalUI` |
| R10 | ✓ | All specs updated to use `console.warn` |

All requirements satisfied. No alternative shapes — the modifier-over-enum pattern is the proven approach from refund-state, and the mental models analysis provides strong convergence.

## Spike findings

See `shape/spike-codebase-analysis.md`. Three critical findings incorporated:
1. Webhook needs shop lookup via `stripeAccountId` (R3 implementation path)
2. New error detection helper needed (R1 implementation path)
3. `console.warn` required throughout (R10)

## Architecture mapping

| File | Specs | Change |
|------|-------|--------|
| `src/lib/stripe-refund.ts` | 01 | New `isReverseTransferFailedError()` + catch clause retry |
| `src/lib/schema.ts` | 02 | `transferHeld` column on appointments |
| `drizzle/0039_transfer_held.sql` | 02 | Migration |
| `src/app/api/stripe/webhook/route.ts` | 03 | Shop lookup + transferHeld guard in `handlePaymentIntent` |
| `src/app/api/stripe/connect-webhook/route.ts` | 07, 08 | Sweep: cancel pending PIs + flag recent payments |
| `src/components/appointments/payment-card.tsx` | 04, 05 | `transferHeld` prop + payout "Held" + helper text |
| `src/app/app/dashboard/page.tsx` | 06 | Render `TransferHeldCard` |
| `src/components/dashboard/transfer-held-card.tsx` | 06 | New component |

## Design

Interactive prototypes: `Appointment Fee Breakdown.html` (Held tab), `Dashboard Connect Card.html` (None/1/3 held toggles).
Design brief: `DESIGN-BRIEF.md` — status: Designed, all details confirmed from prototypes.

## Signals applied

| Signal | Type | How applied |
|--------|------|-------------|
| modifier-over-enum | pattern | `transferHeld` is orthogonal boolean, not a FeeState (R5) |
| extract-for-testability | pattern | `isReverseTransferFailedError()` as pure function (testable without mocks) |
| spike-before-shape | pattern | 7 spikes run, 3 critical findings incorporated before slicing |
| design-prototype-as-source-of-truth | pattern | Both prototypes reviewed, specs updated with exact details |
| design-enriched-specs | pattern | Specs 04-06 include design tokens, icon names, copy from prototype |
| agent-skips-visual-polish | friction | UI specs include explicit amber styling, icon names, copy text |
| no-console-info-lint | friction | All specs use `console.warn` |
| no-component-test-infra | friction | Card state tests (spec 11) use logic tests, not component render tests |
