# Shape: Design Consistency Wave 1

**Date:** 2026-06-19
**Appetite:** Now
**Specs:** #01, #03, #05, #07

---

## 1. Problem Summary

The codebase has two design systems living side-by-side: the legacy **Deep Ledger** dark theme (`--color-*` tokens) and the intended **Atelier Light** system (`--al-*` tokens). This creates:

- **Wrong fonts loaded** — 3 of 4 loaded fonts aren't in the design system; JetBrains Mono (required for numeric data) is missing entirely
- **Missing infrastructure** — Most AL typography, spacing, weight, motion, and effect tokens were never added to production `globals.css`, forcing hardcoded pixel values
- **Forbidden tokens in shared components** — Button's `outline` variant and 5 dashboard components use Deep Ledger `--color-*` tokens or hardcoded Tailwind dark-theme colors

All 4 specs are Wave 1, have no inter-dependencies, and can execute in parallel.

---

## 2. Spec-by-Spec Analysis

### Spec #01 — Font Loading Cleanup
**File:** `src/app/layout.tsx`
**Severity:** Major

| Current State | Target State |
|---|---|
| Loads Cormorant_Garamond, Bricolage_Grotesque, Fira_Code, Manrope | Loads Manrope + JetBrains_Mono only |
| `globals.css` font stacks reference `--font-cormorant`, `--font-bricolage`, `--font-fira-code` | Font stacks reference `--font-manrope-raw` + `--font-jetbrains-mono` |
| No JetBrains Mono available at runtime | JetBrains Mono available via `--font-jetbrains-mono` CSS variable |

**Ripple effects:**
- `globals.css` lines 10-13 define `--font-display`, `--font-body`, `--font-mono` using the old font variables. These stacks must be updated or removed.
- The `--al-font-mono` token in globals.css currently has no actual JetBrains Mono to resolve to — this spec fixes that.
- Any component using `font-mono` Tailwind class or `var(--font-fira-code)` directly will break visually (should improve, not degrade, since the design system intends JetBrains Mono).

### Spec #03 — Missing AL Tokens
**File:** `src/app/globals.css`
**Severity:** Moderate

**Currently present AL tokens in globals.css (non-color):**
- `--al-display-lg`, `--al-track-eyebrow` (2 typography tokens)
- `--al-shadow-float`, `--al-shadow-cta` (2 shadow tokens)
- `--al-font`, `--al-font-headline`, `--al-font-body`, `--al-font-label` (4 font aliases)
- `--al-radius-*` (7 radius tokens)

**Missing (to be added):**
- Typography scale: 15 tokens (`--al-display-md` through `--al-label-xs`)
- Weight scale: 6 tokens (`--al-w-light` through `--al-w-extra`)
- Tracking: 3 tokens (`--al-track-pill`, `--al-track-display`, `--al-track-tight`)
- Spacing: 12 tokens (`--al-sp-1` through `--al-sp-24`)
- Layout: 3 tokens (`--al-main-pad-x`, `--al-main-pad-y`, `--al-sidebar-w`)
- Motion: 4 tokens (`--al-dur-instant` through `--al-dur-slow`)
- Effects: 5 tokens (`--al-shadow-menu`, `--al-shadow-mark`, `--al-shadow-ring`, `--al-hairline-rest`, `--al-hairline-strong`)

**Total:** ~48 new token declarations.

**Architecture note:** `globals.css` already has an AL section starting around line 290. New tokens should go into this existing section, organized by category to match the design system token files.

### Spec #05 — Button Forbidden Tokens
**File:** `src/components/ui/button.tsx`
**Severity:** Major

Only the `outline` variant uses Deep Ledger tokens (line 16). The other standard variants (`default`, `destructive`, `secondary`, `ghost`, `link`) use Tailwind theme tokens. The `al-*` variants are already correct.

**Token mapping (5 swaps):**
- `--color-surface-elevated` -> `--al-surface-container-lowest`
- `--color-border-medium` -> `--al-outline-variant`
- `--color-text-primary` -> `--al-on-surface`
- `--color-surface-float` -> `--al-surface-container`
- `--color-border-strong` -> `--al-outline`

### Spec #07 — Dashboard Components Forbidden Tokens
**Files:** 5 components in `src/components/dashboard/`
**Severity:** Major

