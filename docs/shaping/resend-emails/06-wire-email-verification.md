# Spec: Wire Email Verification to Resend

## Summary
Replace `console.log` in `sendVerificationEmail` handler with a real `sendEmail()` call using the verification HTML template. Throw on failure.

## Type
Code

## Prerequisites
- `03-verification-email-template` — HTML + plain text content
- `04-e2e-test-guards` — guard must be in place before wiring real sends
- `05-wire-password-reset` — shares the `sendEmail` import (minor ordering preference, not a hard dependency)

## Changes

**File:** `src/lib/auth.ts`

Replace the `sendVerificationEmail` handler body (lines 62-66):

```ts
sendVerificationEmail: async ({ user, url }) => {
  if (isPlaywrightE2E) {
    console.log(`\n${"=".repeat(60)}\nEMAIL VERIFICATION\nUser: ${user.email}\nVerification URL: ${url}\n${"=".repeat(60)}\n`)
    return
  }

  const html = `...` // verification template from spec 03
  const text = `...` // plain text fallback from spec 03

  const result = await sendEmail({
    to: user.email,
    subject: "Verify your Astro email",
    html,
    text,
  })

  if (!result.success) {
    throw new Error(result.error || "Failed to send verification email")
  }
},
```

## Files Changed
| File | Change |
|------|--------|
| `src/lib/auth.ts` | Replace `sendVerificationEmail` handler body |

## Acceptance
- Signing up sends a verification email via Resend (dev: sandbox, prod: showup.dev)
- Email contains branded HTML with CTA button linking to verification URL
- Plain text fallback included
- On Resend failure, user sees error message
- E2E tests (`PLAYWRIGHT=true`) still log to console
- `sendOnSignUp: !isPlaywrightE2E` still controls whether verification fires on signup

## Effort
10 min
