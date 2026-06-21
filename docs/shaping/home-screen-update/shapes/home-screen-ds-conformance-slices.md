# Slices: Home Screen DS Conformance Pass

**Shape:** `docs/shaping/home-screen-ds-conformance.md`
**Approach:** Option A — single-file sweep, one branch, one PR
**Execution order:** Sequential (Slice 1 is prerequisite for all others; 2-5 are independent but ordered for clean diffs)
**Status:** All 5 slices implemented (2026-06-19) — 0 TS errors, all self-tests pass.

---

## Slice Overview

| # | Slice | Specs Covered | Files Changed | Est. Lines |
|---|-------|--------------|---------------|------------|
| 1 | Token foundation | (prerequisite) | `globals.css`, `code-standards.md` | ~15 |
| 2 | Icon swap | #1 | `atelier-dashboard.tsx` | ~60 |
| 3 | Card surface & elevation | #2, #5, #6 | `atelier-dashboard.tsx` | ~40 |
| 4 | Typography & color tokens | #3, #4, #8, #9, #10 | `atelier-dashboard.tsx` | ~25 |
| 5 | Buttons & accessibility | #7, #12 | `atelier-dashboard.tsx` | ~20 |

---

## Slice 1 — Token Foundation

**What:** Add 6 missing tokens to `globals.css :root`, update `code-standards.md` radius reference.

**Specs:** None directly — enables Slices 3-5.

**Plan:** `docs/shaping/plan-slice-1-token-foundation.md`

---

## Slice 2 — Icon Swap

**What:** Remove all `lucide-react` imports. Add file-local `Icon` helper. Replace 9 icon usages with Material Symbols Outlined.

**Specs:** #1 (Wrong Icon Set)

**Plan:** `docs/shaping/plan-slice-2-icon-swap.md`

---

## Slice 3 — Card Surface & Elevation

**What:** Fix card radius to 24px, replace bespoke shadows with `--al-shadow-float`, remove hover-lift and scale animations, restructure Team card to white surface with reduced terracotta.

**Specs:** #2 (Terracotta Card Background), #5 (Card Radius Below Spec), #6 (Non-Token Shadows + Hover-Lift)

**Plan:** `docs/shaping/plan-slice-3-card-surface.md`

---

## Slice 4 — Typography & Color Tokens

**What:** Cap hero title at `--al-display-lg`, normalize eyebrow tracking to 0.2em, add `font-mono tabular-nums` to numeric data, fix status pill to DS tokens, fix dividers to `--al-hairline`.

**Specs:** #3 (Off-Palette Status Pill), #4 (Numbers Not in Mono), #8 (Hero Title Oversized), #9 (Eyebrow Tracking), #10 (Dividers Wrong Token)

**Plan:** `docs/shaping/plan-slice-4-typography-color.md`

---

## Slice 5 — Buttons & Accessibility

**What:** Apply gradient CTA + CTA shadow to primary buttons, add `focus-visible:ring` to all interactive elements.

**Specs:** #7 (Flat Navy Buttons), #12 (Buttons Lack Focus Ring)

**Plan:** `docs/shaping/plan-slice-5-buttons-a11y.md`

---

## Dependency Graph

```
Slice 1 (tokens)
    ├── Slice 2 (icons)        — independent, no token dependency
    ├── Slice 3 (cards)        — needs --al-radius-3xl, --al-hairline
    ├── Slice 4 (typography)   — needs --al-display-lg, --al-track-eyebrow, --al-hairline
    └── Slice 5 (buttons)      — needs --al-shadow-cta, --al-focus-ring
```

Slice 2 could technically run in parallel with Slice 1, but sequential order produces cleaner diffs.
