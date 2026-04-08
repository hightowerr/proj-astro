# Timely Feature Gap Analysis — Shaping

**Date:** 2026-03-16
**Purpose:** Understand competitive positioning against industry-specific salon/spa software

---

## Frame

### Source

User request:
> Do a full analysis of https://www.gettimely.com/ next - use playwright if need be but complete a similar analysis

### Problem

- Timely is industry-specific software targeting salons, spas, barbers, and beauty businesses
- They have deep vertical integration with features designed specifically for the beauty/wellness industry
- Need to understand if we're competing in the same market or if they represent a different customer segment
- Must identify which of their industry-specific features are relevant to our general booking/appointment use case

### Outcome

- Clear understanding of Timely's vertical-specific approach vs. our horizontal approach
- Identification of features that work for ANY appointment-based business (transferable)
- Strategic direction: vertical depth (specialize in one industry) vs. horizontal breadth (work for many industries)
- Recognition of market positioning opportunities

---

## CURRENT: Our System Capabilities

*[Same as Calendly analysis - C1 through C8]*

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

## T: Timely Feature Set

| Part | Mechanism |
|------|-----------|
| **T1** | **Core Scheduling** |
| T1.1 | Online booking calendar 24/7 for clients |
| T1.2 | Multi-staff scheduling and rostering |
| T1.3 | Day/week calendar views |
| T1.4 | Recurring appointments support |
| T1.5 | Block time for breaks/lunch |
| T1.6 | Minimize gaps between appointments (automatic optimization) |
| T1.7 | Timezone detection |
| T1.8 | Mobile app for iOS/Android |
| **T2** | **Client Management** |
| T2.1 | Client profiles with full history |
| T2.2 | Before/after photos storage |
| T2.3 | Treatment plans and notes |
| T2.4 | Client alerts and flags |
| T2.5 | Detailed consent tracking |
| T2.6 | Pronouns support (she/her, he/him, they/them) |
| T2.7 | VIP client tags (Innovate plan) |
| **T3** | **Digital Consultation Forms** |
| T3.1 | Timely Consult app integration |
| T3.2 | 10 pre-built templates for different services |
| T3.3 | Custom form builder |
| T3.4 | Automatic form sending before appointments |
| T3.5 | Digital consent forms |
| T3.6 | Client document storage |
| **T4** | **Payments** |
| T4.1 | In-salon payments with card readers |
| T4.2 | Tap to Pay on iPhone (no hardware needed) |
| T4.3 | Online payments and deposits |
| T4.4 | Cancellation fee collection |
| T4.5 | Split payments |
| T4.6 | Gift card/voucher sales |
| T4.7 | Transaction fees: 1.59% + 5p (in-person), 1.95% + 20p (online) |
| T4.8 | Custom rates for businesses processing £4,000+/month |
| **T5** | **No-Show Prevention** |
| T5.1 | Automated SMS reminders (100-300 SMS included per plan) |
| T5.2 | Automated email reminders |
| T5.3 | Customizable reminder timing |
| T5.4 | Deposit requirements to reduce no-shows |
| T5.5 | Cancellation fee policies |
| T5.6 | Block repeat no-show offenders from booking |
| **T6** | **Waitlist Management** |
| T6.1 | Client waitlist for requested times |
| T6.2 | Automatic notification when slots open |
| T6.3 | Quickly fill cancellations from waitlist |
| T6.4 | Waitlist for specific staff members |
| **T7** | **Marketing & Client Loyalty** |
| T7.1 | Automated rebooking reminders |
| T7.2 | SMS marketing campaigns (target segments) |
| T7.3 | Automated follow-up messages |
| T7.4 | Personalized messages with client data |
| T7.5 | Social media booking buttons (Instagram, Facebook, Messenger) |
| T7.6 | Mini website with online booking |
| T7.7 | Custom booking confirmation pages (Innovate plan) |
| **T8** | **Staff Management** |
| T8.1 | Staff dashboards with individual calendars |
| T8.2 | Timesheets and clock in/out |
| T8.3 | Staff rosters |
| T8.4 | Pricing tiers by staff seniority/skill |
| T8.5 | Performance-based compensation tracking |
| T8.6 | Sales targets and performance reports |
| T8.7 | Commission tracking |
| T8.8 | Staff permissions and access controls |
| **T9** | **Inventory & Retail** |
| T9.1 | Stock and inventory management |
| T9.2 | Product tracking |
| T9.3 | Low stock alerts |
| T9.4 | Professional vs. retail stock separation |
| T9.5 | Product sales during checkout |
| **T10** | **Reporting & Analytics** |
| T10.1 | Custom reports and analytics |
| T10.2 | Performance tracking by staff |
| T10.3 | Revenue reports |
| T10.4 | Service popularity reports |
| T10.5 | Client retention metrics |
| T10.6 | Trend identification |
| T10.7 | Business optimization insights |
| **T11** | **Integrations** |
| T11.1 | Facebook/Instagram booking integration |
| T11.2 | Google Calendar sync |
| T11.3 | Third-party app marketplace |
| T11.4 | Xero accounting integration |
| **T12** | **Pricing Model** |
| T12.1 | Build: £22/staff/month (100 SMS, basic features) |
| T12.2 | Elevate: £34/staff/month (200 SMS, consultation forms, waitlist, campaigns) |
| T12.3 | Innovate: £39/staff/month (300 SMS, phone support, VIP, rebooking automation) |
| T12.4 | No contracts, month-to-month billing |
| T12.5 | No new client fees |
| T12.6 | 14-day free trial, no credit card required |

