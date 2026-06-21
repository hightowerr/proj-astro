# Shape: Design Consistency Wave 2

**Date:** 2026-06-19
**Appetite:** Now
**Specs:** #02, #06, #08

---

## 1. Problem Summary

Wave 1 established the Atelier Light token infrastructure (48 new tokens, font loading, Button + Dashboard component migration). Wave 2 continues the migration by normalizing font aliases to canonical `--al-*` tokens and purging forbidden Deep Ledger `--color-*` tokens from the Dialog shared component and 6 booking/service feature components.

Three categories of work:

- **Font normalization** (Spec #02) — `@layer base` rules and utility classes still resolve through legacy `--font-body` / `--font-display` intermediaries instead of canonical `--al-font` / `--al-font-mono`. Functionally correct today, but a normalization gap.
- **Dialog cleanup** (Spec #06) — 5 forbidden Deep Ledger tokens in inline styles on DialogContent, Close, and Description.
- **Booking/service component cleanup** (Spec #08) — 6 feature components across `booking/`, `services/`, `manage/`, `conflicts/` use `--color-*` tokens. Largest scope of the three.

All three specs are Wave 2 with no inter-dependencies.

---

## 2. Spec-by-Spec Analysis

### Spec #02 — Base Font Rules (remaining steps)
**File:** `src/app/globals.css` (lines 491–508, 515–517)
**Severity:** Major (classification), Low (functional risk — fonts already resolve correctly)
**Status:** Partially implemented — Steps 1 & 4 done by Wave 1 Slice 1

| Current State | Target State |
|---|---|
| `body { font-family: var(--font-body); }` | `body { font-family: var(--al-font); }` |
| `h1-h6 { font-family: var(--font-display); }` | `h1-h6 { font-family: var(--al-font); }` |
| `code { font-family: var(--font-mono); }` | `code { font-family: var(--al-font-mono); }` |
| `.font-display { font-family: var(--font-display); }` | `.font-display { font-family: var(--al-font); }` |
| `.font-body { font-family: var(--font-body); }` | `.font-body { font-family: var(--al-font); }` |
| `.font-mono { font-family: var(--font-mono); }` | `.font-mono { font-family: var(--al-font-mono); }` |

**Ripple effects:** None. No component directly uses `.font-display` or `.font-body` as classes. `font-mono` Tailwind class resolves through `@theme inline`, not these utility classes. 13 inline `var(--font-mono)` references in 4 component files read from the `@theme` definition (line 12), not the utility class — unaffected by this change.

### Spec #06 — Dialog Uses Deep Ledger Tokens
**File:** `src/components/ui/dialog.tsx` (lines 66–133)
**Severity:** Major

**Token mapping (5 swaps):**

| Deep Ledger token | AL replacement | Location in dialog.tsx |
|---|---|---|
| `--color-surface-raised` | `--al-surface-container-lowest` | Line 66 (background) |
| `--color-border-default` | `--al-outline-variant` | Line 67 (border) |
| `--shadow-lg` | `--al-shadow-menu` | Line 68 (boxShadow) |
| `--color-text-tertiary` | `--al-on-surface-variant` | Line 77 (Close button color) |
| `--color-text-secondary` | `--al-on-surface-variant` | Line 132 (Description color) |

All AL replacement tokens already exist in globals.css. No additional forbidden tokens found. Component has zero AL tokens currently — clean migration.

**Design note:** Close button and DialogDescription will both use `--al-on-surface-variant` — intentional per the AL design system (both are secondary/tertiary text elements).

### Spec #08 — Booking & Service Components
**Files:** 6 components across 4 directories (all confirmed to exist)
**Severity:** Major

| Component | Unique `--color-*` tokens | Complexity |
|---|---|---|
| `booking-form.tsx` | 16 | Heaviest — also has Stripe Elements hex, dark success block, hardcoded rgba |
| `manage-booking-view.tsx` | 19 | Most variety — highest `--color-text-secondary` usage (20 occurrences) |
| `event-type-list.tsx` | 16 | Status tokens (error/warning/success) + brand tokens |
| `event-type-form.tsx` | 11 | Checkbox, select, submit button tokens |
| `service-selector.tsx` | 6 | Lightest — needs `.service-card` → `.al-service-card` class swap |
| `conflict-alert-banner.tsx` | 1 | Single Tailwind arbitrary value: `hover:text-[var(--color-text-primary)]` |

**Total unique legacy tokens across all files:** 28

---

## 3. Architecture Conflict Check

Mapped against `docs/context/architecture-context.md`:

| Concern | Assessment |
|---|---|
| **Styling layer** (Tailwind CSS 4.1.18 + CSS custom properties) | Aligned. All changes stay within CSS custom props and inline style swaps. |
| **Component library** (shadcn/ui + Radix) | Dialog is a shadcn component — changes are to inline style props, no structural Radix changes. |
| **Design tokens are code-managed** (architecture §5) | Aligned. globals.css is the documented source of truth. |
| **`@theme inline` block** | Not touched. Legacy `--color-*` tokens remain for other unremediated consumers. |
| **Booking components** are public-facing (`/book/[slug]`) | Token swaps are visual-only. No data flow, API, or business logic changes. |
| **Manage components** use token-based auth (`/manage/[token]/*`) | Only styling changes; auth mechanism untouched. |

**No conflicts detected.** Pure substitutive changes. No structural, routing, auth, or data model impact.

---

## 4. Spike Findings (Resolved)

Full spike reports: `spike-font-rules.md`, `spike-dialog-tokens.md`, `spike-booking-components.md`

### Spike A: Font Rule Location & Consumer Audit — RESOLVED

**Lines confirmed:** `@layer base` is at lines 491–508, utility classes at 515–517. Shifted slightly from spec's estimate due to Wave 1 token insertion, but all rules found.

**Consumer audit:**
- `--font-body`: zero consumers outside globals.css `@layer base`
- `--font-display`: zero consumers outside globals.css `@layer base`
- `--font-mono`: 13 inline-style consumers in 4 component files (`booking-form.tsx`, `manage-booking-view.tsx`, `tier-policy-form.tsx`, `payment-policy-form.tsx`) + 18 components using the `font-mono` Tailwind class. All read from the `@theme` definition (line 12), not the utility class → **unaffected by this change**.

**`--al-font` and `--al-font-mono`:** Both defined in `:root` at lines 373 and 377. Ready to use.

**Conclusion:** Zero risk. Change is self-contained within globals.css lines 491–517.

### Spike B: Dialog Component Verification — RESOLVED

**All 5 forbidden tokens confirmed** at exactly the lines the spec predicted (66, 67, 68, 77, 132). All in inline `style={{}}` objects.

**No additional forbidden tokens.** No `--color-*`, `--shadow-*`, hardcoded hex, or dark Tailwind classes beyond what the spec lists.

**Zero AL tokens** in current component — clean slate for migration.

**All 4 replacement tokens** (`--al-surface-container-lowest`, `--al-outline-variant`, `--al-shadow-menu`, `--al-on-surface-variant`) confirmed defined in globals.css.

**Conclusion:** Spec #06 is accurate and complete. Straightforward 5-swap migration.

### Spike C: Booking Component Full Scan — RESOLVED

**All 6 files exist.** 28 unique legacy tokens found across all files.

**The spike initially reported 13 unmapped tokens, but cross-referencing against all existing AL tokens in globals.css reduces this significantly:**

| Deep Ledger token | AL replacement | Status |
|---|---|---|
| `--color-success` | `--al-status-positive` | Exists (line 358) |
| `--color-success-subtle` | `--al-status-positive-bg` | Exists (line 359) |
| `--color-success-border` | `--al-status-positive-border` | Exists (line 442) |
| `--color-error` | `--al-status-negative` | Exists (line 360) |
| `--color-error-subtle` | `--al-status-negative-bg` | Exists (line 361) |
| `--color-error-border` | **NEW:** `--al-status-negative-border: rgba(168, 41, 74, 0.20)` | Needs creation |
| `--color-warning` | `--al-status-caution` | Exists (line 362) |
| `--color-warning-subtle` | `--al-status-caution-bg` | Exists (line 363) |
| `--color-warning-border` | **NEW:** `--al-status-caution-border: rgba(201, 122, 42, 0.20)` | Needs creation |
| `--color-brand-dim` | `--al-primary` (opacity already applied inline) | Exists (line 297) |
| `--color-surface-overlay` | `--al-surface-container-low` | Exists (line 335) |
| `--color-surface-void` | `--al-on-primary` | Exists (line 301) |
| `--color-border-subtle` | `--al-ghost-border` | Exists (line 368) |

**Result: Only 2 new tokens needed** (following the `--al-status-*-border` pattern established by Wave 1's `--al-status-positive-border`).

**Semantic mappings for the 3 non-obvious tokens:**
- `--color-surface-overlay` (#1d2738, dark inset surface) → `--al-surface-container-low` (#f4f4f2) — used for unchecked checkboxes, select backgrounds, unselected options. Semantically "recessed input surface."
- `--color-surface-void` (#070a0f, near-black) → `--al-on-primary` (#ffffff) — used exclusively as text/icon color on brand-colored (navy) backgrounds. Semantically "on-primary" text.
- `--color-brand-dim` (#1a9990, teal) → `--al-primary` — used only for disabled/submitting button backgrounds where `opacity: 0.7` is already applied inline. No dim token needed; the opacity handles it.

**CSS class swap confirmed:** `.al-service-card` exists at globals.css line 646. `service-selector.tsx` line 94 needs `className="service-card"` → `className="al-service-card"`.

**Out-of-scope items found (do NOT migrate in Wave 2):**
1. **Stripe Elements theme** (`booking-form.tsx` lines 115–150) — hardcoded hex colors that Stripe Elements requires as JS object values. Cannot use CSS variables. Needs a separate Stripe-theme spec.
2. **Dark success block** (`booking-form.tsx` lines 880–940) — uses non-`--color-*` Tailwind classes (`text-white`, `bg-bg-dark`, `border-white/10`). Already tracked in `current-issues.md`.
3. **Hardcoded rgba hairlines** (`booking-form.tsx`, 7 instances of `rgba(195,198,209,0.50)`) — should use `--al-hairline-strong` but are not `--color-*` token violations. Separate cleanup.
4. **Hardcoded rgba warning border** (`conflict-alert-banner.tsx` line 76, `rgba(201,122,42,0.25)`) — untokenized. Separate cleanup.

---

## 5. Complete Token Mapping Table (Wave 2)

All 28 unique legacy tokens across specs #06 and #08, plus the Spec #07 standard table:

| # | Deep Ledger token | AL replacement | New? |
|---|---|---|---|
| 1 | `--color-border-default` | `--al-outline-variant` | No |
| 2 | `--color-border-medium` | `--al-outline-variant` | No |
| 3 | `--color-border-hairline` | `--al-ghost-border` | No |
| 4 | `--color-border-subtle` | `--al-ghost-border` | No |
| 5 | `--color-surface-raised` | `--al-surface-container-lowest` | No |
| 6 | `--color-surface-elevated` | `--al-surface-container` | No |
| 7 | `--color-surface-base` | `--al-background` | No |
| 8 | `--color-surface-overlay` | `--al-surface-container-low` | No |
| 9 | `--color-surface-void` | `--al-on-primary` | No |
| 10 | `--color-text-primary` | `--al-on-surface` | No |
| 11 | `--color-text-secondary` | `--al-on-surface-variant` | No |
| 12 | `--color-text-tertiary` | `--al-on-surface-variant` | No |
| 13 | `--color-brand` | `--al-primary` | No |
| 14 | `--color-brand-dim` | `--al-primary` | No |
| 15 | `--color-brand-border` | `--al-hairline-strong` (hover) / `--al-hairline-rest` (rest) | No |
| 16 | `--color-brand-hover` | `--al-primary-container` | No |
| 17 | `--color-brand-subtle` | `rgba(0, 30, 64, 0.08)` | No |
| 18 | `--color-success` | `--al-status-positive` | No |
| 19 | `--color-success-subtle` | `--al-status-positive-bg` | No |
| 20 | `--color-success-border` | `--al-status-positive-border` | No |
| 21 | `--color-error` | `--al-status-negative` | No |
| 22 | `--color-error-subtle` | `--al-status-negative-bg` | No |
| 23 | `--color-error-border` | `--al-status-negative-border: rgba(168, 41, 74, 0.20)` | **Yes** |
| 24 | `--color-warning` | `--al-status-caution` | No |
| 25 | `--color-warning-subtle` | `--al-status-caution-bg` | No |
| 26 | `--color-warning-border` | `--al-status-caution-border: rgba(201, 122, 42, 0.20)` | **Yes** |
| 27 | `--shadow-lg` | `--al-shadow-menu` | No |
| 28 | `.service-card` class | `.al-service-card` class | No |

**26 of 28 mappings use existing tokens. 2 new token definitions required.**

---

## 6. Risk Assessment (Updated Post-Spikes)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Font rule change breaks components | **None** | N/A | Spike A: zero component consumers of `--font-body`/`--font-display` |
| Dialog has additional forbidden tokens | **None** | N/A | Spike B: confirmed exactly 5, no extras |
| Unmapped tokens block migration | **Resolved** | N/A | All 28 tokens mapped; only 2 need creation (established pattern) |
| `--color-surface-void` → `--al-on-primary` mismatch | Low | Low | Usage context confirms: only used as text color on navy buttons |
| `--color-brand-dim` opacity handling | Low | Low | All 3 usages already have `opacity: 0.7` inline |
| `.service-card` → `.al-service-card` CSS mismatch | Low | Low | `.al-service-card` exists with AL-correct styles at globals.css:646 |
| Visual regression in booking flow | Low | Medium | Self-test: dev server visual comparison before/after |
| Stripe Elements theme left dark-themed | **Certain** | Low (deferred) | Out of scope; appended to current-issues.md |

---

## 7. Recommended Shape

### Approach: Foundation Micro-Slice + Three Parallel Component Slices

**Slice 0 — Token Definitions (2 new tokens in globals.css)**
Add `--al-status-negative-border` and `--al-status-caution-border` to the `:root` block. Must complete first because Spec #08 components need these tokens.

- 1 file (`globals.css`), 2 lines added
- 0 risk — follows exact pattern of `--al-status-positive-border` added in Wave 1

**Slice 1 — Font Normalization (Spec #02)**
No dependencies on Slice 0. Can start immediately.

- 1 file (`globals.css` lines 491–517), 6 variable swaps
- 0 risk — fonts already work, just normalizing aliases

**Slice 2 — Dialog (Spec #06)**
No dependencies on Slice 0. Can start immediately.

- 1 file (`dialog.tsx`), 5 token swaps in inline styles
- 0 risk — all replacement tokens exist

**Slice 3 — Booking Components (Spec #08)**
Depends on Slice 0 (needs the 2 new border tokens).

- 6 files across 4 directories, 28 token types to swap + 1 class swap
- Low risk — large surface area but mechanical token substitution
- Explicitly excludes: Stripe Elements hex, dark success block, hardcoded rgba values

### Dependency Graph

```
Slice 0 (2 new tokens)
  │
  ├──→ Slice 1 (Font)       [no dependency — can start immediately]
  ├──→ Slice 2 (Dialog)     [no dependency — can start immediately]
  └──→ Slice 3 (Booking)    [depends on Slice 0 for border tokens]
```

Slices 1 and 2 can execute in parallel, independently of Slice 0.
Slice 3 waits on Slice 0 but can run parallel with Slices 1 and 2.
**Pragmatically:** Slice 0 is 2 lines — batch it with Slice 1 (both modify globals.css).

### Why this shape?

| Criterion | Assessment |
|---|---|
| **Speed** | 8 files total. Slices 1+2 are trivial (11 swaps combined). Slice 3 is mechanical but large. |
| **Risk** | All spikes resolved to "no risk." 2 new tokens follow an established pattern. Out-of-scope items are explicitly deferred. |
| **Simplicity** | No new abstractions. No structural changes. Pure token substitution + 2 token declarations. |

---

## 8. Open Questions — RESOLVED

1. ~~Font rule location~~ — lines 491–508, 515–517. Zero external consumers. **Resolved by Spike A.**
2. ~~Dialog forbidden tokens~~ — exactly 5, no extras, all replacements exist. **Resolved by Spike B.**
3. ~~Booking unmapped tokens~~ — 13 → 2 truly new (rest already exist under AL names). **Resolved by Spike C + cross-reference.**

---

## 9. Side Effects for current-issues.md

Append after implementation:
- **Stripe Elements theme still uses Deep Ledger** — `booking-form.tsx` lines 115–150 contain hardcoded dark-theme hex colors in the Stripe appearance object. Cannot use CSS variables. Needs a dedicated Stripe theme spec.
- **Hardcoded rgba hairlines in booking-form.tsx** — 7 instances of `rgba(195,198,209,0.50)` should use `--al-hairline-strong`. Not a `--color-*` violation but a tokenization gap.
- **Hardcoded rgba warning border in conflict-alert-banner.tsx** — `rgba(201,122,42,0.25)` at line 76 should use `--al-status-caution-border` once defined.
