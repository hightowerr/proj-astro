# Calendly Feature Gap Analysis — Shaping

**Date:** 2026-03-16
**Purpose:** Understand competitive positioning and identify differentiation opportunities

---

## Frame

### Source

User request:
> Use shaping skills to research the gap between this application and Calendly. Analyze https://calendly.com/features to understand their feature set, then compare it to our current implementation.

### Problem

- We've built a booking system with unique financial outcomes and tier-based pricing, but don't know how we compare to market leader Calendly
- Without understanding the competitive landscape, we risk building features Calendly already has while missing opportunities for differentiation
- Need to identify what features users expect from scheduling software (Calendly sets expectations) vs. what makes our system unique

### Outcome

- Clear understanding of feature gaps that prevent us from competing with Calendly
- Identification of unique features we have that Calendly doesn't (differentiation opportunities)
- Prioritized list of "table stakes" features needed for market competitiveness
- Strategic direction: where to invest (parity vs. differentiation)

---

## CURRENT: Our System Capabilities

| Part | Mechanism |
|------|-----------|
| **C1** | **Core Scheduling** |
| C1.1 | Single-event booking with availability checking |
| C1.2 | Timezone detection and display |
| C1.3 | Token-based self-service manage links (reschedule/cancel) |
| C1.4 | Google Calendar conflict detection and event caching |
| **C2** | **Financial & Payment** |
| C2.1 | Stripe payment integration with deposits |
| C2.2 | Policy-based refund automation (before/after cutoff) |
| C2.3 | Policy snapshots (frozen at booking time) |
| C2.4 | Automated financial outcome resolution (settled/voided/refunded) |
| C2.5 | Idempotent refund handling |
| **C3** | **Tier System** |
| C3.1 | Customer reliability scoring (top/neutral/risk tiers) |
| C3.2 | Tier-based deposit pricing |
| C3.3 | Historical void/settled ratio tracking |
| C3.4 | Tier distribution analytics |
| **C4** | **No-Show Prevention** |
| C4.1 | No-show risk prediction based on history |
| C4.2 | Risk-level indicators (low/medium/high) |
| C4.3 | Manual confirmation workflow in dashboard |
| C4.4 | Attention-required filtering |
| **C5** | **Slot Recovery** |
| C5.1 | Automatic slot recovery on cancellation |
| C5.2 | Tier-prioritized offer loop (top → neutral → risk) |
| C5.3 | Redis-based offer cooldown locks |
| C5.4 | Offer lifecycle management (pending/accepted/expired/superseded) |
| **C6** | **SMS & Notifications** |
| C6.1 | Twilio SMS integration |
| C6.2 | SMS opt-in tracking |
| C6.3 | Confirmation request messages |
| C6.4 | Slot recovery offer messages |
| **C7** | **Shop Owner Dashboard** |
| C7.1 | Summary cards (total/confirmed/attention required) |
| C7.2 | All appointments table with filters |
| C7.3 | Attention-required queue |
| C7.4 | Manual confirmation controls |
| C7.5 | Contact information popover |
| C7.6 | Copy-to-clipboard for phone/email |
| **C8** | **Background Jobs** |
| C8.1 | PostgreSQL advisory locks for job safety |
| C8.2 | Outcome resolution cron job |
| C8.3 | Offer loop cron job |
| C8.4 | Score recomputation cron job |
| C8.5 | Calendar conflict scanning cron job |

---

## A: Calendly Feature Set

