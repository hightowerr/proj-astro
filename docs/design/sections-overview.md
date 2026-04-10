# App Sections Overview

Reference for designers optimising each section of the app.

---

## Shop

**Route:** `/app`

Onboarding hub and shop home. Shows the shop name, public booking link, and status banners for newly created shops. Users navigate from here to settings to complete setup.

**Designer focus:** First-run experience, onboarding clarity, booking link copy affordance.

---

## Dashboard

**Route:** `/app/dashboard`

Business KPI overview and proactive customer engagement. The primary day-to-day view.

- **4 metric cards** — upcoming appointments (30d), high-risk count, deposits at risk (£), monthly retained/refunded totals
- **Attention Required table** — customers needing action; columns: tier badge, no-show risk score, voids in 90 days, confirmation status; filterable by time window (24h / 72h / 7d / 14d)
- **Tier Distribution chart** — horizontal bar showing Top / Neutral / Risk customer split with percentages
- **All Upcoming Appointments table** — filterable by tier, sortable by time / score / tier; inline actions per row: View · Contact · Remind · Confirm · Cancel

**Designer focus:** Information density, inline action discoverability, mobile responsiveness of the tables.

---

## Appointments

**Route:** `/app/appointments`

Full transaction record and slot recovery log. Historical and live appointment data in one place.

- **3 outcome cards** — Settled / Voided / Unresolved (last 7 days)
- **Conflict alert banner** — conditional, links to the Conflicts page
- **Appointments table** — time, customer, service, payment status & amount, financial outcome, no-show risk badge, resolved/created dates; "View" navigates to the detail page
- **Slot Recovery table** — cancelled slots and their recovery status (open / filled / expired), with link to recovered booking if filled

**Designer focus:** Visual separation between two tables on one page, empty states for each section, outcome badge hierarchy.

---

## Conflicts

**Route:** `/app/conflicts`

Binary resolution workflow for overlaps between booked appointments and Google Calendar events.

- **Alert banner** — conflict count with guidance
- **Conflicts table** — appointment time, customer, conflicting calendar event name & time, severity badge, detection timestamp
- **Per-row actions** — **Keep Appointment** (dismiss as false positive) or **Cancel Appointment** (triggers confirmation modal showing refund amount)

**Designer focus:** Two-action pattern per row must be unambiguous; severity badge visual hierarchy; destructive action confirmation.

---

## Customers

**Route:** `/app/customers`

Customer reliability registry. Data is computed automatically from booking history — nothing is manually entered here.

- **Customers table** — name, contact, tier badge (Top / Neutral / Risk), reliability score, historical stats breakdown, last updated; rows link to individual customer detail pages
- **Tier explanation card** — defines how scores and tiers are calculated

**Designer focus:** Tier badge scannability at a glance, stats visualisation component, empty state for shops with no customers yet.

---

## Availability

**Route:** `/app/settings/availability`

Booking grid configuration. Controls how appointment slots are generated.

- **Timezone** picker + **slot duration** dropdown (15 – 120 min)
- **Buffer between appointments** — pill toggle: 0 / 5 / 10 min
- **Business hours** — per-day rows (Mon – Sun); each day has open/close time inputs and a Closed toggle that disables the time fields

Single save action for the whole form.

**Designer focus:** Day-by-day grid layout, disabled state styling for closed days, time input usability on mobile.

---

## Services

**Route:** `/app/settings/services`

Service catalogue management. Controls what customers can book.

- **Service list** — expandable cards showing name, duration, buffer, deposit override, status badges (Default / Hidden / Inactive)
- **Inline edit form** — replaces card content when editing; fields: name, description, duration, buffer override, deposit override, hidden flag, active flag
- **Add a service form** — below the list
- **Copyable booking link** per service (with 2-second "Copied" feedback)

**Designer focus:** Card accordion pattern, status badge placement, copy-link affordance, form field disabled states.

---

## Payment Policy

**Route:** `/app/settings/payment-policy`

Deposit and prepayment rules. Two independent form sections that save separately.

- **Base policy** — currency (3-letter code), payment mode (Deposit / Full prepay / None), conditional amount field (hidden when mode = None)
- **Tier overrides** — Risk tier: custom deposit amount; Top tier: waive deposit checkbox + custom amount (disabled when waived); Offer exclusions: checkboxes to exclude Risk tier or high no-show customers from slot recovery offers

**Designer focus:** Conditional field visibility, disabled-but-visible states, help text explaining tier implications without overwhelming the form.

---

## Calendar

**Route:** `/app/settings/calendar`

Google Calendar OAuth connection management. Enables conflict detection.

- **Connected state** — green badge, calendar name, connection date, Disconnect button (with confirmation dialog)
- **Not connected state** — grey badge, description text, Connect button (starts OAuth flow)
- **Config warning card** — shown when Google OAuth environment variables are not set up

**Designer focus:** Two clearly distinct states (connected vs. not), destructive disconnect action prominence, graceful handling of misconfigured environment.

---

## Reminders

**Route:** `/app/settings/reminders`

Controls when automated appointment reminders are sent to customers.

- **Interval selector** — up to 3 intervals chosen from 7 presets: 10 min, 1 hr, 2 hr, 4 hr, 24 hr, 48 hr, 1 week
- **Capacity indicator** — dots showing how many of the 3 slots are used; unselected options disabled when limit is reached
- **Persona hints** per option (e.g. "Most common", "Therapists") as contextual guidance
- **Save** with transient "Saved" confirmation; requires at least 1 interval selected

**Designer focus:** Max-3 selection constraint UX, capacity indicator clarity, disabled-but-still-readable unselected options.