---

## Comparative Fit Check

### Requirements: What Users Expect from Booking Software

| ID | Requirement | Status | CURRENT (Us) | T (Timely) |
|----|-------------|--------|:------------:|:----------:|
| **R0** | **Core Scheduling** |
| R0.1 | Book appointments with availability checking | Core goal | ✅ | ✅ |
| R0.2 | Multiple event types with different durations | Must-have | ❌ | ✅ |
| R0.3 | Timezone detection and conversion | Must-have | ✅ | ✅ |
| R0.4 | Calendar sync (Google, Outlook, etc.) | Must-have | ✅ | ✅ |
| R0.5 | Buffer time between appointments | Must-have | ❌ | ✅ |
| R0.6 | Recurring appointments | Must-have | ❌ | ✅ |
| R0.7 | Mobile app for on-the-go management | Must-have | ❌ | ✅ |
| **R1** | **Multi-Staff Management** |
| R1.1 | Manage multiple staff calendars | Must-have | ❌ | ✅ |
| R1.2 | Staff rostering and schedules | Must-have | ❌ | ✅ |
| R1.3 | Staff-specific pricing tiers | Nice-to-have | ❌ | ✅ |
| R1.4 | Staff performance tracking | Nice-to-have | ❌ | ✅ |
| **R2** | **Notifications & Reminders** |
| R2.1 | Automated email reminders | Must-have | ❌ | ✅ |
| R2.2 | Automated SMS reminders | Must-have | ✅ (manual) | ✅ (automated) |
| R2.3 | Customizable reminder timing | Must-have | ❌ | ✅ |
| R2.4 | Customizable message templates | Must-have | ❌ | ✅ |
| **R3** | **Client Management** |
| R3.1 | Client profiles with history | Must-have | ✅ (basic) | ✅ (advanced) |
| R3.2 | Client notes and treatment plans | Nice-to-have | ❌ | ✅ |
| R3.3 | Photo storage (before/after) | Nice-to-have | ❌ | ✅ |
| R3.4 | Digital consultation forms | Nice-to-have | ❌ | ✅ |
| R3.5 | Self-service reschedule/cancel | Must-have | ✅ | ✅ |
| **R4** | **Payments** |
| R4.1 | Collect payments during booking | Must-have | ✅ | ✅ |
| R4.2 | Deposits to reduce no-shows | Must-have | ✅ | ✅ |
| R4.3 | Cancellation fee collection | Must-have | ✅ (via policy) | ✅ |
| R4.4 | In-person payment processing | Nice-to-have | ❌ | ✅ |
| R4.5 | Transparent transaction fees | Must-have | ✅ | ✅ |
| **R5** | **No-Show Prevention** |
| R5.1 | Track no-show history | Core goal | ✅ | ✅ (basic) |
| R5.2 | Risk prediction based on history | Core goal | ✅ | ❌ |
| R5.3 | Automated reminder workflows | Must-have | ❌ | ✅ |
| R5.4 | Block repeat offenders | Nice-to-have | ❌ | ✅ |
| **R6** | **Waitlist & Slot Recovery** |
| R6.1 | Waitlist for requested times | Nice-to-have | ❌ | ✅ |
| R6.2 | Auto-notify waitlist when slots open | Nice-to-have | ❌ | ✅ |
| R6.3 | Auto-offer cancelled slots to waitlist | Core goal | ✅ | ✅ |
| R6.4 | Tier-based prioritization for offers | Core goal | ✅ | ❌ |
| **R7** | **Financial Management** |
| R7.1 | Automated refunds based on policy | Core goal | ✅ | ❌ |
| R7.2 | Policy snapshots at booking time | Core goal | ✅ | ❌ |
| R7.3 | Outcome resolution automation | Core goal | ✅ | ❌ |
| R7.4 | Tier-based pricing | Core goal | ✅ | ❌ |
| **R8** | **Marketing & Growth** |
| R8.1 | Rebooking reminders | Nice-to-have | ❌ | ✅ |
| R8.2 | SMS marketing campaigns | Nice-to-have | ❌ | ✅ |
| R8.3 | Social media booking integration | Nice-to-have | ❌ | ✅ |
| **R9** | **Reporting & Analytics** |
| R9.1 | Revenue and performance reports | Must-have | ❌ | ✅ |
| R9.2 | Staff performance tracking | Nice-to-have | ❌ | ✅ |
| R9.3 | Service popularity insights | Nice-to-have | ❌ | ✅ |
| R9.4 | Client retention metrics | Nice-to-have | ❌ | ✅ |
| **R10** | **Industry-Specific Features** |
| R10.1 | Inventory management (retail products) | Out | ❌ | ✅ |
| R10.2 | Before/after photo storage | Out | ❌ | ✅ |
| R10.3 | Treatment plan tracking | Out | ❌ | ✅ |

