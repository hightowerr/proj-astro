# Spec: Stale Copy Cleanup

## Summary
Update UI copy that references "terminal" or "console" for email delivery. These were accurate when emails logged to console but are now misleading.

## Type
Code (copy change only)

## Prerequisites
None

## Changes

### File 1: `src/app/(auth)/forgot-password/page.tsx`
**Line 19** — `formSubtitle` prop:
- Before: `"Enter your email and we'll send a reset link to your terminal."`
- After: `"Enter your email and we'll send you a reset link."`

### File 2: `src/components/auth/forgot-password-form.tsx`
**Line 51** — success state paragraph:
- Before: `"If an account exists with that email, a password reset link has been sent. Check your terminal for the reset URL."`
- After: `"If an account exists with that email, we've sent a password reset link. Check your inbox."`

## Files Changed
| File | Change |
|------|--------|
| `src/app/(auth)/forgot-password/page.tsx:19` | Update `formSubtitle` copy |
| `src/components/auth/forgot-password-form.tsx:51` | Update success message copy |

## Designer Mockup Needed
No — text-only change within existing layout.

## Acceptance
- No UI references to "terminal" or "console" in auth flows
- Copy accurately describes email delivery

## Effort
5 min
