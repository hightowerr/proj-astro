---
title: "Vertical Slice 7: Tiering + scoring (only after you have real outcomes)"
type: "shape-up"
status: "pitch"
appetite: "3 days"
owner: "PM/Tech Lead"
tech_stack:
  frontend:
    - "Next.js (App Router) + TypeScript"
    - "Tailwind + shadcn/ui"
  backend:
    - "Next.js Route Handlers"
    - "Postgres"
    - "Drizzle ORM (migrations)"
  infra:
    - "Vercel (deployment)"
  jobs:
    - "Vercel Cron (or scheduled trigger hitting an API route)"
  testing:
    - "Vitest"
    - "Playwright (1 E2E)"
principles:
  - "Score financial reliability, not attendance."
  - "Scoring is deterministic, explainable, and reproducible."
  - "Tier effects are limited and policy-safe (no hidden punishment)."
success_criteria:
  - "Each customer has a score and tier derived from policy outcomes."
  - "Tier is visible with a simple explanation (counts + dates)."
  - "Tier affects deposit requirements (risk higher; top optional/lower)."
  - "Offer loop can prioritise top tier deterministically."
---

# Pitch: Vertical Slice 7 — Tiering + scoring (only after you have real outcomes)

## Problem
Once you have policy-based outcomes (settled/refunded/voided) and a recovery loop, you’ll see a predictable pattern:
- a small set of customers are reliably “good”
- a smaller set are repeatedly costly (cancellations late, no payment completion, disputes later)

Without tiering, the business can’t apply stricter payment policies to risky behaviour or reward reliable customers. But if scoring is vague or AI-driven, you’ll create unfairness and distrust.

## Appetite
**3 days.** Hard stop. We will build deterministic scoring, basic tier rules, and one clear lever: deposit requirements.

## Solution
Introduce a deterministic scoring pipeline that produces:
- `score` (0–100)
- `tier` (`top | neutral | risk`)
- `explanation` (simple stats)

Use only signals we already control and can defend:
- policy outcomes
- cancellations relative to cutoff
- successful payment completions
- offer acceptance reliability (optional)

Then apply tier to:
- deposit requirement at booking
- prioritisation in the offer loop

No ML, no “AI decided you’re risky”.

---

## Scope

### In scope
- Customer score/tier computation (deterministic)
- Scheduled recompute (nightly) + on-event recompute (optional)
- Dashboard visibility: score + tier + explanation
- Tier affects booking payment rules:
  - risk → higher deposit / full prepay (configurable)
  - top → lower deposit or deposit waived (configurable)
- Offer loop ordering uses tier then score

### Out of scope (explicit)
- Multi-armed bandits / optimisation
- Dynamic policy experiments
- Disputes/chargebacks modelling (can be added later)
- Complex customer segmentation (LTV, services, etc.)
- Hard bans / blacklists (unless explicitly added later)

---

## Scoring model (deterministic, explainable)

### Inputs (per customer, per shop)
Over a rolling window (default 180 days):
- `settled_count`
- `refunded_count` (customer cancelled refundable)
- `cancelled_no_refund_count` (customer cancelled after cutoff, deposit retained)
- `voided_count` (payment required but not captured / abandoned flow)
- `offers_accepted_count` (optional)
- `offers_expired_count` (optional)
- `last_activity_at`

### Score calculation (example)
Score components:
- **Completion reliability** (weight 60%)
  - based on how often bookings end as `settled` vs `voided`
- **Cancellation discipline** (weight 30%)
  - refundable cancellations are mild negative
  - after-cutoff cancellations are stronger negative (they waste capacity even if money is kept)
- **Recency** (weight 10%)
  - recent good behaviour matters more

Example mapping:
- Start at 50
- +10 per settled (cap)
- -20 per voided
- -5 per refundable cancellation
- -10 per after-cutoff cancellation
- Apply recency multiplier (e.g. events in last 30d count 2×, 31–90d 1×, >90d 0.5×)
- Clamp 0–100

This isn’t “the right” formula. It’s:
- stable
- easy to reason about
- adjustable without breaking semantics

### Tier rules (simple)
- `top`: score ≥ 80 AND voided_count == 0 in last 90 days
- `risk`: score < 40 OR voided_count ≥ 2 in last 90 days
- else `neutral`

**Important:** tier is per shop, not global, unless you decide otherwise later.

---

## Data model