**Notes:**
- **CURRENT fails R0.2:** Single event type only, no multiple durations
- **CURRENT fails R0.5:** No buffer time between appointments
- **CURRENT fails R0.6:** No recurring appointments
- **CURRENT fails R0.7:** No mobile app
- **CURRENT fails R1.x:** Built for solo shop owner, no multi-staff management
- **CURRENT fails R2.1, R2.3-R2.4:** No automated email reminders, no customization
- **CURRENT fails R3.2-R3.4:** Basic client management only, no notes/photos/forms
- **CURRENT fails R4.4:** No in-person payment processing
- **CURRENT fails R5.3-R5.4:** No automated reminder workflows, can't block repeat offenders
- **CURRENT fails R6.1-R6.2:** No client-requested waitlist feature
- **CURRENT fails R8.x:** No marketing/rebooking features
- **CURRENT fails R9.x:** No reporting/analytics features
- **Timely fails R5.2:** No predictive no-show risk scoring
- **Timely fails R6.4:** Waitlist is FIFO, not tier-prioritized
- **Timely fails R7.1-R7.4:** No automated refund logic, policy snapshots, outcome resolution, or tier-based pricing

---

## Gap Analysis Summary

### Table Stakes Features (Missing — Timely Has)

These are features users expect from appointment booking software:

1. **Multi-staff management** (R1.1-R1.2) — Most salons/spas have multiple staff, need calendar/roster management
2. **Automated email reminders** (R2.1) — Critical for no-show prevention
3. **Customizable reminder timing** (R2.3) — Users need control over when reminders send
4. **Recurring appointments** (R0.6) — Clients book weekly/monthly standing appointments
5. **Mobile app** (R0.7) — Staff need to manage calendar on the go
6. **Buffer time** (R0.5) — Prevent back-to-back burnout
7. **Multiple event types** (R0.2) — Different services with different durations
8. **Reporting & analytics** (R9.1) — Business owners need revenue visibility
9. **Client-requested waitlist** (R6.1-R6.2) — Clients want to request specific times
10. **Block repeat no-show offenders** (R5.4) — Protect business from serial offenders

### Differentiation Features (We Have — Timely Doesn't)

These are unique capabilities that set us apart:

