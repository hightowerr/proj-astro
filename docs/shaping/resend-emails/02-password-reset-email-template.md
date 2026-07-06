# Spec: Password Reset Email Template

## Summary
Design the HTML + plain text email template for password reset. Lightly branded, matches existing product email pattern (connect reengagement).

## Type
Template / Design

## Prerequisites
None

## Design Brief

### Pattern Reference
Match `/src/app/api/jobs/connect-reengagement/route.ts:74-120` — the existing inline HTML email pattern:
- Dark mode: `prefers-color-scheme` media query + `[data-ogsc]` Outlook fallback
- Mobile: `max-width: 600px` breakpoint
- Logo: text-only `<span>` ("ShowUp"), not an image — avoids external asset hosting
- Brand color: `#001e40` (dark navy) for logo + CTA button
- Font: `system-ui, sans-serif`
- Max-width: `600px`, padded `44px 56px` (desktop), `28px 24px` (mobile)
- CTA button: `background:#001e40; color:#fff; border-radius:12px; padding:14px 36px`

### Email Content
- **Subject:** `Reset your ShowUp password`
- **Heading:** `Reset your password`
- **Body:** `You requested a password reset for your ShowUp account. Click the button below to choose a new password.`
- **CTA button:** `Reset password →` (links to `${url}`)
- **Fallback text:** `Or copy this link: ${url}`
- **Expiry note:** `This link expires in 1 hour.`
- **Footer:** `If you didn't request this, you can safely ignore this email. Your password won't change.`
- **Sign-off:** `— ShowUp`

### Plain Text Fallback
```
Reset your password

You requested a password reset for your ShowUp account.

Reset your password:
${url}

This link expires in 1 hour.

If you didn't request this, you can safely ignore this email.

— ShowUp
```

## Files Changed
None yet — template is consumed by `05-wire-password-reset`

## Designer Mockup Needed
Yes — one email mockup (light mode). Dark mode follows mechanically from CSS.

### Mockup Specs
- **Width:** 600px max
- **Header:** "ShowUp" text logo, 22px, weight 800, color `#001e40`
- **Body text:** 15.5px, line-height 1.65, color `#111827`
- **CTA button:** Full-width on mobile, inline on desktop. Navy `#001e40` bg, white text, 12px radius
- **Footer:** 12px, color `#9ca3af`, separated by `1px solid #e5e7eb` rule

## Effort
15 min (code), 30 min (design mockup)
