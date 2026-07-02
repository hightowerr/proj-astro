# Work Log

Append-only. Every agent reads the last 10 entries at session start for context.

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
