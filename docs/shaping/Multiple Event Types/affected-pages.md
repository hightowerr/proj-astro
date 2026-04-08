---
shaping: true
---

# Multiple Event Types — Affected Pages

## New page

| Page | What's needed |
|------|--------------|
| `/app/settings/services` | Full new page — list of event types with create/edit/deactivate actions, deposit override, buffer selector (None / 5 min / 10 min), hidden toggle, "Copy link" per service |

---

## Modified — significant UI change

| Page | What changes |
|------|-------------|
| `/book/[slug]` | New service-selector screen added before the calendar. Cards for each active visible event type. If `?service=<id>` is in the URL, skip the selector entirely and load that service directly (supports hidden services via direct link). |
| `OnboardingFlow` (renders at `/app` pre-shop) | Currently 2 steps (Business Type → Shop Details). Gains Step 3: "Add your services" with name, duration, buffer radio, optional deposit — plus a "Skip for now" path that creates a default event type. |

---

## Modified — minor (add service name as a display field)

| Page | What changes |
|------|-------------|
| `/app/appointments` | Add a "Service" column to the appointments table |
| `/app/appointments/[id]` | Show service name in the appointment detail card |
| `/app/slot-openings/[id]` | Show which service the slot was opened for |
| `/manage/[token]` | Show service name in the customer-facing booking summary ("You've booked: Colour Session") |

---

## Not affected

| Page | Why |
|------|-----|
| `/app/settings/availability` | `slotMinutes` stays as the slot grid — no UI change needed |
| `/app/settings/payment-policy` | Tier overrides remain shop-level — no change |
| `/app/settings/reminders` | No event-type dependency |
| `/app/settings/calendar` | No event-type dependency |
| `/app/dashboard` | Summary cards are outcome-based, not service-based |
| `/app/customers/[id]` | Customer history; service name is a future nice-to-have, not required |