| Part | Mechanism |
|------|-----------|
| **A1** | **Core Scheduling** |
| A1.1 | One-on-one, group, and team-based scheduling |
| A1.2 | Multiple meeting length options from single link (30/45/60 min) |
| A1.3 | Real-time availability across 6+ synced calendars |
| A1.4 | Time zone detection |
| A1.5 | Buffer time before/after events |
| A1.6 | Minimum notice requirements |
| A1.7 | Embedded scheduling widgets for websites |
| **A2** | **Team Features** |
| A2.1 | Round-robin scheduling (auto-assign to next available) |
| A2.2 | Collective event types (entire team must attend) |
| A2.3 | Team pages (directory of schedulable team members) |
| A2.4 | Admin controls for team management |
| **A3** | **Workflows & Automation** |
| A3.1 | Automated email reminders (customizable timing) |
| A3.2 | Automated SMS reminders (customizable timing) |
| A3.3 | No-show workflows (auto-prompt to rebook) |
| A3.4 | Reconfirmation workflows (reduce last-minute cancellations) |
| A3.5 | Follow-up workflows (share resources, book next meeting) |
| A3.6 | Customizable templates for all workflow messages |
| **A4** | **Routing & Qualification** |
| A4.1 | Routing forms (collect info, route to specific booking page) |
| A4.2 | Meeting polls (find time that works for group) |
| **A5** | **Integrations** |
| A5.1 | 100+ native integrations (CRM, video, payment, HR) |
| A5.2 | Zapier integration (7,000+ apps, no-code automation) |
| A5.3 | Make integration (custom workflows) |
| A5.4 | Salesforce native integration |
| A5.5 | HubSpot native integration |
| A5.6 | Zoom/Microsoft Teams auto-add to events |
| A5.7 | Greenhouse (HR) integration for candidate scheduling |
| **A6** | **Payment** |
| A6.1 | Stripe integration for paid appointments |
| A6.2 | PayPal integration for paid appointments |
| A6.3 | Automatic payment collection during booking |
| **A7** | **Cancellation & Rescheduling** |
| A7.1 | Configurable reschedule/cancel links in confirmations |
| A7.2 | Cancellation policy display |
| A7.3 | Minimum notice for cancellation/reschedule (e.g., 24 hours) |
| A7.4 | Option to disable cancellation/rescheduling |
| **A8** | **Enterprise** |
| A8.1 | SSO/SAML authentication |
| A8.2 | Microsoft Dynamics integration |
| A8.3 | Salesforce lookup |
| A8.4 | Enterprise support and SLAs |

---

## Comparative Fit Check

### Requirements: What Users Expect from Scheduling Software

| ID | Requirement | Status | CURRENT (Us) | A (Calendly) |
|----|-------------|--------|:------------:|:------------:|
| **R0** | **Core Scheduling** |
| R0.1 | Book appointments with availability checking | Core goal | ✅ | ✅ |
| R0.2 | Multiple event types with different durations | Must-have | ❌ | ✅ |
| R0.3 | Timezone detection and conversion | Must-have | ✅ | ✅ |
| R0.4 | Calendar sync (Google, Outlook, etc.) | Must-have | ✅ | ✅ |
| R0.5 | Buffer time between appointments | Must-have | ❌ | ✅ |
| R0.6 | Minimum notice period for bookings | Must-have | ❌ | ✅ |
| R0.7 | Embedded booking widgets | Must-have | ❌ | ✅ |
| **R1** | **Team Scheduling** |
| R1.1 | Round-robin distribution across team | Nice-to-have | ❌ | ✅ |
| R1.2 | Collective events (entire team attends) | Nice-to-have | ❌ | ✅ |
| R1.3 | Team directory pages | Nice-to-have | ❌ | ✅ |
| **R2** | **Notifications & Reminders** |
| R2.1 | Automated email reminders | Must-have | ❌ | ✅ |
| R2.2 | Automated SMS reminders | Must-have | ✅ (manual) | ✅ (automated) |
| R2.3 | Customizable reminder timing | Must-have | ❌ | ✅ |
| R2.4 | Customizable message templates | Must-have | ❌ | ✅ |
| **R3** | **Customer Management** |
| R3.1 | Self-service reschedule/cancel | Must-have | ✅ | ✅ |
| R3.2 | Minimum notice for cancellation | Must-have | ❌ | ✅ |
| R3.3 | Cancellation policy display | Must-have | ❌ | ✅ |
| R3.4 | Reconfirmation prompts before event | Nice-to-have | ✅ (manual) | ✅ (automated) |
| **R4** | **Integrations** |
| R4.1 | CRM integrations (Salesforce, HubSpot) | Nice-to-have | ❌ | ✅ |
| R4.2 | Video conferencing auto-add (Zoom, Teams) | Must-have | ❌ | ✅ |
| R4.3 | Zapier/Make for custom workflows | Nice-to-have | ❌ | ✅ |
| R4.4 | Payment processor integration | Must-have | ✅ | ✅ |
| **R5** | **Routing & Qualification** |
| R5.1 | Forms to collect info before booking | Nice-to-have | ❌ | ✅ |
| R5.2 | Route to different booking pages based on answers | Nice-to-have | ❌ | ✅ |
| R5.3 | Meeting polls for group scheduling | Nice-to-have | ❌ | ✅ |
| **R6** | **No-Show Prevention** |
| R6.1 | Track no-show history | Core goal | ✅ | ❌ |
| R6.2 | Risk prediction based on history | Core goal | ✅ | ❌ |
| R6.3 | Automated no-show workflows (rebook prompts) | Nice-to-have | ❌ | ✅ |
| **R7** | **Financial Management** |
| R7.1 | Collect payments during booking | Must-have | ✅ | ✅ |
| R7.2 | Automated refunds based on policy | Core goal | ✅ | ❌ |
| R7.3 | Policy snapshots at booking time | Core goal | ✅ | ❌ |
| R7.4 | Outcome resolution automation | Core goal | ✅ | ❌ |
| R7.5 | Tier-based pricing | Core goal | ✅ | ❌ |
| **R8** | **Slot Recovery** |
| R8.1 | Auto-offer cancelled slots to waitlist | Core goal | ✅ | ❌ |
| R8.2 | Tier-based prioritization for offers | Core goal | ✅ | ❌ |
| R8.3 | Offer expiration and lifecycle management | Core goal | ✅ | ❌ |

