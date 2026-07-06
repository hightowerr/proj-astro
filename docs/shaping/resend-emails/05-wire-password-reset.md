# Spec: Wire Password Reset to Resend

## Summary
Replace `console.log` in `sendResetPassword` handler with a real `sendEmail()` call using the password reset HTML template. Throw on failure so the user sees an error and can retry.

## Type
Code

## Prerequisites
- `02-password-reset-email-template` — HTML + plain text content
- `04-e2e-test-guards` — guard must be in place before wiring real sends

## Changes

**File:** `src/lib/auth.ts`

1. Add import: `import { sendEmail } from "./email"`
2. Replace the `sendResetPassword` handler body (lines 53-57):

```ts
sendResetPassword: async ({ user, url }) => {
  if (isPlaywrightE2E) {
    console.log(`\n${"=".repeat(60)}\nPASSWORD RESET REQUEST\nUser: ${user.email}\nReset URL: ${url}\n${"=".repeat(60)}\n`)
    return
  }

  const html = `...` // password reset template from spec 02
  const text = `...` // plain text fallback from spec 02

  const result = await sendEmail({
    to: user.email,
    subject: "Reset your Astro password",
    html,
    text,
  })

  if (!result.success) {
    throw new Error(result.error || "Failed to send password reset email")
  }
},
```

## Files Changed
| File | Change |
|------|--------|
| `src/lib/auth.ts` | Add `sendEmail` import, replace `sendResetPassword` handler body |

## Acceptance
- Requesting password reset sends a real email via Resend (dev: sandbox, prod: showup.dev)
- Email contains branded HTML with CTA button linking to `/reset-password?token=...`
- Plain text fallback included
- On Resend failure, user sees error message (not silent failure)
- E2E tests still log to console

## Effort
15 min
