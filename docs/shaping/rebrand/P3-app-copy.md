# P3 — In-app product copy (tooltips)

## Classification
**Type:** Rebrand — in-app copy
**Risk:** Low — tooltip text replacements
**Files:** `src/app/app/appointments/page.tsx`, `src/components/payments/tier-policy-form.tsx`

## Problem
Two in-app tooltip strings still reference "Astro."

## Replacements

### `src/app/app/appointments/page.tsx` (1)
| Line | Old | New |
|------|-----|-----|
| 294 | `Astro offers their slot` | `ShowUp offers their slot` |

### `src/components/payments/tier-policy-form.tsx` (1)
| Line | Old | New |
|------|-----|-----|
| 922 | `Astro can text the open slot` | `ShowUp can text the open slot` |

## Dependencies
- **Requires:** P0–P2 shipped (must not have "ShowUp" in tooltips while "Astro" still appears in nav/header)
- **Blocks:** nothing

## Verification
- `pnpm check` passes
- Appointments page tooltip reads "ShowUp"
- Tier policy form tooltip reads "ShowUp"

## Design impact
None — tooltip copy only, no layout change.
