# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

---

## Current Phase

Stripe Connect — Feature loop COMPLETE + post-loop design review done. All 23 drift shortcuts fixed. 15 new issues logged from design grilling, 3 roadmap items parked.

---

## Current Goal

Address critical current-issues from design review before ship: slot recovery Connect guard, minimum deposit floor, platform webhook Connect awareness, suspended onboarding status, free booking SMS gap.

---

## Completed

- Shaping: requirements, 3 shapes evaluated, fit check, Shape C selected
- Spikes: RouteChrome exclusion (clean), mixed styling coexistence (safe)
- Breadboarding: full affordance tables + wiring diagram
- Slicing: 3 vertical slices with individual implementation plans
- V1: Booking layout + navigation header — implemented and verified (0 TS errors)
- V2: Page header + service card — implemented and verified (0 TS errors)
- V3: Date picker + communication preferences — implemented and verified (0 TS errors)
- Time slot grid (spec 05) — implemented and verified (0 TS errors, Playwright visual + interaction pass)
- Contact form (spec 06) — implemented and verified (0 TS errors, focus ring confirmed via Playwright computed styles). Includes date picker focus ring retrofix.
- Home screen DS conformance pass (all 5 slices) — implemented and verified (0 TS errors):
  - Slice 1: Token foundation — 6 missing tokens added to `globals.css`, `code-standards.md` radius reference updated
  - Slice 2: Icon swap — 9 lucide-react icons replaced with Material Symbols Outlined via file-local `MsIcon` helper
  - Slice 3: Card surface & elevation — radius bumped to `rounded-3xl`, bespoke shadows replaced with `--al-shadow-float`, hover-lift/scale removed, Team card restructured to white surface
  - Slice 4: Typography & color — hero title capped at `--al-display-lg` (56px), eyebrow tracking normalized to 0.2em, status pill switched to `--al-status-positive` tokens, mono font added to numeric data, dividers switched to `--al-hairline`
  - Slice 5: Buttons & accessibility — gradient CTA + `--al-shadow-cta` on primary buttons, `focus-visible:ring` on all interactive elements, hover-translate removed
- Spec #11 — Scattered hardcoded hex (Slices 6-7) — implemented and verified (0 TS errors):
  - Slice 6: Theme mapping — added `--color-al-on-secondary-container` to `@theme inline` block
  - Slice 7: Hex-to-token swap — replaced all 12 hardcoded hex class instances with Tailwind DS token utilities (`bg-al-*`, `text-al-*`). Zero hardcoded hex values remain in `atelier-dashboard.tsx`.
