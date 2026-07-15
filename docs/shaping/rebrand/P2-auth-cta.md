# P2 — Auth CTA copy

## Classification
**Type:** Rebrand — auth flow copy
**Risk:** Low — single string replacement
**File:** `src/components/auth/sign-in-button.tsx`

## Problem
"New to Astro?" prompt on the sign-in page (line 136).

## Change
```diff
- New to Astro?
+ New to ShowUp?
```

## Replacements
| Line | Old | New |
|------|-----|-----|
| 136 | `New to Astro?` | `New to ShowUp?` |

## Dependencies
- **Requires:** nothing
- **Blocks:** nothing (ships with P0 + P1 in one PR)

## Verification
- `pnpm check` passes
- Sign-in page shows "New to ShowUp?"

## Design impact
None — copy-only, same layout.
