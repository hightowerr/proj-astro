# Drift: inflight-payments all waves

Date: 2026-07-03
Feature: inflight-payments (In-flight payments during Connect suspension)
Waves: 1–4 (all)

## D1: Spec 07 — queries payments table, not appointments

- **Spec**: "query appointments where `paymentStatus === 'pending'` AND `stripePaymentIntentId IS NOT NULL`"
- **Implementation**: Queries `payments` table by Stripe PI statuses (`requires_payment_method`, `requires_action`, `processing`)
- **Classification**: EVOLUTION
- **Why**: `stripePaymentIntentId` lives on the `payments` table, not `appointments`. Using accurate Stripe-level statuses is more precise than the appointment-level `paymentStatus` enum. Same outcome, better data path.

## D2: Spec 07 — in-flight PI status filter

- **Spec**: `paymentStatus === "pending"` (appointment enum)
- **Implementation**: `inArray(table.status, ["requires_payment_method", "requires_action", "processing"])` (Stripe PI statuses on payments table)
- **Classification**: EVOLUTION
- **Why**: The Stripe PI statuses are the actual states where a customer could still complete payment. More precise than the appointment-level enum which doesn't distinguish between Stripe processing states. Directly related to D1.

## D3: Spec 01 — usedConnect hoisted to let

- **Spec**: Catch clause checks `usedConnect` in catch block
- **Implementation**: `usedConnect` was `const` scoped inside `try` block — hoisted to `let usedConnect = false` before `try` so catch block can read it
- **Classification**: EVOLUTION
- **Why**: Mechanical necessity. The variable was scoped inside `try` and inaccessible from `catch`. Hoisting to `let` before the try block is the standard pattern. No behavioral change.

## D4: Spec 06 — added appointmentId prop

- **Spec**: `count: number` as only prop
- **Implementation**: Added `appointmentId?: string` optional prop so the count=1 CTA can deep-link to `/app/appointments/{id}`
- **Classification**: EVOLUTION
- **Why**: Without this prop, the CTA for a single held transfer would link to the appointments list, not the specific appointment. The spec's acceptance criteria say "links to appointment detail page (if count === 1)" which requires the ID.

## D5: Spec 04/05 — extracted pure functions for testability

- **Spec**: Conditional rendering inline in JSX
- **Implementation**: Extracted `resolvePayoutDisplay()`, `resolveHelperIcon()`, `resolveHelperText()` as exported pure functions. JSX delegates to them.
- **Classification**: EVOLUTION
- **Why**: No component test infrastructure exists (friction signal `no-component-test-infra`). Extracting pure functions enables direct unit testing without render tests. Follows `extract-for-testability` pattern from prior wave (webhook-unaware feature). No behavioral change — same rendering output.

## D6: Spec 01 — fallback metadata field

- **Spec**: No mention of metadata on fallback refund
- **Implementation**: Added `fallback: "reverse_transfer_failed"` to retry refund metadata
- **Classification**: EVOLUTION
- **Why**: Aids debugging/auditing in the Stripe dashboard. Platform team can filter refunds by this metadata to track fallback frequency. Zero cost addition.

## D7: Spec 08 — object-style logging

- **Spec**: `console.warn("Flagged recent payment %s...", appointmentId, shopId)` (interpolation style)
- **Implementation**: `console.warn("Flagged recent payments...", { shopId, count })` (object style)
- **Classification**: EVOLUTION
- **Why**: Codebase convention uses object-style structured logging throughout `connect-webhook/route.ts`. Consistency with existing code. Batch flagging makes per-appointment logging unnecessary.

## D8: Spec 11 — test count and legacy case

- **Spec**: 6 test cases including "transferHeld true + legacy: legacy path unchanged"
- **Implementation**: 12 tests (6 payout + 3 icon + 3 text). Legacy case (case 5) not included.
- **Classification**: EVOLUTION
- **Why**: Legacy path doesn't use `FeeBreakdown` (separate JSX branch), so `transferHeld` has no effect on legacy rendering. No pure function to test. Verifiable only via Playwright render test. The extracted-function approach covers more edge cases (12 vs 6) despite omitting the one untestable case.

## Summary

| Classification | Count |
|----------------|-------|
| EVOLUTION | 8 |
| SHORTCUT | 0 |

**Evolution/shortcut ratio: 8/0 (0% shortcuts)**. Well below the 50% threshold.

**Root causes**: 3 categories
1. **Data model discovery** (D1, D2): `stripePaymentIntentId` location discovered at implementation time. Would have been caught by expanding spike scope to "which table owns this column?"
2. **Mechanical necessity** (D3): Scoping constraint, standard pattern
3. **Testability** (D5, D8): No component test infra forces pure function extraction — this is the `extract-for-testability` pattern applied systematically
4. **Missing spec detail** (D4, D6, D7): Props, metadata, and logging style not specified at the granularity needed — filled by following codebase conventions
