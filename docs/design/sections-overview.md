# App Sections Overview

Reference for designers optimising each section of the app.

---

## Shop home

**Route:** `/app`

Conditional gateway — not a static page. Routes based on shop state:

- **No shop yet** — renders `<OnboardingFlow />`: first-run experience for new owners to create their shop and configure basics.
- **Shop exists** — renders `<AtelierDashboard />`, passing `userName`, `shopName`, `shopSlug`, and a generated `bookingUrl` (`/book/{slug}`).

**Designer focus:** First-run onboarding clarity; booking link copy affordance on the returning-user view.

---

## Dashboard

**Route:** `/app/dashboard`

Business overview and proactive customer engagement. The primary day-to-day view. Switches between two modes via a tab/toggle in the header.

### Quick View (default)

- **4 summary cards**
  - "Total Upcoming (30d)" — count of upcoming appointments in the next 30 days
  - "High-Risk Customers" — count flagged within the selected attention window
  - "Deposits at Risk" — currency amount at risk
  - "This Month" — shows "Retained" (green) and "Refunded" (red) sub-values

- **Attention Required table** (left, 2/3 width)
  - Period filter buttons: **24h · 3 days · 7 days · 14 days**
  - Columns: Client (name + tier badge + SMS opt-in badge), Time, Score, Voids (90d), Confirmation status badge, Actions
  - Rows are card-style with hover state; actions rendered via `<ActionButtons />`

- **Tier Distribution chart** (right, 1/3 width)
  - Three horizontal bars: **Top Tier · Neutral · Risk**
  - Each shows count + percentage
  - Subtitle: "Client segments for upcoming 30 days"

- **All Upcoming Appointments table** (full width, below)
  - Tier filter dropdown: All tiers / Top only / Neutral only / Risk only
  - Sortable columns (click to toggle ↑↓): **Time · Score · Tier**
  - Columns: Client (avatar, name, email/phone, SMS badge), Time (start–end), Score, Tier, Voids (90d), Confirmation, Actions

### Daily Log View

- Feed of events from the past 7 days (up to 50 items), rendered via `<DailyLogFeed />`

**Designer focus:** Information density, inline action discoverability, mobile responsiveness of both table layouts; visual distinction between Quick View and Daily Log.

---

## Appointments

**Route:** `/app/appointments`

Full transaction record and slot recovery log.

- **3 outcome cards** (grid) — **Settled · 7d** / **Voided · 7d** / **Unresolved · 7d**; each shows a large count in the corresponding status colour

- **Conflict alert banner** — conditional; shown when pending calendar conflicts exist; links to `/app/conflicts`

- **Appointments table** ("Recent appointments")
  - Filter pills: **All · Settled · Voided · Unresolved · Risk only** (active pill shows count, e.g. "Settled · 4")
  - Sort dropdown: **Newest first · Oldest first · Amount: high to low · Amount: low to high**
  - Columns: Time (HH:MM / weekday · month day), Customer (initials avatar + name, coloured by tier), Service, Payment (amount + status badge: Paid / Pending / Unpaid / Failed), Outcome (coloured dot + label: Settled / Voided / Unresolved / Refunded / Disputed), Risk (tier pill: Top / Neutral / Risk), Resolved (date or "—" + "created [date]" sub-text), arrow → detail page
  - Row arrow navigates to `/app/appointments/[id]`

- **Slot recovery table** ("Slot recovery")
  - Section header shows **"X of Y recovered"** count
  - Columns: Slot time, Duration, Status (Open / Filled / Expired badges), Opened, Recovery ("View booking →" if filled / "Awaiting recovery" if open / "Slot passed without recovery" if expired), arrow → `/app/slot-openings/[id]`
  - Empty state: message explaining the waitlist-offer mechanism

**Designer focus:** Visual separation between the two tables, outcome badge colour hierarchy, empty states per section, slot recovery status badge distinction.

---

## Conflicts

**Route:** `/app/conflicts`

Ledger-style resolution workflow for overlaps between booked appointments and Google Calendar events.

