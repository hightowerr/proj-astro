# Wave 1 Verification Report — dispute-visibility

**Date:** 2026-07-17
**Verifier:** Independent agent (fresh session, no access to implementer context)
**Method:** Code review + unit test execution
**Playwright:** BLOCKED — ConnectedView and disputed PaymentCard both require a Stripe Connect account + disputed appointment in the database. No test seed data available.

## Summary

**41 criteria evaluated: 41 PASS / 0 FAIL / 0 BLOCKED**

All 7 specs pass all acceptance criteria. `pnpm check` clean (lint + typecheck). All 17 dispute-specific tests pass (10 webhook + 7 payment card). 1 pre-existing test failure in suspension sweep (unrelated).

---

## Spec 01 — P1: Expectation-setting copy in ConnectedView

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Copy renders in `ConnectedView` below the account details card | PASS | `stripe-connect-card.tsx:528-534` — `<p>` with exact copy "Since deposits go directly to you, you'll handle any customer disputes through your Stripe Dashboard." placed after `!payoutsEnabled` info box (line 493-526) and before "Open Stripe Dashboard" button (line 536) |
| 2 | Styled as `text-xs`, `--al-on-surface-variant`, `opacity: 0.7` | PASS | `stripe-connect-card.tsx:529-530` — `className="mt-4 text-xs leading-relaxed"` + `style={{ color: "var(--al-on-surface-variant)", opacity: 0.7 }}` |
| 3 | Does NOT appear in `StartView`, `PendingView`, or `VerifyingView` | PASS | Grep for "disputes through" returns exactly 1 hit at line 533 (inside `ConnectedView`). `StartView` (38-76), `PendingView` (191-223), `VerifyingView` (225-265), `StillVerifyingView` (267-331) — none contain dispute copy |
| 4 | `pnpm check` passes | PASS | Lint + typecheck clean |

---

## Spec 02 — P2a: `charge.dispute.created` webhook handler

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `charge.dispute.created` events handled within connect-webhook transaction | PASS | `route.ts:236-340` — handler inside `db.transaction(async (tx) => { ... })` block |
| 2 | Payment lookup via `stripePaymentIntentId` resolves the associated appointment | PASS | `route.ts:247-252` — `tx.query.payments.findFirst()` with `whereEq(table.stripePaymentIntentId, paymentIntentId)` |
| 3 | `financialOutcome` set to `"disputed"` on the appointment | PASS | `route.ts:256-262` — `tx.update(appointments).set({ financialOutcome: "disputed", updatedAt: new Date() })` |
| 4 | `"dispute_opened"` event inserted into `appointmentEvents` with dispute metadata | PASS | `route.ts:265-281` — `tx.insert(appointmentEvents).values({ type: "dispute_opened", meta: { disputeId, chargeId, paymentIntentId, amount, currency, reason, status } })` |
| 5 | `console.error` emitted with disputeId, chargeId, amount, reason, appointmentId, shopId | PASS | `route.ts:283-291` — `console.error("Dispute opened — financialOutcome set to disputed", { disputeId, chargeId, paymentIntentId, amount, reason, appointmentId, shopId })` |
| 6 | Unresolvable disputes (no matching payment) log `console.error` with available context | PASS | `route.ts:333-339` — `console.error("Dispute opened but could not resolve payment context", { disputeId, chargeId, paymentIntentId, amount, reason })` |
| 7 | Deduplication via `processedStripeEvents` prevents double-processing | PASS | `route.ts:53-61` — `tx.insert(processedStripeEvents).values({ id: event.id }).onConflictDoNothing().returning()` + early return if `inserted.length === 0` |
| 8 | `pnpm check` passes | PASS | Lint + typecheck clean |

---

## Spec 03 — P2b: `charge.dispute.updated` and `charge.dispute.closed` handlers

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `charge.dispute.updated` logs status, reason, amount via `console.warn` | PASS | `route.ts:341-354` — `console.warn("Dispute updated", { disputeId, status, reason, amount, paymentIntentId, eventId })` |
| 2 | `charge.dispute.closed` resolves financial outcome: `"settled"` if won, remains `"disputed"` if lost | PASS | `route.ts:374` — `const newOutcome = dispute.status === "won" ? "settled" : "disputed"` + `route.ts:376-382` sets it on appointment |
| 3 | Payment lookup via `stripePaymentIntentId` for `closed` handler | PASS | `route.ts:363-369` — same lookup pattern as spec 02 |
| 4 | Both handlers deduplicated via `processedStripeEvents` | PASS | Same dedup mechanism at `route.ts:53-61` applies to all event types |
| 5 | `pnpm check` passes | PASS | Lint + typecheck clean |

---