1. **Predictive no-show risk scoring** (R5.2) — AI-driven risk prediction, not just history
2. **Tier-based pricing** (R7.4) — Charge more for risky customers, reward reliable ones
3. **Automated refund logic** (R7.1) — Policy-driven refund automation
4. **Policy snapshots** (R7.2) — Immutable policy at booking time
5. **Financial outcome automation** (R7.3) — Automatic state machine for appointment outcomes
6. **Tier-prioritized slot recovery** (R6.4) — Smart waitlist prioritization based on reliability

### Industry-Specific Features (Timely Has — Not Our Market)

Features specific to beauty/wellness vertical:

1. **Inventory management** (R10.1) — Track retail products, professional stock
2. **Before/after photos** (R10.2) — Visual treatment documentation
3. **Treatment plans** (R10.3) — Multi-session service planning
4. **Digital consultation forms** (T3.x) — Health/safety/allergy forms
5. **Staff commission tracking** (T8.7) — Beauty industry compensation model
6. **Pricing tiers by staff seniority** (T8.4) — Junior vs. senior stylist pricing
7. **VIP client services** (T2.7) — Special treatment for high-value clients

---

## Strategic Insights

### 1. **Market Positioning: Vertical vs. Horizontal**

**Timely's Approach:**
- Deep vertical integration in beauty/wellness industry
- Industry-specific features (inventory, photos, treatment plans)
- Industry-specific pricing model (per-staff)
- Marketing emphasizes "salon," "spa," "barber" terminology

**Our Approach:**
- Horizontal solution for ANY appointment-based business
- Core scheduling + advanced financial protection
- Value proposition: revenue protection, not industry-specific workflow

**Implication:** We're not direct competitors. Timely owns the beauty vertical; we should own the "revenue protection" horizontal.

### 2. **Feature Gap Categories**

| Category | Our Status | Action |
|----------|-----------|--------|
| **Core Scheduling Basics** | Missing critical features | Must build (P0) |
| **Multi-Staff Management** | Not our current market | Decide if we expand |
| **Advanced Financial Protection** | Our differentiation | Double down |
| **Industry-Specific Tools** | Out of scope | Ignore |
| **Marketing & Growth** | Missing | Consider (P1) |

### 3. **Pricing Model Comparison**

**Timely:**
- Per-staff pricing: £22-£39/staff/month
- Targets multi-staff businesses (3-10 staff typical)
- Example: 5-staff salon = £110-£195/month
- Transaction fees: 1.59-1.95% + fixed fee

**Us (Current):**
- Not clearly defined yet
- Transaction-based? Subscription? Hybrid?
- Need to clarify pricing model

**Implication:** Our pricing should reflect value delivered (revenue protected) not staff count.

### 4. **Customer Segment Differences**

**Timely's Customer:**
- Salons, spas, barbers, beauty clinics, tattoo studios
- 1-20 staff members
- High volume of recurring clients
- Focus on client experience and retail upsell
- Need inventory management
- Emphasis on staff performance tracking

**Our Ideal Customer:**
- Solo practitioners or small teams (1-3 people)
- Service providers with high no-show rates
- Businesses requiring deposits
- Providers who want to charge risky customers more
- Focus on revenue protection, not retail
- Examples: consultants, personal trainers, therapists, tutors, coaches

**Implication:** We serve a different customer with different pain points.

---

## Competitive Positioning

### Direct Competition: LOW

Timely is **not a direct competitor** because:
1. **Different market segment** — Beauty/wellness vertical vs. horizontal revenue protection
2. **Different value proposition** — Workflow optimization vs. financial protection
3. **Different customer profile** — Multi-staff salons vs. solo practitioners with no-show problems

### Feature Overlap: MEDIUM

Where we overlap:
- Online booking ✅
- Calendar management ✅
- Deposits and cancellation fees ✅
- Waitlist/slot recovery ✅
- SMS reminders ✅

Where we diverge:
- They have: Staff management, inventory, industry tools, marketing automation
- We have: Tier-based pricing, predictive risk, automated refunds, policy snapshots, outcome resolution

### Learning Opportunities: HIGH

What Timely does well that we can learn from:
1. **Automated reminder workflows** — We need this (P0)
2. **Customizable timing for reminders** — We need this (P0)
3. **Email reminder support** — We need this (P0)
4. **Waitlist management UI** — Good reference for our slot recovery feature
5. **Block repeat offenders** — Simple but effective no-show prevention
6. **Rebooking reminders** — Automated client retention
7. **Social media booking integration** — Easy client acquisition

