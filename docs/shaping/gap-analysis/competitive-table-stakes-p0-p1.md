# Competitive Table Stakes: P0 & P1 Features

**Date:** 2026-03-16
**Purpose:** Consolidated list of must-have features across Calendly, Timely, and Cal.com competitive analyses

---

## Executive Summary

This document consolidates findings from three competitive gap analyses (Calendly, Timely, Cal.com) to identify:
- **P0 features**: Critical gaps that prevent us from being taken seriously as booking software
- **P1 features**: High-priority features needed for competitive parity
- **Opportunities**: Areas where we can leverage our unique differentiation

**Strategic Position:**
- **Calendly**: Horizontal scheduling automation (team meetings, sales calls)
- **Timely**: Vertical salon/spa software (industry-specific workflows)
- **Cal.com**: Open-source scheduling infrastructure (developer-first, API-based)
- **Us**: Revenue protection through automated financial outcomes and customer reliability scoring

---

## P0 Features (Critical — Table Stakes)

These features appear as "must-have" across all three competitors. Without them, we appear incomplete as booking software.

### 1. Automated Email Reminders

**What it is:**
- Automatic email notifications sent before appointments
- Reduces no-shows through proactive customer engagement
- Expected baseline feature in all scheduling software

**Current state:** ❌ Missing
**Competitor coverage:**
- Calendly: ✅ (customizable timing, templates)
- Timely: ✅ (automated, customizable timing)
- Cal.com: ✅ (workflow-based email triggers)

**Priority justification:**
Users expect both email AND SMS reminders. We have SMS (manual), but email is table stakes.

**Implementation scope:**
- Trigger: X hours/days before appointment
- Template: Customizable message with booking details
- Delivery: Integration with email service (SendGrid, Postmark, etc.)
- Schedule: Cron job to check upcoming appointments - Hobby plan on vercel

---

### 2. Customizable Reminder Timing

**What it is:**
- Shop owners configure when reminders send (e.g., 24h, 48h, 1 week before)
- Different timing for different appointment types
- Allows for business-specific preferences

**Current state:** ❌ Missing
**Competitor coverage:**
- Calendly: ✅ (per event type)
- Timely: ✅ (per service)
- Cal.com: ✅ (workflow configuration)

**Priority justification:**
Automated reminders without timing control are useless. This is core to reminder effectiveness.

**Implementation scope:**
- Schema: `reminderTiming` configuration on shop/event type
- Options: 15min, 1h, 2h, 4h, 24h, 48h, 1 week
- Support: Multiple reminders (e.g., 1 week + 24h before)

---

### 3. Multiple Event Types with Different Durations

**What it is:**
- Ability to offer 30min, 45min, 60min appointments from one booking page
- Different pricing per event type
- Different buffer/notice requirements per type

**Current state:** ❌ Missing (single event type per shop)
**Competitor coverage:**
- Calendly: ✅ (multiple from single link)
- Timely: ✅ (different services with different durations)
- Cal.com: ✅ (unlimited event types)

**Priority justification:**
Real businesses offer multiple services. A hairstylist does cuts (30min) and color (2h). This is fundamental.

**Implementation scope:**
- Schema: `eventTypes` table with `shopId`, `name`, `duration`, `price`, `depositAmount`
- Booking flow: Customer selects event type before time slot
- Calendar: Calculate availability per event type duration

---

### 4. Buffer Time Between Appointments

**What it is:**
- Automatic padding before/after appointments
- Prevents back-to-back burnout
- Accounts for cleanup, prep, travel time

**Current state:** ❌ Missing
**Competitor coverage:**
- Calendly: ✅ (before/after buffer)
- Timely: ✅ (automatic gap optimization)
- Cal.com: ✅ (configurable buffers)

**Priority justification:**
Without buffers, system books appointments back-to-back, which is unrealistic for service businesses.

**Implementation scope:**
- Schema: `bufferBefore` and `bufferAfter` (minutes) on event types or shop settings
- Availability logic: Factor buffer into time slot calculation
- UI: Show buffer in calendar views (grayed-out time)

---

### 5. Minimum Notice Period for Bookings

**What it is:**
- Don't allow bookings within X hours of start time
- Protects shop owner from last-minute scrambles
- Standard practice in service industries

**Current state:** ❌ Missing
**Competitor coverage:**
- Calendly: ✅ (minimum notice configuration)
- Timely: ✅ (booking cutoff time)
- Cal.com: ✅ (minimum booking notice)