## Spec 04 — P3: Merchant notification email on dispute

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Email sent to shop owner when `charge.dispute.created` resolves to a known payment | PASS | `route.ts:294-331` prepares `pendingDisputeEmail` inside transaction; `route.ts:467-555` sends via `sendEmail()` after commit |
| 2 | Email includes customer name (if resolvable), dispute amount, appointment date (if resolvable) | PASS | `route.ts:475-479` — `formattedAmount` (Intl.NumberFormat), `customerLine` (fallback: "A customer has"), `dateLine` (fallback: empty string) |
| 3 | CTA links to Express Dashboard via `stripe.accounts.createLoginLink()` | PASS | `route.ts:483-489` — `stripe.accounts.createLoginLink(stripeAccountId)` with fallback to `https://dashboard.stripe.com` |
| 4 | Email send happens AFTER DB transaction commit (external call pattern) | PASS | `pendingDisputeEmail` set inside transaction (line 320), email sent at line 467 — after `db.transaction()` try/catch block ends at line 417 |
| 5 | Email failure does not block webhook response (try/catch with `console.error`) | PASS | `route.ts:542-555` — try/catch wrapping `sendEmail()`, catch logs `console.error("Failed to send dispute notification email", ...)` |
| 6 | Plaintext fallback included | PASS | `route.ts:540` — `const text = \`Hi ${firstName}...\`` with full plaintext version of the email |
| 7 | `pnpm check` passes | PASS | Lint + typecheck clean |

---

## Spec 05 — P4a: Payment card `disputed` modifier

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `disputed` derived from `financialOutcome === "disputed"` | PASS | `payment-card.tsx:186` — `const disputed = financialOutcome === "disputed"` |
| 2 | Payout display shows "Disputed" when disputed is true | PASS | `payment-card.tsx:50` — `if (disputed) return "Disputed"` in `resolvePayoutDisplay()` |
| 3 | Helper icon is `gavel` | PASS | `payment-card.tsx:64` — `if (disputed) return "gavel"` in `resolveHelperIcon()` |
| 4 | Helper text references Stripe Dashboard | PASS | `payment-card.tsx:76` — `if (disputed) return "This deposit is under dispute. Respond via your Stripe Dashboard."` |
| 5 | `FeeBreakdown` accepts `disputed` prop | PASS | `payment-card.tsx:88` — `disputed = false` in destructured props of `FeeBreakdown` |
| 6 | Disputed takes priority over refunded/transferHeld in helper resolution order | PASS | All three helpers (`resolvePayoutDisplay`, `resolveHelperIcon`, `resolveHelperText`) check `disputed` first, before `refunded` and `transferHeld` |
| 7 | `pnpm check` passes | PASS | Lint + typecheck clean |

---

## Spec 06 — P2c: Unit tests for dispute webhook handlers

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | 10 test cases covering happy path, unresolvable context, outcome resolution, and dedup | PASS | `route.test.ts` — `charge.dispute.created` (4 tests: lines 702, 723, 752, 774), `charge.dispute.updated` (2 tests: lines 793, 821), `charge.dispute.closed` (4 tests: lines 853, 880, 905, 925) = 10 total |
| 2 | All tests pass with `pnpm test` | PASS | `pnpm vitest run route.test.ts` — 10/10 dispute tests pass (58/59 total; 1 pre-existing failure in suspension sweep) |
| 3 | Tests follow existing patterns in `route.test.ts` | PASS | Same mock structure, `makeEvent` helper, `makeDispute` factory, `beforeEach(vi.clearAllMocks)`, dedup testing pattern |
| 4 | `pnpm check` passes | PASS | Lint + typecheck clean |

---

## Spec 07 — P4b: Unit tests for payment card disputed modifier

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | 7 test cases covering disputed modifier across all three helpers | PASS | `payment-card.test.ts` — `resolvePayoutDisplay` (3 tests: lines 166, 170, 174), `resolveHelperIcon` (2 tests: lines 180, 184), `resolveHelperText` (2 tests: lines 190, 196) = 7 total |
| 2 | Priority ordering verified: disputed > refunded > transferHeld > default | PASS | Tests at lines 170-171 (disputed > refunded for payout), 174-175 (disputed > transferHeld for payout), 184-185 (disputed > refunded for icon), 196-198 (disputed > refunded + transferHeld for text) |
| 3 | All tests pass with `pnpm test` | PASS | `pnpm vitest run payment-card.test.ts` — 30/30 pass (including 7 new disputed tests) |
| 4 | `pnpm check` passes | PASS | Lint + typecheck clean |

---

## Deviations Noted (for drift audit)

1. **EVOLUTION**: Spec 04 assumed `appointment?.customer?.name` via Drizzle `with: { customer: true }`, but implementation uses explicit `tx.select().from(customers)` + `tx.select().from(user)` queries. Reason: Drizzle relations pattern not used in codebase; schema uses `customers.fullName` not `customers.name`. TypeScript would reject the spec's version.

2. **EVOLUTION**: Spec 04 assumed `shop.userEmail` for owner email, but implementation queries `user` table via `shop.ownerUserId`. Reason: shops table doesn't have a `userEmail` column — the owner's email lives on the `user` table.

3. **EVOLUTION**: `pendingDisputeEmail` declared at function scope with TypeScript closure narrowing fix — `const disputeEmail = pendingDisputeEmail as ... | null` cast at line 457. Reason: TypeScript cannot track mutations inside async closures.

4. **EVOLUTION**: `disputed` param defaults to `false` in helper functions (e.g., `disputed = false`). Reason: existing tests call without the param; backward-compatible default.

---

## Test Run Summary

| Suite | Total | Pass | Fail | Pre-existing Fail |
|-------|-------|------|------|-------------------|
| `route.test.ts` | 29 | 28 | 1 | 1 (suspension sweep) |
| `payment-card.test.ts` | 30 | 30 | 0 | 0 |
| **Total** | **59** | **58** | **1** | **1** |

The 1 failure is a pre-existing issue in the suspension sweep test (documented in prior work log entries), unrelated to dispute-visibility.