**Page header**
- Eyebrow: "Calendar sync · Google Calendar"
- Title: "Calendar conflicts" (40 px, deep navy)
- Description: resolve-or-keep framing
- Action buttons: **Sync settings** (ghost) · **Sync now** (primary gradient) — visual only in V1

**Conflicts ledger** (`<ConflictsLedger />`)

*Sheet head*
- "RESOLUTION QUEUE" eyebrow + conflict count title (e.g. "3 conflicts to resolve")
- "Synced · 2 min ago" indicator (static in V1)

*Filter pills* — **All conflicts · High · Medium · Low** with live counts
- High = `full` or `high` severity
- Medium = `partial` severity
- Low = `all_day` severity

*Column headers* — Severity, Appointment, Calendar event, Overlap, Detected, Actions

*Rows* (per conflict)
- Left-edge **severity rail** coloured by level (crimson / amber / neutral grey)
- **Severity badge** — coloured pill: High / Medium / Low
- **Appointment** — customer name + time range · day
- **Calendar event** — amber diamond icon + event title + time range + "Google Calendar"
- **Overlap** — e.g. "30m" over "of 60m"
- **Detected** — formatted date/time
- **Actions** — **Keep** (ghost, check icon; calls `dismissConflictAction`) · **Cancel** (crimson, calls confirmation modal)

*Cancel confirmation modal*
- Header: "Destructive action" eyebrow + "Cancel this appointment?"
- Summary block: Appointment time/day · Customer · Conflicting event
- "What happens next" block: refund-via-original-payment policy note (5 business days)
- "Send cancellation email" checkbox (default checked) with customer first name in label
- Footer: **Keep appointment** (ghost) · **Cancel appointment** (crimson)

*Empty state* — green checkmark icon, "No conflicts found", sync cadence note, "Back to appointments" button

**Designer focus:** Unambiguous two-action pattern per row; severity rail + badge visual hierarchy; destructive confirm modal clarity.

---

## Customers

**Route:** `/app/customers`

Customer reliability registry. All data is computed from booking history.

- **Customers table**
  - Columns: Customer (name), Contact (email or phone), Tier (`<TierBadge />`), Score (tabular-nums or "—"), Reliability (`<ReliabilityStats />`), Last Updated (formatted date or "—"), Details ("View" link → `/app/customers/[id]`)
  - No client-side filter or sort controls on this view

- **"Understanding Tiers" card** (below table)
  - **Top tier** (green): score ≥ 80 and no voids in 90 days
  - **Neutral tier**: default for customers with moderate history
  - **Risk tier** (red): score < 40 or two or more voids in 90 days
  - Footer: "Scores are recomputed nightly using booking outcomes from the last 180 days"

**Designer focus:** Tier badge scannability, reliability stats component layout, empty state for shops with no customers.

---

## Availability

**Route:** `/app/settings/availability`

Booking grid configuration. Single form, single save action.

- **Timezone** — text input; IANA format (e.g. `UTC`, `America/New_York`, `Europe/London`)
- **Slot length** — dropdown: **15 / 30 / 45 / 60 / 90 / 120** minutes
- **Default buffer between appointments** — radio: **None · 5 min · 10 min**; note: "Padding after each appointment. Applied to services with no buffer set"
- **Business hours** — 7 rows (Sunday–Saturday); each has open time input, close time input, and a **Closed** checkbox that disables (not hides) the time inputs

Save action: **"Save availability settings"** (single submit for the whole form)

**Designer focus:** Day-by-day grid layout; disabled-state styling for closed days; time input usability on mobile.

---

## Services

**Route:** `/app/settings/services`

Service catalogue management. Two-pane layout: list (left) + editor form (right).

**Service list** (left pane)
- One row per service: name (bold, truncated) · description · duration · deposit label ("£X.XX" or "Policy default (£X.XX)") · **Hidden** and/or **Inactive** badges · copy-link button (shows "Copied!" or "Error" on click) · overflow menu (⋯)
- Selected row gets a distinct background