**Priority justification:**
Shop owners need prep time. Bookings 15 minutes from now are unrealistic for most service businesses.

**Implementation scope:**
- Schema: `minimumNoticeHours` on event types or shop settings
- Availability logic: Filter out time slots within notice window
- Example: If notice = 24h, tomorrow at 3pm shows as available, but today at 5pm (2h away) does not

---

## P1 Features (High Priority — Competitive Parity)

These features are expected by users and present in 2+ competitors. Without them, we're at a competitive disadvantage.

### 6. Embedded Booking Widgets

**What it is:**
- JavaScript widget embeddable on shop owner's website
- Inline or popup/modal options
- Maintains branding while embedding scheduling

**Current state:** ❌ Missing (standalone booking page only)
**Competitor coverage:**
- Calendly: ✅ (inline, popup, text link)
- Timely: ✅ (mini website + embeds)
- Cal.com: ✅ (React Atoms, iframe embeds)

**Priority justification:**
Shop owners want scheduling on THEIR website, not a separate URL. This is a common user request.

**Implementation scope:**
- Embed code: `<script>` tag + `<div>` placeholder
- Widget types: Inline (full calendar), button (opens modal), text link
- Styling: Customizable colors, fonts to match site

---

### 7. Video Conferencing Auto-Add

**What it is:**
- Automatically generate Zoom/Teams/Meet links on booking
- Add link to calendar event and confirmation email
- Support virtual appointments without manual setup

**Current state:** ❌ Missing
**Competitor coverage:**
- Calendly: ✅ (Zoom, Teams, Meet, GoToMeeting)
- Timely: ❌ (physical location focus)
- Cal.com: ✅ (video apps in marketplace)

**Priority justification:**
Post-COVID, virtual appointments are standard. Many service providers work remotely (coaches, consultants, therapists).

**Implementation scope:**
- Integration: OAuth with Zoom, Google Meet, Microsoft Teams
- Logic: Generate unique meeting link on booking confirmation
- Include in: Confirmation email, calendar event, manage page

---

### 8. Recurring Appointments

**What it is:**
- Book weekly/biweekly/monthly standing appointments
- Common for therapy, coaching, personal training
- Auto-book series on customer confirmation

**Current state:** ❌ Missing
**Competitor coverage:**
- Calendly: ❌ (individual bookings only)
- Timely: ✅ (recurring client appointments)
- Cal.com: ✅ (recurring event types)

**Priority justification:**
Many service businesses have regulars (weekly haircuts, biweekly therapy). This is a key retention feature.

**Implementation scope:**
- Schema: `recurrencePattern` (frequency, interval, end date)
- Booking flow: Option to book single or recurring
- Calendar: Create series of appointments
- Payments: Charge deposit per occurrence vs. full series upfront

---

### 9. Mobile-Responsive Dashboard (Web-Based)

**What it is:**
- Dashboard works seamlessly on phone/tablet browsers
- No native app needed initially
- Essential for on-the-go shop owners

**Current state:** ⚠️ Partial (desktop-first design)
**Competitor coverage:**
- Calendly: ✅ (responsive web + native apps)
- Timely: ✅ (native iOS/Android apps)
- Cal.com: ✅ (responsive web)

**Priority justification:**
Shop owners manage bookings from their phone. Current dashboard is usable but not optimized for mobile.

**Implementation scope:**
- UI audit: Test all dashboard features on mobile viewport
- Responsive design: Optimize touch targets, navigation, tables
- Priority: Appointments table, confirmation actions, contact info

---

### 10. Customizable Message Templates

**What it is:**
- Shop owners edit SMS/email content
- Use variables: {customerName}, {appointmentTime}, {manageLink}
- Brand voice customization

**Current state:** ❌ Missing (hardcoded messages)
**Competitor coverage:**
- Calendly: ✅ (template editor per workflow)
- Timely: ✅ (customizable SMS/email)
- Cal.com: ✅ (template variables in workflows)

**Priority justification:**
Generic messages feel impersonal. Shop owners want to match their brand voice.

**Implementation scope:**
- Schema: `messageTemplates` table with template types
- Editor: Simple text editor with variable insertion
- Template types: Booking confirmation, reminder, slot offer, cancellation

---

### 11. Minimum Notice for Cancellation/Reschedule

**What it is:**
- Enforce cancellation policy cutoff time
- Block cancellations/reschedules within X hours of appointment
- Automatic deposit retention when policy violated

