# Product Definition: Astro

> This is document #1 in the mandatory reading order. It defines the business constraints that `architecture-context.md` implements, `code-standards.md` enforces, and `ai-workflow-rules.md` governs.

## 1. Product Identity

- **Product name:** Astro
- **Tagline:** "Stop losing money to no-shows"
- **Type:** B2B SaaS — subscription web application
- **Regulatory status:** None. No FCA, HIPAA, or PCI-DSS obligations on Astro itself. Payment card handling is fully delegated to Stripe (PCI-compliant). SMS opt-out compliance (TCPA/CTIA) handled via Twilio's STOP/START keyword processing.
- **Pricing:** $49/month (monthly) or ~$39/month (annual, 20% discount). Single plan ("Astro Pro"). 14-day free trial, no credit card required.

**Commercial proposition:** Astro protects service businesses from revenue loss caused by no-shows and late cancellations. It scores customers on reliability, enforces tier-based deposit policies, and automatically re-sells cancelled slots via SMS offers — turning booking chaos into predictable income.

## 2. Target Audience

| | |
|---|---|
| **Primary user** | Independent service providers and small shop owners: hair stylists, barbers, beauty salons, spas, massage studios, health clinics, personal trainers |
| **Not the target** | Enterprise chains, medical practices with insurance billing, retail/e-commerce, any business without appointment-based revenue |
| **Job to be done** | Protect income from unreliable customers without manual follow-up or awkward conversations about deposits |
| **Conversion funnel** | Land (hero) → Understand (feature sections) → Trust (metrics, social proof) → Convert (start free trial) |
| **Funnel time target** | Under 3 minutes from landing page to registration |

**Social proof (landing page):** "Trusted by 500+ beauty professionals"

## 3. Core Features (In Scope)

### Booking & Payments

1. **Public booking page** (`/book/[slug]`) — Customers select a service, pick a time slot, and pay via Stripe. No account required. *Business reason:* Frictionless booking increases conversion.
2. **Stripe deposit collection** — Deposits or full prepayment captured at booking time. Amount determined by shop policy + customer tier. *Business reason:* Deposits are the primary no-show deterrent.
3. **Tier-based pricing overrides** — Risk customers pay higher deposits; top customers can be waived. *Business reason:* Rewards reliable customers, penalizes unreliable ones without manual intervention.
4. **Automatic refunds** — Cancellations before the cutoff window trigger automatic Stripe refunds. After cutoff, deposit is retained. *Constraint:* Refund idempotency enforced — always check `stripeRefundId` before issuing.

### Customer Scoring & Risk

5. **Reliability scoring** — Each customer scored 0–100 based on 180-day appointment history (settled, voided, refunded, late cancels) with recency-weighted buckets. *Business reason:* Quantifies "gut feeling" about customer reliability.
6. **Three-tier system** — Top (score ≥80, 0 voids in 90d), Neutral (default), Risk (score <40 or ≥2 voids in 90d). Tiers drive deposit amounts, slot recovery priority, and dashboard warnings. *Business reason:* Automates the "charge more for flaky clients" decision.
7. **No-show detection** — Cron job resolves financial outcomes after appointment end + grace period. Voided outcomes increment no-show stats. *Business reason:* Feeds the scoring loop without manual input.

### Slot Recovery

8. **Automated slot recovery** — When a paid appointment is cancelled, the system SMS-offers the slot to other customers in tier priority order (top → neutral → risk). *Business reason:* Recovers revenue that would otherwise be lost. Landing page claims 8-minute average fill time and £240/week recovery.
9. **Offer loop with cooldowns** — Redis-backed cooldowns prevent re-offering to the same customer. Offers expire after TTL. If declined/expired, next eligible customer is offered. *Business reason:* Prevents spam while maximizing fill rate.

### Communications

10. **SMS confirmations** — Sent immediately after successful payment via Twilio. *Business reason:* Reduces "I forgot" no-shows.
11. **Configurable reminders** — Owner selects intervals (10m, 1h, 2h, 4h, 24h, 48h, 1w). SMS and email templates are customizable with template variables. *Constraint:* SMS opt-out compliance via STOP/START keywords.
12. **Confirmation requests** — System can send a "please confirm" message before high-risk appointments. Unconfirmed appointments auto-expire. *Business reason:* Early warning system for potential no-shows.
13. **Email reminders** — Transactional emails via Resend with customizable templates. *Business reason:* Reaches customers who prefer email over SMS.

