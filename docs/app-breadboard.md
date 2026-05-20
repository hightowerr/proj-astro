# App Breadboard — Booking & Appointment Management System
> Generated: 2026-04-28

---

## Overview

| Stat | Count |
|------|-------|
| Total page files | 28 |
| Total API routes | 34 |
| Auth-gated pages | 18 |
| Public pages | 8 |
| Navigation components | 2 |

---

## Complete Route Tree

### Public Pages (No Auth Required)

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Marketing landing page — hero, features, pricing, FAQ |
| `/login` | `src/app/(auth)/login/page.tsx` | Email/password sign-in; redirects to `/app` if already authed |
| `/register` | `src/app/(auth)/register/page.tsx` | New account creation; redirects to `/app` if already authed |
| `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | Password reset request form |
| `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | Password reset confirmation (token-based) |
| `/book/[slug]` | `src/app/book/[slug]/page.tsx` | Public booking form by shop slug; `?service=[eventTypeId]` to pre-select |
| `/manage/[token]` | `src/app/manage/[token]/page.tsx` | Customer self-service: reschedule/cancel via secure token (email link only) |
| ~~`/design-system`~~ | ~~`src/app/design-system/page.tsx`~~ | ~~Dev/design component showcase~~ — **deleted; use `docs/design-system/` instead** |

---

### Protected App Pages (Auth Required)

**Layout guard**: `src/app/app/layout.tsx` — calls `requireAuth()`, redirects to `/` if no session.

#### Hub & Dashboard

| Route | File | Purpose | Outbound Links |
|-------|------|---------|----------------|
| `/app` | `src/app/app/page.tsx` | Home hub / onboarding flow (if no shop exists yet) | — |
| `/app/dashboard` | `src/app/app/dashboard/page.tsx` | KPIs, high-risk appointments, daily log, tier distribution | `/app/appointments/[id]`, `?view=quick`, `?view=log`, `?period=` |

#### Operations

| Route | File | Purpose | Outbound Links |
|-------|------|---------|----------------|
| `/app/appointments` | `src/app/app/appointments/page.tsx` | Appointments ledger with outcome summary, conflict banner | `/app/appointments/[id]`, `/app/slot-openings/[id]` |
| `/app/appointments/[id]` | `src/app/app/appointments/[id]/page.tsx` | Appointment detail: payment, messages, customer history | `/app/appointments` (back) |
| `/app/conflicts` | `src/app/app/conflicts/page.tsx` | Google Calendar conflict detection and resolution | `/app/appointments` (back) |
| `/app/customers` | `src/app/app/customers/page.tsx` | Customer reliability scores and tier assignments | `/app/customers/[id]` |
| `/app/customers/[id]` | `src/app/app/customers/[id]/page.tsx` | Customer payment history and booking timeline | — |
| `/app/slot-openings/[id]` | `src/app/app/slot-openings/[id]/page.tsx` | Slot recovery detail: offers sent, status, recovered bookings | `/app/appointments/[id]` |

#### Settings

| Route | File | Purpose | Outbound Links |
|-------|------|---------|----------------|
| `/app/settings/services` | `src/app/app/settings/services/page.tsx` | Manage service types (event types), reorder, create, edit | — |
| `/app/settings/availability` | `src/app/app/settings/availability/page.tsx` | Shop hours by day of week | — |
| `/app/settings/calendar` | `src/app/app/settings/calendar/page.tsx` | Google Calendar OAuth setup and management | — |
| `/app/settings/payment-policy` | `src/app/app/settings/payment-policy/page.tsx` | Deposit amounts, tier-based pricing (top/neutral/risk) | — |
| `/app/settings/reminders` | `src/app/app/settings/reminders/page.tsx` | SMS/email reminder timing configuration | — |

#### Misc / Diagnostics

| Route | File | Purpose | Notes |
|-------|------|---------|-------|
| `/chat` | `src/app/chat/page.tsx` | AI chat interface (Vercel AI SDK, localStorage) | Auth: client-side only |
| `/dev` | `src/app/dev/page.tsx` | Dev hub — AI readiness check, links to `/chat` | Client-side auth; renamed from `/dashboard` to resolve naming collision |
| `/profile` | `src/app/profile/page.tsx` | User account settings, activity | Client-side auth; redirects to `/` if not logged in |

---

## Navigation Components

### Site Header — `src/components/site-header.tsx`
Used on: public/landing pages (excluded from `/app/*` and auth pages)

