# Design Brief 03 — Nav: Payments Link + Indicator

**Type:** Updated component
**File:** `src/components/app/app-nav.tsx`
**Priority:** P1 — wayfinding; ensures the owner can always find the Connect page
**Spec refs:** 11, 17

---

## Context

The app nav is a fixed sidebar on desktop and a bottom bar + hamburger on mobile. This brief adds a "Payments" link to the settings section and an indicator dot when Connect isn't complete.

**Existing nav structure (desktop sidebar):**
- Dashboard
- Appointments
- Customers
- Catalog
- *divider: Settings*
- Calendar
- Billing
- Profile

---

## Changes

### 1. Add "Payments" link

**Position:** After "Billing" in the settings section (or replace "Billing" if billing is being superseded — confirm with engineering).

```
Settings
├── Calendar
├── Billing
├── Payments  ← new
└── Profile
```

**Label:** "Payments" (not "Stripe Connect" — owners think in payments, not integrations)
**Icon:** `credit_card` material symbol (FILL 0 when inactive, FILL 1 when active)
**Route:** `/app/settings/stripe-connect`

**Active state:** Same as all other nav links:
- Desktop: `bg-[#003366] text-on-primary shadow-lg shadow-primary/10`
- Mobile bottom bar: `text-primary` (if visible there)

### 2. Indicator dot (when Connect incomplete)

When `stripeOnboardingStatus !== "complete"` AND the prompt gate conditions are met (services + availability configured):

```
┌──────────────────────────────┐
│  💳  Payments            ●  │  ← dot on the right
└──────────────────────────────┘
```

**Dot design:**
- Size: 6–8px filled circle
- Color: `al-status-caution` (amber) — matches the dashboard card urgency
- Position: Right-aligned within the nav link row, vertically centered
- **Not a number badge** — it's a simple presence indicator, like an unread dot
- **Disappears** when `stripeOnboardingStatus === "complete"`

### Mobile bottom nav

The "Payments" link does NOT appear in the 5-icon bottom nav bar (that's reserved for primary actions: Dashboard, Appointments, Customers, Catalog + center button). It's accessible via the hamburger menu / settings section only.

If the indicator dot is active, show it on the **Settings gear icon** in the mobile nav (if one exists) to signal that something in settings needs attention.

---

## Visibility gate

The indicator dot follows the same gate as the dashboard card (spec 17):
- NOT shown until services + availability are configured
- NOT shown when Connect is complete
- Shown in all other cases (not_started or pending)

The link itself is always visible (the owner should be able to navigate to the payments page at any time, even before setup).

---

## Design reference

```
DESKTOP SIDEBAR (existing pattern):

┌──────────────────────────────┐
│  🏠 Dashboard                │  ← active: bg-[#003366]
│  📅 Appointments             │
│  👥 Customers                │
│  📦 Catalog                  │
│                              │
│  SETTINGS                    │  ← divider label
│  📅 Calendar        ● (dot) │  ← example of connection status
│  💰 Billing                  │
│  💳 Payments         ●      │  ← NEW: with indicator dot
│  👤 Profile                  │
└──────────────────────────────┘
```

Note: The calendar settings page already has a "connection status pill" pattern (connected/not connected). The nav indicator dot is a simplified version of that concept applied to navigation.

---

## Accessibility

- Indicator dot: `aria-label` on the link should include status, e.g., "Payments (setup required)" when dot is visible, "Payments" when not
- The dot itself is decorative (`aria-hidden="true"`) since the label carries the information
