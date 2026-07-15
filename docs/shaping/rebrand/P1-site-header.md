# P1 — Site header brand text

## Classification
**Type:** Rebrand — platform chrome
**Risk:** Low — string replacements only, no layout change
**File:** `src/components/site-header.tsx`

## Problem
Three occurrences of "Astro" in the site header: desktop logo text, mobile drawer logo (×2). These appear on the landing page and authenticated app shell.

## Change
Replace all 3 occurrences of "Astro" with "ShowUp."

## Replacements
| Line | Old | New |
|------|-----|-----|
| 63 | `aria-label="Astro homepage"` | `aria-label="ShowUp homepage"` |
| 64 | `Astro` (desktop logo text) | `ShowUp` |
| 136 | `Astro` (mobile drawer logo) | `ShowUp` |

**The brand mark (icon) does not change — only the text string next to it.**

## Dependencies
- **Requires:** nothing
- **Blocks:** nothing (ships with P0 + P2 in one PR)

## Verification
- `pnpm check` passes
- Desktop: logo reads "ShowUp"
- Mobile drawer: logo reads "ShowUp"

## Design impact
**Review needed:** designer should confirm "ShowUp" rendering at the current font-size/weight in both desktop and mobile drawer contexts. No layout change — same space, different string.
