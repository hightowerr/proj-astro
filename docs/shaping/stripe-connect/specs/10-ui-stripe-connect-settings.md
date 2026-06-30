# 10 — UI: Stripe Connect Settings Page

## Summary
Settings page and component where shop owners connect their Stripe account, check onboarding status, and access their Express Dashboard. Each state is designed around the psychology principles that drive completion.

## Design references
- Brief: `design/design-01-settings-stripe-connect.md`
- Mock: `design/design files/Payments Stripe Connect.dc.html`
- Screenshots: `design/design files/screenshots/connected.png`

## Prerequisites
- Depends on: 05 (api-create-account), 07 (api-status), 08 (api-dashboard)

## Changes

**New file:** `src/app/app/settings/stripe-connect/page.tsx`

Server component:
1. `requireAuth()`
2. Look up shop by owner ID, select `stripeAccountId` and `stripeOnboardingStatus`
3. Render `<StripeConnectCard>` with props

**New file:** `src/components/settings/stripe-connect-card.tsx`

### Page shell
- **Title:** "Payments" (not "Stripe Connect" — owners think in payments, not integrations)
- **Subtitle (al-lede):** "Manage how you receive booking deposits"
- **Layout:** Single shadcn Card component, centered in the settings content area, max-width matches existing settings cards (560px from mock)
- Follow existing settings page patterns (`src/app/app/settings/billing/page.tsx`, `src/app/app/settings/calendar/page.tsx`)

Client component with five visual states:

### State 1: `not_started`
- Heading: **"Get paid directly"** — bold, `text-al-primary`, ~22px
- Body: "Customer deposits go straight to your bank account. You'll see payouts, refunds, and tax info in your own Stripe dashboard." — `text-al-on-surface-variant`
- Fee disclosure (secondary text, below body, separated from body paragraph): "A `50p` platform fee applies per booking deposit." — 13px, 72% opacity, `text-al-on-surface-variant`
- Decorative `credit_card` icon: top-right of card, 150px, 6% opacity (matches summary card watermark pattern)
- CTA: "Connect with Stripe" button — AstroDesignSystem primary button, size `lg`, icon-right `arrow_forward`. Arrow signals external redirect
- Card style: `rounded-2xl bg-al-surface-lowest p-6`
- On click: show transition state (State 1b), POST to `/api/settings/stripe-connect/create-account`, redirect to returned URL

**Why this copy:** "Get paid directly" leads with the outcome (The Promised Land — Sleepzy case study). The original "Customer booking deposits will be paid directly into your bank account" buries the benefit in a compound sentence. Fee disclosure is separated so it doesn't compete with the value proposition (Cognitive Load — Zapier case study: single CTA lifts conversion 27–232%).

### State 1b: `redirecting` (client-only, not persisted)
- Shown between CTA click and browser redirect
- Replaces the card content (same card container, different inner content — not a modal/overlay)
- Spinner: 30px circle, 3px border, `border-top` in `al-primary`, continuous rotation (`al-spin` animation, 0.8s linear infinite)
- Text: "Setting up your Stripe account..." — centered, `text-al-on-surface-variant`
- Minimum display time: 1700ms — if the API responds faster, hold the spinner for the remainder before redirecting. This ensures the animation feels intentional, not a flicker
- Auto-transitions to browser redirect after API response + minimum time elapsed

**Why this exists:** Clicking a button and being silently redirected to an external domain feels jarring. A brief processing state signals that something meaningful is happening (Labor Illusion — Wise case study: +15% perceived value from transfer animation). This is purely client-side; no API change needed.

### State 2: `pending`
- Card accent: 4px solid `al-primary` left-edge stripe
- Heading: **"Almost there"** — 22px, bold
- Body: "Complete your Stripe verification to start collecting deposits." — forward-looking, not failure-framed
- Visual progress indicator — three horizontal steps connected by lines:
  ```
  (✓)────────────(○)────────────(○)
  Account        Stripe        Ready to
  created       verifying      collect
  ```
  - Step 1 "Account created": filled circle with checkmark, `al-status-positive` green, label below
  - Step 2 "Stripe verifying": empty/outline circle, `al-on-surface-variant` gray, label below
  - Step 3 "Ready to collect": empty/outline circle, `al-on-surface-variant` gray, label below
  - Connecting line 1→2: solid green (completed segment)
  - Connecting line 2→3: dashed gray (upcoming segment)
  - If `detailsSubmitted === true` (from status API), advance step 2 to filled/half-filled state
- CTA: "Continue setup" button — same primary style, icon-right `arrow_forward`. Clicking triggers redirect animation (State 1b) then Stripe redirect

**Why reframed:** "Stripe setup incomplete" + "Deposits are disabled" is failure-framed. The Headspace case study showed negative framing ("Manage my anxiety") underperforms positive JTBD framing. "Almost there" + a progress indicator reframes the same state as forward momentum. The Goal Gradient effect (Blinkist, GoDaddy) accelerates completion when users can see progress.

### State 2b: `verifying` — `pending` with `?status=complete` query param (returning from Stripe)
- Same card layout as State 2 (4px primary left stripe), but progress indicator advances:
  ```
  (✓)────────────(●)────────────(○)
  Account       Verifying...    Ready to
  created                       collect
  ```
  - Step 2 "Verifying...": animated pulsing dot — `al-status-caution` color with radiating ring animation (`al-ring`: scale 0.65/opacity 0.5 → scale 1.9/opacity 0, 1.5s; `al-pulsedot`: scale 1 → 0.78 → 1, 1.5s breathing)
