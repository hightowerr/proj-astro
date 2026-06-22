# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

---

## Current Phase

Design Consistency Wave 3 — Spec #04 (AL Utility Classes) implemented and verified.

---

## Current Goal

Continue DS conformance across remaining screens (specs #09-#20) and complete booking page reskin (specs #08-#09).

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

## In Progress

None.

---

## Next Up

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
