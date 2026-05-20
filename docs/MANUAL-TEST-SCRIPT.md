# Manual Testing Demo Script

Pre-launch test cases covering every feasible user journey.
Each section is a self-contained scenario. Cases are MECE within each journey.

**Setup:** `pnpm dev` running, `.env` configured, database migrated.

---

## A. Registration

### A1. Happy path
1. Go to `/register`
2. Fill: Name="Demo Owner", Email=`demo-{timestamp}@example.com`, Password="Password123!", Confirm="Password123!"
3. Click "Create account"
4. **Expect:** Redirect to `/app`, onboarding wizard visible

### A2. Password mismatch
1. Go to `/register`
2. Fill all fields, but Confirm Password="Different123!"
3. Click "Create account"
4. **Expect:** "Passwords do not match" error, no redirect

### A3. Short password
1. Go to `/register`
2. Password="Ab1!", Confirm="Ab1!"
3. Click "Create account"
4. **Expect:** "Password must be at least 8 characters" error

### A4. Duplicate email
1. Register with email X (from A1)
2. Go to `/register` again with the same email X
3. **Expect:** Server error ("account already exists" or similar)

### A5. Navigation link
1. Go to `/register`
2. Click "Sign in" link at bottom
3. **Expect:** Navigates to `/login`

---

## B. Login & Logout

*Prereq: Account created in A1.*

### B1. Valid login
1. Go to `/login`
2. Enter email and password from A1
3. Click "Sign in"
4. **Expect:** Redirect to `/app`

### B2. Wrong password
1. Go to `/login`
2. Enter correct email, wrong password
3. Click "Sign in"
4. **Expect:** Error alert visible ("Failed to sign in" or similar)

### B3. Password visibility toggle
1. Go to `/login`
2. Type in password field
3. Click eye icon
4. **Expect:** Password text becomes visible, icon toggles to EyeOff
5. Click again
6. **Expect:** Password hidden again

### B4. Already authenticated redirect
1. Log in successfully (B1)
2. Navigate to `/login` manually
3. **Expect:** Redirected to `/app` (server-side)

### B5. Navigation links
1. Go to `/login`
2. Verify "Create an account" links to `/register`
3. Verify "Forgot password?" links to `/forgot-password`

### B6. Reset success banner
1. Navigate to `/login?reset=success`
2. **Expect:** Green banner: "Password reset successfully..."

---

## C. Password Reset

### C1. Request reset email
1. Go to `/forgot-password`
2. Enter any email address
3. Click submit
4. **Expect:** Success message about checking email/terminal

### C2. Reset with no token
1. Navigate to `/reset-password` (no query params)
2. **Expect:** Error: "No reset token provided" with link to request new one

### C3. Reset with invalid token
1. Navigate to `/reset-password?token=invalid-token-abc`
2. **Expect:** Error: "invalid or has expired" with link to request new one

---

## D. Onboarding (Shop Setup)

*Prereq: Logged in, no shop yet.*

### D1. Full wizard completion
1. On `/app`, onboarding wizard appears
2. **Step 1:** Select "Hair Salon" business type, click "Next"
3. **Step 2:** Shop Name="Demo Salon", Slug="demo-salon-{timestamp}", click "Create shop"
4. **Step 3:** Click "Skip for now"
5. **Expect:** Dashboard loads

### D2. Business type required
1. On Step 1, click "Next" without selecting a type
2. **Expect:** Button is disabled or nothing happens

### D3. Slug validation
1. On Step 2, enter slug="ab" (too short)
2. Click "Create shop"
3. **Expect:** Error about minimum 3 characters

### D4. Slug normalization
1. On Step 2, enter slug="My Cool Shop!!"
2. Click "Create shop"
3. **Expect:** Slug normalizes to "my-cool-shop", shop created successfully

### D5. Add first service
1. On Step 3, enter Name="Haircut", Duration=60 min, Buffer=None
2. Click "Add service"
3. **Expect:** Service created, proceeds to dashboard

### D6. Back navigation
1. On Step 2, click "Back"
2. **Expect:** Returns to Step 1 with previous selection preserved