| Component | Token violations found |
|---|---|
| `shop-overview-card.tsx` | 10+ inline `style=` with `--color-*` tokens throughout |
| `confirmation-status-badge.tsx` | Hardcoded Tailwind `bg-amber-*/text-amber-*`, `bg-emerald-*/text-emerald-*`, `bg-rose-*/text-rose-*` |
| `success-banner.tsx` | `--color-success*`, `--color-text-primary`, `--color-text-tertiary`, `--color-brand`, `--color-surface-base` |
| `copy-button.tsx` | `--color-brand`, `--color-surface-elevated`, `--color-border-medium`, `--color-text-primary`, `--color-surface-base` |
| `booking-management-choice.tsx` | `--color-border-default`, `--color-surface-raised`, `--color-surface-base`, `--color-text-*`, `--color-brand*`, `--color-accent-amber` |

**Gap in spec #07:** The mapping table doesn't cover every token found in the actual code:
- `--color-success` / `--color-success-subtle` / `--color-success-border` (success-banner.tsx) — no AL equivalent listed
- `--color-accent-amber` (booking-management-choice.tsx) — no AL equivalent listed
- `--color-brand-border` (booking-management-choice.tsx) — no AL equivalent listed
- `bg-white/10` and `text-text-light-muted` (confirmation-status-badge.tsx `none` status) — no AL equivalent listed

These gaps are **spike unknowns** (see Phase 2).

---

## 3. Architecture Conflict Check

Mapped against `docs/context/architecture-context.md`:

| Concern | Assessment |
|---|---|
| **Styling layer** (Tailwind CSS 4.1.18 + CSS custom properties) | Aligned. All changes stay within CSS custom props and Tailwind utility classes. |
| **Component library** (shadcn/ui + Radix) | Button is a shadcn component — changes are to variant strings only, no structural changes. |
| **Design tokens are code-managed** (architecture context §5) | Aligned. Changes go into `globals.css` which is the documented source of truth. |
| **`@theme inline` block** | The Deep Ledger `--color-*` tokens in the `@theme inline` block (lines 3-160) remain untouched in this wave. They may still be referenced by other components. Removing them is a separate, larger cleanup. |
| **Tailwind theme mappings** | `globals.css` lines 171-203 map `--color-al-*` to `--al-*` for Tailwind class consumption. Adding new AL tokens may require adding corresponding `--color-al-*` Tailwind mappings if components need to use them as Tailwind classes. |

**No conflicts detected.** These changes are additive (tokens) and substitutive (component token refs). No structural, routing, auth, or data model changes.

---

## 4. Spike Findings (Resolved)

Full spike reports: `shape/spike-unmapped-tokens.md`, `shape/spike-font-blast-radius.md`, `shape/spike-tailwind-theme-mapping.md`

### Spike A: Unmapped Token Equivalents — RESOLVED

All 6 unmapped tokens now have AL equivalents:

| Deep Ledger Token | AL Replacement | Notes |
|---|---|---|
| `--color-success` | `--al-status-positive` | Semantic match |
| `--color-success-subtle` | `--al-status-positive-bg` | Direct 1:1 |
| `--color-success-border` | **NEW:** `--al-status-positive-border` `rgba(14,122,85,0.20)` | No existing AL token; follows hairline opacity pattern |
| `--color-accent-amber` | `--al-status-caution` | Caution = amber attention callout |
| `--color-brand-border` | `--al-hairline-strong` (hover) / `--al-hairline-rest` (rest) | AL uses neutral hairlines, not brand-tinted borders |
| `bg-white/10 text-text-light-muted` | `--al-status-neutral-bg` + `--al-status-neutral` | Dark-theme artifact → AL neutral status pair |

**Dependencies discovered:** `--al-status-neutral` / `--al-status-neutral-bg` and `--al-hairline-rest` / `--al-hairline-strong` exist in design system source but are **not yet in production globals.css**. Spec #03 must add these before Spec #07 components can use them. This creates a soft ordering dependency: #03 before #07.

**One new token needed:** `--al-status-positive-border: rgba(14, 122, 85, 0.20)` — add alongside existing status tokens in globals.css.

### Spike B: Font Removal Blast Radius — RESOLVED

