# 02 — HTML Body: Remove "verified" Assumption

## Summary
Replace "Once verified" with "Once set up" — avoids implying the user has already entered a verification flow they may never have reached.

## Prerequisites
- Depends on: spec 16 implemented (`connect-reengagement/route.ts` exists and is deployed)

## Design reference
**Prototype:** [`Email Connect Reengagement Standalone.html`](Email%20Connect%20Reengagement%20Standalone.html)

## Change

**File:** `src/app/api/jobs/connect-reengagement/route.ts`
**Location:** HTML template, line ~110

**Before:**
```
Once verified, customer deposits will go directly to your bank account on every booking.
```

**After:**
```
Once set up, customer deposits will go directly to your bank account on every booking.
```

### Design details (from prototype)

| Property | Value |
|----------|-------|
| Font size | 15.5px |
| Line height | 1.65 |
| Color (light) | `#43474f` (cMuted) |
| Color (dark) | `#a3a9b2` (cMuted) |
| Margin | `0 0 36px` |
| Max width | 46ch |
| Text wrap | `pretty` |

## Rationale
- "Verified" implies the user has already submitted identity documents to Stripe and is awaiting verification — a Stripe-internal process. If the redirect failed, they never reached verification.
- "Set up" is neutral and true for all five `"pending"` sub-scenarios (reached Stripe and abandoned, completed but reviewing, redirect failed, popup blocked, tab closed).

## Acceptance
- HTML email body paragraph reads "Once set up, customer deposits will go directly to your bank account on every booking."
- Typography matches design prototype: 15.5px / line-height 1.65 / max-width 46ch
