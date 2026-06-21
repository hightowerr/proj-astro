# Shape: Dashboard Hardcoded Hex → DS Token Replacement

**Appetite:** Now (single batch)
**Target file:** `src/components/dashboard/atelier-dashboard.tsx`
**Prerequisite file:** `src/app/globals.css` (one `@theme` mapping addition)
**Spec:** #11 — Scattered Hardcoded Hex
**Selected shape:** A — Add theme mapping + Tailwind utilities everywhere
**Status:** Implemented (2026-06-19) — all 7 hex values replaced, 0 TS errors, 0 hardcoded hex remaining.

---

## 1. Problem Summary

The dashboard component (`atelier-dashboard.tsx`) contains 7 hardcoded hex color values that should reference Atelier Light design system tokens. This violates `code-standards.md` line 26: "no raw Tailwind color classes like `zinc-*` or hardcoded hex values."

All 7 hex values have matching `--al-*` tokens defined in `globals.css :root`. 6 of 7 have corresponding `--color-al-*` entries in the Tailwind `@theme inline` block, enabling direct Tailwind utility usage (e.g., `bg-al-secondary-fixed`). One token (`--al-on-secondary-container` / `#785c53`) is missing its `@theme` mapping.

---

## 2. Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Replace all 7 hardcoded hex values with DS token references | Core goal |
| R1 | All replacements must use Tailwind utility classes (not inline `style={}`) for consistency with the rest of the component | Must-have |
| R2 | No visual change — every token maps to the identical color value | Must-have |
| R3 | Zero TypeScript errors after replacement | Must-have |
| R4 | No changes to component behavior, props, or data shapes | Must-have |

---

## 3. Hex Inventory (Current State)

| # | Hex | Token | Location | Instances | `@theme` mapped? |
|---|-----|-------|----------|-----------|:-----------------:|
| 1 | `#ffdbcf` | `--al-secondary-fixed` | Step pill bg | 1 | ✅ |
| 2 | `#2a170f` | `--al-on-secondary-fixed` | Step pill text | 1 | ✅ |
| 3 | `#fdd8cb` | `--al-secondary-container` | Book-first icon bg, avatar bg | 4 | ✅ |
| 4 | `#785c53` | `--al-on-secondary-container` | Book-first icon text | 1 | ❌ |
| 5 | `#74584f` | `--al-secondary` | Avatar initials text | 3 | ✅ |
| 6 | `#ffdad6` | `--al-error-container` | Error pill bg | 1 | ✅ |
| 7 | `#93000a` | `--al-on-error-container` | Error pill text | 1 | ✅ |

**Total:** 12 class replacements across 7 unique hex values.

---

## 4. Architecture Analysis

### Token layer (`globals.css`)

All 7 raw tokens exist in `:root` (lines 308-355). The `@theme inline` block (lines 170-206) maps colors to enable Tailwind utilities:

| Token | `:root` | `@theme` mapping |
|-------|:-------:|:----------------:|
| `--al-secondary-fixed` | ✅ L310 | ✅ `--color-al-secondary-fixed` L180 |
| `--al-on-secondary-fixed` | ✅ L314 | ✅ `--color-al-on-secondary-fixed` L181 |
| `--al-secondary-container` | ✅ L309 | ✅ `--color-al-secondary-container` L179 |
| `--al-on-secondary-container` | ✅ L313 | ❌ **MISSING** |
| `--al-secondary` | ✅ L308 | ✅ `--color-al-secondary` L178 |
| `--al-error-container` | ✅ L353 | ✅ `--color-al-error-container` L201 |
| `--al-on-error-container` | ✅ L355 | ✅ `--color-al-on-error-container` L202 |

### `code-standards.md` alignment

Line 26: *"Use CSS custom property tokens defined in `globals.css` — no raw Tailwind color classes like `zinc-*` or hardcoded hex values."*

This spec directly enforces this existing rule. No standards conflict.

### No architecture conflict

Per `architecture-context.md` §5 (Content Model): *"Design tokens: CSS custom properties in globals.css — design system is code-managed."* Adding a `@theme` mapping is the standard mechanism.

