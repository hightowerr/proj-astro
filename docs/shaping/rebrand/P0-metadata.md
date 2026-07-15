# P0 — App metadata: title and description

## Classification
**Type:** Rebrand — metadata
**Risk:** Low — no UI layout change, SEO/tab-title only
**File:** `src/app/layout.tsx`

## Problem
The root layout exports `title: "Astro"` (line 23). Every browser tab, social preview, and search engine result shows the old brand name.

## Change
```diff
- title: "Astro",
+ title: "ShowUp",
```

Update the `description` field to reference "ShowUp" if it mentions "Astro."

## Replacements
| Line | Old | New |
|------|-----|-----|
| 23 | `title: "Astro"` | `title: "ShowUp"` |

## Dependencies
- **Requires:** nothing
- **Blocks:** nothing (but must ship with P1 + P2 in one PR)

## Verification
- `pnpm check` passes
- Browser tab shows "ShowUp"

## Design impact
None — metadata only. Designer should confirm the `description` copy if changed.
