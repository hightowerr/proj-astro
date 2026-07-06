# Spec: Production Environment Config

## Summary
Set `EMAIL_FROM_ADDRESS` to `ShowUp <noreply@showup.dev>` in Vercel production environment. Dev/staging continues using Resend sandbox sender.

## Type
Infrastructure / Config

## Prerequisites
- `01-resend-domain-verification` — domain must be verified before production sends work
- `05-wire-password-reset` — code must be deployed that uses `sendEmail()`
- `06-wire-email-verification` — code must be deployed that uses `sendEmail()`

## Changes
1. In Vercel dashboard → Settings → Environment Variables:
   - Set `EMAIL_FROM_ADDRESS` = `ShowUp <noreply@showup.dev>` for **Production** environment
   - Keep `EMAIL_FROM_ADDRESS` = `onboarding@resend.dev` for **Preview** and **Development**
2. Redeploy to pick up the new env var

## Files Changed
None (Vercel dashboard only)

## Acceptance
- Production password reset emails arrive from `ShowUp <noreply@showup.dev>`
- Production verification emails arrive from `ShowUp <noreply@showup.dev>`
- Dev/preview environments still use Resend sandbox sender
- No code changes required — `sendEmail()` already reads `EMAIL_FROM_ADDRESS` at runtime

## Effort
5 min