---

## 5. Shape Options

### A: Add theme mapping + Tailwind utilities everywhere

1. Add `--color-al-on-secondary-container: var(--al-on-secondary-container);` to `@theme inline` block in `globals.css`
2. Replace all 12 hex class instances with Tailwind utility classes

**Pros:** Consistent approach — all 7 replacements use the same pattern (`bg-al-*`, `text-al-*`). Enables reuse of `text-al-on-secondary-container` in future components.
**Cons:** Touches `globals.css` (one line). Negligible risk.

### B: Tailwind for 6 tokens, inline style for the missing one

1. Replace 11 of 12 hex instances with Tailwind utility classes
2. For `#785c53`, use `style={{ color: 'var(--al-on-secondary-container)' }}`

**Pros:** No `globals.css` change.
**Cons:** Inconsistent — 6 tokens use Tailwind utilities, 1 uses inline style. Breaks the component's own pattern. Leaves the `@theme` gap for future consumers to trip over.

---

## 6. Fit Check

| Req | Requirement | Status | A | B |
|-----|-------------|--------|---|---|
| R0 | Replace all 7 hardcoded hex values with DS token references | Core goal | ✅ | ✅ |
| R1 | All replacements must use Tailwind utility classes | Must-have | ✅ | ❌ |
| R2 | No visual change — tokens map to identical values | Must-have | ✅ | ✅ |
| R3 | Zero TypeScript errors | Must-have | ✅ | ✅ |
| R4 | No behavior/prop/data shape changes | Must-have | ✅ | ✅ |

**Notes:**
- B fails R1: `#785c53` replacement uses inline `style={}` instead of a Tailwind utility class

---

## 7. Recommendation

**Shape A — Add theme mapping + Tailwind utilities everywhere.**

- **Speed:** One `@theme` line + 12 find-and-replace class swaps. Faster than the prior DS conformance pass.
- **Risk:** Zero. Adding a `@theme` mapping is additive. Token values are verified identical to hex values.
- **Simplicity:** Every replacement follows the same `bg-[#hex]` → `bg-al-token` / `text-[#hex]` → `text-al-token` pattern.

---

## 8. Spike Findings

> Full spike reports: `spike-theme-mapping-gap.md`, `spike-hex-scope-beyond-dashboard.md`

### S1 — Theme Mapping Gap

**`--color-al-on-secondary-container` confirmed missing** from the `@theme inline` block. The gap affects 3 files, not just the dashboard:

| File | Workaround used |
|------|----------------|
| `atelier-dashboard.tsx:156` | `text-[#785c53]` (hardcoded hex) |
| `badge.tsx:21` | `[color:var(--al-on-secondary-container)]` (bracket syntax) |
| `button.tsx:26` | `[color:var(--al-on-secondary-container)]` (bracket syntax) |

Adding the mapping is one line, zero risk, benefits all three files.

### S2 — Hex Scope Beyond Dashboard

**3 of 7 hex values leak into 4 additional component files** (`attention-required-table.tsx`, `payments-table.tsx`, `curator-chip.tsx`, `customers-editorial.tsx`, `appointments-table.tsx`). These files are **out of scope** for Spec #11's [now] appetite — tracked as a follow-up issue in `current-issues.md`.

4 of 7 hex values are confined to `globals.css` + `atelier-dashboard.tsx` only.

---

## 9. Appendix: Side Effects

### `current-issues.md` entry to append

- **Hardcoded hex values in 5 non-dashboard components** — `attention-required-table.tsx`, `payments-table.tsx`, `curator-chip.tsx`, `customers-editorial.tsx`, `appointments-table.tsx` contain hardcoded hex values (`#ffdbcf`, `#2a170f`, `#fdd8cb`, `#e2bfb3`, `#380d01`, `#572411`) that should be replaced with DS tokens. Out of scope for Spec #11 (dashboard only). See `spike-hex-scope-beyond-dashboard.md`.

### No architecture or standards changes needed

The `@theme inline` addition follows the existing pattern. No `code-standards.md` or `architecture-context.md` updates required.
