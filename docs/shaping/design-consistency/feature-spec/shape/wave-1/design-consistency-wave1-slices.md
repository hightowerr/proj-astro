# Design Consistency Wave 1 — Slices

**Shape:** design-consistency-wave1-shape.md
**Date:** 2026-06-19

---

## Dependency Graph

```
Slice 1 (Foundation)
  │
  ├──→ Slice 2 (Button)     [no dependency — can start immediately]
  │
  └──→ Slice 3 (Dashboard)  [depends on Slice 1 for tokens]
```

Slices 2 and 3 can execute in parallel once Slice 1 is merged.

---

## Slice Overview

| # | Name | Specs | Files Changed | New Lines | Risk |
|---|------|-------|---------------|-----------|------|
| 1 | Foundation: Fonts + Tokens | #01, #03 | 2 (`layout.tsx`, `globals.css`) | ~60 | Low |
| 2 | Button: Outline Variant | #05 | 1 (`button.tsx`) | 0 (replacements only) | Minimal |
| 3 | Dashboard: Component Migration | #07 | 5 dashboard components | 0 (replacements only) | Low |

**Total files touched:** 8
**Total new tokens added:** ~49 (48 from spec #03 + 1 new `--al-status-positive-border`)

---

## Slice Definitions

### Slice 1 — Foundation: Fonts + Tokens

**Goal:** Establish correct font loading and complete the AL token infrastructure in production CSS.

**Files:**
- `src/app/layout.tsx` — remove 3 legacy fonts, add JetBrains_Mono
- `src/app/globals.css` — repoint font stacks, add ~49 missing tokens, add `--al-font-mono`

**Side effects:**
- 31 downstream `font-mono` usages across 12 components silently switch from Fira Code to JetBrains Mono
- Update `docs/context/current-issues.md` — resolve "JetBrains Mono not loaded" and "--al-hairline-strong and --al-shadow-ring tokens not in globals.css" issues

**Implementation plan:** `shape/slice-1-foundation-plan.md`

---

### Slice 2 — Button: Outline Variant

**Goal:** Replace 5 forbidden Deep Ledger tokens in the Button's `outline` variant with AL equivalents.

**Files:**
- `src/components/ui/button.tsx` — line 16 only

**Side effects:** None. Button is a leaf component; the outline variant's visual appearance changes from dark-theme to light-theme colors.

**Implementation plan:** `shape/slice-2-button-plan.md`

---

### Slice 3 — Dashboard: Component Migration

**Goal:** Migrate 5 dashboard components from Deep Ledger / hardcoded tokens to AL tokens.

**Files:**
- `src/components/dashboard/shop-overview-card.tsx`
- `src/components/dashboard/confirmation-status-badge.tsx`
- `src/components/dashboard/success-banner.tsx`
- `src/components/dashboard/copy-button.tsx`
- `src/components/dashboard/booking-management-choice.tsx`

**Depends on:** Slice 1 (needs `--al-status-neutral-*`, `--al-hairline-rest`, `--al-hairline-strong`, `--al-status-positive-border`)

**Implementation plan:** `shape/slice-3-dashboard-plan.md`
