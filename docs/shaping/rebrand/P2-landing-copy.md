# P2 — Landing page marketing copy

## Classification
**Type:** Rebrand — landing page copy
**Risk:** Low — string replacements in marketing text
**Files:** 5 landing page components

## Problem
11 occurrences of "Astro" across 5 landing page section components. All are marketing copy — no layout, logic, or routing changes.

## Replacements

### `src/components/landing/hero-section.tsx` (1)
| Line | Old | New |
|------|-----|-----|
| 111 | `Astro protects your income` | `ShowUp protects your income` |

### `src/components/landing/faq-section.tsx` (5)
| Line | Old | New |
|------|-----|-----|
| 10 | `Astro retains the deposit automatically` | `ShowUp retains the deposit automatically` |
| 26 | `Astro is month-to-month` | `ShowUp is month-to-month` |
| 29 | `does Astro work with?` | `does ShowUp work with?` |
| 30 | `Astro integrates with Google Calendar` | `ShowUp integrates with Google Calendar` |
| 50 | `about Astro.` | `about ShowUp.` |

### `src/components/landing/how-it-works.tsx` (3)
| Line | Old | New |
|------|-----|-----|
| 25 | `Astro protects your schedule` | `ShowUp protects your schedule` |
| 34 | `Astro offers the slot` | `ShowUp offers the slot` |
| 51 | `How Astro works` | `How ShowUp works` |

### `src/components/landing/features-carousel.tsx` (1)
| Line | Old | New |
|------|-----|-----|
| 24 | `Astro flags high-risk clients` | `ShowUp flags high-risk clients` |

### `src/components/landing/pricing-section.tsx` (1)
| Line | Old | New |
|------|-----|-----|
| 55 | `Astro Pro` | `ShowUp Pro` |

## Dependencies
- **Requires:** nothing
- **Blocks:** nothing (ships with P0 + P1 in one PR)

## Verification
- `pnpm check` passes
- Visual scan of each landing page section — no "Astro" text visible

## Design impact
**Content review needed:** designer should scan each section to confirm "ShowUp" reads naturally in every sentence. No layout changes. Pricing section: confirm "ShowUp Pro" plan name treatment.
