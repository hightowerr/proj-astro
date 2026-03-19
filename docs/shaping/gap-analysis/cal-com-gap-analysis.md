# Cal.com Feature Gap Analysis — Shaping

**Date:** 2026-03-16
**Purpose:** Understand competitive positioning against "Scheduling Infrastructure" and identify differentiation in "Revenue Protection".

---

## Frame

### Source

User request:
> Use shaping skills to research the gap between this application and the https://cal.com/ app... get a 360 view or as close as possible view of what they offer.

### Problem

- Cal.com is the leading "open-source scheduling infrastructure" with a heavy focus on developer experience and customizability.
- Our system has a unique "Revenue Protection" angle (automated outcomes, customer scoring, slot recovery) which Cal.com handles via generic integrations (Stripe) or custom workflows.
- We need to understand if we are competing on "scheduling flexibility" (where Cal.com wins) or "business outcome automation" (where we win).

### Outcome

- A 360-degree view of Cal.com's offerings.
- A technical and functional gap analysis.
- Strategic positioning: "Infrastructure" vs. "Revenue Protection".

---

## Cal.com: The "Scheduling Infrastructure" (360 View)

| Category | Offering |
|----------|----------|
| **Core Value** | **Open Scheduling Infrastructure**. API-first, self-hostable, white-labelable. |
| **Product Tiers** | Individual (Free), Team ($15/mo), Enterprise (Custom), Platform (API-based). |
| **Technical Stack** | Next.js, TRPC, Prisma, Tailwind, Postgres. Modular React components (Atoms). |
| **Extensibility** | Built-in App Store (60+ apps), Webhooks, robust REST API v2. |
| **Compliance** | HIPAA, SOC2 Type II, GDPR, ISO 27001 (Enterprise). |

### Key Capabilities

1. **Availability Management**: Complex schedules, date overrides, buffers, minimum notice, and multi-calendar sync (Google, Outlook, CalDav).
2. **Team Scheduling**: Round-robin (weighted/unweighted), Collective (everyone must be free), Managed Users (admin controls others' schedules).
3. **Workflows**: Triggered actions (Email/SMS) based on event lifecycle (booked, cancelled, rescheduled).
4. **Routing Forms**: Qualify leads before they see a calendar; route to different people/pages based on input.
5. **Platform Offering**: A headless scheduling engine that lets developers manage thousands of users via API, keeping Cal.com entirely invisible.
6. **Payments**: Stripe and PayPal integration. Simple "pay to book" model.

---

## Gap Analysis: Our System vs. Cal.com

| Feature Area | Cal.com (Infrastructure) | Our System (Revenue Protection) | Gap / Winner |
|--------------|-------------------------|--------------------------------|--------------|
| **Scheduling Core** | Multi-event, buffers, notice periods, multi-calendar. | Single-event, basic Google sync, timezone support. | **Cal.com** (Flexibility) |
| **Team Support** | Round-robin, collective, team pages, RBAC. | Single owner per shop. | **Cal.com** (Teams) |
| **Financial Logic** | Pay-to-book (Stripe). Basic refunds via Stripe Dashboard. | **Automated Outcomes**, **Policy Snapshots**, **Tier-based Pricing**. | **Us** (Finance) |
| **Customer Risk** | None (requires custom workflow/CRM). | **No-show prediction**, **Reliability Scoring** (Top/Risk). | **Us** (Risk) |
| **Slot Recovery** | Manual waitlist or custom workflow. | **Automated Offer Loop** with tier priority. | **Us** (Recovery) |
| **Developer Exp.** | API-first, Modular UI (Atoms), Self-hostable. | Integrated Next.js app, internal API. | **Cal.com** (Devs) |
| **Integrations** | 60+ native apps (CRM, Video, Automation). | Google Calendar, Stripe, Twilio. | **Cal.com** (Ecosystem) |
| **White-labeling** | Full (CSS, custom domain, invisible API). | Branded booking pages (Manage Tokens). | **Cal.com** (Custom) |

---

## Strategic Positioning: The "Revenue Gap"

Cal.com is built for **efficiency and customization**. It solves the problem of "How do I get a meeting on the calendar?" with maximum flexibility.

Our system is built for **revenue security and reliability**. It solves the problem of "How do I ensure this appointment actually turns into money?"

### Where we are "behind" (Table Stakes)
To compete as a "general" scheduler, we need:
- **Multiple event types** (Different lengths/prices).
- **Buffer times** (Prevent back-to-back burnout).
- **Minimum notice** (No last-minute surprises).
- **Automated Workflows** (Email/SMS reminders without manual intervention).

### Where we are "ahead" (Unfair Advantage)
Cal.com does **not** have:
- **Financial State Machine**: Automatically knowing if an appointment was a "no-show" vs "settled" and handling the money accordingly.
- **Dynamic Deposit Pricing**: Charging a higher deposit to someone who has a 60% no-show rate.
- **Active Slot Recovery**: Not just a waitlist, but an automated SMS "auction" to fill gaps as they open.

---

## Recommendations

### 1. Don't build an App Store
Cal.com wins on integrations. We should focus on **deep integration with the money**. Our value is that we understand the *outcome* of the booking, which Cal.com treats as a "black box".

### 2. Adopt "Modular UI" philosophy
Cal.com's success comes from letting developers embed scheduling. We should consider offering "Revenue Protected" booking widgets that developers can drop into their own sites, bringing our scoring and recovery logic with them.

### 3. Focus on "High-Stakes" Appointments
Cal.com is great for "let's chat" meetings. We are better for "this slot is worth $200 and I can't afford a no-show" appointments (salons, high-end consulting, medical).

### 4. Bridge the "Parity Gap"
Implement the "Table Stakes" identified in the Calendly analysis:
- **Buffers**
- **Notice Periods**
- **Automated Reminders**

---

## Conclusion

Cal.com is a **horizontal** infrastructure tool. We are a **vertical** revenue protection tool. We should not try to out-feature Cal.com on "scheduling logic" but rather on "financial outcomes".

**Positioning Statement:**
"Cal.com is for building a custom booking experience. We are for running a profitable booking business."
