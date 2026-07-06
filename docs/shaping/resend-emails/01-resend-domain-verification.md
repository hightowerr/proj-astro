# Spec: Resend Domain Verification

## Summary
Verify `showup.dev` as a sender domain in Resend so production emails send from `ShowUp <noreply@showup.dev>`.

## Type
Infrastructure / DNS

## Prerequisites
- Resend account with API access (already exists)
- DNS access for `showup.dev`

## Changes
1. In Resend dashboard → Domains → Add `showup.dev`
2. Add DNS records to `showup.dev`:
   - **MX** `send` → `feedback-smtp.us-east-1.amazonses.com` (priority 10)
   - **TXT** `send` → SPF record (value from Resend)
   - **TXT** `resend._domainkey` → DKIM public key (value from Resend)
3. Click "Verify DNS Records" in Resend dashboard
4. Batch with Vercel DNS changes (P0 #4) if doing both

## Files Changed
None (DNS + dashboard only)

## Acceptance
- Resend dashboard shows `showup.dev` status = `verified`
- Test send from `noreply@showup.dev` via Resend test endpoint succeeds

## Effort
15 min (excluding DNS propagation wait)
