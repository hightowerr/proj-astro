# Work Log

Append-only. Every agent reads the last 10 entries at session start for context.

---

## [2026-07-16] verify+drift+retro | payouts-not-surfaced wave 1

- **Picked up**: Phases 3-5 for payouts-not-surfaced feature (verify in separate session, drift audit, retro)
- **Result**: Loop COMPLETE.
  - Verify: 14/14 PASS. 0 FAIL. 0 BLOCKED. Independent verifier in fresh session. 4 criteria via Playwright (pre-connect state, auth/redirect guards), 10 via code review (connected-state conditional logic). Connected-state Playwright blocked (no Stripe Connect account in test DB).
  - Drift: 0 divergences — all 3 specs (P1, P2, P3) match implementation exactly. No remaining unimplemented specs (wave 1 of 1).
  - Retro: Architecture updates applied — invariant #18 (no DB persistence for volatile Stripe flags, `payouts_enabled` fetched live via `stripe.accounts.retrieve()`), ui-context.md (ConnectedView info box recipe). current-issues.md entry moved to Resolved. progress-tracker.md updated.
  - Evolution/shortcut ratio: 0/0
  - Patterns extracted: 0 (no novel solutions — standard conditional rendering)
  - Friction logged: 0
  - Key learning: When shaping aligns specs with design prototype before implementation (6 discrepancies fixed pre-IMPLEMENT), implementation achieves 0 deviations and verification is pure confirmation. The pre-alignment step is the highest-leverage shaping activity for UI features.
- **Unresolved**: 3 pre-existing test failures discovered during verification (messages, connect-webhook, twilio inbound) — logged to current-issues.md, all independent of this feature.

---

## [2026-07-15] shape+implement | payouts-not-surfaced wave 1

- **Picked up**: Shape alignment + Phase 2 IMPLEMENT for payouts-not-surfaced feature (surface `payoutsEnabled` on Stripe Connect settings page).
- **Result**: Shape aligned + implement complete.
  - Shape: 3 existing specs (P1, P2, P3) + build-order aligned with design prototype (`Payments Stripe Connect.html`). 6 discrepancies fixed before implementation: label text ("Active" → "Payouts enabled"/"Payouts verifying"), info box background (`--al-surface-container-low` → `--al-surface-container`), icon color (`--al-primary` → `--al-on-surface-variant`), copy text, spacing tokens. No spikes needed (2 files, linear chain).
  - Implement: 3 specs implemented sequentially (P1→P2→P3). P1: added `getStripeClient` import + `stripe.accounts.retrieve()` server-side + `payoutsEnabled` prop. P2: conditional status row — green dot/"Payouts enabled" when true, neutral dot/"Payouts verifying" when false. P3: info box with design prototype tokens (`--al-surface-container` bg, `--al-on-surface-variant` icon 20px, copy per prototype). `pnpm check` clean after each slice. 0 deviations.
  - Modified files (2): `src/app/app/settings/stripe-connect/page.tsx`, `src/components/settings/stripe-connect-card.tsx`
- **Unresolved**: Phase 3 (VERIFY) must run in a separate fresh session (NEVER self-verify). Then DRIFT AUDIT + RETRO.

---

## [2026-07-14] all phases | rebrand waves 1–2

- **Picked up**: Full loop completion for rebrand feature. Wave 1 phases 3-5 + Wave 2 phases 2-5.
- **Result**: Loop COMPLETE.
  - **Wave 1**: Verify 12/12 PASS (independent agent, previous session). Drift: 0 conflicts with Wave 2 specs, 4 evolution / 0 shortcuts. Retro: architecture updates applied (ui-context.md brand names, code-standards.md brand convention).
  - **Wave 2**: Implement — 3 specs (P3-app-copy: 2 tooltips, P3-email-rebrand: 5 strings + 4 typography fixes + brand footer, P4-internal-docs: 7 strings). `pnpm check` clean. Verify: 20/20 PASS (independent agent). Drift: 0 divergences. Retro: current-issues.md rebrand + typography fix moved to Resolved.
  - Total: 32/32 PASS across both waves. 4 evolution / 0 shortcuts (0%).
  - Modified files (Wave 2): `src/app/app/appointments/page.tsx`, `src/components/payments/tier-policy-form.tsx`, `src/app/api/jobs/connect-reengagement/route.ts`, `docs/context/project-overview.md`
  - Patterns extracted: 0
  - Friction logged: 0
  - Key learning: Shaping phase should include grep audit for brand references — manual file review missed 4 references that post-sweep grep caught (Wave 1). Wave 2 was trivial once Wave 1 established the pattern. Bundling the typography fix with the email rebrand was the right call — same file, same PR, no extra coordination cost.
- **Unresolved**: none. `auth-origins.test.ts` has `astro.example.com` fixture URLs — excluded from scope (test data). Loop COMPLETE.

- **Picked up**: Phases 3-5 for rebrand Wave 1 (verify in separate session, drift audit, retro)
- **Result**: Wave 1 COMPLETE.
  - Verify: 12/12 PASS. 0 FAIL. 0 INCONCLUSIVE. Independent verifier (previous session) + independent re-verification (this session). All acceptance criteria met. Playwright visual checks passed (landing, mobile drawer, login, register). BookingNav verified by code review (no valid shop slug in dev DB).
  - Drift: 0 conflicts with remaining specs. All 3 Wave 2 spec line numbers verified accurate. 4 deviations from Wave 1 (all EVOLUTION, documented by implementer): additional brand references found by post-sweep grep. P4 spec inaccuracy noted: `auth-origins.test.ts` has 3 `astro.example.com` fixture URLs, not "0 matches" as claimed.
  - Retro: Architecture context updates applied — ui-context.md (brand names table), code-standards.md (brand convention section). current-issues.md rebrand entry updated with Wave 1 status. No new patterns (sweep replacement is standard). 0 friction.
  - Evolution/shortcut ratio: 4/0 (0%)
  - Patterns extracted: 0
  - Friction logged: 0
  - Key learning: Shaping missed 4 brand references (demo URLs in features-carousel, page.tsx descriptions, onboarding URL) that post-sweep grep caught. Future rebrand-style specs should include a grep audit step in the shaping phase, not just a manual file-by-file review.