### Self-Service

14. **Manage booking page** (`/manage/[token]`) — Token-based (no login required). Customer can view appointment details, cancellation eligibility, refund status, and cancel. *Constraint:* Token is hashed (SHA256), raw value shown only once at booking.
15. **Email preference toggle** — Customer controls email opt-in from manage page. *Business reason:* Compliance with communication preferences.

### Dashboard & Operations

16. **Owner dashboard** — Summary cards (upcoming count, high-risk customers, deposits at risk, monthly breakdown). Attention-required section highlights appointments needing follow-up. Tier distribution chart. *Business reason:* Single screen to answer "what needs my attention today?"
17. **Customer registry** — Full list with scores, tiers, contact info, booking history. *Business reason:* Owner can assess any customer's reliability at a glance.
18. **Appointment detail** — Complete record: status, payment, financial outcome, message log (every SMS/email sent with delivery status and rendered body). *Business reason:* Troubleshooting and audit trail.
19. **Google Calendar sync** — OAuth connection. Conflict detection flags overlapping events. Owner can keep, cancel, or reschedule. *Business reason:* Prevents double-booking across personal and business calendars.

### Configuration

20. **Payment policy settings** — Base mode (deposit/full prepay/none), amount, currency, cancellation cutoff, refund-before-cutoff toggle, per-tier overrides. *Business reason:* Every shop has different risk tolerance.
21. **Services management** — Name, duration, buffer time, per-service deposit override, active/hidden flags. *Business reason:* Different services have different no-show economics.
22. **Availability / working hours** — Day-of-week open/close times, timezone, slot duration. *Business reason:* Controls what customers can book.
23. **Reminder templates** — Customizable SMS and email with template variables and preview. Reset-to-defaults option. *Business reason:* Owner voice in automated communications.

## 4. Exclusions (Out of Scope)

| # | Excluded | Why |
|---|----------|-----|
| 1 | Blog / content marketing | Content update frequency doesn't justify a publishing system. Landing page is sufficient for SEO. |
| 2 | Client portal / customer accounts | Customers interact via tokenized links, not accounts. Adding accounts adds auth complexity for a population that books infrequently. |
| 3 | CRM / customer relationship management | Astro tracks reliability, not relationships. CRM features (notes, tags, campaigns) would dilute the no-show prevention focus. |
| 4 | Historical performance analytics | Dashboard shows current-state metrics. Time-series analytics (trends, cohort analysis) are premature before PMF. |
| 5 | Multi-location / franchise support | Single-shop model. Multi-tenant would require org hierarchy, permissions, and cross-shop reporting. Revisit after 100+ paying shops. |
| 6 | In-app chat or messaging | SMS and email are the communication channels. Real-time chat adds infrastructure cost for minimal no-show prevention value. |
| 7 | Marketplace / discovery | Astro is a tool for existing businesses, not a booking marketplace. Customers arrive via the shop's direct link. |
| 8 | Re-engagement campaigns | Landing page mentions "win back clients on autopilot" but this is aspirational — not implemented. Revisit after core loop is validated. |
| 9 | Mobile app | Web-first. The dashboard is responsive. A native app would double maintenance surface for the same features. |
| 10 | Internationalization / i18n | English only. Multi-language would require template translation, locale-aware formatting, and translated UI. Revisit for non-English markets. |

## 5. Key Decisions & Rationale

| Decision | Alternative considered | Why this was chosen | Revisit when |
|----------|----------------------|--------------------|-----------------| 
| Twilio via REST API (no SDK) | Twilio Node SDK | Lighter dependency, fewer abstraction layers, direct control over request/response | SDK adds features we need (e.g., signature validation is manual today) |
| Better Auth (not NextAuth/Clerk) | NextAuth v5, Clerk | Better Auth is self-hosted, no vendor lock-in, Drizzle adapter built-in, rate limiting included | Better Auth ecosystem matures or breaks compatibility |
| Single pricing plan | Freemium, tiered plans | Reduces decision friction during trial conversion. One plan = one value prop. | Revenue data shows segment-specific willingness to pay |
| Token-based self-service (no customer accounts) | Customer login/accounts | Reduces friction for infrequent bookers. No password reset, no account management. | Customers need persistent features (history, preferences) |
| Nightly batch scoring (not real-time) | Score on every appointment event | Simpler, cheaper, avoids scoring race conditions during concurrent bookings | Score staleness causes visible policy errors |

