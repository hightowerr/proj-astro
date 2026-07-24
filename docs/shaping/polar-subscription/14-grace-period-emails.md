# 14 — Grace Period Emails

## Summary
Transactional emails for payment failure and renewal receipt. Supplements Polar's own retry emails with ShowUp-branded messaging.

## Prerequisites
- **05-webhook-handler** — needs `past_due` and `active` state changes to trigger emails
- **12-onboarding-drip** — email infrastructure (Resend, messageLog dedup) established

## Changes

### Webhook handler deferred calls

#### `onSubscriptionUpdated` (status = `past_due`) → Payment Failed email
- Subject: "Payment failed"
- Label: "PAYMENT FAILED"
- Heading: "Your payment didn't go through."
- Body: "We tried to charge your card for **ShowUp Pro** and the payment failed. Polar will retry automatically over the next few days — nothing is paused yet."
- Body 2: "To avoid losing access, update your card now. It takes a minute, and the retry picks up the new card."
- CTA: **"Update your card"** → Polar customer portal via `authClient.customerPortal()`
- Sub-CTA: "Your shop stays live while retries run."

#### `onSubscriptionActive` (after being `past_due`) → Payment Recovered email
- Subject: "Payment recovered"
- Label: "PAYMENT RECOVERED"
- Heading: "All settled."
- Body: "Your payment was processed successfully and your **ShowUp Pro** subscription is active. Deposits, reminders, and slot recovery are running as normal — nothing to do."
- CTA: **"Go to your dashboard"** → `/app/dashboard`

#### `onSubscriptionRevoked` → Subscription Ended email
- Subject: "Subscription ended"
- Label: "SUBSCRIPTION ENDED"
- Heading: "Your subscription has ended."
- Body: "Your **ShowUp Pro** subscription is no longer active. **Existing appointments will be honored** — but your booking page is paused and no new bookings are coming in."
- Body 2: "Your services, policies, and customer scores are saved. Resubscribe and you're live again in under a minute."
- CTA: **"Resubscribe to ShowUp Pro"** → `/app/billing/subscribe`

Footer (all 3): "This is a billing notification for your ShowUp subscription for {{shopName}}. Email preferences. ShowUp Ltd · 18 Percy Street, London W1T 1DX"

### Email templates
- 3 templates via Resend

### Design
- Prototypes: [`design/emails/`](design/emails/)
  - [`txn-payment-failed.html`](design/emails/txn-payment-failed.html)
  - [`txn-payment-recovered.html`](design/emails/txn-payment-recovered.html)
  - [`txn-subscription-ended.html`](design/emails/txn-subscription-ended.html)

### Pages impacted
- None (email only)