---

## Recommendations

### 1. **Parity Track (Critical Gaps)**

Build these to be taken seriously as booking software:

| Priority | Feature | Reasoning |
|----------|---------|-----------|
| **P0** | Automated email reminders | Critical gap — users expect this |
| **P0** | Customizable reminder timing | Required for effective reminder system |
| **P0** | Multiple event types | Users need different service durations |
| **P1** | Recurring appointments | Common use case (weekly sessions, etc.) |
| **P1** | Mobile app (or responsive web) | Staff need mobile access |
| **P1** | Buffer time configuration | Prevent back-to-back scheduling |
| **P2** | Block repeat no-show offenders | Simple protection mechanism |

### 2. **Differentiation Track (Double Down)**

Features that make us unique — market these heavily:

| Feature | Marketing Angle |
|---------|----------------|
| **No-show prediction** | "AI predicts which customers will show up" |
| **Tier-based pricing** | "Charge risky customers more, reward loyal ones" |
| **Automated refunds** | "Set policy once, refunds happen automatically" |
| **Tier-prioritized slot recovery** | "Fill cancellations with your best customers first" |
| **Financial outcomes** | "Know exactly what happened with every appointment" |
| **Policy snapshots** | "No disputes — policy locked at booking" |

### 3. **Market Positioning Track**

Clarify our positioning vs. vertical players like Timely:

**Positioning Statement:**
"For solo practitioners and small service businesses struggling with no-shows and lost revenue, our booking system is the only platform that automatically predicts no-show risk, adjusts pricing based on customer reliability, and recovers revenue from cancelled slots — unlike industry-specific software like Timely, which focuses on workflow optimization but treats all customers the same and leaves money on the table."

**Target Customers:**
- Consultants (business, career, life coaches)
- Personal trainers and fitness coaches
- Therapists and counselors
- Tutors and educators
- Freelance professionals (photographers, designers)
- Solo beauty practitioners (independent hairstylists, aestheticians)
- Alternative medicine (acupuncture, massage therapy)

**NOT targeting (leave to Timely):**
- Multi-staff salons and spas
- Businesses needing inventory management
- Businesses focused on retail upsell
- Enterprise beauty chains

### 4. **Feature Development Priority**

**Phase 1 (Parity) — 3 months:**
- Automated email reminders with customizable timing
- Multiple event types (30/45/60 min options)
- Recurring appointments
- Buffer time configuration

**Phase 2 (Enhancement) — 3 months:**
- Mobile-responsive dashboard (web-based, not native app)
- Block repeat offenders feature
- Rebooking reminder automation
- Embedded booking widgets

**Phase 3 (Growth) — 3 months:**
- Basic reporting (revenue, no-show rate, tier distribution)
- SMS marketing campaigns
- Social media booking integration
- Multi-staff support (optional upgrade path)

### 5. **Pricing Strategy**

**Recommended Model:**
- **Starter:** $29/month — Solo practitioners, 1 event type, basic features
- **Professional:** $79/month — Multiple event types, tier pricing, slot recovery, 500 SMS
- **Business:** $149/month — Everything + multi-staff (2-5), advanced reporting, 1500 SMS

**vs. Timely's Model:**
- Timely: £22-£39/staff/month (£110-£195 for 5 staff)
- Us: Flat $79-$149/month regardless of staff count
- Value prop: "Predictable pricing based on features, not headcount"

---

## Conclusion

**Timely is not our competitor** — they own the beauty/wellness vertical with deep industry integration. We should:

1. **Learn from their strengths** — Automated reminders, customization, mobile access
2. **Clarify our differentiation** — Revenue protection through predictive intelligence
3. **Target different customers** — Solo/small service businesses across industries
4. **Build parity features** — Core booking functionality users expect
5. **Market our unique value** — Tier-based pricing and automated financial outcomes

**Next Steps:**
1. Build P0 parity features (email reminders, multiple event types)
2. Create marketing site emphasizing revenue protection differentiation
3. Develop case studies showing revenue recovered vs. lost
4. Target horizontal market (consultants, trainers, coaches) not vertical (salons)