---

## E. Settings: Services

*Prereq: Logged in with shop.*

### E1. Create a service
1. Go to `/app/settings/services`
2. Click "Create service" (or equivalent)
3. Fill: Name="Premium Cut", Duration=90 min, Buffer=10 min, Deposit=$30
4. Save
5. **Expect:** Service appears in list

### E2. Edit a service
1. Click on existing service
2. Change name to "Signature Cut"
3. Save
4. **Expect:** Updated name displays in list

### E3. Deactivate default service (blocked)
1. Try to set the default service's Active toggle to off
2. **Expect:** Error: "Cannot deactivate the default service"

### E4. Duration limit
1. Create service with duration=300 min
2. **Expect:** Error: "Duration must be 240 minutes or less"

---

## F. Settings: Availability

### F1. Set working hours
1. Go to `/app/settings/availability`
2. Set Monday: Open 10:00, Close 18:00
3. Set Saturday: Closed
4. Click "Save availability"
5. **Expect:** Settings saved, toast or confirmation

### F2. Change timezone
1. Select a different timezone (e.g., "America/New_York")
2. Save
3. **Expect:** Dashboard and booking pages reflect new timezone

### F3. Change slot duration
1. Set slot duration to 30 min
2. Save
3. **Expect:** Booking page shows 30-min slots

---

## G. Settings: Payment Policy

### G1. Set deposit mode
1. Go to `/app/settings/payment-policy`
2. Select "Deposit collection"
3. Set amount to $25
4. Save
5. **Expect:** Policy saved, booking flow will collect $25 deposit

### G2. Set no payment mode
1. Select "No payment collection"
2. Save
3. **Expect:** Booking flow skips payment step

### G3. Configure tier surcharges
1. In tier policy section, set Risk tier surcharge to 150%
2. Save
3. **Expect:** Risk-tier customers pay higher deposit

---

## H. Settings: Reminders

### H1. Set reminder timings
1. Go to `/app/settings/reminders`
2. Check: 24h and 1h before
3. Save timings
4. **Expect:** Confirmation, settings persist on reload

### H2. Edit email template
1. Modify subject line
2. Add `{{customerName}}` variable to body
3. Save
4. **Expect:** Template saved

### H3. Reset template to default
1. Click reset button
2. **Expect:** Template reverts to default content

---

## I. Settings: Calendar

### I1. View calendar settings (no connection)
1. Go to `/app/settings/calendar`
2. **Expect:** "Connect to Google Calendar" button visible, no connection shown

### I2. Connect Google Calendar (if OAuth configured)
1. Click "Connect to Google Calendar"
2. Complete OAuth flow
3. **Expect:** Returns to settings showing connected calendar name

### I3. Disconnect calendar
1. With connected calendar, click "Disconnect"
2. **Expect:** Connection removed, "Connect" button returns

---

## J. Settings: Billing

### J1. View billing dashboard
1. Go to `/app/settings/billing`
2. **Expect:** 4 summary cards (Collected, Pending, Refunds, Failed)
3. **Expect:** Payments ledger table (may be empty for new shop)

### J2. Issue manual refund (requires completed payment)
1. Find a succeeded payment in the ledger
2. Click refund action
3. **Expect:** Refund processed, status updates

---

## K. Customer Booking Flow

*Prereq: Shop "demo-salon" exists with at least one active service, deposit policy set.*

### K1. Full booking with payment
1. Go to `/book/demo-salon`
2. If multiple services: select one
3. Pick a future weekday date
4. Select an available time slot
5. Fill: Name="Jane Smith", Email="jane@test.com", Phone="+12025551234"
6. Check email opt-in
7. On payment step: enter test card `4242424242424242`, exp 12/30, CVC 123
8. Click "Complete booking"
9. **Expect:** Confirmation screen with appointment details, manage link, "Book again" button

### K2. No available slots
1. Go to `/book/demo-salon`
2. Select a date that is Saturday (if Saturday is closed)
3. **Expect:** "No slots available" message