**Only 3 files need code changes:**
1. `src/app/layout.tsx` — remove 3 font imports/consts, add JetBrains_Mono, update body className
2. `src/app/globals.css` lines 10-12 — repoint `--font-display`/`--font-body` to Manrope, `--font-mono` to JetBrains Mono
3. `src/app/globals.css` ~line 377 — add missing `--al-font-mono` token

**31 usages across 12 components auto-migrate** through the CSS variable chain (18 `font-mono` class usages + 13 `var(--font-mono)` inline usages). Zero code changes needed in any component file.

**No component references `font-display` or `font-body`** as a Tailwind class or inline style — only the globals.css base rules use them.

**Risk:** Low. Fira Code → JetBrains Mono is same category. Net font download reduction (remove 3, add 1).

### Spike C: Tailwind Theme Mapping — RESOLVED

**Answer: No `@theme inline` entries needed for Spec #03 tokens.**

- Color AL tokens use Tailwind utilities heavily (200+ occurrences of `text-al-*`, `bg-al-*`) — this is already working via existing `--color-al-*` mappings.
- Non-color AL tokens exclusively use `var()` syntax (inline styles or `[var()]` Tailwind escape hatch) — zero instances of native utility consumption.
- Adding theme mappings creates namespace collision risk with existing Deep Ledger `--duration-*`, `--shadow-*` entries.
- `:root` definitions + `[var()]` is the established and sufficient pattern.

**Spec #03 should add tokens to `:root` only. Do not touch `@theme inline`.**

---

## 5. Risk Assessment (Updated Post-Spikes)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Font removal breaks components | **None** | N/A | Spike B confirmed: all 31 usages auto-migrate via CSS variables |
| Missing token values drift from design system | Low | Medium | Copy values directly from `docs/design-system/tokens/*.css` |
| Spec #07 components need tokens from Spec #03 | **Certain** | Low | Soft ordering: implement #03 before #07, or batch in same slice |
| `--al-status-positive-border` is a new token | Low | Low | Follows established `bg/border/fg` pattern; single consumer for now |
| Deep Ledger `@theme inline` removal needed later | Certain | Low (deferred) | Out of scope; document in current-issues.md |

---

## 6. Open Questions — RESOLVED

1. **Success-banner tokens:** Yes, `--color-success` → `--al-status-positive`. Semantic match confirmed by spike A.
2. **"None" confirmation badge:** Use `--al-status-neutral` / `--al-status-neutral-bg`. Matches the StatusPill component pattern.
3. **Deep Ledger `@theme inline` cleanup:** Deferred to a future wave. Not in scope for Wave 1.

---

## 7. Recommended Shape

### Approach: Single Foundation Slice + Parallel Component Slices

Based on spike findings, the optimal execution order is:

**Slice 1 — Foundation (Specs #01 + #03 combined)**
Addresses font loading and missing tokens in a single `globals.css` + `layout.tsx` pass. Must complete first because Spec #07 components depend on tokens added here.

- Remove 3 legacy fonts from layout.tsx, add JetBrains_Mono
- Repoint `--font-display`, `--font-body`, `--font-mono` in globals.css `@theme inline`
- Add `--al-font-mono` to AL tokens block
- Add ~48 missing AL tokens to `:root` (typography, weight, tracking, spacing, layout, motion, effects)
- Add 1 new token: `--al-status-positive-border`
- Update `docs/context/current-issues.md` (resolve JetBrains Mono issue)

**Slice 2 — Button (Spec #05)**
Single-file change, no dependencies on Slice 1.

- Replace 5 `--color-*` tokens in `outline` variant with `--al-*` equivalents

**Slice 3 — Dashboard Components (Spec #07)**
Depends on Slice 1 (needs `--al-status-neutral-*`, `--al-hairline-*` tokens). Can run parallel with Slice 2.

- Migrate 5 components: shop-overview-card, confirmation-status-badge, success-banner, copy-button, booking-management-choice
- Apply standard token mapping + spike A's extended mapping for unmapped tokens

### Why this shape?

| Criterion | Assessment |
|---|---|
| **Speed** | 2 files in Slice 1, 1 file in Slice 2, 5 files in Slice 3. Small, focused changes. |
| **Risk** | Foundation-first eliminates the #03→#07 dependency. Button is isolated. |
| **Simplicity** | No new abstractions, no structural changes. Pure token substitution + declarations. |
