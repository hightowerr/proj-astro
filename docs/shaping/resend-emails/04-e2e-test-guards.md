# Spec: E2E Test Guards

## Summary
Guard both `sendResetPassword` and `sendVerificationEmail` handlers so they `console.log` instead of calling `sendEmail()` when `PLAYWRIGHT=true`. Prevents E2E tests from hitting the real Resend API.

## Type
Code

## Prerequisites
None

## Changes

**File:** `src/lib/auth.ts`

Both handlers get the same guard pattern. The `isPlaywrightE2E` const already exists at line 7:
```ts
const isPlaywrightE2E = process.env.PLAYWRIGHT === "true"
```

In each handler, before calling `sendEmail()`:
```ts
if (isPlaywrightE2E) {
  console.log(`\n${"=".repeat(60)}\n<EMAIL TYPE>\nUser: ${user.email}\nURL: ${url}\n${"=".repeat(60)}\n`)
  return
}
```

This matches the existing pattern: `sendOnSignUp: !isPlaywrightE2E` (line 61).

## Files Changed
| File | Change |
|------|--------|
| `src/lib/auth.ts` | Add `isPlaywrightE2E` guard inside both handlers |

## Acceptance
- E2E tests exercising forgot-password flow do not trigger Resend API calls
- Console output still shows URLs in test mode for debugging
- Non-E2E environments (dev, staging, prod) send real emails

## Effort
5 min