### K3. Booking without payment (no-payment mode)
1. Set payment policy to "No payment collection" (G2)
2. Go to `/book/demo-salon`
3. Complete booking without payment step
4. **Expect:** Confirmation screen, no payment info shown

### K4. Service pre-selection
1. Navigate to `/book/demo-salon?service={serviceId}`
2. **Expect:** Service is pre-selected, goes directly to date/time picker

### K5. Payment failure
1. Start a booking
2. On payment step, use card `4000000000000002` (decline card)
3. **Expect:** "Payment failed" error, ability to retry

### K6. Browser refresh during payment
1. Start a booking, reach payment step
2. Refresh the browser
3. **Expect:** Booking resumes, payment form reloads with same intent

---

## L. Manage Booking (Customer Self-Service)

*Prereq: Booking from K1 exists. Copy the manage link from confirmation.*

### L1. View appointment details
1. Open manage link (`/manage/{token}`)
2. **Expect:** Appointment details card (date, time, service, status)
3. **Expect:** Customer details card (name, email, phone)
4. **Expect:** Payment card (amount, status)

### L2. Cancel before cutoff (refund eligible)
1. Open manage link for a future appointment (before cancellation cutoff)
2. Click cancel
3. **Expect:** Confirmation dialog showing "you'll receive a full refund of $X"
4. Confirm cancellation
5. **Expect:** Success message, status changes to "Cancelled"

### L3. Cancel after cutoff (deposit retained)
1. Open manage link for an appointment past the cancellation cutoff
2. Click cancel
3. **Expect:** Warning: "deposit will be retained"
4. Confirm
5. **Expect:** Cancelled, no refund

### L4. Toggle email preferences
1. Open manage link
2. Uncheck "Receive email reminders"
3. **Expect:** Confirmation: "Email reminders have been turned off"
4. Check it again
5. **Expect:** Confirmation: "You'll receive email reminders..."

### L5. Invalid/expired token
1. Navigate to `/manage/invalid-token-xyz`
2. **Expect:** Error page or "link invalid/expired" message

### L6. Book again link
1. On manage page, click "Book again"
2. **Expect:** Navigates to `/book/{slug}`

---

## M. Dashboard

*Prereq: Shop with at least 1 booking.*

### M1. Quick View (default)
1. Go to `/app/dashboard`
2. **Expect:** Summary cards (Total Upcoming, High-Risk, Deposits At Risk, Monthly Stats)
3. **Expect:** Attention Required table (may be empty)
4. **Expect:** Tier Distribution chart
5. **Expect:** All Appointments table

### M2. Daily Log view
1. Click "Daily Log" tab
2. **Expect:** Feed of recent events (confirmations, payments, cancellations)
3. **Expect:** Events have timestamps and descriptions

### M3. Period filter
1. Switch period to "24h"
2. **Expect:** Data updates to last 24 hours
3. Switch to "2 weeks"
4. **Expect:** Data expands to 2-week window

### M4. Dashboard search
1. Type a customer name in the search bar
2. **Expect:** Results filter or search results appear
3. Clear search
4. **Expect:** Returns to full view

### M5. Click appointment row
1. Click on any appointment in the table
2. **Expect:** Navigates to `/app/appointments/{id}`

---

## N. Appointments Ledger

### N1. View appointments list
1. Go to `/app/appointments`
2. **Expect:** Outcome summary cards (Settled, Voided, Unresolved counts)
3. **Expect:** Recent appointments table with customer, time, amount, status

### N2. Empty state (new shop)
1. View appointments page with no bookings yet
2. **Expect:** "No appointments yet" message with booking link

### N3. Slot recovery section
1. Cancel a paid future appointment (L2)
2. Return to `/app/appointments`
3. **Expect:** Slot Recovery section shows the cancelled slot as "Open"

### N4. Conflict alert banner
1. If calendar conflicts exist
2. **Expect:** Yellow banner: "X calendar conflicts detected" with link

---

## O. Appointment Detail

*Prereq: At least one booking exists.*

### O1. View full detail
1. Go to `/app/appointments/{id}`
2. **Expect:** Details card (date, time, status, service)
3. **Expect:** Payment card (amount, status, outcome)
4. **Expect:** Customer card (name, contact)
5. **Expect:** Customer History card (last 5 appointments)

