# 17 — Connect Prompt Timing

## Summary
Define when the "Connect Stripe" prompt first appears in the shop owner's journey. The prompt should arrive after the owner has invested effort in setup (endowment effect) and understands why deposits matter (user-driven prompts), not on first login.

## Prerequisites
- Depends on: 10 (ui-stripe-connect-settings), 15 (guard-dashboard-warning)

## Psychology basis
- **User-Driven Prompts** (Hopper case study): Hopper's notification permission request succeeds because it comes *after* the price-prediction aha moment — the user understands the value before being asked to act. Asking for Stripe on first login, before the owner has set up services or seen their booking page, triggers Reactance.
- **Endowment Effect** (Trello, Blinkist, HEY): once the owner has customised services, set availability, and seen their booking page, it's *their* shop. The effort invested makes them more likely to complete the next step.
- **Reactance** (Sleepzy, YouTube, Blinkist, GoDaddy): premature asks for commitment — before the user understands the value — trigger psychological resistance. The request feels like an obstacle rather than a natural next step.

## Design

### Prompt gate conditions
The Connect prompt (spec 15 dashboard card + spec 11 nav link highlight) should only appear when ALL of:
1. `shop.services.length > 0` — at least one service created
2. `shop.availabilityConfigured === true` — working hours set
3. `shop.stripeOnboardingStatus !== "complete"` — not already connected

Before conditions 1 and 2 are met, the owner should see setup-related prompts for services and availability instead — not the Stripe prompt.

### Where the prompt appears (after gate conditions met)
1. **Dashboard card** (spec 15) — the primary prompt surface
2. **Settings nav** (spec 11) — "Payments" link gets a subtle indicator dot (like an unread badge) when Connect is not complete
3. **Post-first-booking inline** — if a booking comes in before Connect is set up, the booking confirmation in the dashboard should include: "This booking has no deposit. [Connect Stripe →] to collect deposits on future bookings."

### Where the prompt does NOT appear
- First-login onboarding flow (if one exists) — too early
- Blocking modals or interstitials — never block the owner from using the product
- The public booking page — customers should never see Stripe Connect prompts

### Progressive urgency
The prompt copy escalates naturally through spec 15's four-state system:
1. Before any bookings: navy/blue informational card (Tier 1)
2. After bookings without deposits: amber loss-quantifying card with count (Tier 2)
3. Started but didn't finish: amber card with progress badge acknowledging they started (Tier 2b)
4. Connected: brief green confirmation banner, then card disappears permanently

No artificial urgency (no countdown timers, no fake scarcity). The real cost of unprotected bookings is urgent enough.

## Acceptance
- Connect prompt not shown until owner has at least one service AND availability configured
- Connect prompt appears on dashboard after gate conditions are met
- Settings nav "Payments" link shows indicator dot when Connect is incomplete
- No blocking modals or interstitials for Connect
- Prompt timing is consistent across spec 15 (dashboard) and spec 11 (nav)
