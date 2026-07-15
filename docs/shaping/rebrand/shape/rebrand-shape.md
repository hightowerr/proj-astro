# Rebrand "Astro" → "ShowUp" — Shaping Document

## Frame

### Source

From `docs/context/current-issues.md` (High priority):

> The product domain is now `showup.dev` but 28 occurrences of "Astro"/"ASTRO" remain across 14 source files. Every occurrence is a map that contradicts the territory: a customer booking at showup.dev sees "ASTRO" in the nav and either assumes the site is broken, fake, or that they navigated somewhere wrong.

Verified count (2026-07-13): **35 occurrences across 15 files** (original estimate was 28/14).

### Problem

- Customers booking at `showup.dev` see "ASTRO" in the nav — trust risk in payment flow
- Every "Astro" string is a map-territory mismatch between domain and UI
- Partial rebrand is worse than none — must ship atomically

### Outcome

- Every user-facing surface displays "ShowUp" (camelCase) or "SHOWUP" (uppercase treatment)
- Plan name reads "ShowUp Pro"
- Brand mark (navy square + icon) stays unchanged
- Design system tokens, directory names, and internal artifacts stay unchanged

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | All user-facing text surfaces display "ShowUp" (not "Astro") | Core goal |
| R1 | P0–P2 ship as one atomic PR — partial rebrand is worse than none | Must-have |
| R2 | Brand mark (navy square + `dashboard_customize` icon) unchanged | Must-have |
| R3 | Design system tokens (`--al-*`), directory names, Vercel URLs unchanged | Must-have |
| R4 | Email rebrand bundles with typography fix (brand footer as "SHOWUP" not "ASTRO") | Must-have |
| R5 | `pnpm check` (lint + typecheck) passes after every slice | Must-have |
| R6 | No logic, routing, schema, or business rule changes — text only | Must-have |

---

## Shape A: Single-sweep string replacement

Only one shape — there are no alternative approaches to replacing strings. The decision space is limited to *scope* (what to change) and *ordering* (wave structure), both already defined in the specs.

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | Wave 1: Replace 21 "Astro"/"ASTRO" strings across 8 source files (P0+P1+P2) | |
| **A2** | Wave 2: Replace 2 tooltip strings in 2 app files (P3-app-copy) | |
| **A3** | Wave 2: Replace 5 email strings + create brand footer element (P3-email-rebrand) | |
| **A4** | Wave 2: Replace 7 doc strings in project-overview.md (P4-internal-docs) | |

No flagged unknowns — every change is a verified string replacement at a known line number.

---

## Fit Check (R × A)

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | All user-facing text surfaces display "ShowUp" (not "Astro") | Core goal | ✅ |
| R1 | P0–P2 ship as one atomic PR — partial rebrand is worse than none | Must-have | ✅ |
| R2 | Brand mark (navy square + `dashboard_customize` icon) unchanged | Must-have | ✅ |
| R3 | Design system tokens (`--al-*`), directory names, Vercel URLs unchanged | Must-have | ✅ |
| R4 | Email rebrand bundles with typography fix (brand footer as "SHOWUP" not "ASTRO") | Must-have | ✅ |
| R5 | `pnpm check` (lint + typecheck) passes after every slice | Must-have | ✅ |
| R6 | No logic, routing, schema, or business rule changes — text only | Must-have | ✅ |

All requirements satisfied. Shape A is the only shape and passes all checks.

---

## Spikes

None needed. All changes are verified string replacements at known locations. No technical unknowns.

---

## Relevant Signals

- **`cascading-rename-breakage`** (friction) — When renaming strings, grep for ALL references including compound selectors and aria-labels. Applied: every spec includes aria-label changes where applicable.
- **`single-file-sweep`** (pattern) — When violations are the same type (string replacement) concentrated across files, a single sweep is more efficient than per-file agents. Applied: Wave 1 uses a single sweep agent, not 7 parallel agents.
- **`agent-skips-visual-polish`** (friction) — Agents treat visual details as optional. Applied: mock-ups received and approved with precise CSS specs for the email brand footer.

---

## Design

Mock-ups received and approved (2026-07-13). See `DESIGN-BRIEF.md`.

- **Booking nav wordmark**: "SHOWUP" fits at unchanged spec (`16px / 800 / .16em`). No overflow.
- **Email brand footer**: `SHOWUP` at `font-weight: 800`, `letter-spacing: .14em`. Tagline at regular weight. `font-size: 11.5px`, `color: #737780`.
