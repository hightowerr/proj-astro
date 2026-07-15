# P1 — Auth brand bar text

## Classification
**Type:** Rebrand — auth chrome
**Risk:** Low — single string replacement
**File:** `src/components/auth/auth-brand-bar.tsx`

## Problem
The auth brand bar (shown on login/register pages) displays "Astro" (line 11).

## Change
```diff
- Astro
+ ShowUp
```

## Replacements
| Line | Old | New |
|------|-----|-----|
| 11 | `Astro` | `ShowUp` |

## Dependencies
- **Requires:** nothing
- **Blocks:** nothing (ships with P0 + P2 in one PR)

## Verification
- `pnpm check` passes
- Auth pages show "ShowUp" brand bar

## Design impact
**Review needed:** designer should confirm "ShowUp" rendering in the auth brand bar context. Same layout, different string.