- Reassurance block below progress: info banner with `al-surface-container` background, `rounded-xl`, info icon + "Stripe is verifying your details — this usually takes a few minutes." — `aria-live="polite"` for screen readers
- **No CTA button** — auto-polling handles the transition. The owner should feel like things are happening automatically
- Auto-poll `/api/settings/stripe-connect/status` every 5 seconds (max 12 attempts / 60 seconds)
- When status transitions to `"complete"`, fade/slide animate to State 3 (with celebration)

**Why this exists:** The return URL says `?status=complete` but Stripe verification isn't always instant. Without reassurance, the user sees "pending" and suspects they did something wrong. The Audible case study showed that no confirmation after a purchase (spinner for minutes, user suspects a bug) is a critical UX failure. Explicit "Stripe is verifying" copy + a polling indicator prevents anxiety.

### State 3: `complete`
- Card accent: 4px solid `al-status-positive` green left-edge stripe
- Success icon: 38px circle with `al-status-positive-bg` background, check icon — animated in with `al-pop` (scale 0 → 1.12 → 1, 0.5s spring bounce)
- Heading: **"Payments connected"** — with inline check icon in `al-status-positive` green
- Subheading: "Booking deposits will now go directly to your bank account." — `text-al-on-surface-variant`
- Account details card (inset, `al-surface-container-low` background, 12px radius):
  - Account: `acct_...AbC` (mono font, last 3 chars visible)
  - Status: green dot + "Charges enabled", green dot + "Payouts enabled"
  - Platform fee: `50p` per booking deposit
  - Labels: `text-xs font-medium uppercase tracking-wider text-al-on-surface-variant`; values: standard weight `text-al-on-surface`
- "Open Stripe Dashboard" — ghost/outline button style (NOT primary), `open_in_new` icon signals external. Opens in new tab via GET `/api/settings/stripe-connect/dashboard`
- Divider: thin horizontal rule
- **Next step bridge:** "→ Review your deposit policy" — text link, 15px weight 800, `al-primary` color, `arrow_forward` icon. Links to `/app/settings/billing`. This is the most important element — owner just completed a milestone and needs a clear next step

**Why the bridge:** The Audible case study identified "Successful Transitions" — after a milestone, bridge to the next action. Don't leave users on a dead-end success page. The deposit policy is the logical next step after connecting payments. The Peak-End Rule (Zapier, Been) means this completion moment disproportionately shapes memory of the entire setup experience.

### First-time completion (one-time celebrate mode)
On first transition to `complete` (detected via `?status=complete` poll success or webhook-driven status change during the session):
- Checkmark draws on with `al-pop` bounce animation (scale 0 → 1.12 → 1, 0.5s)
- Radiating ring animation around checkmark (`al-ring`: scale 0.65 → 1.9, opacity 0.5 → 0, 1.5s)
- Copy: **"You're all set! Deposits are now enabled on your booking page."** — `al-status-positive` green, weight 700
- After ~2 seconds, settle to static State 3 layout. On subsequent visits, page loads directly into static State 3 (no animation)

This is shown once per session, not on every subsequent visit. Peak-End Rule: the completion moment should feel like an achievement, not just a status change.

### Animations reference

| Name | Keyframes | Duration | Usage |
|------|-----------|----------|-------|
| `al-spin` | rotate 0→360deg | 0.8s linear infinite | Redirect spinner |
| `al-ring` | scale 0.65 opacity 0.5 → scale 1.9 opacity 0 | 1.5s | Verifying pulse ring, completion ring |
| `al-pop` | scale 0 → 1.12 → 1 | 0.5s spring | Success checkmark bounce |
| `al-fade` | opacity 0 translateY(5px) → normal | 0.3s | Content transitions |
| `al-pulsedot` | scale 1 → 0.78 → 1 | 1.5s | Verifying step dot breathing |

### Responsive behavior
- **Mobile:** Card fills width with `px-4`. Progress indicator steps stack vertically if horizontal space is insufficient. CTA buttons are full-width
- **Tablet/Desktop:** Card is centered within the settings content area, max-width matches existing settings cards (~560px)

### Accessibility
- Progress indicator: `role="progressbar"` with `aria-valuenow` / `aria-valuemax`
- State 2b verifying: `aria-live="polite"` region for "Stripe is verifying..." text
- All states: card has a heading (`h2`) for screen reader navigation
- CTA buttons: clear, descriptive labels (not just "Continue")
- External links: `aria-label` includes "(opens in new tab)" for Stripe Dashboard

## Acceptance
- Page renders all five visual states correctly (not_started, redirecting, pending, verifying, complete)
- "Connect with Stripe" shows transition spinner (minimum 1700ms) before redirecting to Stripe onboarding
- Returning from Stripe with `?status=complete` shows verifying state with pulsing indicator and reassurance copy, auto-polls status
- Auto-poll transitions to success state with celebrate animation (al-pop + al-ring) when `"complete"` is detected
- Celebrate mode shown once per session; subsequent visits show static State 3
- Success state includes next-step bridge link to deposit policy settings
- "Open Stripe Dashboard" opens Express Dashboard in new tab (ghost button, not primary)
- Fee is visible in both the initial state (secondary text) and the success state (account details card)
- Progress indicator renders correctly on mobile (vertical stack if needed)
- All ARIA attributes present (progressbar, aria-live, heading hierarchy)
