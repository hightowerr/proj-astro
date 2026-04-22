CLAUDE.md - FULL TEAM PROJECT

### ## Project
* Booking & appointment management system
* Next.js 16, PostgreSQL, Stripe, Twilio SMS
* Requires `.env` (copy from `env.example`)
* Run scripts with `pnpm tsx --env-file=.env`
* Local Docker: `sudo docker compose up`

### ## Architecture
* Lifecycle: book → cancel/end → resolve
* Policies: Use `policyVersions` snapshot (never current)
* Tiers: top (score ≥80) → neutral → risk (score <40)
* Slot Recovery: Redis locks prevent duplicate offers
* Predictor: Risk levels based on void/settled ratio
* Cron Jobs: Secured via `x-cron-secret` header

### ## Code Conventions
* IDs: `uuid().defaultRandom()` (Better Auth uses text)
* Next.js: No `src/middleware.ts` (use `src/proxy.ts`)
* Next.js: No `dynamic` with ssr:false in page/layout
* Phones: Always use `libphonenumber-js`
* Run `pnpm lint && pnpm typecheck` after changes
* DB schema: `pnpm db:generate` then `db:migrate`

### ## Design System
* See `docs/design-system/` for all new UI
* Dashboard: Protected route (owner auth required)
* UI indicates no-show prediction risk levels
* Display tier distribution charts & analytics

### ## Content & Tone
* Self-service links: Tokenized, 90-day expiry
* Raw tokens shown only once (at booking)
* Emails: Transactional templates via Resend
* SMS: Real delivery in prod, magic numbers in test

---

### ## Rules
Hard constraints the whole team agreed on 
- "Never start dev server without asking" 
- "Never db:push in prod" 
- "Resolver MUST filter by status='booked'" 
- "Check stripeRefundId before refund" 
- "Set smsOptIn: true for test bookings"

---

### ## WHEN IT GETS LONG - SPLIT IT:

CLAUDE.md (the hub)
├── "See docs/context/product-rules.md for customer lifecycles and business logic"
├── "See docs/context/backend-architecture.md for automated jobs and database rules"
├── "See docs/context/env-setup.md for required services and environment variables"
├── "See docs\design-system\design-system.md for UI components and tone of voice"
└── "See docs\design-system\DESIGN.md for brand guidelines"