| Label | Destination |
|-------|-------------|
| Logo | `/` |
| How It Works | `#how-it-works` |
| Features | `#features` |
| Pricing | `#pricing` |
| FAQ | `#faq` |
| Open App *(authed)* | `/app` |
| Sign In *(anon)* | `/login` |
| Start Free Trial *(anon)* | `/register` |

### App Nav — `src/components/app/app-nav.tsx`
Used on: all `/app/*` routes. Sidebar on desktop, bottom nav on mobile.

**Main links:**

| Label | Destination |
|-------|-------------|
| Home Hub | `/app` |
| Dashboard | `/app/dashboard` |
| Appointments | `/app/appointments` |
| Shop Catalog | `/app/settings/services` |
| Conflicts | `/app/conflicts` |
| Customers | `/app/customers` |
| Availability | `/app/settings/availability` |

**Settings links:**

| Label | Destination |
|-------|-------------|
| Payment Policy | `/app/settings/payment-policy` |
| Calendar | `/app/settings/calendar` |
| Reminders | `/app/settings/reminders` |

---

## Auth Flow Map

```
Unauthenticated user
  → /             (landing)
  → /login        (sign in → redirects to /app on success)
  → /register     (new account → redirects to /app on success)
  → /forgot-password
  → /reset-password?token=...
  → /book/[slug]  (book without account)
  → /manage/[token] (manage booking via email link)

Authenticated user
  → /app          (hub; shows OnboardingFlow if no shop)
  → /app/dashboard
  → /app/appointments, /app/appointments/[id]
  → /app/customers, /app/customers/[id]
  → /app/conflicts
  → /app/slot-openings/[id]
  → /app/settings/* (5 settings pages)
  → /chat
  → /profile

Auth redirects
  /login | /register | /forgot-password | /reset-password
    → if session already exists → /app

Session expiry / orphaned session
  → /api/auth/sign-out-orphan → clears session → /
```

---

## Dynamic Route Segments

| Route | Segment | Source |
|-------|---------|--------|
| `/book/[slug]` | shop slug | URL — shop's public identifier |
| `/book/[slug]?service=[id]` | eventTypeId | Query param — pre-select service |
| `/manage/[token]` | token | Secure token sent in booking email |
| `/app/appointments/[id]` | appointment ID | Row ID from appointments table |
| `/app/customers/[id]` | customer ID | Row ID from customers table |
| `/app/slot-openings/[id]` | slot opening ID | Row ID from slot_openings table |

---

## Dead Ends & Gaps

| Issue | Detail |
|-------|--------|
| ~~`/design-system` orphan~~ | **Resolved** — page deleted; canonical reference is `docs/design-system/` |
| ~~`/dashboard` vs `/app/dashboard`~~ | **Resolved** — `/dashboard` renamed to `/dev`; satellite references updated across session, proxy, robots, not-found; sitemap entry removed |
| ~~`/app/settings/services/[id]`~~ | **Resolved — intentional master-detail design; no `[id]` route needed.** The services page is a two-pane inline editor (list + sticky editor card) with full dirty-state guard, discard confirmation, and mobile responsive switching. A dedicated route would destroy list context and orphan the dirty-state machine. |
| ~~`/chat` is not in app nav~~ | **Intentional deferral** — accessible via `/dev`. Excluded from AppNav until promoted from experimental to production: requires server-side auth (currently client-side only), persistent history (currently localStorage), and a defined user job. Next milestone: contextual "Ask AI" entry point on Dashboard or Customer detail. |
| ~~`/profile` is not in app nav~~ | **Resolved** — Desktop sidebar footer user card and mobile header avatar are now `Link` components pointing to `/profile`. Tech debt: `/profile` uses client-side auth; all other `/app/*` pages use server-side `requireAuth()` — migrate when page scope grows. |
| ~~Email/SMS template management~~ | **Resolved** — `/app/settings/reminders` has three sections: timing config, `EmailTemplateForm` (subject + HTML body, variable hints, live iframe preview), and `SmsTemplateForm` (body, character/segment counter, live preview). Variables: `{{customerName}}`, `{{shopName}}`, `{{appointmentDate}}`, `{{appointmentTime}}`, `{{bookingUrl}}` (email) and `{{shop_name}}`, `{{time}}`, `{{manage_link}}` (SMS). |
| ~~Admin/billing management~~ | **Resolved** — `/app/settings/billing` implemented: 4 stat cards (collected/pending/refunds/failed this month), full payment ledger with status filter chips, sortable columns, per-row kebab menu (view appointment, view in Stripe, issue refund, copy ID), `useOptimistic` refund with server action, disputed-payment guard at both server and UI layers. Nav link added to sidebar. |
| ~~`/book/[slug]` not linked from app~~ | **Resolved** — `/app` hub (`AtelierDashboard`) renders a "Public Booking Link" section: full URL display, "Open Booking Page" (new tab), and "Copy Booking Link" (clipboard + toast). `bookingUrl` is computed server-side in `src/app/app/page.tsx` and passed as a prop. |