### O2. View message log
1. Scroll to Messages section
2. **Expect:** Table showing sent confirmations/reminders with status, timestamp, body

### O3. Send manual reminder (SMS)
1. Click "Send reminder" action (if available)
2. **Expect:** Toast: "Reminder sent successfully" or "already sent"

### O4. Send manual reminder (Email)
1. Click "Send email reminder" action (if available)
2. **Expect:** Toast: "Email sent" or appropriate error (no email, opted out)

---

## P. Customers

### P1. View customers list
1. Go to `/app/customers`
2. **Expect:** List of customers with name, email, phone, tier badge, score
3. **Expect:** Stats per customer (On Time, Late, No-show counts)

### P2. View customer detail
1. Click on a customer
2. **Expect:** Customer name, contact info
3. **Expect:** Payment history table (appointment dates, amounts, statuses)

### P3. Empty state
1. View customers with no bookings
2. **Expect:** Empty state message

---

## Q. Conflicts

*Prereq: Google Calendar connected with an overlapping event.*

### Q1. View conflicts ledger
1. Go to `/app/conflicts`
2. **Expect:** Table of conflicts (appointment time, calendar event, severity badge, overlap duration)

### Q2. Dismiss a conflict
1. Click dismiss on a conflict
2. **Expect:** Conflict removed from list, paths revalidated

### Q3. Cancel appointment from conflict
1. Click cancel on a conflicting appointment
2. **Expect:** Confirmation dialog with refund info
3. Confirm
4. **Expect:** Appointment cancelled, conflict resolved, slot opening created

### Q4. Sync now
1. Click "Sync now" button
2. **Expect:** Calendar re-syncs, new conflicts detected if any

### Q5. Empty state
1. View conflicts with no overlaps
2. **Expect:** "No conflicts detected"

---

## R. Slot Recovery Detail

*Prereq: A slot opening exists from a cancelled paid appointment.*

### R1. View slot opening detail
1. From Appointments page, click a slot recovery detail link
2. **Expect:** Slot details (time window, duration, status, source appointment link)

### R2. View offers table
1. If offers have been sent
2. **Expect:** Table with customer name, phone, status, sent/expires times

### R3. Empty offers
1. If no offers sent yet
2. **Expect:** "No offers sent yet"

---

## S. SMS Reply Handling

*These require Twilio test mode or actual SMS integration.*

### S1. Customer confirms via SMS
1. Send "YES" from customer's phone number
2. **Expect:** Appointment confirmed, confirmation status updated

### S2. Customer accepts slot offer via SMS
1. With an open slot offer, send "YES" from offered customer's phone
2. **Expect:** Offer accepted, new appointment created, slot status="filled"

### S3. Customer opts out via SMS
1. Send "STOP" from customer's phone
2. **Expect:** Customer opted out of SMS, future reminders skip this customer

### S4. Customer re-opts in via SMS
1. Send "START" from customer's phone
2. **Expect:** Customer re-opted in, reminders resume

---

## T. Cron Jobs (API)

*Test via curl with `x-cron-secret` header.*

### T1. Resolve outcomes
```bash
curl -X POST http://localhost:3000/api/jobs/resolve-outcomes \
  -H "x-cron-secret: $CRON_SECRET"
```
**Expect:** 200 with `{ resolved, skipped, errors }`. Past appointments get outcomes (settled/voided).

### T2. Send reminders
```bash
curl -X POST http://localhost:3000/api/jobs/send-reminders \
  -H "x-cron-secret: $CRON_SECRET"
```
**Expect:** 200 with `{ sent, skipped, errors }`. SMS reminders sent for upcoming appointments.

### T3. Send email reminders
```bash
curl -X POST http://localhost:3000/api/jobs/send-email-reminders \
  -H "x-cron-secret: $CRON_SECRET"
```
**Expect:** 200. Email reminders sent.

### T4. Recompute scores
```bash
curl -X POST http://localhost:3000/api/jobs/recompute-scores \
  -H "x-cron-secret: $CRON_SECRET"
```
**Expect:** 200 with processed count. Customer scores and tiers recalculated.

