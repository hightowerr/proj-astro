# 16 — Email: Abandoned Connect Onboarding

## Summary
Send an automated re-engagement email when a shop owner starts Stripe Connect onboarding but doesn't complete it within 24 hours. The dashboard banner (spec 15) only works if they log in — this email reaches them regardless.

## Prerequisites
- Depends on: 01 (schema), 02 (migration), 05 (api-create-account)

## Psychology basis
- **Zeigarnik Effect** (Duolingo case study): incomplete tasks create psychological tension. Duolingo's open-loop mechanics drove +14% Day-7 retention. An "almost there" email leverages the same principle — the owner *knows* they started something unfinished.
- **Goal Gradient** (Blinkist, GoDaddy): proximity to completion accelerates action. The email should communicate that finishing is quick, not that they failed.

## Changes

### Trigger logic
**Where:** Cron job or background worker (same infrastructure as existing reminder/recovery crons)

**When:** Check once daily for shops where:
- `stripeOnboardingStatus === "pending"`
- `stripeAccountCreatedAt` is between 24 and 48 hours ago
- No re-engagement email has been sent yet for this onboarding attempt

**Send exactly once** per onboarding attempt. If the owner restarts onboarding (new Account Link via spec 06), the 24-hour clock resets but only one email is sent per `stripeAccountCreatedAt` window.

### Email content

**Design references:** `design/design-06-email-connect-reengagement.md`, `design/design files/Email Connect Reengagement.dc.html`

**From:** Astro (or the configured sender name, e.g. `hello@astro.app`)
**Subject:** "You're one step away from collecting deposits"

**Body layout:**
```
[Astro logo + wordmark]

Hi {shopOwnerFirstName},

You started connecting your Stripe account —     ← headline (21px weight 800)
you're almost there.

Once verified, customer deposits will go          ← body (15.5px, line-height 1.65)
directly to your bank account on every booking.

        +-----------------------------+
        |   Complete setup  →         |           ← CTA button (gradient-cta, 12px radius,
        +-----------------------------+              min-height 50px, 36px horiz padding)

This usually takes under 5 minutes.               ← nudge (13px, muted)

— Astro

────────────────────────────────────────────────
You're receiving this because you started         ← footer (muted, small)
setting up deposit collection for your
Astro account. This is a transactional
account-setup message.

ASTRO · Stop losing money to no-shows.
```

**CTA link:** `{appUrl}/api/settings/stripe-connect/refresh` — generates a fresh Account Link (spec 06) and redirects to Stripe. This handles the case where the original link expired.

**Tone:** Encouraging, brief, no guilt. NOT "You haven't finished" or "Don't forget." Frame it as proximity to a reward, not a reminder of incompleteness.

### Template variables

| Variable | Source | Example |
|----------|--------|---------|
| `{shopOwnerFirstName}` | User record | "Sarah" |
| `{setupUrl}` | Generated: `{appUrl}/api/settings/stripe-connect/refresh` | Full URL |

### Dark mode support

| Token | Light | Dark |
|-------|-------|------|
| Page background | `#ecece8` | `#0e1013` |
| Body text | `#1a1c1b` | `#f1f2f4` |
| Wordmark | `#001e40` | `#cdddf7` |
| Email body bg | `#ffffff` | `#16191e` |
| Toolbar bg | `#f4f4f2` | `#1b1e23` |

Use standard email dark-mode meta tags if the email system supports them.

### Responsive
- **Desktop:** max-width 600px, body padding 44px 56px. CTA inline-flex centered
- **Mobile:** max-width 392px, body padding 32px 26px. CTA full-width block, min-height 50px for touch targets

### Plain text fallback
"Hi {name}, you started connecting your Stripe account. Complete setup here: {url}. This usually takes under 5 minutes."

### Email infrastructure
Use the existing Resend transactional email setup. Create a new template following the pattern of existing reminder/confirmation templates.

**Template key:** `connect-onboarding-reengagement`, version 1.

### Tracking
Add a `connectReengagementSentAt` timestamp column to `shops` (or use a lightweight `sent_emails` log table if one exists) to enforce the "send once" constraint.

### Do NOT send if:
- Owner has already completed onboarding (`stripeOnboardingStatus === "complete"`)
- Owner created the account less than 24 hours ago (give them time)
- Owner created the account more than 48 hours ago (a single email, not a drip campaign — avoid reactance)
- Owner has no services or availability configured (they're not far enough in setup for Connect to matter yet)

## Acceptance
- Email sent exactly once, 24–48 hours after `stripeAccountCreatedAt`, if status is still `"pending"`
- Email not sent if owner has no services/availability configured
- CTA link generates a fresh Account Link and redirects to Stripe
- Email not sent if status is already `"complete"` (race condition with webhook)
- `connectReengagementSentAt` prevents duplicate sends
