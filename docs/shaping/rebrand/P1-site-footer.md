# P1 — Site footer brand text and copyright

## Classification
**Type:** Rebrand — platform chrome
**Risk:** Low — string replacements only
**File:** `src/components/site-footer.tsx`

## Problem
Two occurrences: the footer logo text (line 21) and the copyright line (line 37).

## Change
```diff
- Astro
+ ShowUp
```
```diff
- © 2025 Astro. All rights reserved.
+ © 2025 ShowUp. All rights reserved.
```

## Replacements
| Line | Old | New |
|------|-----|-----|
| 21 | `Astro` (logo text) | `ShowUp` |
| 37 | `© 2025 Astro. All rights reserved.` | `© 2025 ShowUp. All rights reserved.` |

## Dependencies
- **Requires:** nothing
- **Blocks:** nothing (ships with P0 + P2 in one PR)

## Verification
- `pnpm check` passes
- Footer logo reads "ShowUp"
- Copyright reads "© 2025 ShowUp."

## Design impact
**Review needed:** designer should confirm "ShowUp" in footer logo matches the site-header treatment.
