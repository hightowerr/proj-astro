# Design Consistency Wave 2 — Slices

**Shape:** design-consistency-wave2-shape.md
**Date:** 2026-06-19

---

## Dependency Graph

```
Slice 1 (Foundation: Fonts + 2 New Tokens)
  │
  ├──→ Slice 2 (Dialog)              [no dependency — can start immediately]
  │
  └──→ Slice 3 (Booking Components)  [depends on Slice 1 for border tokens]
```

Slices 1 and 2 can execute in parallel. Slice 3 waits on Slice 1.

---

## Slice Overview

| # | Name | Specs | Files Changed | New Lines | Risk |
|---|------|-------|---------------|-----------|------|
| 1 | Foundation: Fonts + Tokens | #02 + token gap | 1 (`globals.css`) | 2 (new tokens) + 6 swaps | Minimal |
| 2 | Dialog: Token Migration | #06 | 1 (`dialog.tsx`) | 0 (replacements only) | Minimal |
| 3 | Booking Components: Token Migration | #08 | 6 component files | 0 (replacements only) | Low |

**Total files touched:** 8
**Total new tokens added:** 2 (`--al-status-negative-border`, `--al-status-caution-border`)

---

## Slice Definitions

### Slice 1 — Foundation: Fonts + Tokens

**Goal:** Complete font normalization to canonical AL tokens and add 2 missing status border tokens.

**Files:**
- `src/app/globals.css` — swap 6 font variable references in `@layer base` (lines 498, 502, 506) and utility classes (lines 515–517); add 2 new tokens to `:root` block near line 442

**Side effects:**
- 18 components using `font-mono` Tailwind class silently switch from `var(--font-mono)` to `var(--al-font-mono)` resolution path (same actual font — JetBrains Mono)
- Resolves `current-issues.md` item: "`--font-display` and `--font-body` legacy aliases still in `@theme inline`" (aliases are retained but base rules no longer depend on them)

**Implementation plan:** `slice-1-foundation-plan.md`

---

### Slice 2 — Dialog: Token Migration

**Goal:** Replace 5 forbidden Deep Ledger tokens in Dialog component with AL equivalents.

**Files:**
- `src/components/ui/dialog.tsx` — 5 inline style swaps (lines 66–68, 77, 132)

**Side effects:** None. Dialog is a shared UI component; all consumers inherit the visual change. No functional/behavioral change.

**Implementation plan:** `slice-2-dialog-plan.md`

---

### Slice 3 — Booking Components: Token Migration

**Goal:** Migrate 6 booking/service/manage/conflicts components from Deep Ledger tokens to AL tokens.

**Files:**
- `src/components/booking/booking-form.tsx` — 16 unique token types
- `src/components/booking/service-selector.tsx` — 6 unique token types + class swap
- `src/components/services/event-type-list.tsx` — 16 unique token types
- `src/components/services/event-type-form.tsx` — 11 unique token types
- `src/components/manage/manage-booking-view.tsx` — 19 unique token types
- `src/components/conflicts/conflict-alert-banner.tsx` — 1 token type

**Depends on:** Slice 1 (needs `--al-status-negative-border`, `--al-status-caution-border`)

**Explicitly out of scope:**
- Stripe Elements appearance object (`booking-form.tsx` lines 115–150)
- Dark success block Tailwind classes (`booking-form.tsx` lines 880–940)
- Hardcoded `rgba()` values (hairlines and warning border)
- 13 inline `var(--font-mono)` references in 4 files (reads from `@theme`, not `--color-*`)

**Implementation plan:** `slice-3-booking-plan.md`
