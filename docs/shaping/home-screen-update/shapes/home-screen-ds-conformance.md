# Shape: Home Screen Design System Conformance Pass

**Appetite:** Now (single batch)
**Target file:** `src/components/dashboard/atelier-dashboard.tsx`
**Specs:** 11 issues (2 Major, 6 Moderate, 3 Minor)
**Status:** Implemented (2026-06-19) — all 11 specs resolved across 5 slices. 0 TS errors.

---

## 1. Problem Summary

The dashboard home screen has 11 design system violations spanning icons, colors, typography, spacing, shadows, and accessibility. All violations are concentrated in a single component (`atelier-dashboard.tsx`, ~308 lines). The sidebar (`app-nav.tsx`) already conforms — the dashboard is the outlier.

---

## 2. Spec Inventory

### Major — Breaks Brand Laws

| # | Issue | Root Cause | DS Rule Violated |
|---|-------|-----------|------------------|
| 1 | Wrong icon set (lucide-react) | All 9 icons imported from `lucide-react` | Material Symbols Outlined exclusively (Brand Law #10) |
| 2 | Terracotta as card background | Team card uses `bg-[#fff8f5]`, terracotta border/text, 4+ terracotta instances per viewport | Terracotta rationed to avatars + max 1 badge per viewport (Brand Law #3) |

### Moderate — Token / Scale Violations

| # | Issue | Current Value | DS Token / Value |
|---|-------|--------------|------------------|
| 3 | Off-palette status pill | `bg-emerald-100 text-emerald-800` | `--al-status-positive-bg` / `--al-status-positive` |
| 4 | Numbers not in mono | Manrope on all numeric data | JetBrains Mono + `tabular-nums` (Brand Law #4) |
| 5 | Card radius below spec | `rounded-2xl` (16px) | 24px / `rounded-3xl` (Brand Law #8) |
| 6 | Non-token shadows + hover-lift | Bespoke `shadow-[0px_10px_30px...]`, `hover:shadow-[...]`, `group-hover:scale-110` | `--al-shadow-float` only; no hover-lift on cards (Brand Laws #6, #12) |
| 7 | Flat navy buttons, not gradient CTA | `bg-al-primary` (flat), bespoke shadow | `--al-gradient-cta` + `--al-shadow-cta` (Brand Law #2) |
| 8 | Hero title oversized | `text-5xl md:text-7xl` (up to 72px) | `--al-display-lg` (56px max) (Brand Law #9) |

### Minor — Polish

| # | Issue | Current Value | DS Token / Value |
|---|-------|--------------|------------------|
| 9 | Eyebrow tracking inconsistent | `tracking-[0.28em]`, `tracking-[0.22em]` | `--al-track-eyebrow` (0.2em) |
| 10 | Dividers use wrong token | `border-al-surface-container-high` | `--al-hairline` |
| 12 | Buttons lack focus ring | No `focus-visible:ring` on buttons/links | `--al-focus-ring` on all interactive controls |

---

## 3. Architecture Analysis

### Token availability in `globals.css`

| Token | Status | Action Needed |
|-------|--------|---------------|
| `--al-status-positive` / `-bg` | Present (lines 358-359) | None |
| `--al-shadow-float` | Present (line 367) — but uses 0.06 alpha vs DS spec 0.04 | Accept as-is (already deployed) |
| `--al-gradient-cta` | Present (line 368) | None |
| `--al-shadow-cta` | **Missing** | Add: `0px 14px 28px rgba(0, 30, 64, 0.20)` |
| `--al-focus-ring` | **Missing** | Add: `0 0 0 3px rgba(0, 30, 64, 0.12)` |
| `--al-hairline` | **Missing** | Add: `rgba(195, 198, 209, 0.20)` |
| `--al-track-eyebrow` | **Missing** | Add: `0.2em` |
| `--al-display-lg` | **Missing** | Add: `3.5rem` (56px) |
| `--al-radius-3xl` | **Missing** (ladder stops at `-2xl: 16px`) | Add: `24px` |

**Note:** `--al-ghost-border` (line 366) has the same value as `--al-hairline`. Could alias or add separately.

### Tailwind theme mappings

The `@theme inline` block (line 3+) maps `--al-*` colors to `--color-al-*` for Tailwind utility classes (e.g., `bg-al-primary`, `text-al-on-surface-variant`). New tokens that need Tailwind utility access will need corresponding `--color-al-*` entries.

### Font loading

| Font | Status | Needed By |
|------|--------|-----------|
| Material Symbols Outlined | Loaded via Google Fonts (`layout.tsx` line 59) | Spec #1 |
| JetBrains Mono | **Not loaded** — falls back to Fira Code via `var(--font-mono)` | Spec #4 |
| Manrope | Loaded | — |

**Decision point:** Spec #4 requires mono numerics. Fira Code is already loaded and serves the same purpose. Accept Fira Code as the mono font (already in `--font-mono`) rather than adding another font download.

### Icon component

The DS provides an `Icon` component (`docs/design-system/components/core/Icon.jsx`) but it's a reference implementation, not a production import. The production codebase uses raw `<span className="material-symbols-outlined">` throughout. No need to create a wrapper — follow existing convention.

### `lucide-react` scope

The dashboard imports 9 lucide icons. `lucide-react` is also used in other components (shadcn/ui, etc.). The package stays; we just stop importing it in this file.

### `code-standards.md` conflict

Line 28 says `rounded-2xl for cards` — this contradicts the DS spec of 24px (`rounded-3xl`). **Must update** `code-standards.md` to align with the DS.

---

## 4. Cross-Cutting Themes

The 11 issues decompose into **4 concern categories**, not 11 independent fixes:

### A. Icon swap (Spec #1)
Remove all `lucide-react` imports, replace with Material Symbols `<span>` elements using the icon mapping from the spec.

### B. Token alignment (Specs #3, #5, #6, #7, #8, #9, #10)
Replace Tailwind defaults and bespoke values with DS tokens. This is the bulk of the work — mostly find-and-replace on class strings.

### C. Brand law fixes (Spec #2)
Restructure the Team card to use standard white surface instead of terracotta background. Reduce terracotta instances to within the 1-badge-per-viewport rule.

### D. Accessibility (Spec #12)
Add `focus-visible:ring` to all interactive elements (buttons, links) in the dashboard.

---

## 5. Technical Unknowns (→ Spikes)

| # | Unknown | Question | Risk if Wrong |
|---|---------|----------|---------------|
| S1 | Token gap completeness | Are all 6 missing tokens truly absent, or are some defined elsewhere? | Wrong fix targets |
| S2 | `lucide-react` import graph | Does `atelier-dashboard.tsx` re-export any icons used by other components? | Breaking other components |
| S3 | Existing icon usage pattern | How do other production files use Material Symbols? Raw spans or shared wrapper? | Inconsistent implementation pattern |

---

## 6. Shape Options

### Option A: Single-file sweep (Recommended)

Fix all 11 issues in one pass over `atelier-dashboard.tsx`, plus:
- Add missing tokens to `globals.css` 
- Update `code-standards.md` radius reference

**Pros:** Fastest, simplest, all changes visible in one diff, no coordination.
**Cons:** Larger single PR. But at ~308 lines of component code, this is manageable.

### Option B: Token-first, then component

1. First PR: add all missing tokens to `globals.css` + update `code-standards.md`
2. Second PR: fix `atelier-dashboard.tsx`

**Pros:** Token layer changes are independently useful.
**Cons:** Two PRs for tightly coupled work; token additions without consumers look like dead code until PR 2 lands.

### Option C: Priority-ordered (Major → Moderate → Minor)

Three PRs in severity order.

**Pros:** Highest-severity issues fixed first.
**Cons:** Three passes over the same file; repeated context-switching; later PRs may conflict with earlier ones.

---

## 7. Recommendation

**Option A — single-file sweep.** Rationale:

- **Speed:** One pass, one PR, one review cycle. All 11 specs in ~30 min implementation.
- **Risk:** Low. Changes are cosmetic (CSS/JSX classes), confined to one component + `globals.css`. No logic changes, no data model changes, no API changes.
- **Simplicity:** All changes are co-located. Reviewer sees the full before/after in one diff.

The only pre-requisite is adding the missing tokens to `globals.css`.

---

## 8. Spike Findings

> Full spike reports: `docs/shaping/spike-token-gap.md`, `spike-lucide-scope.md`, `spike-material-symbols-pattern.md`

### S1 — Token Gap Audit
**6 tokens confirmed missing** from `globals.css :root`: `--al-shadow-cta`, `--al-focus-ring`, `--al-hairline`, `--al-track-eyebrow`, `--al-display-lg`, `--al-radius-3xl`. 4 tokens already present (`status-positive`, `status-positive-bg`, `shadow-float`, `gradient-cta`). Note: `--al-ghost-border` (L366) has the same value as the needed `--al-hairline` — can alias. The Tailwind `@theme` block maps only colors; non-color tokens must use `var()` via inline styles or arbitrary Tailwind values.

### S2 — lucide-react Import Scope
**Safe to remove from dashboard.** All 9 icons are consumed locally. No re-exports, no icon props from parents. `lucide-react` stays installed for other consumers (booking-form, onboarding, shadcn/ui).

### S3 — Material Symbols Usage Pattern
**Use raw `<span className="material-symbols-outlined">`** with inline `fontVariationSettings`. No shared Icon component in production code. Follow `app-nav.tsx` convention: `FILL 0, wght 400` default; `FILL 1, wght 500` for active/emphasis. Add `aria-hidden="true"` for decorative icons.

---

## 9. Appendix: Side Effects

### `code-standards.md` update needed
Line 28: `rounded-2xl for cards` → `rounded-3xl for cards/sheets`

### `current-issues.md` entries to append
- `--al-shadow-cta` token missing from globals.css (to be added)
- `--al-focus-ring` token missing from globals.css (to be added)  
- `--al-hairline` token missing from globals.css (to be added)

### No `current-issues.md` changes needed for
- JetBrains Mono — already tracked; using Fira Code via `--font-mono` is acceptable
