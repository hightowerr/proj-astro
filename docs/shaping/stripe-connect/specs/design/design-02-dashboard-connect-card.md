# Design Brief 02 — Dashboard: Connect Card

**Type:** New component on existing page
**Route:** `/app/app/dashboard`
**Priority:** P0 — this is the primary conversion driver; if the card doesn't work, owners won't connect Stripe
**Spec refs:** 15, 17

---

## Context

The dashboard is the shop owner's home screen. The Connect card must convince owners to set up Stripe without annoying them into ignoring it. Traditional dismissible banners fail due to Habituation (Amber Alert case study: repeated alarms 8x less effective) and Banner Blindness (Instagram, Loom, Apple case studies). This card is persistent, contextual, and escalates naturally.

**Existing page structure:** The dashboard has SummaryCards (4-column grid at top), then AttentionRequiredTable, TierDistributionChart, AllAppointmentsTable, and DailyLogFeed below.

---

## Visibility gate

The Connect card is **NOT shown** until:
1. `shop.services.length > 0` (at least one service created)
2. `shop.availabilityConfigured === true` (working hours set)
3. `shop.stripeOnboardingStatus !== "complete"` (not already connected)

If conditions 1 and 2 are NOT met, the owner is still in initial setup — showing a Stripe prompt at this stage triggers Reactance (Hopper, Sleepzy case studies: asking before the user understands the value).

Once all three conditions are met, the card appears and stays until Connect is complete. **It is never dismissible.**

---

## Placement

The card sits **above the SummaryCards grid**, spanning full width. It's the first thing the owner sees after the page title — impossible to scroll past without seeing it.

```
┌──────────────────────────────────────────────────────────────┐
│  Dashboard                                    al-page-title  │
│  Your studio at a glance.                     al-lede        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌── CONNECT CARD (this component) ─────────────────────┐   │
│  │                                                       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌── Summary Card ──┐ ┌── Summary Card ──┐ ┌── ... ──┐     │
│  │  Upcoming (12)    │ │  High-risk (3)   │ │         │     │
│  └──────────────────┘ └──────────────────┘ └─────────┘     │
│                                                              │
```

---

## Tier 1: Pre-booking (no appointments exist yet)

**When shown:** Gate conditions met + shop has zero appointments

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ○ account_balance_wallet icon (top-right, decorative,       │
│    opacity-10 — matches summary card pattern)                │
│                                                              │
│  Your booking page is live, but deposits        ← heading   │
│  aren't enabled yet.                                         │
│                                                              │
│  Connect your Stripe account so customers       ← body      │
│  pay a deposit when they book.                               │
│                                                              │
│  ┌───────────────────────────┐                               │
│  │ Connect with Stripe  →   │                   ← CTA       │
│  └───────────────────────────┘                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Design notes

- **Card style:** `rounded-2xl p-6`. Blue/indigo tint — informational, not alarming
  - Background: `bg-blue-50` or a custom `al-surface-info` if available
  - Border: `border border-blue-100`
  - No shadow — flat, clean
- **Heading:** Bold, `text-blue-900` or `text-al-on-surface`, ~16–18px
- **Body text:** `text-blue-800` or `text-al-on-surface-variant`, standard body
- **CTA:** Primary button style. Links to `/app/settings/stripe-connect`
- **Decorative icon:** Same pattern as existing summary cards (absolute positioned, top-right, huge, opacity-10). Use `account_balance_wallet` or `payments` material symbol
- **NOT dismissible:** No X button, no close action

### Tone
Informational, not urgent. The owner just set up their shop — this is a natural next step, not a warning.

---

## Tier 2: Post-booking (appointments exist without deposits)

**When shown:** Gate conditions met + shop has ≥1 appointment created while `stripeOnboardingStatus !== "complete"`

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ○ warning icon (top-right, decorative, opacity-10)          │
│                                                              │
│  You've had 7 bookings without deposit          ← heading   │
│  protection.                                                 │
│                                                              │
│  Connect Stripe to start collecting             ← body      │
│  deposits on future bookings.                                │
│                                                              │
│  ┌───────────────────────┐                                   │
│  │ Connect now  →        │                      ← CTA       │
│  └───────────────────────┘                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Design notes

- **Card style:** Amber/warning palette — the cost is now tangible
  - Background: `bg-amber-50` (matches existing "Deposits at Risk" summary card)
  - Border: `border border-amber-100`
- **Heading:** Bold, `text-amber-900`. The number `{count}` is dynamically queried — it only goes up, creating natural escalating urgency
- **Body text:** `text-amber-800`
- **CTA:** Primary button. Label shifts to "Connect now →" (more urgent than "Connect with Stripe →")
- **Decorative icon:** `warning` or `shield` material symbol, amber-tinted
- **NOT dismissible**

### Psychology: Loss Aversion
> Loss Aversion is the single most-documented principle across 43 case studies (6 appearances). The count of unprotected bookings makes the loss concrete and personal — "7 bookings" is more motivating than "deposits are disabled." The number going up on each visit creates escalating urgency without artificial scarcity.

### Booking count query
Count appointments where:
- `appointment.shopId === shop.id`
- `appointment.createdAt` is after `shop.stripeAccountCreatedAt` OR after services+availability were first configured
- `appointment.depositSkipped === "connect_not_complete"` (from spec 14)

If the `depositSkipped` signal isn't available, fall back to counting all appointments created while `stripeOnboardingStatus !== "complete"`.

---

## Tier 2b: Pending state (started but not completed)

**When shown:** `stripeOnboardingStatus === "pending"` — owner started onboarding but didn't finish

### Layout

Same as Tier 2 but with modified copy:

```
Heading: "Your Stripe setup isn't complete yet."
Body:    "You have {count} bookings without deposit protection. Finish setup to start collecting deposits."
CTA:     "Continue setup →"
```

### Design notes
- Same amber card style as Tier 2
- "Continue setup" (not "Connect now") — acknowledges they've already started
- Links to `/app/settings/stripe-connect` where they'll see State 2 (progress indicator)

---

## Responsive behavior

- **Mobile (< md):** Card is full-width, stacks vertically. CTA button is full-width
- **Tablet (md):** Card spans full width of content area
- **Desktop (lg+):** Card spans full width above the 4-column summary cards grid

The card should feel like a natural part of the dashboard layout, not a floating overlay or modal.

---

## Transitions

| Event | Transition |
|-------|------------|
| Owner completes Connect | Card fades out / collapses with animation. Summary cards shift up to fill the space. Next dashboard load: card is gone |
| New booking arrives (without deposit) | Count increments on next page load (no live update needed) |
| Owner sets up services + availability for the first time | Card appears on next dashboard load |

---

## Accessibility

- Card: `role="region"` with `aria-label="Payment setup required"`
- Heading: Semantic heading level (h2 or h3, depending on page hierarchy)
- CTA: Standard button with descriptive label
- Booking count: Part of the heading text, no special ARIA needed
- No dismiss button = no accessibility concern about persistent notifications (this is a setup requirement, not a notification)
