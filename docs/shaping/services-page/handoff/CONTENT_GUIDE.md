# Content Guide — Shop Owner Reference

There is no CMS. All shop content (services, policies, schedules) is managed directly through the application's settings UI. This guide covers the management interface from a shop owner's perspective.

---

## Accessing the Management Interface

| What | Where |
|------|-------|
| Main dashboard | `/app/dashboard` |
| Services | `/app/settings/services` |
| Payment policy | `/app/settings/payment-policy` |
| Availability / hours | `/app/settings/availability` |
| Reminder settings | `/app/settings/reminders` |
| Google Calendar sync | `/app/settings/calendar` |

Authentication is email/password via Better Auth. There is no separate admin role — the shop owner account is the single management identity.

---

## Content Structure

### Services (`/app/settings/services`)

Each service (called an "event type" internally) has:

| Field | What it controls |
|-------|-----------------|
| Name | Displayed on the public booking page |
| Description | Optional subtitle on the booking page |
| Duration | How long the appointment runs (multiples of the shop's slot size) |
| Operational buffer | Dead time added after the appointment (None / 5m / 10m / Shop Default) |
| Deposit override | Per-service deposit; leave blank to inherit the shop policy amount |
| Visible on booking page | Toggle off to hide from the public listing (direct-link booking still works) |
| Available for booking | Toggle off to pause all booking including direct links |

One service is marked **Default** — it is pre-selected when a customer lands on the booking page without a service query parameter.

### Payment Policy (`/app/settings/payment-policy`)

- Default deposit amount applied to all services without an override
- Cancellation cutoff window (how many hours before an appointment a customer can cancel for a full refund)

Policies are snapshotted at booking time. Changing a policy does not retroactively affect existing bookings.

### Availability (`/app/settings/availability`)

- Open/close times per day of week
- Slot size (minimum appointment granularity: 30m, 60m, etc.)
- Default operational buffer applied to all services that use "Shop Default"

---

## Common Workflows

### Add a new service
1. Go to `/app/settings/services`
2. Click **Add New Service** (top right of the left panel)
3. Fill in name, duration, and optional description
4. Leave deposit blank to use the shop policy amount, or enter a specific amount
5. Click **Save Changes** — the service immediately appears on the public booking page

### Hide a service without deleting it
1. Open the service in the left panel
2. Expand **More options**
3. Toggle **Visible on booking page** off
4. Save — the service disappears from the public listing but existing direct links still work

### Pause all bookings for a service
1. Open the service
2. Expand **More options**
3. Toggle **Available for booking** off
4. Save — no new bookings can be made, including via direct link

### Restore a hidden or inactive service
1. In the service list, locate the service (shown with a Hidden or Inactive badge)
2. Click the `⋯` menu on the row
3. Select **Restore service** — this sets both toggles back to their public/active defaults in one action

### Copy a direct booking link for a specific service
1. In the service list, locate an active service
2. Click the `⋯` menu on the row
3. Select **Copy booking link** — the URL is `{APP_URL}/book/{shop-slug}?service={service-id}`

---

## Guardrails

These fields require developer input to change:

- **Slot size** — changing this invalidates existing duration options for services (durations must be multiples of slot size). Requires data review before changing on a live shop.
- **Shop slug** — used in all public booking URLs. Changing it breaks any existing shared links.
- **Default service** — exactly one service must be marked default. The default service cannot be deactivated; deactivating via the UI produces a validation error.
- **Policy deposit amounts** — displayed in booking confirmation SMS/emails at their snapshot values. Changing policy does not update sent communications.

---

## Visual Hierarchy Reference

The UI follows the **Atelier Light** design system (see `docs/design-system/design-system.md`):

- **Navy primary** (`--al-primary: #001e40`) — headings, selected states, primary actions
- **Warm neutral surfaces** — cards are white (`--al-surface-container-lowest: #ffffff`) on a warm gray background (`--al-background: #f9f9f7`)
- **No solid divider lines** — sections are separated by background color shifts, not borders
- **State badges** — Hidden (muted outline), Inactive (error-toned container), Default (secondary-fixed warm tint)
