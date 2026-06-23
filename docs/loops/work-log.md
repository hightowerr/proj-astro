# Work Log

Append-only. Every agent reads the last 10 entries at session start for context.

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