- Design Consistency Wave 1 (Specs #01, #03, #05, #07) — implemented and verified (0 TS errors, build passes):
  - Slice 1: Foundation — removed 3 legacy fonts (Cormorant, Bricolage, Fira Code), added JetBrains Mono via `next/font/google`, repointed `--font-mono`/`--font-display`/`--font-body` in `globals.css`, added `--al-font-mono`, added 49 missing AL tokens (typography scale, weights, tracking, spacing, layout, motion, effects, status border)
  - Slice 2: Button — replaced 5 Deep Ledger `--color-*` tokens in `outline` variant with `--al-*` equivalents. Zero `--color-` references remain in `button.tsx`.
  - Slice 3: Dashboard — migrated 5 components (`shop-overview-card`, `confirmation-status-badge`, `success-banner`, `copy-button`, `booking-management-choice`) from Deep Ledger tokens + hardcoded Tailwind dark-theme colors to AL tokens. Zero forbidden tokens remain.
- Design Consistency Wave 2 (Specs #02, #06, #08) — implemented and verified (0 TS errors, build passes):
  - Slice 1: Foundation — normalized `@layer base` font rules and utility classes from `--font-body`/`--font-display`/`--font-mono` to `--al-font`/`--al-font-mono`. Added 2 new tokens (`--al-status-negative-border`, `--al-status-caution-border`).
  - Slice 2: Dialog — replaced 5 forbidden Deep Ledger tokens in `dialog.tsx` inline styles with AL equivalents. Zero `--color-` references remain.
  - Slice 3: Booking Components — migrated 6 component files (`conflict-alert-banner`, `service-selector`, `event-type-form`, `event-type-list`, `booking-form`, `manage-booking-view`) from Deep Ledger `--color-*` tokens to AL tokens. Class swap `service-card` → `al-service-card`. Zero `--color-*` references remain except booking-form.tsx dark success block (out of scope, tracked in current-issues.md).

---

- Design Consistency Wave 3 (Spec #04) — implemented and verified (0 TS errors):
  - Slice 1: Token pre-reqs — added 3 missing tokens to `:root` (`--al-display-lg: 3.5rem`, `--al-track-eyebrow: 0.2em`, `--al-radius-3xl: 24px`). Resolved current-issues.md item #13.
  - Slice 2: Utility classes — appended 8 canonical AL utility classes to globals.css (`.al-page`, `.al-page-title`, `.al-section-title`, `.al-eyebrow`, `.al-lede`, `.al-card`, `.al-num`, `.al-mono`). Purely additive — no component migration yet.

---

- Design Consistency Wave 4 (Specs #09-#19) — Slices 1-7 implemented (0 TS errors):
  - Slice 1: Light typography pages (#14 Dashboard, #15 Services, #16 Billing, #17 Calendar) — page titles → `al-page-title`, subtitles → `al-lede`, breadcrumbs → `al-eyebrow`, amber/red Tailwind → AL status tokens, inline styles removed from calendar page. Padding aligned to canonical py-8/px-12.
  - Slice 2: Settings & detail pages (#19) — 6 files (availability, reminders, appointments/[id], customers/[id], slot-openings/[id], chat) — titles → `al-page-title`, padding → px-12 py-8, `text-muted-foreground` → `text-al-on-surface-variant`, section headings → `al-section-title`, inline styles removed from reminders page.
  - Slice 3: Profile page (#18) — Lucide icons (Mail, Calendar, User, Shield, ArrowLeft, Lock, Smartphone) → Material Symbols Outlined via file-local `MsIcon` helper. Title → `al-page-title`, container → `al-page`, cards → `al-card`, hardcoded green → AL status tokens, `text-muted-foreground` → `text-al-on-surface-variant`.
  - Slice 4: Booking page (#12) — Extracted `BookingHeader` component to eliminate 4x header duplication. All 27 inline styles → Tailwind classes. Preserved intentional wider padding (64px/px-16) for public-facing page. Empty-state card converted to Tailwind.
  - Slice 5: Appointments page (#09) — 57→1 inline styles (1 remaining is dynamic status pill). 41 hardcoded hex → 0. Root → `al-page`, eyebrows → `al-eyebrow`, title → `al-page-title`, sections → `al-section-title`, cards → `al-card`, stats → `al-mono`. RECOVERY_STATUS hex tuples → AL token references.
  - Slice 6: Customers + Conflicts pages (#10, #11) — Both page.tsx files fully converted. Inline Icon components removed, replaced with direct `material-symbols-outlined` spans. Buttons converted to Tailwind + gradient classes. Zero inline styles remain.
  - Slice 7: Payment Policy page (#13) — 35→2 inline styles (2 remaining are dynamic tier badge colors). TiersExplainerCard converted: grid → Tailwind grid, hex → AL tokens, Material Symbols inline → class-based. TIER_DEFINITIONS hex tuples → AL token references.

---

- Design Consistency Wave 4 Slice 8 (companion components):
  - customers-editorial.tsx: 88→12 inline styles (12 remaining are dynamic runtime values: tier colors, score bar widths, data-driven gradients). 82→2 hardcoded hex (bespoke avatar gradient stops with no AL token equivalent). FONT constant removed. 88 className attributes added.
  - conflicts-ledger.tsx: 67→4 inline styles (4 remaining are dynamic: severity badge colors, severity rail indicators). 54→0 hardcoded hex. FONT_FAMILY constant removed. AL utility classes leveraged: al-card, al-section-title, al-eyebrow, al-lede, al-num.

---

- Design Consistency Wave 5 (Spec #20) — Dead token cleanup. 2 slices COMPLETE (0 TS errors):
  - Slice 1: Component migrations — booking-form.tsx (4 --color-* → AL, 3 text-text-light-muted → AL), event-type-list.tsx (.status-pill → Tailwind inline classes), service-selector.tsx (.service-card-arrow hover fix).
  - Slice 2: Dead code removal — removed 48 dead Deep Ledger tokens, .dark {} block (33 lines), 15 dead utility classes (surface-*, card-glass, glow-brand, skeleton, tier-dot-*, status-pill, service-card, focus-brand, font-display/body/mono). globals.css reduced by ~215 lines. 14 tokens retained with DEFERRED comment for landing page redesign.
  - Verification fix: booking-form.tsx success block had 6 Deep Ledger Tailwind classes (bg-bg-dark-secondary/70, text-primary-light, bg-bg-dark, text-white x3) — all migrated to AL tokens. Removed --color-surface-void (zero consumers).

---

- Page layout consistency fix — all app pages now use centered `max-w-7xl` (1280px) content cap:
  - `.al-page` utility class: added `max-width: 80rem; margin-inline: auto` (globals.css)
  - App layout wrapper: added `bg-al-surface-low` for consistent background behind centered content (layout.tsx)
  - Calendar settings: normalized from `max-w-screen-xl` to `max-w-7xl`, padding to `px-12 py-8`
  - Reminders + Availability settings: normalized from Tailwind `container` to `max-w-7xl mx-auto`
  - 0 TS errors. Verified via Playwright at 1920px viewport — all pages center consistently.

- ESM compliance fix: moved `MsIcon` declaration in `src/app/profile/page.tsx` from between import statements to after all imports. 0 TS errors, 0 lint errors.
- Cancel modal a11y audit: confirmed `manage-booking-view.tsx` dialog already has `role="dialog"`, `aria-modal`, Escape handling, and focus trapping via `@radix-ui/react-dialog`. No changes needed — logged as false positive in current-issues.md.
- Icon fix in `customers-editorial.tsx`: replaced dynamic `text-[${size}px]` template literal with static size map (Tailwind JIT safe), added `aria-hidden="true"` to all icon spans. 0 TS errors, 0 lint errors.
- Icon a11y fix in `profile/page.tsx`: added `aria-hidden="true"` to `MsIcon` span so screen readers won't announce raw glyph names. 0 TS errors, 0 lint errors.

---

- **Stripe Connect** — 17 specs, 4 waves, 13 slices. All implemented (0 TS errors). Awaiting verify.
  - Shaping: 9 requirements, shape A (Express + destination charges), 3 spikes resolved, 13 slices
  - **Wave 1 (Foundation):** Schema (3 columns on `shops`: `stripeAccountId`, `stripeOnboardingStatus` enum, `stripeAccountCreatedAt`; pgEnum; partial unique index), migration (`drizzle/0035_stripe_connect_columns.sql`), currency USD→GBP (3 locations), env `STRIPE_CONNECT_WEBHOOK_SECRET` (optional)
  - **Wave 2 (API + Core Logic):** 3 account lifecycle APIs (create-account POST, status GET, dashboard GET) at `/api/settings/stripe-connect/*`. Connect webhook at `/api/stripe/connect-webhook` (separate signing secret, dedup via `processedStripeEvents`, handles `account.updated`). Destination charges (`transfer_data.destination` + `application_fee_amount: 50` + `on_behalf_of` on PaymentIntents; fee waived ≤50p). Booking guard (`paymentsEnabled` dynamic from `shop.stripeOnboardingStatus === "complete"` in 3 places in `book/[slug]/page.tsx`)
  - **Wave 3 (UI + Dependent):** Settings page (5-state client component: start→redirect 1700ms→pending progress indicator→verifying auto-poll→connected celebrate). Refresh link API (re-creates expired Account Links). Refund reverse (`reverse_transfer: true` + `refund_application_fee: true`). Dashboard connect card (4-state: Tier 1 navy, Tier 2 amber with booking count, Tier 2b pending, connected; gated behind `hasServices AND hasAvailability` queries). Payment card (5-state: connect ledger/waived/legacy/skipped/policy on appointment detail)
  - **Wave 4 (Polish):** Nav "Payments" link with 8px amber indicator dot (gated, passed via layout→nav props). Re-engagement email cron (`connect-reengagement`, advisory lock 482181, 24–48h window, `messageDedup` tracking, inline HTML via Resend)
  - **New files (10):** `create-account/route.ts`, `status/route.ts`, `dashboard/route.ts`, `refresh/route.ts`, `connect-webhook/route.ts`, `stripe-connect/page.tsx`, `stripe-connect-card.tsx`, `connect-card.tsx`, `payment-card.tsx`, `connect-reengagement/route.ts`
  - **Modified files (9):** `schema.ts`, `env.ts`, `appointments.ts`, `booking-form.tsx`, `book/[slug]/page.tsx`, `stripe-refund.ts`, `dashboard/page.tsx`, `app-nav.tsx`, `layout.tsx`
  - **Context files updated:** `architecture-context.md` (webhook, cron, env), `progress-tracker.md`, `feature-loop-contract.md`, `work-log.md`

---

## In Progress

- **Stripe Connect** — Loop COMPLETE. All 23 drift shortcuts fixed. Post-loop design review surfaced 15 issues (current-issues.md) and 3 roadmap items. Key issues before ship: slot recovery Connect guard (hardcoded `paymentsEnabled: true`), minimum deposit floor (£1 platform policy), suspended status for capability revocation, free booking SMS gap, platform webhook Connect transfer awareness.

---

## Next Up

- Stripe Connect pre-ship fixes (15 issues from design review — see current-issues.md)
- Remaining booking page specs: confirm-booking-CTA (08), footer (09)

---

## Open Questions

- Should `BookingNav` be session-aware? (Current spec shows static links; `SiteHeader` is session-aware)
- Do landing page sections have matching `id` anchors for nav links?

---

## Architecture Decisions

- **Shape C selected:** Booking-specific layout (`src/app/book/layout.tsx`) isolates changes from shared `SiteHeader`. Components restyled in-place, not extracted.
- **RouteChrome exclusion:** Add `"/book"` to `APP_ROUTE_PREFIXES` — one-line change.
- **Home screen DS conformance:** Option A (single-file sweep) chosen. All 12 specs resolved across 7 slices over `atelier-dashboard.tsx` + `globals.css`.
- **Stripe Connect:** Express accounts with destination charges. Separate Connect webhook endpoint (different signing secret). Prompt timing gated behind `eventTypes.findFirst()` + `shopHours.findFirst()` (no new column — `shopHours` auto-seeded on creation, real gate is `hasServices`). Re-engagement email uses `messageDedup` table for send-once constraint (no new column on shops).

---

## Session Notes

Shaping documents: `docs/shaping/booking-page/`
- `booking-page-reskin-shape.md` — main shaping doc (R, shapes, fit check, breadboard)
- `booking-page-reskin-slices.md` — slice definitions + sliced breadboard
- `v1-plan.md`, `v2-plan.md`, `v3-plan.md` — individual slice implementation plans
- `spike-routechrome-exclusion.md`, `spike-mixed-styling.md` — spike reports

Home screen DS conformance: `docs/shaping/home-screen-update/shapes/`
- `home-screen-ds-conformance.md` — main shape doc
- `home-screen-ds-conformance-slices.md` — 5 slices
- `plan-slice-1-token-foundation.md` through `plan-slice-5-buttons-a11y.md`
- `spike-token-gap.md`, `spike-lucide-scope.md`, `spike-material-symbols-pattern.md`

Spec #11 — Hex-to-token: `docs/shaping/home-screen-update/shapes/`
- `hex-to-token-shape.md` — shape doc (Shape A selected)
- `hex-to-token-slices.md` — 2 slices
- `plan-slice-6-theme-mapping.md`, `plan-slice-7-hex-swap.md`
- `spike-theme-mapping-gap.md`, `spike-hex-scope-beyond-dashboard.md`

Design Consistency Wave 1: `docs/shaping/design-consistency/feature-spec/shape/`
- `design-consistency-wave1-shape.md` — main shape doc (spikes resolved, shape confirmed)
- `design-consistency-wave1-slices.md` — 3 slices
- `slice-1-foundation-plan.md`, `slice-2-button-plan.md`, `slice-3-dashboard-plan.md`
- `spike-unmapped-tokens.md`, `spike-font-blast-radius.md`, `spike-tailwind-theme-mapping.md`

Design Consistency Wave 2: `docs/shaping/design-consistency/feature-spec/shape/wave-2/`
- `design-consistency-wave2-shape.md` — main shape doc (3 spikes resolved, shape confirmed)
- `design-consistency-wave2-slices.md` — 3 slices (Foundation, Dialog, Booking Components)
- `slice-1-foundation-plan.md`, `slice-2-dialog-plan.md`, `slice-3-booking-plan.md`
- `spike-font-rules.md`, `spike-dialog-tokens.md`, `spike-booking-components.md`

Stripe Connect: `docs/shaping/stripe-connect/`
- 17 specs (01–17) + `_build-order.md` — implementation specs with design enrichment
- `design/` — 7 design briefs + interactive HTML mocks (.dc.html) + screenshots
- `shape/stripe-connect-shape.md` — shaping doc (9 R's, 17 parts, fit check)
- `shape/stripe-connect-slices.md` — 13 slices across 4 waves
- `shape/spike-availability-gate.md`, `spike-email-pattern.md`, `spike-payments-enabled.md`