- **Unresolved**: Wave 2 (P3-app-copy, P3-email-rebrand + typography fix, P4-internal-docs) ready for IMPLEMENT.

---

## [2026-07-13] shape+implement | rebrand wave 1

- **Picked up**: Rebrand "Astro" → "ShowUp" — full feature loop. Phase 1 (SHAPE) + Phase 2 (IMPLEMENT) for Wave 1.
- **Result**: Shape + implement complete.
  - Shape: shape doc, slices doc, wave-1 plan. No spikes needed (all string replacements). Single shape (A: sweep replacement). 7 requirements, all satisfied. Relevant signals applied: `cascading-rename-breakage`, `single-file-sweep`, `agent-skips-visual-polish`.
  - Implement: 25 replacements across 13 files (originally planned 21 across 11). Single sweep agent + 3 manual fixes for new finds. `pnpm check` clean. Post-sweep grep: 0 "Astro"/"ASTRO" in Wave 1 scope.
  - 4 deviations (all EVOLUTION): `features-carousel.tsx` demo URL (`astro.app/book` → `showup.dev/book`), `page.tsx` 2× feature card descriptions, `shop-details-step.tsx` onboarding demo URL (`astro.com/book/` → `showup.dev/book/`). All found by post-sweep grep, not in original specs.
  - Also fixed: coder agent used `showup.app` instead of `showup.dev` for features-carousel URL — corrected manually.
  - Loop contract, progress tracker updated.
- **Unresolved**: Phase 3 (VERIFY) must run in a separate fresh session (NEVER self-verify). Wave 2 (P3-app-copy, P3-email-rebrand + typography fix, P4-internal-docs) pending after Wave 1 ships.

---

## [2026-07-08] implement | connect-guard waves 1–2

