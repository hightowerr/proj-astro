# Design Brief 01 — Settings: Stripe Connect Page

**Type:** New page
**Route:** `/app/settings/stripe-connect`
**Priority:** P0 — critical path (owner can't collect deposits without completing this)
**Spec refs:** 10, 05, 06, 07, 08

---

## Context

This is the page where shop owners connect their Stripe Express account. It's the single most important page in the Connect feature — every shop owner must complete this flow to collect booking deposits. The page has **four visual states** that map to the owner's progress through onboarding.

**Existing patterns to follow:** `src/app/app/settings/billing/page.tsx` and `src/app/app/settings/calendar/page.tsx` — both use the same page shell (`.al-page-title` + `.al-lede` + card content).

---

## Page Shell

- **Title:** "Payments" (not "Stripe Connect" — owners think in terms of payments, not platform integrations)
- **Subtitle (al-lede):** "Manage how you receive booking deposits"
- **Layout:** Single shadcn Card component, centered in the settings content area. No sidebar needed.
- **Max width:** Match existing settings pages

---

## State 1: Not Started

**When shown:** `stripeOnboardingStatus === "not_started"` (default for all new shops)

### Layout

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ○ CreditCard icon (material, top-right,         │
│    opacity-10, decorative — matches summary       │
│    card pattern from dashboard)                   │
│                                                  │
│  Get paid directly                    ← heading  │
│                                                  │
│  Customer deposits go straight to     ← body     │
│  your bank account. You'll see                   │
│  payouts, refunds, and tax info                  │
│  in your own Stripe dashboard.                   │
│                                                  │
│  A 50p platform fee applies per       ← secondary│
│  booking deposit.                       text     │
│                                                  │
│  ┌────────────────────────────┐                  │
│  │  Connect with Stripe  →   │       ← CTA      │
│  └────────────────────────────┘                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Design notes

- **Card style:** `rounded-2xl bg-al-surface-lowest p-6` (standard card)
- **Heading:** Bold, `text-al-primary`, ~20px
- **Body text:** `text-al-on-surface-variant`, standard body size
- **Fee disclosure:** Separated from body. Smaller text, `text-al-on-surface-variant`, slightly muted. Do NOT bury in the body paragraph — it should be readable but not compete with the value proposition
- **CTA button:** Primary style. Full-width on mobile, auto-width on desktop. Use the `→` arrow to signal external redirect

### Psychology: The Promised Land
> The first screen must reinforce the specific benefit users signed up for (growth.design: 5 Deadly Onboarding Mistakes). "Get paid directly" leads with the outcome. The original copy "Customer booking deposits will be paid directly into your bank account" buried the benefit in a compound sentence.

### Psychology: Cognitive Load
> Separating the fee from the value proposition prevents the "fine print" pattern that triggers distrust (growth.design: Zapier — single CTA lifts conversion 27–232%). One message per visual group.

---

## State 1b: Redirecting (client-side only)

**When shown:** Between CTA click and browser redirect (1–2 seconds). Not a database state.

### Layout

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ◌ ← subtle spinner/pulse animation             │
│                                                  │
│  Setting up your Stripe account...               │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Design notes

- **Replaces** State 1 card content (same card, different content)
- **Animation:** Subtle — a pulsing dot or small spinner. NOT a full-screen loader. Match the tone of the existing calendar connection flow if one exists
- **Text:** Centered, `text-al-on-surface-variant`, calm tone
- **Duration:** 1–2 seconds (however long the POST takes), then browser navigates to Stripe

### Psychology: Labor Illusion
> Wise's transfer animation increased perceived value by +15% (growth.design: Labor Perception Bias). Clicking a button and being silently redirected to an external domain feels jarring. A brief processing state signals meaningful work happening.

---

## State 2: Pending (onboarding in progress)

**When shown:** `stripeOnboardingStatus === "pending"` — owner started but hasn't completed Stripe's verification

### Layout

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Almost there                         ← heading  │
│                                                  │
│  Complete your Stripe verification    ← body     │
│  to start collecting deposits.                   │
│                                                  │
│  ── Progress indicator ──────────────────────    │
│                                                  │
│  ✓ Account created → ○ Verifying → ○ Ready      │
│                                                  │
│  ┌────────────────────────────────┐              │
│  │  Continue setup  →            │   ← CTA      │
│  └────────────────────────────────┘              │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Progress indicator design

Three steps, horizontal, connected by a line:

```
 (✓)───────────(○)───────────(○)
Account       Stripe         Ready to
created      verifying       collect
```

- **Step 1 (Account created):** Filled circle with checkmark, `al-status-positive` green, label below
- **Step 2 (Stripe verifying):** Empty/outline circle, `al-on-surface-variant` gray, label below
- **Step 3 (Ready to collect):** Empty/outline circle, `al-on-surface-variant` gray, label below
- **Connecting line:** Between circles. Solid green from step 1→2 (completed segment), dashed gray from 2→3
- If `detailsSubmitted === true` (from status API), advance Step 2 to filled/half-filled state

### Design notes

- **Card style:** Same `rounded-2xl` card. Blue/indigo tint on the border or a subtle left-edge accent — NOT yellow warning. This is progress, not failure
- **Heading:** "Almost there" — upbeat, not "Stripe setup incomplete"
- **Body text:** Forward-looking: "to start collecting deposits" not "deposits are disabled"
- **CTA:** Same primary button style as State 1, but label is "Continue setup →"

### Psychology: Framing
> Headspace case study showed "Manage my anxiety" (negative) underperforms "Find your calm" (positive JTBD framing). "Almost there" + progress indicator reframes the identical state as forward momentum.

### Psychology: Goal Gradient
> Blinkist's pre-completed first step accelerated trial conversion (growth.design: Trial Paywall Challenge). Showing "✓ Account created" means the owner perceives themselves as already 33% done — they're on the accelerating portion of the motivation curve.

---

## State 2b: Returning from Stripe (verifying)

**When shown:** `stripeOnboardingStatus === "pending"` AND URL has `?status=complete` query param (owner just returned from Stripe's onboarding)

### Layout

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  Almost there                         ← heading  │
│                                                  │
│  ── Progress indicator ──────────────────────    │
│                                                  │
│  ✓ Account created → ● Verifying... → ○ Ready   │
│                        ↑ pulsing dot              │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  ℹ  Stripe is verifying your details —  │    │
│  │     this usually takes a few minutes.    │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  (no CTA button — auto-polling handles it)       │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Design notes

- **Progress Step 2:** Filled/pulsing dot (animated) to signal active processing. Use `al-primary` or `al-status-caution` color with a subtle pulse animation
- **Info block:** Inline, muted background (`al-surface-container`), rounded-xl, small info icon + text. NOT a toast/alert — it's part of the card content
- **No CTA button:** The system is auto-polling every 5 seconds. The owner should feel like things are happening automatically, not that they need to do something
- **Auto-transition:** When the poll returns `"complete"`, animate smoothly to State 3 (fade/slide transition)

### Psychology: Post-Purchase Reassurance
> Audible's case study showed that after a purchase, a spinner with no context for minutes made users suspect a bug (growth.design: Audible Purchase UX). "Stripe is verifying your details" with a pulsing indicator explicitly communicates what's happening and sets time expectations.

---

## State 3: Connected

**When shown:** `stripeOnboardingStatus === "complete"`

### Layout

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  ✓  Payments connected               ← heading  │
│     Booking deposits will now go      ← subhead  │
│     directly to your bank account.               │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ Account     acct_...AbC                    │  │
│  │ Status      ● Charges enabled              │  │
│  │             ● Payouts enabled              │  │
│  │ Platform fee  50p per booking deposit       │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────┐                      │
│  │ Open Stripe Dashboard ↗│          ← secondary │
│  └────────────────────────┘            button    │
│                                                  │
│  ─────────────────────────────────────────────   │
│                                                  │
│  → Review your deposit policy         ← bridge  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Design notes

- **Card style:** Green left-edge accent or subtle green tint on the card border. `al-status-positive` color family
- **Heading checkmark:** Inline ✓ icon in `al-status-positive` green, paired with bold heading text
- **Subheading:** `text-al-on-surface-variant`, confirms the outcome
- **Account details block:** Info grid within the card. Use the label/value pattern from calendar settings dark panels, but in light mode:
  - Labels: `text-xs font-medium uppercase tracking-wider text-al-on-surface-variant`
  - Values: standard weight, `text-al-on-surface`
  - Status dots: Small filled circles — green for enabled (`al-status-positive`)
- **Masked account ID:** `acct_...AbC` (show last 3 chars only)
- **Platform fee:** Listed as a fact in the details block, not hidden
- **Stripe Dashboard button:** Secondary/outline style, opens in new tab (↗ icon signals external). NOT primary style — the primary action is the bridge link below
- **Divider:** Thin horizontal rule before the bridge link
- **Bridge link:** Text link with arrow, `al-primary` color, points to deposit policy settings (`/app/settings/billing`). This is the most important element on the page — the owner just completed a milestone and needs a clear next step

### Psychology: Successful Transitions
> Audible's case study identified that after a milestone, products must bridge to the next action (growth.design: Audible Purchase UX). Leaving users on a dead-end success page wastes the emotional momentum of completion. "→ Review your deposit policy" is the logical next step.

### Psychology: Peak-End Rule
> Zapier's confetti post-upgrade shaped the owner's memory of the entire upgrade experience (growth.design: Zapier Upgrade UX). The completion moment disproportionately determines how the owner feels about Astro's onboarding.

### First-time completion (one-time animation)

When the page first transitions to the Connected state (either via auto-poll or on first load after webhook update), show a brief celebration:

- **Checkmark animation:** The ✓ icon animates in (draw-on effect or scale-up with bounce)
- **Optional:** Subtle confetti or pulse ring around the checkmark — match existing codebase celebratory patterns. Check `success-banner.tsx` for precedent
- **Text flash:** "You're all set! Deposits are now enabled on your booking page." — shown once, then replaced by the standard subheading on subsequent visits
- **Duration:** ~2 seconds, then settle to static State 3

This celebration is shown **once per session** on initial transition. On subsequent visits, the page loads directly into the static State 3 layout.

---

## Responsive behavior

- **Mobile:** Card fills width with `px-4`. Progress indicator steps stack vertically if horizontal space is insufficient. CTA buttons are full-width
- **Tablet/Desktop:** Card is centered within the settings content area, max-width matches existing settings cards

---

## Interactions summary

| Action | Trigger | Result |
|--------|---------|--------|
| Click "Connect with Stripe" | State 1 CTA | → State 1b (transition) → redirect to Stripe |
| Click "Continue setup" | State 2 CTA | → State 1b (transition) → redirect to Stripe |
| Return from Stripe with `?status=complete` | URL param detection on mount | → State 2b (verifying) → auto-poll → State 3 |
| Click "Open Stripe Dashboard" | State 3 link | Opens Stripe Express Dashboard in new tab |
| Click "Review your deposit policy" | State 3 bridge link | Navigates to `/app/settings/billing` |

---

## Accessibility

- Progress indicator: `role="progressbar"` with `aria-valuenow` / `aria-valuemax`
- State 2b pulsing dot: `aria-live="polite"` region for "Stripe is verifying..." text
- All states: card has a heading (h2) for screen reader navigation
- CTA buttons: clear, descriptive labels (not just "Continue")
- External links: `aria-label` includes "(opens in new tab)" for Stripe Dashboard
