# 11 — Nav: Settings Link + Indicator Dot

## Summary
Add a "Payments" link to the settings navigation with a conditional indicator dot when Connect setup is incomplete.

## Design references
- Brief: `design/design-03-nav-payments-indicator.md`
- Mock: `design/design files/App Navigation.dc.html`

## Prerequisites
- Depends on: 10 (ui-stripe-connect-settings), 17 (connect-prompt-timing — gate conditions)

## Changes

**File:** `src/components/app/app-nav.tsx`

### 1. Add "Payments" link

Add to the settings links array:
```ts
{ href: "/app/settings/stripe-connect", label: "Payments", icon: CreditCard }
```

Use "Payments" as the label (not "Stripe Connect") — merchants think in terms of "payments", not "Stripe Connect". Icon: `credit_card` material symbol (FILL 0 when inactive, FILL 1 when active).

### Placement
Add after the existing Billing link in the Settings section. Current nav order from mock:
```
Settings
├── Payment Policy
├── Calendar
├── Billing
├── Payments  ← new
└── Profile
```

### 2. Active state
Same pattern as all other nav links:
- Desktop sidebar: `linear-gradient(135deg, #001e40, #003366)` background, white text, `box-shadow: 0 10px 22px rgba(0,30,64,.22)`, filled icon variant, weight 700
- In the mock, the active Payments item uses `al-primary-container` background with white text and filled `account_balance_wallet` icon

### 3. Indicator dot (when Connect incomplete)

When `stripeOnboardingStatus !== "complete"` AND prompt gate conditions are met (services + availability configured — spec 17):

- **Size:** 8px filled circle
- **Color:** `al-status-caution` (amber) with 4px glow ring in `al-status-caution-bg`
- **Position:** right-aligned within the nav link row, vertically centered
- **Type:** Simple presence indicator (not a number badge)
- **Disappears** when `stripeOnboardingStatus === "complete"`
- The link itself is always visible (owner can navigate to payments page at any time, even before the gate conditions are met) — only the dot is gated

### 4. Mobile behavior

- The "Payments" link does NOT appear in the 5-icon bottom tab bar (reserved for: Hub, Book, Catalog, Shop)
- Accessible via hamburger menu / drawer in the Settings section
- When dot is active and drawer is open: the Payments item gets a highlighted background `rgba(201,122,42,.08)` (amber tint) with primary-colored text — draws attention within the drawer
- If the dot is active, also show it on the hamburger button itself (8px dot, positioned absolute top-right with 2.5px ring) to signal something in settings needs attention

### Accessibility
- When dot is visible: `aria-label="Payments (setup required)"`
- When dot is not visible: `aria-label="Payments"`
- Dot itself: `aria-hidden="true"` (label carries the information)

## Acceptance
- Settings nav shows "Payments" link with `credit_card` icon
- Clicking it navigates to `/app/settings/stripe-connect`
- Active state highlights correctly when on the page (gradient background + filled icon)
- Indicator dot (8px, amber, glow ring) appears when Connect is incomplete and gate conditions are met
- Dot disappears when `stripeOnboardingStatus === "complete"`
- Mobile: dot shown on hamburger button; Payments item highlighted in drawer when dot active
- Aria-label includes "(setup required)" when dot is visible
