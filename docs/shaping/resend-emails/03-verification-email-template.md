# Spec: Verification Email Template

## Summary
Design the HTML + plain text email template for email verification sent on signup. Lightly branded, matches existing product email pattern.

## Type
Template / Design

## Prerequisites
None

## Design Brief

### Pattern Reference
Same as `02-password-reset-email-template.md` — match connect reengagement template structure.

### Email Content
- **Subject:** `Verify your ShowUp email`
- **Heading:** `Verify your email address`
- **Body:** `Thanks for signing up for ShowUp. Click the button below to verify your email address.`
- **CTA button:** `Verify email →` (links to `${url}`)
- **Fallback text:** `Or copy this link: ${url}`
- **Expiry note:** `This link expires in 24 hours.`
- **Footer:** `If you didn't create a ShowUp account, you can safely ignore this email.`
- **Sign-off:** `— ShowUp`

### Plain Text Fallback
```
Verify your email address

Thanks for signing up for ShowUp. Click the link below to verify your email address.

Verify your email:
${url}

This link expires in 24 hours.

If you didn't create a ShowUp account, you can safely ignore this email.

— ShowUp
```

## Files Changed
None yet — template is consumed by `06-wire-email-verification`

## Designer Mockup Needed
Yes — one email mockup (light mode). Identical layout to password reset, different copy. Can be a single shared mockup showing both variants if preferred.

### Mockup Specs
Same dimensions and tokens as `02-password-reset-email-template.md`.

## Effort
10 min (code — near-identical to reset template), 15 min (design mockup if done alongside reset)
