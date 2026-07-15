# P1 — Booking nav wordmark (highest trust-risk surface)

## Classification
**Type:** Rebrand — customer-facing booking chrome
**Risk:** Low (code) / **High (trust)** — this is the customer payment flow
**File:** `src/components/booking/booking-nav.tsx`

## Problem
`booking-nav.tsx` renders `"ASTRO"` (line 74, all-caps) as the nav wordmark. This is the only uppercase brand instance. Customers booking at `showup.dev` see "ASTRO" during the payment flow — the strongest trust-risk surface for brand inconsistency.

The `aria-label` also says "Astro homepage" (line 31).

## Change
```diff
- ASTRO
+ SHOWUP
```
```diff
- aria-label="Astro homepage"
+ aria-label="ShowUp homepage"
```

**The brand mark (navy square + `dashboard_customize` icon) does not change — only the text string.**

## Replacements
| Line | Old | New |
|------|-----|-----|
| 31 | `aria-label="Astro homepage"` | `aria-label="ShowUp homepage"` |
| 74 | `ASTRO` | `SHOWUP` |

## Dependencies
- **Requires:** nothing
- **Blocks:** nothing (ships with P0 + P2 in one PR)

## Verification
- `pnpm check` passes
- Booking page nav shows "SHOWUP" wordmark
- Screen reader announces "ShowUp homepage"

## Design impact
**APPROVED (2026-07-13).** Designer verified: SHOWUP fits at the unchanged spec (`16px / 800 / .16em` tracking). One character wider than ASTRO — no overflow, no changes needed. Mark-to-wordmark gap (`11px`) and `34px` square untouched. At mobile 390px with nav links hidden, brand block + CTA still clear each other; `white-space: nowrap` prevents wrapping. String swap only — no layout changes.