---

## API Routes Summary

### Authentication
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...all]` | ANY | Better Auth catch-all (OAuth, password reset) |
| `/api/auth/sign-out-orphan` | GET | Clear stale/orphaned session → redirect to `/` |

### Appointments & Bookings
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/appointments` | POST | Create appointment from booking form |
| `/api/appointments/[id]/confirm` | POST | Customer confirms appointment |
| `/api/appointments/[id]/remind` | POST | Send reminder (SMS/email) |
| `/api/appointments/[id]/send-email-reminder` | POST | Send email reminder explicitly |
| `/api/manage/[token]/cancel` | POST | Cancel via secure token |
| `/api/manage/[token]/update-preferences` | POST | Update customer preferences via token |
| `/api/availability` | GET | Get available booking slots |
| `/api/bookings/create` | POST | Create booking (alternative endpoint) |
| `/api/bookings/[bookingId]` | PATCH/DELETE | Update or cancel booking |

### Background Jobs (Cron-triggered)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/jobs/offer-loop` | POST | Offer cancelled slots to waitlisted customers |
| `/api/jobs/expire-offers` | POST | Expire unaccepted slot offers |
| `/api/jobs/expire-confirmations` | POST | Expire unconfirmed appointments |
| `/api/jobs/expire-pending-recoveries` | POST | Expire pending recovery operations |
| `/api/jobs/resolve-outcomes` | POST | Finalise appointment outcomes (settled/voided) |
| `/api/jobs/send-reminders` | POST | Send SMS reminders |
| `/api/jobs/send-email-reminders` | POST | Send email reminders |
| `/api/jobs/send-confirmations` | POST | Send confirmation messages |
| `/api/jobs/recompute-scores` | POST | Recalculate customer reliability scores |
| `/api/jobs/recompute-no-show-stats` | POST | Update no-show statistics |
| `/api/jobs/scan-calendar-conflicts` | POST | Detect Google Calendar conflicts |

### Payments
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/stripe/webhook` | POST | Stripe payment event handler |
| `/api/app/payments/reconcile` | POST | Manual payment reconciliation |

### Calendar
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/settings/calendar/connect` | GET | Initiate Google OAuth flow |
| `/api/settings/calendar/callback` | GET | Google OAuth callback |
| `/api/settings/calendar/disconnect` | POST | Disconnect Google Calendar |

### Messaging
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/messages` | POST | Send message (SMS/email) |
| `/api/twilio/inbound` | POST | Receive inbound SMS (Twilio webhook) |

### Utilities
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/chat` | POST | AI chat endpoint (Vercel AI SDK) |
| `/api/search` | GET | Global search |
| `/api/test-email` | POST | Send test email |
| `/api/test-template` | POST | Test email template rendering |
| `/api/diagnostics` | GET | System diagnostics |
| `/api/diagnostic` | GET | Alternative diagnostics endpoint (possible duplicate) |
| `/api/debug-env` | GET | Debug environment config (dev only) |

---

## Suggested Next Steps

Based on the gaps found:

1. ~~**Profile page is unreachable**~~ — **Resolved:** sidebar footer user card and mobile header avatar now link to `/profile`
2. ~~**Chat page is unreachable**~~ — **Intentional deferral:** accessible via `/dev`; promote to `/app/chat` with server-side auth + contextual entry point once user job is validated
3. ~~**No booking link in app**~~ — **Resolved:** `AtelierDashboard` on `/app` now surfaces the public booking URL with open + copy actions
4. ~~**`/dashboard` naming confusion**~~ — **Resolved:** renamed to `/dev`
5. ~~**`/design-system` orphan**~~ — **Resolved:** page deleted; use `docs/design-system/` as the canonical design reference
6. **Duplicate API endpoints** — `/api/diagnostics` and `/api/diagnostic` may be duplicates; audit and consolidate
