# 15 — Guard: Dashboard Connect Card

## Summary
Show a contextual, loss-quantifying card on the shop owner's dashboard when they haven't completed Stripe Connect onboarding. The card adapts across four states based on how much revenue is going unprotected and how far the owner is in the Connect flow.

## Design references
- Brief: `design/design-02-dashboard-connect-card.md`
- Mock: `design/design files/Dashboard Connect Card.dc.html`

## Prerequisites
- Depends on: 01 (schema), 02 (migration), 17 (connect-prompt-timing — gate conditions)

## Changes

**File:** `src/app/app/dashboard/page.tsx` (or the dashboard layout)

### Why not a generic dismissible banner
Generic amber banners suffer from habituation (users tune them out after 2–3 sessions) and banner blindness (standard warning format is the most-ignored UI element). Instead, tie the warning to real data so it stays relevant and escalates naturally.

### Placement
The card sits **above the SummaryCards grid**, spanning full width. It's the first thing the owner sees after the page title — impossible to scroll past without seeing it.

```
Dashboard                               (al-page-title)
Your studio at a glance.                (al-lede)

+── CONNECT CARD (this component) ──────────────+
|                                                |
+────────────────────────────────────────────────+

+── Summary Card ──+ +── Summary Card ──+ +── ... ──+
|  Upcoming (12)    | |  High-risk (3)   | |         |
+──────────────────+ +──────────────────+ +─────────+
```

### Four-state card system

**Tier 1 — Pre-booking (no appointments yet):**
- **When:** gate conditions met (spec 17) + shop has zero appointments
- **Visual:** Navy/blue card — informational, not alarming
  - Background: `linear-gradient(180deg, rgba(0,30,64,.045), rgba(0,30,64,.025))`, border `rgba(0,30,64,.13)`
  - Decorative watermark: `account_balance_wallet` icon, 150px, 5% opacity, positioned top-right
  - 46px chip with wallet icon in navy tint
- **Eyebrow:** "Next step" — `al-primary` color, 62% opacity
- **Heading:** "Your booking page is live — but deposits aren't enabled yet." — 18px weight 800
- **Body:** "Connect your Stripe account so customers pay a deposit when they book."
- **CTA:** AstroDesignSystem Button, size `lg`, icon-right `arrow_forward`, "Connect with Stripe" → links to `/app/settings/stripe-connect`
- **Not dismissible** — no X button

**Tier 2 — Post-booking (appointments exist without deposits):**
- **When:** gate conditions met + shop has ≥1 appointment with `depositSkipped: "connect_not_complete"`
- **Visual:** Amber/warning card — the cost is now tangible
  - Background: `linear-gradient(180deg, rgba(201,122,42,.11), rgba(201,122,42,.06))`, border `rgba(201,122,42,.3)`
  - 4px `al-status-caution` stripe on left edge
  - Decorative watermark: `warning` icon, 7% opacity
  - 46px chip with warning icon in amber tint
- **Eyebrow:** "Deposits at risk" — `al-status-caution` color, 85% opacity
- **Heading:** "You've taken **{count}** bookings without deposit protection." — count in mono 21px, `al-status-caution` color
- **Body:** "Connect Stripe to start collecting deposits on every future booking." — color `#8a5a2a`
- **CTA:** "Connect now" (more urgent than "Connect with Stripe")
- `{count}` updates on each dashboard load — the number only goes up, creating escalating loss aversion
- **Not dismissible**

**Tier 2b — Pending (owner started onboarding but didn't finish):**
- **When:** `stripeOnboardingStatus === "pending"`
- **Visual:** Same amber styling as Tier 2
  - `hourglass_top` icon in chip
- **Eyebrow row:** "Almost there" + inline green badge "Account created · one step left" (10.5px with `check_circle` icon)
- **Heading:** "Your Stripe setup isn't complete yet." — color `#7a4715`
- **Body:** "You have **{count}** bookings without deposit protection. Finish setup to start collecting deposits."
- **CTA:** "Continue setup" — acknowledges they've already started. Links to `/app/settings/stripe-connect` where they see State 2 (progress indicator)
- **Not dismissible**

**Connected — brief confirmation (one-time dismissal):**
- **When:** `stripeOnboardingStatus === "complete"` — shown briefly on first load after completion, then removed
- **Visual:** Simple positive banner: `al-status-positive-bg` background, `check_circle` icon
- **Copy:** "Stripe connected — deposits are now live. This card won't show again."
- Fades out after one page view. Subsequent dashboard loads: card is gone entirely

### Timing: when to show
- Do NOT show on first login / before the owner has set up at least one service and their availability. Asking for Stripe before the owner has invested effort in setup triggers reactance (see Hopper/Headspace case studies — ask after the aha moment, not before).
- Show after: `shop.services.length > 0 AND shop.availabilityConfigured === true` (spec 17 gate)
- If the owner hasn't configured services/availability yet, the setup checklist (if present) handles the prompt sequence.

### Booking count query
Count appointments where:
- `appointment.shopId === shop.id`
- `appointment.depositSkipped === "connect_not_complete"` (from spec 14)

If the `depositSkipped` signal isn't available, fall back to counting all appointments created while `stripeOnboardingStatus !== "complete"`.

### Responsive behavior
- **Mobile (<md):** Card is full-width, stacks vertically. CTA button is full-width
- **Tablet (md):** Card spans full width of content area
- **Desktop (lg+):** Card spans full width above the 4-column summary cards grid

### Transitions
- Owner completes Connect → card fades out / collapses with animation. Summary cards shift up. Next load: card gone
- New booking arrives without deposit → count increments on next page load (no live update needed)
- Owner sets up services + availability → card appears on next dashboard load

### Also consider
The billing settings page (`/app/settings/billing`) should show a similar indicator. If the shop has no Connect account, the "Collected this month" stats are meaningless (no deposits are being collected).

### Accessibility
- Card: `role="region"` with `aria-label="Payment setup required"`
- Heading: semantic heading level (`h2` or `h3` depending on page hierarchy)
- CTA: standard button with descriptive label
- No dismiss button = no accessibility concern about persistent notifications

## Acceptance
- Dashboard shows Tier 1 card (navy/blue) when Connect is not complete and shop has no bookings yet (but has services + availability configured)
- Dashboard shows Tier 2 card (amber) with booking count when Connect is not complete and bookings exist
- Dashboard shows Tier 2b card (amber + progress badge) when `stripeOnboardingStatus === "pending"`
- Brief green confirmation banner appears on first load after Connect completes, then disappears
- Card is not shown before services and availability are configured
- Card is not dismissible (no X button) — disappears only when `stripeOnboardingStatus === "complete"`
- Card sits above SummaryCards grid, full width
- Card links to the Connect settings page
- Booking count uses `depositSkipped: "connect_not_complete"` signal from spec 14
- No card shown on subsequent visits when `stripeOnboardingStatus === "complete"`