**Editor form** (right pane, activated by selecting a row or clicking "Add New")
- Fields: Name (required) · Description (optional textarea) · Duration (dropdown, minutes) · Buffer (radio: 0 / 5 / 10 min) · Deposit amount (optional, in cents) · Hidden checkbox · Active checkbox
- Buttons: **Save · Cancel** (and **Delete** for existing services)
- Initial / no-selection state: "Select a service to edit, or click Add New"

**Designer focus:** Two-pane selection pattern; status badge placement; copy-link affordance; disabled states on optional overrides.

---

## Payment Policy

**Route:** `/app/settings/payment-policy`

Deposit and prepayment rules. Two sections, each saves independently.

**Base policy**
- **Currency** — 3-letter code (e.g. USD, GBP, EUR)
- **Payment mode** — radio: **Deposit required · Full prepayment required · No payment required**
- **Amount** — conditional number input (shown unless mode = None); label toggles between "Deposit amount" and "Full payment amount"
- Save: **"Save policy"**

**Tier-based overrides**
- **Risk tier deposit** — optional number input (cents); helper: "Leave blank to use the base policy amount"
- **Top tier** — "Waive deposit for top tier customers" checkbox (disables the amount input when checked) + optional deposit override amount
- **Slot recovery offer exclusions** — checkboxes: "Exclude risk tier from offers" · "Exclude high no-show customers from offers"

**"How tiers work" card** (below form)
- Top / Neutral / Risk definitions matching the Customers page card
- Link to the Customers page for live tier distribution

**Designer focus:** Conditional field visibility; disabled-but-visible input states; help text explaining tier implications without cluttering the form.

---

## Calendar

**Route:** `/app/settings/calendar`

Google Calendar OAuth connection management. Enables conflict detection.

**Connected state**
- Green "Connected" status pill
- Info tiles: **Email Address** (shows `calendarName`) · **Sync Frequency** ("Real-time bidirectional" — static label with "Coming Soon" badge, not editable in V1)
- **Disconnect Account** button (red text, top-right of card; triggers confirmation)

**Not connected state**
- Grey "Not connected" status pill
- Description text explaining the integration
- **Connect Google Calendar** button; disabled when `isGoogleOAuthConfigured` is false or no shop exists

**System Configuration Alert** — shown when OAuth env vars are missing; red-tinted card with admin guidance

**OAuth callback feedback** — green success or red error alert injected via query params after OAuth redirect

**Right sidebar** (always visible)
- **Booking Logic** panel (dark navy background): Lead Time / Buffer Periods / Booking Horizon tiles; pencil icons link to Stitch (external, not functional in V1)
- **Atelier Tip** (orange background): brief studio advice copy

**Available Providers section**
- Outlook Calendar card — "Connect Outlook" button with "Coming Soon" badge

**Designer focus:** Clear connected vs. not-connected state distinction; graceful degradation when OAuth is misconfigured; prominence of the Disconnect destructive action.

---

## Reminders

**Route:** `/app/settings/reminders`

Controls when automated reminders are sent to customers. Changes apply to new bookings only.

- **Interval options** (toggle list, all 7 always visible)

  | Value | Label | Persona hint |
  |-------|-------|-------------|
  | 10m | 10 minutes before | Phone calls |
  | 1h | 1 hour before | General |
  | 2h | 2 hours before | Hairstylists |
  | 4h | 4 hours before | General |
  | 24h | 24 hours before | Most common |
  | 48h | 48 hours before | Therapists |
  | 1w | 1 week before | Therapists |

- **Capacity indicator** — row of 3 dots (filled = selected) + "X/3" counter; max is hardcoded at 3
- **At-capacity alert** — amber banner: "Max 3 reminders reached — deselect one to choose a different interval"
- **Save** button: disabled when at max capacity, zero intervals selected, or no changes pending; shows "Saving..." during submission; shows "Saved" confirmation on success; shows "Select at least one interval" warning if zero selected

**Designer focus:** Max-3 constraint UX clarity; capacity indicator legibility; disabled-but-readable unselected options at capacity.