**Notes:**
- **CURRENT fails R0.2:** We only support single event type per shop (no multiple duration options)
- **CURRENT fails R0.5:** No buffer time configuration between appointments
- **CURRENT fails R0.6:** No minimum notice period setting
- **CURRENT fails R0.7:** No embeddable widget (only direct booking page)
- **CURRENT fails R1.x:** No team scheduling features (single shop owner only)
- **CURRENT fails R2.1:** No automated email reminders
- **CURRENT fails R2.3-R2.4:** SMS reminders are manual, not customizable
- **CURRENT fails R3.2-R3.3:** Cancellation policy exists but minimum notice not enforced, policy not displayed to customer
- **CURRENT fails R4.1-R4.3:** No CRM, video conferencing, or workflow automation integrations
- **CURRENT fails R5.x:** No routing forms or meeting polls
- **CURRENT fails R6.3:** No automated no-show rebook workflows (we have manual confirmation)
- **Calendly fails R6.1-R6.2:** No historical no-show tracking or risk prediction
- **Calendly fails R7.2-R7.5:** No automated refund logic, policy snapshots, outcome resolution, or tier-based pricing
- **Calendly fails R8.x:** No slot recovery system

---

## Gap Analysis Summary

### Table Stakes Features (Missing — Calendly Has)

These are features users expect from scheduling software. Without them, we appear incomplete:

1. **Multiple event types** (R0.2) — Users expect to offer 30/45/60 min options from one link
2. **Buffer time** (R0.5) — Prevent back-to-back burnout
3. **Minimum notice period** (R0.6) — Don't allow bookings too close to start time
4. **Embedded widgets** (R0.7) — Users want to embed scheduling on their website
5. **Automated email reminders** (R2.1) — Critical for no-show prevention
6. **Customizable reminder timing** (R2.3) — Users need control over when reminders send
7. **Customizable templates** (R2.4) — Brand consistency in notifications
8. **Minimum notice for cancellation** (R3.2) — Enforce cancellation policy
9. **Cancellation policy display** (R3.3) — Transparency for customers
10. **Video conferencing auto-add** (R4.2) — Expected feature (Zoom/Teams links)

### Differentiation Features (We Have — Calendly Doesn't)

These are unique capabilities that set us apart:

1. **No-show risk prediction** (R6.1-R6.2) — Track history and predict risk
2. **Automated refund logic** (R7.2) — Policy-driven refund automation
3. **Policy snapshots** (R7.3) — Immutable policy at booking time
4. **Outcome resolution** (R7.4) — Automated financial state machine
5. **Tier-based pricing** (R7.5) — Charge more for risky customers
6. **Slot recovery system** (R8.1-R8.3) — Auto-offer cancelled slots with tier priority

### Nice-to-Have Features (Calendly Has)

Features that enhance Calendly but aren't critical for our use case:

1. **Team scheduling** (R1.x) — Round-robin, collective events, team pages
2. **Routing forms** (R5.1-R5.2) — Qualification before booking
3. **Meeting polls** (R5.3) — Group scheduling coordination
4. **CRM integrations** (R4.1) — Salesforce, HubSpot
5. **Workflow automation platforms** (R4.3) — Zapier, Make
6. **Enterprise features** (A8.x) — SSO, SAML, advanced integrations

---

## Strategic Recommendations

### 1. **Parity Track (Table Stakes)**

These features are required to be taken seriously as a scheduling platform:

| Priority | Feature | Reasoning |
|----------|---------|-----------|
| **P0** | Automated email reminders (R2.1) | Critical gap — users expect this |
| **P0** | Customizable reminder timing (R2.3) | Required for effective reminder system |
| **P0** | Multiple event types (R0.2) | Users need flexibility (e.g., 30/60 min consults) |
| **P1** | Embedded widgets (R0.7) | Users want to embed on their website |
| **P1** | Buffer time (R0.5) | Prevents burnout, expected feature |
| **P1** | Minimum notice period (R0.6) | Protects shop owners from last-minute bookings |
| **P1** | Video conferencing auto-add (R4.2) | Expected for virtual appointments |
| **P2** | Customizable templates (R2.4) | Nice to have, but can use defaults initially |
| **P2** | Cancellation policy display (R3.3) | Transparency, but exists in manage flow |
| **P2** | Minimum notice for cancellation (R3.2) | Policy enforcement, but not critical |

### 2. **Differentiation Track (Double Down)**

These features make us unique. Market them heavily:

| Feature | Marketing Angle |
|---------|----------------|
| **No-show prediction** | "Know who's likely to show up before the appointment" |
| **Tier-based pricing** | "Charge more for risky customers, reward reliable ones" |
| **Automated refunds** | "Set your policy once, we handle refunds automatically" |
| **Slot recovery** | "Never lose revenue to cancellations — auto-offer to waitlist" |
| **Financial outcomes** | "Know exactly what happened with every appointment" |
| **Policy snapshots** | "No disputes — policy locked at booking time" |

### 3. **Ignore Track (Not Our Market)**

These features are valuable but outside our current scope:

- **Team scheduling** (R1.x) — We're focused on solo practitioners / small shops
- **Routing forms** (R5.x) — Adds complexity, doesn't align with our simple booking flow
- **Enterprise features** (A8.x) — Not targeting enterprise market yet
- **CRM integrations** (R4.1) — Nice to have, but not core to our value prop

---

## Positioning Statement

**For solo practitioners and small shops who lose revenue to no-shows and cancellations, our booking system is the only scheduling platform that automatically predicts no-show risk, adjusts pricing based on customer reliability, and recovers revenue from cancelled slots — unlike Calendly, which treats all customers the same and leaves money on the table.**

**Differentiation:**
- Calendly automates **scheduling**
- We automate **revenue protection**

**Target Customer:**
- Service providers with high no-show rates (hair salons, barbers, personal training, consulting)
- Shops that require deposits but struggle with refund management
- Providers who want to reward loyal customers and charge more for risky ones

---

## Next Steps

1. **Validate strategic direction with user** — Confirm parity vs. differentiation priorities
2. **Slice parity features** — Break down P0/P1 features into vertical slices
3. **Create marketing site** — Highlight differentiation features prominently
4. **Competitive comparison page** — Direct comparison showing our unique features
5. **Case studies** — Quantify revenue recovered through tier system and slot recovery