**Current state:** ⚠️ Partial (policy exists but not enforced in UI)
**Competitor coverage:**
- Calendly: ✅ (enforced minimum notice)
- Timely: ✅ (cancellation fee policies)
- Cal.com: ✅ (configurable notice periods)

**Priority justification:**
We have the backend logic (policy snapshots, refunds), but customer-facing enforcement is missing.

**Implementation scope:**
- Manage page: Show cutoff time, disable cancel/reschedule buttons if too late
- Message: "Cancellations require 24h notice. Contact shop owner directly."
- Backend: Validate notice period on cancel/reschedule requests

---

### 12. Cancellation Policy Display to Customers

**What it is:**
- Show refund policy BEFORE customer books
- Clear language about deposit, refund cutoff, fees
- Reduce disputes through transparency

**Current state:** ⚠️ Partial (policy exists in backend, not shown to customer)
**Competitor coverage:**
- Calendly: ✅ (policy display on booking page)
- Timely: ✅ (terms shown during booking)
- Cal.com: ✅ (customizable policy text)

**Priority justification:**
Avoid "I didn't know" disputes. Legal protection through informed consent.

**Implementation scope:**
- Booking page: Display policy before payment (checkbox: "I agree to cancellation policy")
- Manage page: Show policy on cancellation flow
- Content: Pull from `policyVersions` snapshot

---

### 13. Block Repeat No-Show Offenders

**What it is:**
- Automatically prevent customers with X no-shows from booking
- Protect shop owner from serial offenders
- Simple but effective safeguard