- **Picked up**: Phase 2 IMPLEMENT for connect-guard feature (slot recovery Connect guard bypass — money routing + SMS fix). Waves 1–2.
- **Result**: Waves 1–2 implemented:
  - Wave 1 (3 parallel slices, same session): P0 (`slot-recovery.ts` — added `stripeOnboardingStatus` + `name` to `findLatestOpenOffer` shop select + `OpenOffer` interface), F2 (`slot-recovery.ts` — branched SMS on `booking.paymentRequired`, date/time formatting, `Booked with` opening, `Reply STOP` compliance suffix), T1 (`appointments.ts` — tripwire comment above `paymentsEnabled ?? true`). `pnpm check` clean after each slice.
  - Wave 2 (1 slice): F1 (`slot-recovery.ts` — replaced `paymentsEnabled: true` with `shop.stripeOnboardingStatus === "complete"`). `pnpm check` clean.
  - 1 deviation: P0 also added `name` field to query + `OpenOffer` interface (not in P0 spec, needed by F2's SMS copy which references `shop.name`). EVOLUTION — F2 spec assumed the field was available.
  - Modified files (2): `src/lib/slot-recovery.ts`, `src/lib/queries/appointments.ts`
- **Unresolved**: Phase 3 VERIFY must run in a separate session (non-negotiable: implementing agents do not verify their own work). Then DRIFT AUDIT + RETRO.
- **Update**: F3 unblocked — `sendBookingConfirmationSMS` already shipped with confirmation-SMS feature. Implemented: import from `@/lib/messages`, added `!booking.paymentRequired` guard with fire-and-forget try/catch after F2's inline SMS. `pnpm check` clean. 0 deviations. All 5 specs (P0, F1, F2, F3, T1) now implemented.

---

## [2026-07-08] verify+drift+retro | connect-guard waves 1–2

- **Picked up**: Phases 3-5 for connect-guard feature (verify, drift audit, retro)
- **Result**: Loop COMPLETE.
  - Verify: 19/19 PASS. 0 FAIL. 0 BLOCKED. Independent verifier in fresh session. All acceptance criteria met.
  - Drift: 1 divergence (EVOLUTION, 0 shortcuts, 0%). D1: P0 added `name` field to query + `OpenOffer` interface — needed by F2's SMS copy (`shop.name ?? shop.slug`). Spec P0 updated.
  - Retro: Architecture context updates applied (invariant #17: paymentsEnabled derivation, slot recovery flow steps 5b/5c, product rule: Connect guard). Issue marked RESOLVED in current-issues.md. 0 new patterns. 0 friction.
  - Evolution/shortcut ratio: 1/0 (0%)
  - Patterns extracted: 0
  - Friction logged: 0
  - Key learning: F3's external dependency (`sendBookingConfirmationSMS`) was assumed unshipped but had already landed with confirmation-SMS. Checking existing exports before deferring specs avoids unnecessary blocking. The full 5-spec feature shipped in a single session because all code paths were pre-verified by mental models analysis.
- **Unresolved**: none

---

## [2026-07-07] shape+implement | no-minimum waves 1–2

- **Picked up**: Phase 1 SHAPE + Phase 2 IMPLEMENT for no-minimum feature (platform minimum deposit floor — £1 clamp, dual enforcement)
- **Result**: Shape complete. Waves 1-2 implemented:
  - Shape: shape doc, slices doc, 4 specs, build order. 0 spikes (all code paths verified from mental models analysis). Single shape (dual-point floor clamp), 3 alternatives rejected (per-merchant column, per-input-point validation, console.warn).
  - Wave 1 (2 sequential slices, same file): `src/lib/tier-pricing.ts` — exported `PLATFORM_MINIMUM_DEPOSIT_CENTS = 100` with tripwire JSDoc, modified `derivePaymentRequirement()` (`const` → `let`, floor clamp for `amountCents > 0 && < 100`). `pnpm check` clean.
  - Wave 2 (2 parallel slices): `src/lib/queries/appointments.ts` (import constant + `clampedDepositCents` before policy snapshot + use in `derivePaymentRequirement` and `policyVersions` insert) + `src/lib/__tests__/tier-pricing.test.ts` (9 new floor tests: sub-floor 1p/50p/99p, at-floor, above-floor, zero, null, paymentMode=none, full_prepay). 22 total tests passing. `pnpm check` clean.
  - 0 deviations. 0 new type errors. 0 regressions.
  - Modified files (2): `src/lib/tier-pricing.ts`, `src/lib/queries/appointments.ts`
  - Modified test file (1): `src/lib/__tests__/tier-pricing.test.ts`
- **Unresolved**: Phase 3 VERIFY must run in a separate session (non-negotiable: implementing agents do not verify their own work). Then DRIFT AUDIT + RETRO.

---

## [2026-07-07] verify+drift+retro | no-minimum waves 1–2

- **Picked up**: Phases 3-5 for no-minimum feature (verify in separate session, drift audit, retro)
- **Result**: Loop COMPLETE.
  - Verify: 16/16 PASS. 0 FAIL. 0 BLOCKED. Independent verifier in fresh session. All acceptance criteria met. All critical invariants confirmed.
  - Drift: 1 divergence (EVOLUTION, 0 shortcuts, 0%). D1: test file path `__tests__/tier-pricing.test.ts` vs spec's `tier-pricing.test.ts` — used existing project convention.
  - Retro: 0 new patterns (mental-models-as-shape already demonstrated by ks-migration). 0 friction.
  - Key learning: When mental models analysis pre-resolves all unknowns and the feature is small (~15 lines production code), the entire 5-phase loop completes with zero surprises and zero shortcuts. The dual-enforcement pattern (chokepoint + belt-and-suspenders) is a good template for future platform invariants.
  - Evolution/shortcut ratio: 1/0 (0%)
  - Patterns extracted: 0
  - Friction logged: 0
- **Unresolved**: Architecture context updates (invariant #16, booking flow step 4b) queued in `_build-order.md` — apply as part of next architecture review.

---

## [2026-07-07] all phases | ks-migration wave 1

- **Picked up**: Full loop (SHAPE → IMPLEMENT → VERIFY → DRIFT AUDIT → RETRO) for ks-migration feature (pre-Connect appointments query fallback for Kicksnare)
- **Result**: Loop COMPLETE.
  - Shape: shape doc, slices doc, 1 wave plan. 0 spikes (all edge cases pre-verified in issue analysis). Single shape (query fallback), 3 alternatives rejected (backfill, do nothing, simplified query).
  - Implement: Wave 1 (2 parallel slices): `dashboard/page.tsx` + `appointments/page.tsx`. Both add `OR (isNull(depositSkipped) AND paymentStatus = 'unpaid')` to unprotected count query. Import `isNull`, `or` from drizzle-orm. Comment added. `pnpm check` clean. 0 deviations.
  - Verify: 10/10 PASS. 0 FAIL. 0 BLOCKED. Independent verifier in fresh session. Edge case safety confirmed.
  - Drift: 0 divergences. Implementation matches both specs exactly.
  - Retro: 0 new patterns. 0 friction. 0 drift.
  - Modified files (2): `src/app/app/dashboard/page.tsx`, `src/app/app/appointments/page.tsx`
  - Evolution/shortcut ratio: 0/0
  - Key learning: When the issue analysis is thorough enough to serve as a shape document (evaluated 4 alternatives, verified edge cases, specified exact code changes), the loop executes in one pass with zero drift. The mental models analysis pre-resolved every unknown.
- **Unresolved**: none

---

## [2026-07-07] shape+implement | confirmation-SMS waves 1–2

- **Picked up**: Phase 1 SHAPE + Phase 2 IMPLEMENT for confirmation-SMS feature (free bookings get confirmation SMS)
- **Result**: Shape complete. Waves 1-2 implemented:
  - Shape: shape doc, slices doc, 3 wave plans. 0 spikes (all code paths mapped from prior exploration). Single shape (conditional `paidLine`), no alternatives.
  - Wave 1 (1 slice, atomic): `src/lib/messages.ts` — `DEFAULT_TEMPLATE_VERSION` 1→2, `Paid {{amount}}` → `{{paid_line}}`, removed `!payment` bail-out, replaced `amountLabel` with `paidLine` conditional. `pnpm check` clean.
  - Wave 2 (2 parallel slices): `api/bookings/create/route.ts` + `api/appointments/route.ts` — both add `sendBookingConfirmationSMS()` for `!paymentRequired && status === "booked"` with try/catch. `pnpm check` clean.
  - 0 deviations. 0 new type errors. 0 regressions.
  - Modified files (3): `src/lib/messages.ts`, `src/app/api/bookings/create/route.ts`, `src/app/api/appointments/route.ts`
- **Unresolved**: Phase 3 VERIFY must run in a separate session (non-negotiable: implementing agents do not verify their own work). Then DRIFT AUDIT + RETRO.

---

## [2026-07-06] implement | MCC-hardcoded wave 3 (spec 04)

- **Picked up**: Spec 04 — post-deploy audit script
- **Result**: `scripts/audit-mcc.ts` implemented. Type-check clean. Queries shops with Stripe accounts, retrieves MCC via Stripe API, compares against `getMccForBusinessType()`, logs results. Read-only, one-time use.
- **Unresolved**: Run after deploying to production: `npx tsx scripts/audit-mcc.ts`

---

## [2026-07-06] verify+drift+retro | MCC-hardcoded waves 1–2

- **Picked up**: Phases 3-5 for MCC-hardcoded feature (verify in separate session, drift audit, retro)
- **Result**: Loop COMPLETE.
  - Verify: 10 PASS / 0 FAIL / 0 BLOCKED. Independent verifier in fresh session. All acceptance criteria met.
  - Drift: 2 divergences, both EVOLUTION (0 shortcuts, 0%). D1: exported `MCC_BY_BUSINESS_TYPE` (spec's own Option 2). D2: extra "valid 4-digit codes" test (data integrity).
  - Retro: 0 new patterns (extract-for-testability already covers pure function extraction). 0 friction.
  - Key learning: When the problem is a 1-to-1 data routing fix with a single shape and no UI, the loop overhead is minimal — all phases complete in a single session except verify. Spec quality was high enough that implementation had zero surprises and drift was only additive.
  - Evolution/shortcut ratio: 2/0 (0%)
  - Patterns extracted: 0
  - Friction logged: 0
- **Unresolved**: Spec 04 (post-deploy audit script) deferred until deployment to production.

---

## [2026-07-06 15:25] shape+implement | MCC-hardcoded waves 1–2

- **Picked up**: Phase 1 SHAPE + Phase 2 IMPLEMENT for MCC-hardcoded feature (derive MCC from shop.businessType instead of hardcoding 7241)
- **Result**: Shape complete. Waves 1-2 implemented:
  - Shape: shape doc, slices doc, 3 wave plans. 3 spikes confirmed (query returns businessType, type import works, vitest aliases work). Single shape (lookup table), no alternatives.
  - Wave 1 (1 slice): `src/lib/mcc-mapping.ts` — new module with `MCC_BY_BUSINESS_TYPE`, `DEFAULT_MCC`, `getMccForBusinessType()`. Type-check clean.
  - Wave 2 (2 parallel slices): `create-account/route.ts` (1 import + 1 line change), `src/lib/mcc-mapping.test.ts` (6 tests, all passing). Type-check clean.
  - 0 new type errors. 6 new tests. 0 regressions (2 pre-existing failures in connect-webhook suspension sweep — unrelated).
  - Deviations: none — straightforward mapping, no surprises.
  - New files (2): `src/lib/mcc-mapping.ts`, `src/lib/mcc-mapping.test.ts`
  - Modified files (1): `create-account/route.ts`
- **Unresolved**: Phase 3 VERIFY next (separate session per loop contract). Spec 04 (post-deploy audit script) deferred until deployment.

---

## [2026-07-03] verify+drift+retro | inflight-payments waves 5–7

- **Picked up**: Phases 3-5 for specs 14-19 (verify in separate session, drift audit, retro)
- **Result**: Loop COMPLETE.
  - Verify: 31 PASS / 0 FAIL / 0 BLOCKED. Independent verifier in fresh session.
  - Drift: 0 divergences — all 6 specs match implementation exactly. No drift signals logged.
  - Retro: 0 new patterns (spike-before-shape already covers "check Stripe TS types before assuming event exists"). No friction logged.
  - Key learning: When a spike pre-resolves all unknowns and the implementation is straightforward (handlers modeled on existing patterns), zero drift is achievable. The 1 spike (transfer event types) prevented the exact error that created the `transfer.failed` dead code in the first place.
- **Unresolved**: Ops — register `transfer.reversed` and `transfer.updated` on Connect webhook in Stripe Dashboard.

---

## [2026-07-03] shape+implement | inflight-payments waves 5–7 (specs 14-19)

- **Picked up**: Transfer event rethink — `transfer.failed` is dead code, add real transfer event handlers, update cross-dep docs
- **Result**: All 6 specs implemented across 3 waves:
  - Wave 5 (2 parallel agents): `connect-webhook/route.ts` (−18 lines dead handler), `route.test.ts` (−80 lines dead tests), `03-detection-guard.md` (PRIMARY framing)
  - Wave 6 (1 agent — file contention): `connect-webhook/route.ts` (+`transfer.reversed` handler with `MANUAL_REVIEW_REQUIRED`, +`transfer.updated` handler with informational logging)
  - Wave 7 (1 agent — file contention): `route.test.ts` (+6 new tests: 3 per handler — happy path, unresolvable context, dedup)
  - 1 spike run (transfer event types): confirmed `transfer.reversed`/`transfer.updated` fully typed in Stripe TS, no cast needed
  - 6 new tests, 19 total in file, all passing. Zero new type errors.
  - Deviations: none — spike pre-resolved all unknowns
- **Unresolved**: Phase 3 VERIFY next (separate session per loop contract). Stripe Dashboard config needed: register `transfer.reversed` and `transfer.updated` on Connect webhook endpoint.

---

## [2026-07-03] verify+drift+retro | inflight-payments all waves

- **Picked up**: Phases 3-5 for inflight-payments feature (verify in separate session, drift audit, retro)
- **Result**: Loop COMPLETE.
  - Verify: 76 PASS / 0 FAIL / 0 BLOCKED. Independent verifier in fresh session. All acceptance criteria met.
  - Drift: 8 divergences, all EVOLUTION (0 shortcuts, 0%). 3 root causes: data model discovery (D1-D2: stripePaymentIntentId on payments table), mechanical necessity (D3: usedConnect scoping), testability (D5, D8: pure function extraction for no-component-test-infra).
  - Retro: 1 pattern extracted (multi-table-spike: verify column ownership during spike), 1 pattern updated (spike-before-shape +item 6: grep schema.ts for every column in spec queries).
  - Key learning: Mixed backend+UI features benefit from 7-spike depth. The 3 critical findings (shop lookup, error helper, console.warn) prevented the exact same class of drift seen in webhook-unaware. Column ownership (which table has which field) is a new drift source — added to spike checklist.
  - Evolution/shortcut ratio: 8/0 (0%)
  - Patterns extracted: 1
  - Friction logged: 0 (existing signals covered all friction encountered)
- **Unresolved**: none

---

## [2026-07-03] implement | inflight-payments waves 1–4

- **Picked up**: Phase 2 IMPLEMENT for all 4 waves (13 specs, 13 slices)
- **Result**: All 13 slices implemented across 4 waves:
  - Wave 1 (3 parallel): `stripe-refund.ts` (+`isReverseTransferFailedError` + fallback catch), `schema.ts` (+transferHeld column) + migration 0039, `connect-webhook/route.ts` (+PI cancellation sweep)
  - Wave 2 (5 parallel): `webhook/route.ts` (+detection guard), `payment-card.tsx` (+transferHeld "Held" payout), new `transfer-held-card.tsx` (dashboard), `connect-webhook/route.ts` (+flag recent sweep), `stripe-refund.test.ts` (17 tests)
  - Wave 3 (3 parallel): `payment-card.tsx` (+pause_circle helper text), `webhook/route.test.ts` (5 tests), `connect-webhook/route.test.ts` (9 tests)
  - Wave 4 (2 parallel): `payment-card.test.ts` (16 logic tests), `inflight-payments-integration.test.ts` (9 integration tests)
  - Deviations logged: 5 total — all EVOLUTION candidates (payments table query, in-flight PI status filter, usedConnect hoisting, appointmentId deep-link prop, pure function extraction for testability)
  - 65 new tests, all passing. 1 pre-existing failure. Zero new type errors.
- **Unresolved**: Phase 3 VERIFY next (separate session per loop contract).

---

## [2026-07-03] shape | inflight-payments

- **Picked up**: Phase 1 SHAPE for inflight-payments feature ("In-flight payments during Connect suspension" from current-issues.md)
- **Result**: Shaping complete.
  - 13 specs created (01–13) from mental models analysis report. 4-phase BUILD-ORDER with dependency graph.
  - Both design prototypes reviewed in detail (Appointment Fee Breakdown.html → "Held" tab, Dashboard Connect Card.html → None/1/3 held toggles). Specs 04-06 enriched with exact design tokens, icon names, copy.
  - 7 spikes run against codebase. 3 critical findings incorporated: (1) webhook/route.ts has NO shop context — spec 03 needs direct shop lookup via stripeAccountId, (2) new `isReverseTransferFailedError()` helper needed following isAlreadyRefundedError pattern, (3) all logging must use console.warn (lint blocks console.info).
  - Shape document with 11 requirements (R0–R10), single shape (orthogonal modifier + guard + sweep), fit check passing all.
  - Slices document: 13 slices across 4 waves (1:1 spec-to-slice). No file contention within any wave — all slices within a wave can run fully parallel with worktrees.
  - 13 individual slice implementation plans with acceptance criteria, file targets, visual checklists for UI slices.
  - Signals applied: modifier-over-enum, extract-for-testability, spike-before-shape, design-prototype-as-source-of-truth, design-enriched-specs, agent-skips-visual-polish, no-console-info-lint, no-component-test-infra.
  - Loop contract updated. Ready for Phase 2 IMPLEMENT Wave 1.
- **Unresolved**: none — ready for Wave 1 IMPLEMENT

---

## [2026-07-02] verify+drift+retro | webhook-unaware all waves

- **Picked up**: Phases 3-5 for webhook-unaware feature (verify in separate session, drift audit, retro)
- **Result**: Loop COMPLETE.
  - Verify: 30 PASS / 0 FAIL / 3 BLOCKED (spec 07 — deployment). Independent verifier in fresh session.
  - Drift: 7 divergences, all EVOLUTION (0 shortcuts, 0%). 5 specs patched (02, 03, 04, 09, 10). 3 root causes: lint `no-console` (D1, D6), Stripe TS type gap (D2), column type `Record<string, string>` (D3-D5, D7).
  - Retro: 1 pattern extracted (extract-for-testability), 1 pattern updated (spike-before-shape +2 items), 1 friction logged (no-console-info-lint).
  - Key learning: backend-only features produce zero visual drift — all deviations are compile-time constraints discoverable at spike time. Expanding spikes to "will this compile?" and "what types does the target accept?" would prevent all 7.
- **Unresolved**: Spec 07 (ops) blocked on deployment — register transfer events in Stripe Dashboard.

---

## [2026-07-01] shape | webhook-unaware

- **Picked up**: Phase 1 SHAPE for webhook-unaware feature ("Platform webhook unaware of Connect transfers" from current-issues.md)
- **Result**: Shaping complete. 10 specs created (01-10), BUILD-ORDER with dependency graph and 3-phase build order. Shape document with 4 shapes evaluated (A chosen — console logging v1). 4 spikes pre-resolved via agent codebase analysis. Slices document mapping specs to 3 waves (9 slices total). 9 individual slice implementation plans. Loop contract updated. No UI — entirely backend observability. Specs 02+03 combined into single implementation slice (same file contention on connect-webhook/route.ts).
- **Unresolved**: none — ready for Phase 2 IMPLEMENT

---

## [2026-07-01] implement | webhook-unaware waves 1–3

- **Picked up**: Phase 2 IMPLEMENT for all 3 waves of webhook-unaware feature
- **Result**: All 9 code slices implemented across 3 waves:
  - Wave 1 (3 parallel agents): `stripe-utils.ts` (new, 112 LOC), `appointments.ts` (+1 line metadata), `webhook/route.ts` (+else branch)
  - Wave 2 (3 parallel agents): `connect-webhook/route.ts` (+transfer.created/failed handlers), `stripe-utils.test.ts` (5 tests), `appointments-metadata.test.ts` (11 tests)
  - Wave 3 (1 direct + 1 agent): `connect-webhook/route.ts` (+else branch for unhandled), `connect-webhook/route.test.ts` (7 tests), ops checklist documented
  - Deviations logged: (1) `console.info` → `console.warn` for transfer.created (lint `no-console` rule), (2) `buildConnectPaymentMetadata` extracted as pure function (testability), (3) `(event.type as string)` cast for transfer.failed (Stripe TS types omit it), (4) `String()` wrapping for metadata (column is `Record<string, string>`)
  - 23 new tests, all passing. 3 pre-existing failures unchanged. Zero new type errors.
  - Spec 07 (ops: register events in Stripe Dashboard) documented but BLOCKED on deployment
- **Unresolved**: Spec 07 requires deployment. Phase 3 VERIFY next (separate session per loop contract).

---

## [2026-07-01] shape | refund-state

- **Picked up**: Phase 1 SHAPE for refund-state feature (issue #1 from stripe-connect design review)
- **Result**: Shaping complete.
  - Split feature into 10 specs (01–10) with design-enriched details from interactive prototype
  - Extracted 9 requirements (R0–R8) from specs + mental models analysis (12 models, all converge)
  - Single shape: modifier approach — `refunded: boolean` prop on `FeeBreakdown`, no 6th FeeState
  - No spikes needed — data path, component interface, rendering logic all understood from stripe-connect
  - Dependency graph + BUILD-ORDER.md: 3 phases, critical path `02→03→04→08` (4 specs)
  - Sliced into 3 waves: W1 foundations (3 specs), W2 core rendering (3 specs), W3 polish+tests (4 specs)
  - Design prototype reviewed (3 variants: connect+refunded, waived+refunded, legacy+refunded)
  - Design brief updated with prototype details (icon swaps, italic styling, card collapse behaviour)
  - Signals check: `agent-skips-visual-polish` friction applied → specs include explicit styling (italic, bold, Material icon names)
  - Implementation note: all specs touch single file (`payment-card.tsx`) → single agent recommended, not parallel
  - Shape docs: `shape/refund-state-shape.md`, `shape/refund-state-slices.md`, 3 wave plans
- **Unresolved**: none — ready for Wave 1 IMPLEMENT

## [2026-07-01] implement | refund-state waves 1–3

- **Picked up**: Phase 2 IMPLEMENT for all 3 waves (10 specs total)
- **Result**: All 3 waves implemented. Typecheck clean after each wave.
  - **Wave 1** (3 specs): Derived `refunded` boolean from `financialOutcome` (spec 01), added `refunded?: boolean` prop to `FeeBreakdown` (spec 02), legacy+refunded fallback collapses card to "Outcome: Refunded" + hides metadata (spec 06)
  - **Wave 2** (3 specs): Refunded display — "Returned" italic for fee, £0.00 for payout (spec 03), waived+refunded shows "Returned" not "Waived" (spec 05), threaded `refunded` prop from PaymentCard to FeeBreakdown (spec 07)
  - **Wave 3** (4 specs): Helper text icon swap `north_east`→`undo` + copy swap (spec 04), logic tests — 11 tests pass: 7 determineFeeState regression + 4 refunded derivation (specs 08-10 partial)
  - **Deviation**: Specs 08-10 called for 21 rendering tests but project has no component test infra (no RTL, no jsdom). Wrote 11 logic tests instead. Logged friction: `docs/signals/friction/no-component-test-infra.md`
  - **New files**: 1 (`payment-card.test.ts`). **Modified files**: 1 (`payment-card.tsx`).
  - Exported `determineFeeState` + `FeeState` type for testability
  - Context files updated: loop contract
- **Unresolved**: Rendering test coverage deferred to Phase 3 VERIFY (Playwright)

## [2026-07-01] verify | refund-state all waves

- **Picked up**: Phase 3 VERIFY — independent agent, fresh session
- **Result**: 26 PASS / 3 FAIL / 5 BLOCKED.
  - Code implementation: all 26 behavioral criteria pass by code review
  - Tests: 3 FAIL — specs 08-10 require rendering tests (RTL + jsdom not installed). Logic tests pass (11/11)
  - Playwright: 5 BLOCKED — empty database, no seed data
  - Verifier caught 2 spec issues: impossible states in spec 09 (cases 7-8) and spec 10 (case 5)
- **Unresolved**: Rendering test gap (friction logged). Playwright needs seed data.

## [2026-07-01] drift-audit + retro | refund-state all waves

- **Picked up**: Phase 4 DRIFT AUDIT + Phase 5 RETRO
- **Result**: Loop COMPLETE.
  - **Drift**: 5 divergences found. 4 evolution / 1 shortcut (20% — below 50% threshold)
    - Evolutions (4): added `north_east` icon to non-refunded helper (matches design), exported `determineFeeState`/`FeeState` for testability, removed impossible test cases from specs 09+10
    - Shortcuts (1): rendering tests substituted with logic tests (codebase lacks RTL)
  - **Patterns extracted (2):** modifier-over-enum (orthogonal boolean vs enum expansion — reusable for disputes, transfer_held), design-prototype-as-source-of-truth (interactive HTML for visual specs)
  - **Friction logged (1):** no-component-test-infra (CODEBASE)
  - **Friction analysis:** single friction item is codebase fault — RTL installation would resolve all 3 test FAILs
  - **Drift analysis:** all 4 evolutions accepted. 1 shortcut: tech debt for RTL installation
  - **Key learning:** Single-file features → single agent, sequential waves. Design prototypes > text specs for visual fidelity.
  - Evolution/shortcut ratio: 4/1 (80% evolution)
  - Patterns extracted: 2
  - Friction logged: 1
- **Unresolved**: RTL installation queued as codebase improvement

---

## [2026-06-28] shape | stripe-connect

- **Picked up**: Phase 1 SHAPE for Stripe Connect feature (17 specs + 7 design briefs + HTML mocks)
- **Result**: Shaping complete.
  - Updated loop contract from design-consistency → stripe-connect
  - Enriched 8 specs (05, 10, 11, 12, 14, 15, 16, 17) + build order with design brief details (animation specs, design tokens, responsive behavior, accessibility, state machines)
  - Extracted 9 requirements (R0-R8) from all 17 specs analyzed together
  - Formalized shape A (Stripe Connect Express with destination charges, 17 parts)
  - Ran 3 parallel spikes:
    - `spike-availability-gate.md`: `availabilityConfigured` not a field; derived from `shopHours.findFirst()` + `eventTypes.findFirst()`. shopHours auto-seeded; real gate is hasServices
    - `spike-email-pattern.md`: Templates are DB-stored HTML with `{{var}}` interpolation. Cron uses advisory lock pattern. Use `sendEmail()` directly with inline HTML
    - `spike-payments-enabled.md`: `paymentsEnabled={true}` confirmed at 3 locations in page.tsx. `getShopBySlug()` returns all columns. Downstream branching clean
  - Fit check: all 9 requirements ✅ (A17 flag resolved by spike)
  - Architecture mapping: 13 aligned, 1 flag (Stripe API version pinned — low risk), 1 known issue (Stripe Elements still uses Deep Ledger theme)
  - Sliced into 13 slices across 4 waves (validated against `_build-order.md` dependency graph)
  - Shape docs: `shape/stripe-connect-shape.md`, `shape/stripe-connect-slices.md`, 3 spike files
- **Unresolved**: none — ready for Wave 1 IMPLEMENT

## [2026-06-28] implement | stripe-connect waves 1–4

- **Picked up**: Phase 2 IMPLEMENT for all 4 waves (13 slices total)
- **Result**: All 13 slices implemented. Typecheck clean after each wave.
  - **Wave 1** (2 slices): Schema + migration (pgEnum, 3 columns, partial unique index, SQL migration), currency USD→GBP (3 locations), env `STRIPE_CONNECT_WEBHOOK_SECRET` (optional)
  - **Wave 2** (4 slices, parallel): 3 API routes (create-account, status, dashboard), Connect webhook (`account.updated` handler, dedup, capability revocation), destination charges (`transfer_data`, `application_fee_amount: 50`, `on_behalf_of`, ≤50p waiver), booking guard (`paymentsEnabled` dynamic from `stripeOnboardingStatus`)
  - **Wave 3** (5 slices, parallel): Settings page (5-state client component: start→redirect→pending→verifying→connected, 1700ms transition, auto-poll, celebrate), refresh link API, refund reverse transfer (`reverse_transfer + refund_application_fee`), dashboard connect card (4-state: Tier 1 navy, Tier 2 amber, Tier 2b pending, with gate queries), payment card (5-state: connect/waived/legacy/skipped/policy)
  - **Wave 4** (2 slices, parallel): Nav "Payments" link + 8px amber indicator dot (passed via layout→nav props), re-engagement email cron (advisory lock 482181, 24–48h window, `messageDedup` tracking, inline HTML)
  - **New files**: 10. **Modified files**: 9. **Migration**: 1.
  - Context files updated: progress-tracker.md, architecture-context.md (webhook, cron, env), loop contract
  - One cosmetic deviation: schema agent reformatted `appointmentEvents` index callback whitespace (tabs→spaces). No functional change.
- **Unresolved**: none — ready for Phase 3 VERIFY

## [2026-06-29] drift-audit | stripe-connect all waves

- **Picked up**: Phase 4 DRIFT AUDIT — compare all 17 specs against implementation
- **Result**: 43 divergences found. **20 evolution / 23 shortcut (53.5% shortcuts — FLAGGED).**
  - Evolutions (20): error handling on API routes, transaction wrapping in webhook, semantic Link vs Button, centralized depositSkipped logic, generic messageDedup over dedicated column, descriptive migration filename, ARIA enhancements
  - Shortcuts (23): concentrated in 4 specs:
    - Spec 10 (7 shortcuts): missing watermark icon, accent stripes, bg token, bridge link prominence, success icon background, mobile progress stacking, banner auto-fade
    - Spec 12 (5 shortcuts): missing Stripe Connect badge, footer, status pill styling; state routing uses amountCents instead of transfer_data; no depositSkipped prop passed to payment card
    - Spec 16 (5 shortcuts): missing plain text fallback, email footer, dark mode, responsive breakpoints, logo
    - Spec 15 (4 shortcuts): missing ARIA role/label, heading prominence, count typography, post-booking inline prompt
  - 4 critical shortcuts: payment card can't distinguish pre-Connect vs Connect payments, webhook bypasses env.ts validation, no prod enforcement of webhook secret, refresh route missing try/catch
  - Drift signal logged: `docs/signals/drift/stripe-connect-wave-all.md`
- **Unresolved**: Shortcut ratio exceeds 50% threshold. Core business logic is clean — drift is in UI polish and email completeness. Recommend a polish pass for critical shortcuts (payment card state routing, env validation) in a future wave.

## [2026-06-29] retro | stripe-connect all waves

- **Picked up**: Phase 5 RETRO — extract patterns, log friction, close loop
- **Result**: Loop COMPLETE.
  - **Patterns extracted (3):** design-enriched-specs (merge design brief details into specs before implement), spike-before-shape (confirmation spikes against actual codebase), parallel-wave-implementation (worktree agents per slice)
  - **Friction logged (2):** agent-skips-visual-polish (AGENT — agents treat visual details as optional; mitigate with visual checklists per slice or design conformance pass), env-validation-bypass (CODEBASE — existing webhook pattern bypasses validated env module)
  - **Drift analysis:** 20 evolutions accepted. 23 shortcuts: 4 critical → tech debt for fix pass, 19 medium/low → deferred to polish pass
  - **Shaping assessment:** All 3 spikes high-value (resolved unknowns that would have caused rework). Pre-existing build order validated. Design enrichment helped but wasn't sufficient — agents need concrete CSS values per slice, not just spec-level prose
  - **Key learning:** Agents implement business logic faithfully but treat visual polish as optional. Concrete CSS values > prose descriptions. Next feature should include visual checklists per slice plan.
  - Evolution/shortcut ratio: 20/23 (FLAGGED — 53.5%)
  - Patterns extracted: 3
  - Friction logged: 2
- **Unresolved**: 4 critical shortcuts queued for fix pass. 19 medium/low polish items deferred.

---

## [2026-06-21 23:00] retro | design-consistency waves 1-2

- **Picked up**: Retrospective on waves 1-2 to seed signals before starting wave 3
- **Result**: Extracted 13 signals from shaping docs, spike reports, current-issues.md, and learning log:
  - 5 patterns: spike-first-shaping, foundation-first-slicing, explicit-scope-fencing, single-file-sweep, css-variable-indirection
  - 5 friction: token-docs-production-drift (CODEBASE), cascading-rename-breakage (AGENT), tailwind-theme-mapping-gaps (CODEBASE), dual-design-system-coexistence (CODEBASE), mocks-outrun-product-model (SPEC)
  - 3 drift: radius-scale-update (EVOLUTION), protected-component-modification (EVOLUTION), secondary-tertiary-text-collapse (EVOLUTION)
  - Evolution/shortcut ratio: 3/0 — all drift was legitimate evolution
- **Unresolved**: none

## [2026-06-22] shape+implement | design-consistency wave 5

- **Picked up**: Wave 5 — Spec #20 (dead token cleanup), 2 slices
- **Result**: Both slices implemented and verified (typecheck pass after each):
  - Slice 1: Component migrations — booking-form.tsx (4 `--color-*` → AL tokens, 3 `text-text-light-muted` → `text-al-on-surface-variant`), event-type-list.tsx (`.status-pill` → Tailwind inline classes), globals.css (`.service-card-arrow` hover rules reparented to `.al-service-card`).
  - Slice 2: Dead code removal — removed from globals.css:
    - 48 dead Deep Ledger tokens (surface, text, accent, tier, status, shadow, compat aliases)
    - `.dark {}` block (33 lines)
    - 15 dead utility classes (surface-*, card-glass, glow-brand, skeleton, tier-dot-*, status-pill, service-card, focus-brand, font-display/body/mono)
    - Net: -211 lines from globals.css
  - 15 tokens retained with `/* DEFERRED — landing page redesign */` comment block (brand, surface-void/base/raised, text-primary/secondary/tertiary/inverse/light-muted, border-hairline/default)
  - Grep audit: zero dead token/class refs in src/ except globals.css deferred block + landing page components
  - Surprise find: booking-form.tsx also had 3 `text-text-light-muted` Tailwind class refs (Deep Ledger via Tailwind's `--color-text-light-muted` theme token) — migrated to AL
  - Shape docs: wave-5-shaping.md + wave-5-slices.md in docs/shaping/.../shape/wave-5/
  - Resolves friction signal: dual-design-system-coexistence (for app pages; landing page deferred)
  - Phase 3 (VERIFY) found CRITICAL: booking-form.tsx success block had 6 Deep Ledger Tailwind classes (`bg-bg-dark-secondary/70`, `text-primary-light`, `bg-bg-dark`, `text-white` x3) — all migrated to AL tokens (`bg-al-surface-container-lowest`, `text-al-primary`, `bg-al-surface-container-low`, `text-al-on-surface`). Also removed `--color-surface-void` (zero consumers). Typecheck clean.
- **Unresolved**: none — verification complete

## [2026-06-22] shape+implement | design-consistency wave 4

- **Picked up**: Wave 4 — Specs #09-#19 (11 specs, 8 slices). Shape + implement phases.
- **Result**: 7 of 8 slices implemented and verified (`pnpm check` pass after each):
  - Slice 1: #14 Dashboard, #15 Services, #16 Billing, #17 Calendar — class swaps, status tokens
  - Slice 2: #19 Settings/detail pages (6 files) — title + padding alignment
  - Slice 3: #18 Profile — Lucide → Material Symbols, card radius, green → AL tokens
  - Slice 4: #12 Booking — 27→0 inline styles, extracted BookingHeader component
  - Slice 5: #09 Appointments — 57→1 inline style, 41→0 hex. Biggest conversion.
  - Slice 6: #10 Customers + #11 Conflicts pages — both page.tsx fully converted
  - Slice 7: #13 Payment Policy — 35→2 inline styles, TiersExplainerCard converted
  - Slice 8: companion components (customers-editorial.tsx 88→12, conflicts-ledger.tsx 67→4) — all remaining are dynamic runtime values
  - Shape docs created: wave-4 shape + slices in docs/shaping/.../shape/wave-4/
  - 19 remaining inline `style={{}}` across all files — all dynamic (runtime data-driven colors, score bar widths, tier gradients)
  - 2 hardcoded hex remain (bespoke avatar gradient stops with no AL equivalent)
  - Zero hardcoded hex colors remain in any page file
- **Unresolved**: none — all 8 slices complete, awaiting Phase 3 verification

## [2026-06-22 00:15] implement+verify | design-consistency wave 3

- **Picked up**: Wave 3 — Spec #04 (AL utility classes), 2 sequential slices
- **Result**: Both slices implemented and verified:
  - Slice 1: 3 tokens added to :root (--al-display-lg, --al-track-eyebrow, --al-radius-3xl). Typecheck pass.
  - Slice 2: 8 utility classes appended (.al-page, .al-page-title, .al-section-title, .al-eyebrow, .al-lede, .al-card, .al-num, .al-mono). Typecheck pass.
  - Grep verification: 3 token definitions confirmed, 8 class definitions confirmed (9th match was pre-existing .al-card-glass — not our change)
  - Drift audit: skipped — purely additive change with zero existing consumers
  - current-issues.md: resolved item #13 (3 missing tokens)
  - Loop contract corrected: was pointing at booking page specs #08/#09, actually wave-3 shaping was for DS spec #04
- **Unresolved**: none

## [2026-07-05] verify+drift+retro | Re-engagement-email wave 1

- **Picked up**: Phases 3-5 for Re-engagement-email feature (verify in separate session, drift audit, retro)
- **Result**: Loop COMPLETE.
  - Verify: 7 PASS / 4 FAIL (all pre-existing). Independent verifier in fresh session.
    - Copy changes: 7/7 PASS — all 4 specs' text content matches exactly.
    - Typography/structure: 0/4 PASS — all failures are pre-existing gaps from original spec 16 implementation (letter-spacing, max-width, font-size, brand footer). Not regressions from this change.
    - Unchanged strings confirmed: subject line, CTA, nudge text, sign-off, advisory lock, timing window, dedup guard.
    - Copy-only change confirmed: diff shows exactly 4 lines changed, all within string literals.
    - Typecheck: clean.
  - Drift: 0 evolution / 0 shortcut / 4 pre-existing / 1 spec inconsistency. Zero drift from this change.
    - 4 pre-existing: typography values in original email template don't match design prototype.
    - 1 spec inconsistency: spec 04 acceptance says "match HTML footer" but its own explicit template shows different wording. Implementation follows the explicit template (correct).
  - Retro: 0 patterns extracted (copy-only fix, no reusable solutions). 0 friction logged. Pre-existing typography gaps logged to current-issues.md as single bundled issue.
  - Key learning: Copy-only changes execute cleanly because scope is unambiguous. The typography failures highlight that the original email implementation (spec 16) had design-conformance gaps that the `agent-skips-visual-polish` friction signal already predicted.
- **Unresolved**: Pre-existing email typography gaps tracked in current-issues.md. Bundle fix with a future email design-conformance pass.

---

## [2026-07-05] shape+implement | Re-engagement-email wave 1

- **Picked up**: Re-engagement email copy fix — 4 specs (01-04), false premise in abandoned Connect email
- **Result**: All 4 specs implemented in 1 wave (single agent, file contention):
  - Shape: shape doc, slices doc, 1 wave plan. No spikes needed (copy-only fix).
  - Spec 01: HTML headline "You started connecting your Stripe account — you're almost there." → "You began setting up deposits — finish in under 5 minutes."
  - Spec 02: HTML body "Once verified" → "Once set up"
  - Spec 03: HTML footer "you started Stripe Connect onboarding for your Astro account" → "you began setting up deposit collection for your Astro account"
  - Spec 04: Plaintext mirrors all HTML changes (headline + body + footer)
  - Subject line and CTA unchanged (already correct)
  - Typecheck: clean. Lint: 0 new errors (188 pre-existing).
  - Modified file: `src/app/api/jobs/connect-reengagement/route.ts` (4 string replacements)
- **Unresolved**: Phase 3 VERIFY must run in a separate fresh session (per loop contract rule: NEVER self-verify)
