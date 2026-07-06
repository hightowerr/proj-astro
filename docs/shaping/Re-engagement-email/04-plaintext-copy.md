# 04 — Plain Text Fallback: Mirror HTML Copy Changes

## Summary
Apply the same headline and footer copy changes from specs 01 and 03 to the plain text fallback version of the email.

## Prerequisites
- Depends on: spec 16 implemented (`connect-reengagement/route.ts` exists and is deployed)
- Depends on: 01 (headline wording finalised), 03 (footer wording finalised)

## Design reference
**Prototype:** [`Email Connect Reengagement Standalone.html`](Email%20Connect%20Reengagement%20Standalone.html)
(Plain text has no visual design — copy must match the HTML version.)

## Changes

**File:** `src/app/api/jobs/connect-reengagement/route.ts`
**Location:** Plain text template, line ~122

### Headline
**Before:**
```
You started connecting your Stripe account — you're almost there.
```
**After:**
```
You began setting up deposits — finish in under 5 minutes.
```

### Footer
**Before:**
```
You're receiving this email because you started Stripe Connect onboarding for your Astro account.
```
**After:**
```
You're receiving this because you began setting up deposit collection for your Astro account.
```

### Full plain text template (after changes)
```
Hi ${firstName},

You began setting up deposits — finish in under 5 minutes.

Once set up, customer deposits will go directly to your bank account on every booking.

Complete setup (this usually takes under 5 minutes):
${setupUrl}

— Astro

---
You're receiving this because you began setting up deposit collection for your Astro account. This is a transactional notification — not a marketing email.
```

## Rationale
- Plain text must stay consistent with the HTML version. Inconsistency between formats would be a regression if the HTML specs ship without the plaintext mirror.
- "Once verified" does not appear in the current plaintext template, so spec 02's change has no plaintext equivalent. However, the full template above includes "Once set up" for consistency.

## Acceptance
- Plain text headline and footer match the HTML versions from specs 01 and 03
- Body also updated to "Once set up" for cross-format consistency
- No other plaintext content changes