**Current state:** ❌ Missing (we track but don't block)
**Competitor coverage:**
- Calendly: ❌ (no blocking feature)
- Timely: ✅ (block repeat no-shows)
- Cal.com: ❌ (would require custom workflow)

**Priority justification:**
We already track voided appointments. Blocking is low-effort, high-value protection.

**Implementation scope:**
- Schema: `isBlocked` flag on customers table
- Logic: Auto-block if `voidedLast90Days >= 3` (configurable threshold)
- Booking page: "This customer is not eligible to book. Contact shop owner."
- Dashboard: Shop owner can manually block/unblock

---

## Opportunities (Leverage Our Differentiation)

These are areas where we can build on our unique strengths while filling competitive gaps.

### 14. Automated No-Show Workflows

**What it is:**
- Auto-send "We missed you" message after no-show
- Prompt to rebook with incentive (e.g., waived deposit for reliable customers)
- Combine with our tier system for targeted offers

**Competitor coverage:**
- Calendly: ✅ (generic no-show workflows)
- Timely: ❌ (manual follow-up)
- Cal.com: ⚠️ (custom workflow required)

**Our advantage:**
We know WHO is reliable (tier system). Offer different incentives: Top tier = discount, Risk tier = higher deposit.

---

### 15. Rebooking Reminders for Regulars

**What it is:**
- Auto-remind customers to book next appointment after current one ends
- Common in salons ("Book your next cut in 6 weeks")
- Retention and revenue driver

**Competitor coverage:**
- Calendly: ❌ (no rebooking automation)
- Timely: ✅ (automated rebooking reminders)
- Cal.com: ❌ (manual process)

**Our advantage:**
Combine with tier system: Prioritize rebooking offers to Top tier customers, send slot recovery offers when Risk tier cancels.

---

### 16. Waitlist Management UI

**What it is:**
- Customer-requested waitlist for specific times
- Different from our automatic slot recovery (which is shop-initiated)
- Customers say "I want Tuesday 3pm if it opens up"

**Competitor coverage:**
- Calendly: ❌ (no waitlist)
- Timely: ✅ (client waitlist for requested times)
- Cal.com: ❌ (no native waitlist)

**Our advantage:**
Integrate with slot recovery: Customers on waitlist + tier priority = smart offer sequence.

---

### 17. Revenue & Analytics Reporting

**What it is:**
- Dashboard showing revenue by period
- No-show rate trends over time
- Tier distribution changes
- Slot recovery effectiveness metrics

**Competitor coverage:**
- Calendly: ⚠️ (basic meeting analytics)
- Timely: ✅ (comprehensive revenue/performance reports)
- Cal.com: ⚠️ (basic event analytics)

**Our advantage:**
We have unique data (financial outcomes, tier movements, slot recovery). Build reports competitors CAN'T offer.

**Metrics to show:**
- Revenue protected (refunds automated)
- Revenue recovered (slot recovery filled)
- No-show trend (decreasing = tier system working)
- Tier distribution (migration from Risk → Neutral → Top)

---

### 18. SMS Marketing Campaigns

**What it is:**
- Send promotional messages to customer segments
- Example: "20% off for Top tier customers this week"
- Compliance: Only to opted-in customers

**Competitor coverage:**
- Calendly: ❌ (email only)
- Timely: ✅ (SMS campaigns to segments)
- Cal.com: ❌ (no marketing features)

**Our advantage:**
Segment by tier: Different offers for Top (loyalty reward) vs. Neutral (incentive to improve) vs. Risk (last chance).

---

## Implementation Priority Matrix

| Feature | P0/P1 | Effort | Impact | Sequence |
|---------|-------|--------|--------|----------|
| **Automated email reminders** | P0 | Medium | High | 1 |
| **Customizable reminder timing** | P0 | Low | High | 2 |
| **Multiple event types** | P0 | High | High | 3 |
| **Buffer time** | P0 | Low | Medium | 4 |
| **Minimum notice period** | P0 | Low | Medium | 5 |
| **Embedded widgets** | P1 | Medium | Medium | 6 |
| **Video conferencing auto-add** | P1 | Medium | Medium | 7 |
| **Recurring appointments** | P1 | High | Medium | 8 |
| **Mobile-responsive dashboard** | P1 | Medium | High | 9 |
| **Customizable message templates** | P1 | Low | Medium | 10 |
| **Min notice for cancellation** | P1 | Low | Low | 11 |
| **Cancellation policy display** | P1 | Low | Low | 12 |
| **Block repeat offenders** | P1 | Low | High | 13 |
| **Revenue reporting** | Opp | Medium | High | 14 |
| **Automated no-show workflows** | Opp | Low | Medium | 15 |
| **Rebooking reminders** | Opp | Medium | Medium | 16 |
| **Waitlist management UI** | Opp | Medium | Low | 17 |
| **SMS marketing campaigns** | Opp | Medium | Low | 18 |

---

## Strategic Recommendations

### Phase 1: Table Stakes (P0) — 2-3 months
**Goal:** Be taken seriously as booking software

1. Automated email reminders with customizable timing
2. Multiple event types (30/45/60 min options)
3. Buffer time and minimum notice period

**Success metric:** Users stop asking "why can't I...?"

---

### Phase 2: Competitive Parity (P1) — 2-3 months
**Goal:** Match expected features from Calendly/Timely

1. Embedded booking widgets
2. Video conferencing integration
3. Mobile-responsive dashboard
4. Policy enforcement and display

**Success metric:** Feature comparison charts show green checkmarks

---

### Phase 3: Differentiated Growth (Opportunities) — 3-4 months
**Goal:** Market our unique revenue protection features

1. Revenue reporting (show $$$ protected/recovered)
2. Tier-based automated workflows (no-show, rebooking)
3. Waitlist integration with tier priority

**Success metric:** Marketing site leads with "Revenue Protection" messaging, competitive comparison shows unique value

---

## Positioning Statement (Updated)

**For service businesses losing revenue to no-shows and cancellations, our booking system is the only platform that combines professional scheduling features (reminders, multiple services, team management) with automated revenue protection (no-show prediction, tier-based pricing, smart slot recovery) — unlike Calendly (treats all customers the same), Timely (salon-only features), or Cal.com (requires custom development).**

**What we do:**
1. **Table Stakes RIGHT** — Reminders, multiple events, buffers (like everyone else)
2. **Revenue Protection UNIQUE** — Tier pricing, outcome automation, slot recovery (only us)
3. **Target Market CLEAR** — Service businesses with no-show problems (not enterprise, not DIY developers)

---

## Next Steps

1. **Validate with user:** Confirm P0 sequence and timeline
2. **Slice P0 features:** Break down into vertical slices (email reminders, then timing, then templates)
3. **Design database schema changes:** `eventTypes`, `messageTemplates`, `reminderSettings`
4. **Update marketing site:** Create comparison table showing our unique + parity features
5. **Track metrics:** Measure feature gap closure over time

---

## Appendix: Source Documents

- `docs/shaping/calendly-gap-analysis.md` — Horizontal scheduling leader
- `docs/shaping/timely-gap-analysis.md` — Vertical salon/spa software
- `docs/shaping/cal-com-gap-analysis.md` — Open-source scheduling infrastructure

