# Design Brief 06 — Email: Abandoned Connect Re-engagement

**Type:** New email template
**Priority:** P2 — re-engagement for owners who started but didn't finish
**Spec refs:** 16

---

## Context

When a shop owner starts Stripe Connect onboarding but doesn't complete Stripe's verification within 24 hours, this email brings them back. The dashboard card (Brief 02) only works if they log in — this email reaches them regardless.

**Existing email system:** Resend (transactional email provider). Templates tracked via `templateKey` and `templateVersion` in the message log. Rendered HTML stored in `renderedBody`. No dedicated email component directory — HTML templates are likely inline or in a shared utility.

---

## Email specification

### Trigger
- `stripeOnboardingStatus === "pending"`
- `stripeAccountCreatedAt` is 24–48 hours ago
- No re-engagement email already sent for this onboarding attempt
- Owner has at least one service AND availability configured (same gate as dashboard card)

### Sent exactly once per onboarding attempt

---

## Content

**From:** Astro (or the configured sender name)
**Subject:** "You're one step away from collecting deposits"

### Body

```
Hi {shopOwnerFirstName},

You started connecting your Stripe account — you're almost there.

Once verified, customer deposits will go directly to your
bank account on every booking.

        ┌─────────────────────────────┐
        │   Complete setup  →         │
        └─────────────────────────────┘

This usually takes under 5 minutes.

— Astro
```

### Design notes

- **Tone:** Encouraging, brief, no guilt. NOT "You haven't finished" or "Don't forget." Frame it as proximity to a reward, not a reminder of incompleteness
- **Single CTA:** One button, centered. "Complete setup →" — the arrow signals action
  - Links to: `/api/settings/stripe-connect/refresh` (generates a fresh Account Link and redirects to Stripe)
  - Button style: Primary color fill (match Astro's brand primary), rounded corners, sufficient padding for touch targets
- **"Under 5 minutes":** Reduces perceived effort. Placed after the CTA as a nudge, not before it (don't front-load logistics)
- **No images or heavy formatting** — plain with a single styled button. Transactional emails with minimal design have higher deliverability and read rates
- **No unsubscribe link needed** — this is a transactional/account-setup email, not marketing. But if your email compliance requires one, add it in footer

### Psychology: Zeigarnik Effect
> Duolingo's open-loop mechanics drove +14% Day-7 retention (growth.design: Duolingo User Retention). Incomplete tasks create psychological tension. "You started connecting your Stripe account — you're almost there" activates the Zeigarnik tension without creating guilt.

### Psychology: Goal Gradient
> "You're almost there" + "under 5 minutes" places the owner on the accelerating portion of the motivation curve (growth.design: Blinkist Trial Paywall). They perceive themselves as close to completion, which increases effort investment.

---

## What this email does NOT do

- **No countdown or urgency** — there is no deadline. Artificial urgency (Temu, Sleepzy case studies) erodes trust
- **No feature list** — the owner already knows what Astro does. Don't re-sell
- **No "what you're missing" FOMO** — Loss Aversion is better applied in-context (dashboard card) than in email, where it feels manipulative
- **No follow-up drip** — one email, once. If they don't act, the dashboard card handles re-engagement on next login. A drip campaign for a B2B setup step crosses into nagging

---

## Template variables

| Variable | Source | Example |
|----------|--------|---------|
| `{shopOwnerFirstName}` | User record | "Sarah" |
| `{setupUrl}` | Generated: `{appUrl}/api/settings/stripe-connect/refresh` | Full URL |

---

## Template key

`templateKey: "connect-onboarding-reengagement"`
`templateVersion: 1`

---

## Responsive behavior

- **Mobile email clients:** CTA button should be full-width with minimum 44px height for touch targets
- **Dark mode:** Ensure text is readable against dark backgrounds (use standard email dark-mode meta tags if the email system supports them)
- **Plain text fallback:** "Hi {name}, you started connecting your Stripe account. Complete setup here: {url}. This usually takes under 5 minutes."

---

## Testing

- Verify the refresh URL generates a valid Account Link and redirects to Stripe (not a 404 or error page)
- Verify the email is NOT sent if the owner completes Connect between the 24h trigger and the cron execution (race condition with webhook)
- Verify the email is NOT sent if the owner has no services/availability configured
- Verify only one email is sent per onboarding attempt (check `connectReengagementSentAt`)