> **Why no CMS?** Content changes are infrequent — the landing page updates quarterly at most. A CMS would add auth, hosting, content modelling, and preview infrastructure for ~10 pages of static copy. All content is developer-managed in JSX. Revisit if a non-technical team member needs to update content without deploys.

## 6. Success Criteria

| # | Criterion | Measurement | Owner |
|---|-----------|-------------|-------|
| 1 | ≥5 new trial signups per month | Registration count in `user` table | Growth |
| 2 | ≥60% trial-to-paid conversion | Stripe subscription activation vs registration | Growth |
| 3 | 100% SMS/email delivery for confirmations and reminders | `messageLog` status != "failed" rate | System (`send-reminders`, `send-confirmations` cron jobs) |
| 4 | Lighthouse mobile performance ≥ 90 | Lighthouse CI on landing page and booking page | Build pipeline |
| 5 | Zero double-refunds | `stripeRefundId` idempotency check in `stripe-refund.ts` never bypassed | Code review |
| 6 | Slot recovery fills ≥50% of cancelled paid slots | `slotOpenings` status="filled" / total created | `offer-loop` job |
| 7 | All cron jobs complete without concurrent overlap | Advisory lock acquisition rate (skip = acceptable, crash = not) | Each `api/jobs/*` route |
| 8 | Manage token shown exactly once | Raw token returned only in booking creation response, never re-fetchable | `manage-tokens.ts` |
| 9 | Customer score accuracy within 24h of last appointment | `customerScores.computedAt` < 24h after latest `appointments.resolvedAt` | `recompute-scores` cron |
| 10 | Onboarding to first booking ≤ 20 minutes | Time from registration to first `appointments` row | Onboarding flow |

## 7. Tone, Voice & Content Constraints

**Brand voice:** Professional, protective, action-oriented. Speaks to the shop owner as a peer, not a customer. Emphasizes financial control and automation over manual work.

**Language patterns:**
- Direct benefit statements: "Stop losing money," "Never lose revenue," "Your calendar fills itself"
- Confidence signals: "automatically," "instantly," "zero manual follow-up"
- Financial clarity: "you've already been paid," "deposit retained," "full refund issued"

**Required copy:**
- Cancellation manage page must state refund eligibility explicitly before the cancel button: "If you cancel now, you'll receive a full refund of [amount]" or "Your deposit will be retained per the cancellation policy"
- SMS messages must include opt-out instructions: "Reply STOP to opt out"
- Post-cancellation confirmation must state refund timeline: "Refunds typically appear within 5-10 business days"

**Design identity:** "The Modern Atelier" — editorial feel, warm neutrals, generous whitespace, no harsh borders. See `docs/design-system/` for full specification.

## 8. Tech Stack (Justification Only)

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router) | Server Components reduce client JS; file-based routing matches the simple page structure |
| Database | PostgreSQL 18 + Drizzle ORM | Relational model fits appointment/customer/payment domain; advisory locks for cron concurrency |
| Auth | Better Auth | Self-hosted, no vendor lock-in, built-in rate limiting, Drizzle adapter |
| Payments | Stripe | Industry standard for deposit collection and automated refunds; webhook-driven status updates |
| SMS | Twilio (REST) | Programmable SMS with inbound handling for offer acceptance and opt-out compliance |
| Email | Resend | Simple transactional email API; no template builder overhead |
| Cache/Locks | Upstash Redis | Distributed locks for slot recovery cooldowns; session caching for auth |
| Calendar | Google Calendar API | Dominant calendar in target market; OAuth for owner-managed connection |
| Styling | Tailwind CSS + CSS custom properties | Token-based design system; no runtime CSS-in-JS cost |
| No CMS | — | See §5. Content is quarterly, developer-managed. |
| No mobile app | — | See §4 (#9). Web-first, responsive dashboard. |

> Full implementation detail is in `architecture-context.md`. This table explains choices, not mechanisms.
