# Wave 5 — Spec #20: Dead Token Cleanup — Shaping

**Wave:** 5  
**Spec:** #20  
**Status:** Shape selected (A)  
**Date:** 2026-06-22

---

## Frame

### Problem

- `globals.css` carries ~47 dead Deep Ledger `--color-*` token declarations, 6 `--shadow-*` tokens, a `.dark {}` block (30 lines), and ~15 legacy utility classes — all unreferenced after waves 1-4 migrated app pages/components to Atelier Light
- Dead code adds CSS weight to every page load and confuses developers about which token system is canonical
- `booking-form.tsx` still has 4 `--color-*` references (not a landing page component — missed in wave 4)
- `.status-pill` class is still consumed by `event-type-list.tsx`
- `.service-card-arrow` hover rule is broken (parent changed from `.service-card` to `.al-service-card` in wave 2)

### Outcome

- Zero dead Deep Ledger tokens in `globals.css` (except landing page deferred tokens with clear comment)
- Zero non-landing-page components referencing `--color-*` tokens
- All utility classes either removed (dead) or migrated (live consumers)
- `pnpm check` passes
- Dual-design-system friction signal resolved

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Remove all dead Deep Ledger tokens from globals.css | Core goal |
| R1 | Zero runtime breakage — only remove tokens/classes verified to have zero consumers | Must-have |
| R2 | Landing page components (site-header, site-footer) keep working unchanged | Must-have |
| R3 | Migrate booking-form.tsx from --color-* to AL tokens | Must-have |
| R4 | Fix broken .service-card-arrow hover (parent class mismatch) | Must-have |
| R5 | Migrate .status-pill consumer before removing class | Must-have |
| R6 | Keep shadcn compatibility aliases (--primary, --muted, etc.) | Must-have |
| R7 | Keep all --al-* tokens and AL utility classes | Must-have |
| R8 | Retained landing page tokens clearly marked as deferred | Nice-to-have |

---

## Shape A: Grep-verified incremental removal

Single shape — no alternatives needed. This is deterministic cleanup work.

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | Migrate `booking-form.tsx` lines 921-939: `--color-brand` → `var(--al-primary)`, `--color-surface-void` → `var(--al-surface)`, `--color-brand-border` → `var(--al-outline-variant)` | |
| **A2** | Inline `.status-pill` styles into `event-type-list.tsx` (layout props only: inline-flex, gap, padding, radius, font-size, weight, letter-spacing, text-transform) | |
| **A3** | Fix `.service-card-arrow` hover: change `.service-card .service-card-arrow` and `.service-card:hover .service-card-arrow` to `.al-service-card .service-card-arrow` and `.al-service-card:hover .service-card-arrow` | |
| **A4** | Remove dead token declarations from `@theme inline`: 47 `--color-*` tokens (surface, text, accent, tier, bg-dark, success/warning/error/info, primary compat) + 6 `--shadow-*` tokens | |
| **A5** | Remove `.dark {}` block (lines 458-490) | |
| **A6** | Remove dead utility classes: `.surface-*` (6), `.card-glass`, `.glow-brand`, `.skeleton`, `.tier-dot*` (4), `.service-card` + hover (but keep `.service-card-arrow` rules under new parent), `.focus-brand`, `.font-display`, `.font-body`, `.font-mono`, `.status-pill` | |
| **A7** | Add `/* DEFERRED — landing page redesign */` comment block around retained `--color-brand-*`, `--color-surface-*`, `--color-text-*`, `--color-border-*` tokens | |

### Tokens to REMOVE (verified zero consumers outside globals.css)

| Group | Tokens | Count |
|-------|--------|:-----:|
| Surface (non-landing) | `--color-surface-overlay`, `--color-surface-elevated`, `--color-surface-float` | 3 |
| Backwards compat | `--color-bg-dark`, `--color-bg-dark-secondary` | 2 |
| Text (non-landing) | `--color-text-muted`, `--color-text-light-muted` | 2 |
| Brand compat | `--color-primary`, `--color-primary-light`, `--color-primary-dark` | 3 |
| Accent | `--color-accent-amber`, `--color-accent-amber-hover`, `--color-accent-amber-subtle`, `--color-accent-coral`, `--color-accent-coral-hover`, `--color-accent-peach` | 6 |
| Semantic status | `--color-success*` (3), `--color-warning*` (3), `--color-error*` (3), `--color-info*` (2) | 11 |
| Status compat | `--color-success-green`, `--color-error-red`, `--color-warning-amber` | 3 |
| Tier | `--color-tier-*` (9 tokens) | 9 |
| Border (non-landing) | `--color-border-subtle`, `--color-border-medium`, `--color-border-strong` | 3 |
| Shadow | `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`, `--shadow-brand` | 6 |
| **Total** | | **48** |

### Tokens to KEEP (landing page deferred)

| Token | Consumer |
|-------|----------|
| `--color-brand` | site-header, site-footer |
| `--color-brand-hover` | site-header |
| `--color-brand-dim` | (no current consumer but part of brand set) |
| `--color-brand-subtle` | (brand set) |
| `--color-brand-border` | site-header |
| `--color-brand-glow` | (brand set) |
| `--color-surface-void` | (retained for brand set completeness) |
| `--color-surface-base` | site-header, site-footer |
| `--color-surface-raised` | site-header |
| `--color-text-primary` | site-header, site-footer |
| `--color-text-secondary` | site-header, site-footer |
| `--color-text-tertiary` | site-footer |
| `--color-text-inverse` | site-header |
| `--color-border-default` | site-header, site-footer |
| `--color-border-hairline` | site-header |

---

## Fit Check (R x A)

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | Remove all dead Deep Ledger tokens from globals.css | Core goal | ✅ |
| R1 | Zero runtime breakage — only remove tokens/classes verified to have zero consumers | Must-have | ✅ |
| R2 | Landing page components (site-header, site-footer) keep working unchanged | Must-have | ✅ |
| R3 | Migrate booking-form.tsx from --color-* to AL tokens | Must-have | ✅ |
| R4 | Fix broken .service-card-arrow hover (parent class mismatch) | Must-have | ✅ |
| R5 | Migrate .status-pill consumer before removing class | Must-have | ✅ |
| R6 | Keep shadcn compatibility aliases (--primary, --muted, etc.) | Must-have | ✅ |
| R7 | Keep all --al-* tokens and AL utility classes | Must-have | ✅ |
| R8 | Retained landing page tokens clearly marked as deferred | Nice-to-have | ✅ |
