# 01 — HTML Headline: Outcome-Anchored Language

## Summary
Replace the process-specific headline claim with outcome-anchored language that is true regardless of whether the Stripe redirect succeeded.

## Prerequisites
- Depends on: spec 16 implemented (`connect-reengagement/route.ts` exists and is deployed)

## Design reference
**Prototype:** [`Email Connect Reengagement Standalone.html`](Email%20Connect%20Reengagement%20Standalone.html)

## Change

**File:** `src/app/api/jobs/connect-reengagement/route.ts`
**Location:** HTML template, line ~109

**Before:**
```
You started connecting your Stripe account — you're almost there.
```

**After:**
```
You began setting up deposits — finish in under 5 minutes.
```

### Design details (from prototype)

| Property | Value |
|----------|-------|
| Font size | 21px |
| Line height | 1.4 |
| Font weight | 800 |
| Letter spacing | -0.015em |
| Color (light) | `#001e40` (cWordmark) |
| Color (dark) | `#cdddf7` (cWordmark) |
| Margin | `0 0 18px` |
| Text wrap | `pretty` |

## Rationale
- `stripeAccountCreatedAt` is set when the API creates the Express account (before browser redirect). If the redirect fails (popup blocker, network drop, tab closed), the original headline references an interaction that never happened from the user's perspective.
- "Began setting up deposits" is always true — the system did begin the process on their behalf.
- Preserves Zeigarnik Effect ("began" opens the loop) and Goal Gradient ("finish in under 5 minutes") from spec 16 psychology basis.

## Acceptance
- HTML email headline reads "You began setting up deposits — finish in under 5 minutes."
- No change to subject line or CTA text
- Typography matches design prototype: 21px / weight 800 / letter-spacing -0.015em