### T5. Recompute no-show stats
```bash
curl -X POST http://localhost:3000/api/jobs/recompute-no-show-stats \
  -H "x-cron-secret: $CRON_SECRET"
```
**Expect:** 200 with processed count. No-show statistics updated.

### T6. Expire offers
```bash
curl -X POST http://localhost:3000/api/jobs/expire-offers \
  -H "x-cron-secret: $CRON_SECRET"
```
**Expect:** 200 with `{ expired, triggered }`. Expired slot offers marked, new offer loop triggered.

### T7. Expire confirmations
```bash
curl -X POST http://localhost:3000/api/jobs/expire-confirmations \
  -H "x-cron-secret: $CRON_SECRET"
```
**Expect:** 200. Unconfirmed appointments past deadline are cancelled.

### T8. Scan calendar conflicts
```bash
curl -X POST http://localhost:3000/api/jobs/scan-calendar-conflicts \
  -H "x-cron-secret: $CRON_SECRET"
```
**Expect:** 200. Conflicts between appointments and Google Calendar events detected.

### T9. Invalid cron secret
```bash
curl -X POST http://localhost:3000/api/jobs/resolve-outcomes \
  -H "x-cron-secret: wrong-secret"
```
**Expect:** 401 Unauthorized.

### T10. Missing cron secret
```bash
curl -X POST http://localhost:3000/api/jobs/resolve-outcomes
```
**Expect:** 401 or 500 (secret not configured).

---

## U. Profile

### U1. View profile
1. Go to `/profile`
2. **Expect:** Avatar, name, email, "Verified" badge, member since date

### U2. Edit profile
1. Click "Edit Profile"
2. Change name
3. Submit
4. **Expect:** Name updates

### U3. Security settings dialog
1. Click "Security Settings"
2. **Expect:** Dialog with password status, 2FA (coming soon), active sessions

---

## V. AI Chat

### V1. Send a message
1. Go to `/chat`
2. Type "What appointments do I have tomorrow?"
3. Click "Send"
4. **Expect:** Message appears in chat, AI responds with thinking indicator then answer

### V2. Clear chat
1. With messages in chat, click "Clear chat"
2. **Expect:** Chat history cleared

### V3. Empty state
1. Go to `/chat` with no messages
2. **Expect:** "Start a conversation with AI" placeholder

---

## W. Landing Page

### W1. Page loads
1. Go to `/` (logged out)
2. **Expect:** Hero section, How It Works, Feature sections, Pricing, FAQ, CTA

### W2. CTA navigation
1. Click "Get started" button
2. **Expect:** Navigates to `/register`

---

## X. Cross-Cutting Concerns

### X1. Protected routes (unauthenticated)
1. Log out
2. Navigate to `/app`, `/app/dashboard`, `/app/settings/services`, `/profile`, `/chat`
3. **Expect:** Each redirects to `/login`

### X2. 404 page
1. Navigate to `/nonexistent-page`
2. **Expect:** Custom 404 page

### X3. Mobile responsiveness
1. Resize browser to 375px width
2. Navigate through: landing, login, booking, manage, dashboard
3. **Expect:** All pages render without horizontal scroll, forms are usable

---

## Journey Map (Suggested Run Order)

For a complete end-to-end demo, run in this order:

1. **W1** - Landing page loads
2. **A1** - Register a new owner account
3. **D1** - Complete onboarding wizard
4. **E1** - Create a service
5. **F1** - Set working hours
6. **G1** - Configure deposit policy
7. **H1** - Set reminder timings
8. **K1** - Book an appointment as a customer (open incognito)
9. **M1** - View dashboard (back as owner)
10. **N1** - View appointments ledger
11. **O1** - View appointment detail
12. **P1** - View customers list
13. **L1** - View manage page (as customer)
14. **L2** - Cancel booking (as customer)
15. **N3** - Verify slot recovery appears
16. **T1** - Run resolve-outcomes cron
17. **T4** - Run recompute-scores cron
18. **M2** - Check Daily Log for all events