### New table: `customer_scores`
- `customer_id` uuid pk fk
- `shop_id` uuid fk
- `score` int not null
- `tier` enum: `top | neutral | risk`
- `window_days` int not null default 180
- `stats` jsonb not null (counts used to compute score)
- `computed_at` timestamptz not null

Optional (but helpful for debugging):
- `customer_score_history` (snapshots over time)

### Extend `shop_policies` (tier overrides)
Add optional overrides:
- `risk_payment_mode` enum: `deposit | full_prepay`
- `risk_deposit_amount_cents` int null
- `top_deposit_waived` boolean default false
- `top_deposit_amount_cents` int null

If overrides are null, fall back to base policy.

---

## Backend design

### Recompute job
Route (cron-triggered):
- `POST /api/jobs/recompute-scores`

Algorithm:
1. For each shop (or a single shop in MVP), find active customers
2. Aggregate counts from appointments/events within window
3. Compute score + tier
4. Upsert into `customer_scores`

Idempotent by design: same inputs → same output.

### On-event recompute (optional)
When any of these happen:
- appointment created with payment required
- payment succeeded/failed
- appointment cancelled
- outcome resolved

…enqueue recompute for that customer. If it’s too much, skip and rely on nightly.

### Booking pricing selection
During booking payment intent creation (Slice 2):
- load customer_score (if exists)
- apply tier overrides to determine required payment and amount
- record applied policy_version snapshot (including tier-derived amount)

This is critical: **store what was applied**, don’t recompute later.

### Offer loop ordering
When building eligible list (Slice 6):
- sort by:
  1) tier priority: top > neutral > risk (risk might be excluded entirely)
  2) score desc
  3) recency desc

Still deterministic.

---

## Frontend changes

### Business: customer list
Add `/app/customers`
- name
- tier badge
- score
- short explanation (e.g. “Settled: 6, Voided: 0, Late cancels: 1”)

### Business: policy settings
Minimal UI toggles:
- Risk tier requires higher deposit (amount)
- Top tier deposit waived (toggle)

If UI is too much, seed policy settings in DB and expose read-only UI.

### Booking UI
Show the deposit amount clearly.
If tier changes deposit:
- show “Deposit £X (based on booking policy)” without calling out “because you’re risk”.

Avoid “punishment copy”.

---

## Risks and rabbit holes

### 1) Scoring becomes moral judgment
Risk: businesses will interpret “risk” as “bad person”.
Mitigation:
- name it “Payment reliability” internally
- show stats, not vibes
- make thresholds configurable later

### 2) Gaming / edge cases
Risk: customer completes payment then cancels after cutoff repeatedly (money kept but capacity wasted).
Mitigation:
- penalise late cancellations separately from voided
- allow businesses to exclude risk tier from offers

### 3) Sparse data
Risk: new customers have no history.
Mitigation:
- default tier = neutral
- show “insufficient history” message

### 4) Policy drift
Risk: score computed with one policy but later policy changes.
Mitigation:
- scoring based on outcomes + timestamps, not current policy
- booking always references policy_version applied at time

---

## Definition of Done

### Functional
- ✅ Customer scores computed nightly
- ✅ Dashboard shows tier + score + explanation
- ✅ Booking deposit amount changes according to tier overrides
- ✅ Offer loop prioritises top tier deterministically

### Correctness
- ✅ Same data recomputes to same score (deterministic)
- ✅ Tier changes are explainable via stored stats
- ✅ Applied deposit rules are snapshot at booking time

### Delivery
- ✅ Cron job runs in deployed environment
- ✅ Tests pass in CI

---

## QA plan

### Unit tests (Vitest)
- Score function:
  - higher settled increases score
  - voided decreases score strongly
  - late cancellations penalise
  - clamp 0–100
- Tier mapping boundaries:
  - score 80+ → top (with constraints)
  - score < 40 → risk

### Integration tests
- Recompute job upserts expected `customer_scores`
- Booking payment intent uses tier overrides and stores policy snapshot

### E2E (Playwright)
Scenario: risk tier increases deposit
1. Seed customer with history producing `risk` tier
2. Run recompute scores job
3. Book slot as that customer
4. Assert deposit amount in UI matches risk override
5. Complete payment and assert booking created

---

## Cut list (if time runs out)
In order:
1. Customer list UI → show tier on appointment rows only
2. Tier overrides UI → DB seeded settings only
3. On-event recompute → nightly only
4. Offer loop prioritisation → ignore tier until next iteration
