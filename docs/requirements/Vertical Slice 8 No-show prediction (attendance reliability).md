---
title: "Vertical Slice 8: No-show prediction (attendance reliability)"
type: "shape-up"
status: "pitch"
appetite: "2 days"
owner: "PM/Tech Lead"
dependencies:
  - "Slice 7 (Tiering + scoring must be complete)"
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
    - "Vercel Cron (reminder job)"
  testing:
    - "Vitest (unit tests for scoring logic)"
    - "Playwright (1 E2E for reminder flow)"
principles:
  - "Score attendance reliability, not character."
  - "Scoring is deterministic, explainable, and reproducible."
  - "Predictions inform actions, not punishments."
  - "Integrate with Slice 7 tiers for holistic customer view."
success_criteria:
  - "Each appointment has a no-show risk score and tier."
  - "Business dashboard shows risk badges and customer history."
  - "High-risk customers receive automatic reminder SMS."
  - "Slot recovery offer loop can filter/prioritize by no-show risk."
  - "Predictions are explainable with visible stats."
---

# Pitch: Vertical Slice 8 — No-show prediction (attendance reliability)

## Problem

After Slice 7 (financial tiering), businesses can identify customers who are reliable with **payments**. But payment reliability doesn't equal attendance reliability.

A customer might:
- Always pay deposits on time but frequently cancel last-minute
- Have perfect payment history but no-show 30% of the time
- Be financially "top tier" but attendance "high risk"

**Research shows no-show rates reach 40-60% in appointment-based businesses** (dental, medical, services). The strongest predictors of no-shows are:
1. **Lead time** (short-notice bookings are riskiest)
2. **Historical no-show patterns** (past behavior predicts future behavior)
3. **Time of day** (early morning appointments have higher no-show rates)

Without attendance prediction:
- Businesses can't send targeted reminders to high-risk customers
- Slot recovery offers go to customers likely to no-show again (wasting capacity)
- Dashboard provides no signal for proactive intervention

## Appetite

**2 days.** Hard stop.

We will build:
- Deterministic no-show scoring (no ML)
- Minimal dashboard integration (badges + tooltips)
- Basic reminder automation (SMS for high-risk)
- Slot recovery filtering (optional parameter)

We will NOT build:
- ML models or feature engineering pipelines
- Complex customer segmentation
- Real-time prediction updates
- Customer-facing risk displays

## Solution

Introduce a **deterministic no-show risk scoring system** that produces:
- `noShowScore` (0–100, higher = better attendance)
- `noShowRisk` (low | medium | high)
- `explanation` (simple stats: "3 no-shows in last 10 appointments")

Use only signals we already track:
- Historical appointment outcomes (completed, cancelled, no-showed)
- Lead time (days from booking to appointment)
- Time of day
- Payment status

Then apply the prediction to:
- **Dashboard visibility** (show risk badge, customer history)
- **Automated reminders** (SMS 24h before high-risk appointments)
- **Slot recovery prioritization** (filter out or deprioritize high-risk customers)

No ML. No "AI decided you're unreliable". Just transparent, explainable math.

### Core User Journey

**Business perspective:**
1. Book appointment → system calculates no-show risk immediately
2. Dashboard shows: `🟢 Low Risk` or `🔴 High Risk` badge
3. Click appointment → see customer history: "4 of 5 attended (80%)"
4. High-risk appointments → automatic SMS reminder sent 24h before

**Customer perspective:**
1. Book appointment normally
2. If high-risk → receive SMS: "Reminder: Your appointment tomorrow at 2 PM. [Confirm link]"
3. No visible "risk score" or punitive messaging

**System perspective:**
1. Nightly cron job recomputes all customer no-show stats
2. Resolver job detects no-shows (appointments that ended without cancellation)
3. Offer loop deprioritizes customers with high no-show risk

---

## Scope

### In scope
- No-show risk calculation at booking creation
- Nightly recompute job (updates all customer stats)
- Dashboard column showing risk badges (🟢 Low / 🟡 Medium / 🔴 High)
- Appointment detail page: customer history (last 5 appointments)
- Automated reminder SMS job (24h before high-risk appointments)
- Slot recovery integration (optional filter to exclude high-risk)
- Customer no-show stats tracking (new table)

### Out of scope (explicit)
- ML models (Logistic Regression, Random Forests, Gradient Boosting)
- Real-time score updates (nightly batch only)
- Customer-facing risk scores (business-only visibility)
- Complex segmentation (by service type, appointment reason, etc.)
- External signals (weather, holidays, traffic)
- Demographic data (age, occupation, distance from clinic)
- Customer list page (can add later)
- Hard bans or blacklists

---

## Scoring Model (Deterministic, Explainable)

### Inputs (per customer, per shop)

Over a rolling 180-day window:
- `total_appointments` — Total appointments in window
- `no_show_count` — Appointments where `status='booked'` but `endsAt` passed without cancellation
- `late_cancel_count` — Cancelled after cutoff (deposit retained)
- `on_time_cancel_count` — Cancelled before cutoff (refund issued)
- `completed_count` — Appointments that completed (status='ended', financialOutcome='settled')
- `last_no_show_at` — Timestamp of most recent no-show

### Score Calculation

**Base formula:**
```
Base score: 75

Per appointment outcome (in 180-day window):
  +5 for each completed appointment (capped at +25 total)
  -15 for each no-show
  -5 for each late cancellation
  -2 for each on-time cancellation

Recency multiplier (apply to penalties):
  Events in last 30 days: 1.5x impact
  Events 31-90 days: 1.0x impact
  Events 91-180 days: 0.5x impact

Final score: clamp(0, 100, base + adjustments)
```

**For the CURRENT appointment, also factor in:**
- **Lead time**: If booking <24h before appointment: -10 points
- **Time of day**: If appointment 6-9 AM: -5 points (research shows higher no-show)
- **Payment status**: If no payment required: -5 points (less commitment)

**Example:**
```
Customer history (last 180 days):
  - 6 completed appointments
  - 2 no-shows (1 recent, 1 old)
  - 1 late cancellation

Calculation:
  Base: 75
  Completed: +5 × 6 = +25 (capped at +25)
  No-shows: -15 × 1.5 (recent) + -15 × 0.5 (old) = -30
  Late cancel: -5 × 1.0 = -5

  Score: 75 + 25 - 30 - 5 = 65

Current appointment adjustments:
  Lead time 3 days: no penalty
  Time of day 2 PM: no penalty
  Payment required: no penalty

  Final score: 65 (medium risk)
```

This isn't "the perfect" formula. It's:
- Stable (same inputs → same output)
- Easy to reason about (explainable in UI)
- Adjustable (weights can be tuned without breaking semantics)

### Tier Rules (Simple)

- `low`: score ≥ 70 **AND** `no_show_count == 0` in last 90 days
- `high`: score < 40 **OR** `no_show_count ≥ 2` in last 90 days
- `medium`: everything else

**Important:** Tier is per shop. Multi-shop customers have independent scores.

---

## Data Model

### New Table: `customer_no_show_stats`

```sql
CREATE TABLE customer_no_show_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  window_days INT NOT NULL DEFAULT 180,

  -- Aggregated counts (rolling window)
  total_appointments INT NOT NULL DEFAULT 0,
  no_show_count INT NOT NULL DEFAULT 0,
  late_cancel_count INT NOT NULL DEFAULT 0,
  on_time_cancel_count INT NOT NULL DEFAULT 0,
  completed_count INT NOT NULL DEFAULT 0,

  -- Temporal tracking
  last_no_show_at TIMESTAMPTZ,
  last_appointment_at TIMESTAMPTZ,

  -- Metadata
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(customer_id, shop_id)
);

CREATE INDEX idx_customer_no_show_stats_shop
  ON customer_no_show_stats(shop_id);

CREATE INDEX idx_customer_no_show_stats_customer
  ON customer_no_show_stats(customer_id);

CREATE INDEX idx_customer_no_show_stats_computed
  ON customer_no_show_stats(computed_at);
```

**Why this table exists:**
- Precompute expensive aggregations (avoid scanning all appointments on every booking)
- Store explanations (can show "3 no-shows in last 10")
- Enable fast dashboard queries

### Extend `appointments` Table

```sql
ALTER TABLE appointments
  ADD COLUMN no_show_score INT,
  ADD COLUMN no_show_risk TEXT CHECK (no_show_risk IN ('low', 'medium', 'high')),
  ADD COLUMN no_show_computed_at TIMESTAMPTZ;

CREATE INDEX idx_appointments_no_show_risk
  ON appointments(no_show_risk) WHERE no_show_risk IS NOT NULL;
```

**Why store on appointment:**
- Snapshot score at booking time (don't recompute later)
- Fast dashboard filtering ("show me high-risk appointments")
- Audit trail (see what the prediction was when booking happened)

### Extend `message_purpose` Enum

```sql
ALTER TYPE message_purpose
  ADD VALUE 'appointment_reminder_24h';

ALTER TYPE message_purpose
  ADD VALUE 'high_risk_confirmation';
```

**Usage:**
- `appointment_reminder_24h`: Automated reminder sent 24h before appointment
- `high_risk_confirmation`: Optional immediate confirmation request for high-risk bookings

---

## Backend Design

### Route 1: Recompute No-Show Stats (Nightly Cron Job)

**Endpoint:** `POST /api/jobs/recompute-no-show-stats`
**Trigger:** Vercel Cron (nightly at 2 AM UTC)
**Auth:** `x-cron-secret` header (same pattern as resolve-outcomes)

**Algorithm:**
```typescript
1. For each shop:
   a. Get all unique customers with appointments in last 180 days
   b. For each customer:
      - Count appointments by outcome (completed, no-show, late cancel, etc.)
      - Find last_no_show_at timestamp
      - Upsert into customer_no_show_stats

2. Return summary: { shopsProcessed, customersUpdated, errors }
```

**Idempotency:** Same data produces same stats. Safe to re-run.

**Implementation notes:**
- Batch process (don't load all customers into memory)
- Use Drizzle `.onConflictDoUpdate()` for upsert
- Handle edge case: customer with no appointments (delete their stats)

### Route 2: Send Reminder SMS (Hourly Cron Job)

**Endpoint:** `POST /api/jobs/send-reminders`
**Trigger:** Vercel Cron (every hour)
**Auth:** `x-cron-secret` header

**Algorithm:**
```typescript
1. Find appointments where:
   - startsAt between now+23h and now+25h (1-hour window around 24h before)
   - status = 'booked'
   - no_show_risk = 'high'
   - customer.smsOptIn = true

2. For each appointment:
   a. Check messageLog: skip if reminder already sent
   b. Send SMS via Twilio:
      "Reminder: Your appointment tomorrow at [time] at [shop].
       Manage booking: [link]"
   c. Log in messageLog with purpose='appointment_reminder_24h'

3. Return summary: { remindersSent, skipped, errors }
```

**Deduplication:** Use `messageLog` to prevent duplicate SMS.

**Timezone handling:**
- startsAt stored in UTC
- Calculate "24h before" in UTC
- Format SMS time in shop timezone

### Integration: Booking Creation

**File:** `src/app/api/bookings/create/route.ts`

After appointment is created, calculate initial no-show score:

```typescript
import { calculateNoShowRisk } from "@/lib/no-show-scoring";

// After appointment created...
const appointment = await createAppointment({ ... });

// Load customer stats (might be null for new customers)
const stats = await db.query.customerNoShowStats.findFirst({
  where: and(
    eq(customerNoShowStats.customerId, customer.id),
    eq(customerNoShowStats.shopId, shop.id)
  )
});

// Calculate score
const leadTimeHours = (appointment.startsAt.getTime() - Date.now()) / 3600000;
const { score, risk, explanation } = calculateNoShowRisk({
  stats,
  leadTimeHours,
  timeOfDay: appointment.startsAt.getHours(),
  paymentRequired: appointment.paymentRequired,
});

// Update appointment with prediction
await db.update(appointments)
  .set({
    noShowScore: score,
    noShowRisk: risk,
    noShowComputedAt: new Date()
  })
  .where(eq(appointments.id, appointment.id));
```

### Integration: Slot Recovery

**File:** `src/lib/slot-recovery.ts`

Enhance `getEligibleCustomers()` to accept optional filters:

```typescript
interface GetEligibleCustomersOptions {
  slotOpeningId: string;
  excludeHighNoShowRisk?: boolean; // NEW
  prioritizeByNoShowScore?: boolean; // NEW
}

export async function getEligibleCustomers(
  options: GetEligibleCustomersOptions
) {
  const { excludeHighNoShowRisk, prioritizeByNoShowScore } = options;

  // In query construction...
  const query = db
    .select({ /* ... */ })
    .from(customers)
    .leftJoin(customerNoShowStats, /* ... */)
    .where(and(
      // Existing filters (sms_opt_in, no overlaps, etc.)
      existingFilters,

      // NEW: Optionally exclude high no-show risk
      excludeHighNoShowRisk
        ? or(
            isNull(customerNoShowStats.noShowCount),
            sql`${customerNoShowStats.noShowCount} < 2`
          )
        : undefined
    ))
    .orderBy(
      prioritizeByNoShowScore
        ? desc(customerNoShowStats.completedCount) // Proxy for low risk
        : undefined
    );

  return await query;
}
```

**Usage in offer loop:**
```typescript
// Get customers, excluding high no-show risk
const eligible = await getEligibleCustomers({
  slotOpeningId: opening.id,
  excludeHighNoShowRisk: true, // NEW
  prioritizeByNoShowScore: true // NEW
});
```

### Integration: Outcome Resolver (No-Show Detection)

**File:** `src/app/api/jobs/resolve-outcomes/route.ts`

After resolving financial outcomes, detect no-shows:

```typescript
// After existing resolution logic...

// Find appointments that ended but weren't cancelled
const potentialNoShows = await db
  .select()
  .from(appointments)
  .where(and(
    eq(appointments.status, 'booked'),
    sql`${appointments.endsAt} <= now() - interval '30 minutes'`,
    isNull(appointments.cancelledAt)
  ));

// These are no-shows (customer didn't cancel, appointment ended)
// Update customer stats
for (const apt of potentialNoShows) {
  await db
    .update(customerNoShowStats)
    .set({
      noShowCount: sql`${customerNoShowStats.noShowCount} + 1`,
      lastNoShowAt: new Date(),
      computedAt: new Date()
    })
    .where(and(
      eq(customerNoShowStats.customerId, apt.customerId),
      eq(customerNoShowStats.shopId, apt.shopId)
    ));

  // Mark appointment as ended (existing resolver does this)
  await db
    .update(appointments)
    .set({ status: 'ended' })
    .where(eq(appointments.id, apt.id));
}
```

**Critical constraint:** Only count as no-show if `status='booked'` (not cancelled). Resolver safety rule applies.

---

## Frontend Changes

### Dashboard: Appointments List

**File:** `src/app/app/appointments/page.tsx`

Add "No-Show Risk" column:

```tsx
<TableHead>No-Show Risk</TableHead>

// In table row...
<TableCell>
  {appointment.noShowRisk ? (
    <div className="flex items-center gap-2">
      <Badge variant={
        appointment.noShowRisk === 'low' ? 'success' :
        appointment.noShowRisk === 'medium' ? 'warning' :
        'destructive'
      }>
        {appointment.noShowRisk === 'low' && '🟢'}
        {appointment.noShowRisk === 'medium' && '🟡'}
        {appointment.noShowRisk === 'high' && '🔴'}
        {' '}
        {appointment.noShowRisk}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {appointment.noShowScore}/100
      </span>
    </div>
  ) : (
    <span className="text-xs text-muted-foreground">N/A</span>
  )}
</TableCell>
```

**Tooltip on hover:**
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Badge>🟡 medium</Badge>
    </TooltipTrigger>
    <TooltipContent>
      <p>Score: 65/100</p>
      <p>3 completed, 1 no-show in last 180 days</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Dashboard: Appointment Detail Page

**File:** `src/app/app/appointments/[id]/page.tsx`

Add section showing customer no-show history:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Customer Attendance History</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Binary sequence visualization */}
    <div className="flex gap-1 mb-4">
      {lastFiveAppointments.map((apt, i) => (
        <div
          key={i}
          className={cn(
            "w-8 h-8 rounded flex items-center justify-center text-sm",
            apt.status === 'ended' ? "bg-green-100 text-green-700" :
            apt.status === 'cancelled' ? "bg-gray-100 text-gray-700" :
            "bg-red-100 text-red-700"
          )}
        >
          {apt.status === 'ended' ? '✅' :
           apt.status === 'cancelled' ? '🚫' :
           '❌'}
        </div>
      ))}
    </div>

    {/* Stats summary */}
    <p className="text-sm text-muted-foreground">
      {completedCount} of {totalCount} attended ({attendanceRate}%)
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      Last 5 appointments shown (most recent first)
    </p>
  </CardContent>
</Card>
```

**Query for last 5 appointments:**
```typescript
const lastFive = await db
  .select()
  .from(appointments)
  .where(eq(appointments.customerId, appointment.customerId))
  .orderBy(desc(appointments.startsAt))
  .limit(5);
```

---

## Integration with Slice 7 (Tiering + Scoring)

### Offer Loop Prioritization (Combined Signals)

When building eligible customers for slot recovery offers, sort by:

```typescript
// Pseudo-code for sorting logic
customers.sort((a, b) => {
  // 1. Financial tier (from Slice 7 customer_scores.tier)
  const tierOrder = { top: 3, neutral: 2, risk: 1 };
  if (a.financialTier !== b.financialTier) {
    return tierOrder[b.financialTier] - tierOrder[a.financialTier];
  }

  // 2. No-show risk (this slice)
  const riskOrder = { low: 3, medium: 2, high: 1 };
  if (a.noShowRisk !== b.noShowRisk) {
    return riskOrder[b.noShowRisk] - riskOrder[a.noShowRisk];
  }

  // 3. No-show score (higher = better)
  if (a.noShowScore !== b.noShowScore) {
    return b.noShowScore - a.noShowScore;
  }

  // 4. Recency (more recent last appointment = higher priority)
  return b.lastAppointmentAt - a.lastAppointmentAt;
});
```

**Result:** Top-tier, low-risk customers get first offers. High financial risk + high no-show risk customers are last (or excluded).

### Dashboard Display (Both Badges)

Show both signals in dashboard:

```tsx
<div className="flex gap-2">
  {/* Financial tier from Slice 7 */}
  <Badge variant={
    customer.tier === 'top' ? 'default' :
    customer.tier === 'risk' ? 'destructive' :
    'secondary'
  }>
    💰 {customer.tier}
  </Badge>

  {/* No-show risk from Slice 8 */}
  <Badge variant={
    appointment.noShowRisk === 'low' ? 'success' :
    appointment.noShowRisk === 'high' ? 'destructive' :
    'warning'
  }>
    {appointment.noShowRisk === 'low' && '🟢'}
    {appointment.noShowRisk === 'medium' && '🟡'}
    {appointment.noShowRisk === 'high' && '🔴'}
    {' '}
    {appointment.noShowRisk}
  </Badge>
</div>
```

**Example combinations:**
- `[💰 top] [🟢 low]` = Best customer (reliable payment + attendance)
- `[💰 top] [🔴 high]` = Pays well but often no-shows
- `[💰 risk] [🟢 low]` = Payment issues but reliable attendance
- `[💰 risk] [🔴 high]` = Risky across the board

### Reminder System Interaction

Could implement "double confirmation" for worst combinations:

```typescript
// In send-reminders job...
const needsExtraConfirmation =
  customer.tier === 'risk' &&
  appointment.noShowRisk === 'high';

if (needsExtraConfirmation) {
  // Send earlier reminder (48h before instead of 24h)
  // Or require explicit confirmation click
}
```

**For MVP:** Just send standard reminder for high no-show risk (Slice 7 tier doesn't affect reminder logic).

---

## Risks and Rabbit Holes

### 1) Sparse Data (New Customers)

**Risk:** New customers have no history, can't compute meaningful score.

**Mitigation:**
- Default: `score=50`, `risk='medium'`
- UI shows: "Insufficient data (new customer)"
- After 3 appointments, use actual data
- Don't penalize businesses for accepting new customers

### 2) Punitive Perception

**Risk:** Customers discover they're "high-risk" and feel targeted/judged.

**Mitigation:**
- **Never** show risk score to customers
- Reminder SMS is framed positively: "Reminder: Your appointment tomorrow..."
- No "You're high-risk" or "We don't trust you" language
- Business-facing only (internal dashboard)

### 3) Reminder Fatigue

**Risk:** Too many SMS annoys customers, reduces effectiveness.

**Mitigation:**
- Only send for high-risk appointments (not all)
- Respect `smsOptIn` preference strictly
- Dedup in `messageLog` (no duplicates)
- Limit to one reminder per appointment (not multiple)

### 4) Timezone Complexity

**Risk:** "24h before" calculation breaks across timezones.

**Mitigation:**
- Store `startsAt` in UTC (already done)
- Calculate reminder window in UTC
- Format SMS message time in shop timezone
- Test with shop in different timezone than server

### 5) No-Show Definition Ambiguity

**Risk:** What counts as a no-show vs. late cancel vs. completed?

**Mitigation:**
- **No-show** = `status='booked'` AND `endsAt < now` AND `cancelledAt IS NULL`
- **Late cancel** = `cancelledAt IS NOT NULL` AND `cancelledAt > cutoffTime`
- **Completed** = `status='ended'` AND `financialOutcome='settled'`
- Document in code comments
- Unit test edge cases

### 6) Gaming the System

**Risk:** Businesses could manipulate scores to exclude customers unfairly.

**Mitigation:**
- Scoring formula is transparent (businesses understand it)
- Stats are factual (not subjective judgments)
- No manual score overrides (deterministic only)
- Audit trail: `customer_no_show_stats.computed_at` timestamp

### 7) Policy Drift

**Risk:** Score computed under one policy, but policy changes later.

**Mitigation:**
- No-show detection based on appointment outcome, not policy
- Score snapshot at booking time (`appointments.no_show_computed_at`)
- Recompute nightly uses current policy for cutoff calculations
- Historical scores don't retroactively change

---

## Definition of Done

### Functional
- ✅ Customer no-show stats computed nightly for all shops
- ✅ New appointments get initial no-show score at booking time
- ✅ Dashboard shows no-show risk badges on appointments list
- ✅ Appointment detail page shows customer history (last 5 appointments)
- ✅ High-risk appointments trigger reminder SMS 24h before
- ✅ Slot recovery can exclude high-risk customers (optional param)
- ✅ Predictions are explainable (tooltip shows stats)

### Correctness
- ✅ Same data recomputes to same score (deterministic)
- ✅ No-shows correctly identified in resolver job
- ✅ Reminders don't duplicate (messageLog dedup works)
- ✅ Timezone handling correct for reminder timing
- ✅ New customers default to medium risk (don't break)
- ✅ Score snapshots at booking time (immutable)

### Delivery
- ✅ Cron jobs deployed and running in Vercel
- ✅ Database migration applied successfully
- ✅ All tests pass in CI (unit + integration + E2E)
- ✅ No breaking changes to existing slices

---

## QA Plan

### Unit Tests (Vitest)

**File:** `src/lib/__tests__/no-show-scoring.test.ts`

Test cases:
```typescript
describe('calculateNoShowRisk', () => {
  it('returns medium risk for new customers with no history', () => {
    const result = calculateNoShowRisk({
      stats: null,
      leadTimeHours: 48,
      timeOfDay: 14,
      paymentRequired: true
    });

    expect(result.score).toBe(50);
    expect(result.risk).toBe('medium');
  });

  it('returns low risk for customers with perfect attendance', () => {
    const result = calculateNoShowRisk({
      stats: {
        totalAppointments: 5,
        completedCount: 5,
        noShowCount: 0,
        lateCancelCount: 0,
        onTimeCancelCount: 0
      },
      leadTimeHours: 48,
      timeOfDay: 14,
      paymentRequired: true
    });

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.risk).toBe('low');
  });

  it('returns high risk for customers with 2+ recent no-shows', () => {
    const result = calculateNoShowRisk({
      stats: {
        totalAppointments: 5,
        completedCount: 3,
        noShowCount: 2,
        lateCancelCount: 0,
        onTimeCancelCount: 0,
        lastNoShowAt: new Date(Date.now() - 15 * 24 * 3600000) // 15 days ago
      },
      leadTimeHours: 48,
      timeOfDay: 14,
      paymentRequired: true
    });

    expect(result.risk).toBe('high');
  });

  it('penalizes short lead time bookings', () => {
    const longLeadTime = calculateNoShowRisk({
      stats: { /* same stats */ },
      leadTimeHours: 168, // 7 days
      timeOfDay: 14,
      paymentRequired: true
    });

    const shortLeadTime = calculateNoShowRisk({
      stats: { /* same stats */ },
      leadTimeHours: 12, // 12 hours
      timeOfDay: 14,
      paymentRequired: true
    });

    expect(shortLeadTime.score).toBeLessThan(longLeadTime.score);
  });

  it('penalizes early morning appointments', () => {
    const afternoon = calculateNoShowRisk({
      stats: { /* same stats */ },
      leadTimeHours: 48,
      timeOfDay: 14, // 2 PM
      paymentRequired: true
    });

    const morning = calculateNoShowRisk({
      stats: { /* same stats */ },
      leadTimeHours: 48,
      timeOfDay: 7, // 7 AM
      paymentRequired: true
    });

    expect(morning.score).toBeLessThan(afternoon.score);
  });
});
```

### Integration Tests

**File:** `src/app/api/jobs/recompute-no-show-stats/route.test.ts`

Test cases:
```typescript
it('recomputes stats for all customers in shop', async () => {
  // Seed shop + customers + appointments
  const shop = await seedShop();
  const customer = await seedCustomer({ shopId: shop.id });
  await seedAppointments([
    { customerId: customer.id, status: 'ended' }, // completed
    { customerId: customer.id, status: 'ended' }, // completed
    { customerId: customer.id, status: 'booked', endsAt: past }, // no-show
  ]);

  // Run job
  await POST(createRequest({ shopId: shop.id }));

  // Assert stats updated
  const stats = await db.query.customerNoShowStats.findFirst({
    where: eq(customerNoShowStats.customerId, customer.id)
  });

  expect(stats.completedCount).toBe(2);
  expect(stats.noShowCount).toBe(1);
  expect(stats.totalAppointments).toBe(3);
});
```

**File:** `src/app/api/jobs/send-reminders/route.test.ts`

Test cases:
```typescript
it('sends reminder SMS for high-risk appointments 24h before', async () => {
  const tomorrow = new Date(Date.now() + 24 * 3600000);
  const appointment = await seedAppointment({
    startsAt: tomorrow,
    noShowRisk: 'high',
    status: 'booked'
  });
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, appointment.customerId)
  });

  // Run job
  await POST(createRequest());

  // Assert SMS sent
  const message = await db.query.messageLog.findFirst({
    where: and(
      eq(messageLog.appointmentId, appointment.id),
      eq(messageLog.purpose, 'appointment_reminder_24h')
    )
  });

  expect(message).toBeDefined();
  expect(message.status).toBe('sent');
  expect(message.toPhone).toBe(customer.phone);
});

it('does not send duplicate reminders', async () => {
  const tomorrow = new Date(Date.now() + 24 * 3600000);
  const appointment = await seedAppointment({
    startsAt: tomorrow,
    noShowRisk: 'high'
  });

  // Seed existing message
  await db.insert(messageLog).values({
    appointmentId: appointment.id,
    purpose: 'appointment_reminder_24h',
    status: 'sent'
  });

  // Run job
  const mockSend = jest.spyOn(twilioClient, 'sendSMS');
  await POST(createRequest());

  // Assert no SMS sent
  expect(mockSend).not.toHaveBeenCalled();
});
```

### E2E Test (Playwright)

**File:** `tests/e2e/no-show-reminder.spec.ts`

```typescript
test('high-risk customer receives reminder SMS 24h before appointment', async ({ page }) => {
  // 1. Seed customer with 2 no-shows in last 90 days
  const customer = await seedCustomer({
    fullName: 'Risky Customer',
    phone: '+1234567890',
    smsOptIn: true
  });
  await seedNoShowHistory(customer.id, {
    noShows: 2,
    completed: 1,
    withinDays: 90
  });

  // 2. Run recompute-no-show-stats job
  await runCronJob('/api/jobs/recompute-no-show-stats');

  // 3. Create appointment for tomorrow (startsAt = now + 24h)
  const tomorrow = new Date(Date.now() + 24 * 3600000);
  const booking = await createBooking({
    customer,
    startsAt: tomorrow,
    slot: { start: '14:00', duration: 30 }
  });

  // 4. Verify appointment.no_show_risk = 'high'
  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, booking.appointmentId)
  });
  expect(appointment.noShowRisk).toBe('high');
  expect(appointment.noShowScore).toBeLessThan(40);

  // 5. Run send-reminders job
  const twilioMock = mockTwilioSMS();
  await runCronJob('/api/jobs/send-reminders');

  // 6. Assert SMS sent to customer
  expect(twilioMock).toHaveBeenCalledWith(
    expect.objectContaining({
      to: customer.phone,
      body: expect.stringContaining('Reminder: Your appointment tomorrow')
    })
  );

  // Verify message logged
  const message = await db.query.messageLog.findFirst({
    where: and(
      eq(messageLog.appointmentId, appointment.id),
      eq(messageLog.purpose, 'appointment_reminder_24h')
    )
  });
  expect(message.status).toBe('sent');

  // 7. Run send-reminders job again
  twilioMock.mockClear();
  await runCronJob('/api/jobs/send-reminders');

  // 8. Assert no duplicate SMS sent
  expect(twilioMock).not.toHaveBeenCalled();
});
```

---

## Cut List (If Time Runs Out)

Priority order to drop (easiest to hardest to add later):

1. **Customer list page** (`/app/customers`)
   - Show stats on appointment rows only
   - Can add later as separate feature

2. **Appointment detail history visualization**
   - Just show score/badge in tooltip
   - Defer binary sequence `[✅❌✅✅]` UI to later

3. **Slot recovery integration**
   - Skip `excludeHighNoShowRisk` parameter
   - Offer loop uses default ordering (no no-show filtering)
   - Can add in next iteration

4. **Time-of-day adjustment**
   - Use simpler formula (history + lead time only)
   - Drop `-5 for 6-9 AM` penalty
   - Easier to explain without this

5. **24h reminder automation**
   - Skip automated job entirely
   - Add manual "Send Reminder" button in dashboard
   - Business clicks to send reminder

**Core must-haves (cannot cut):**
- No-show stats table
- Score calculation at booking
- Nightly recompute job
- Dashboard risk badges
- Basic explanation tooltip

---

## Background Research

This slice is inspired by the academic paper:

**"Predicting no-shows for dental appointments"**
Alabdulkarim et al., 2022, PeerJ Computer Science
DOI: 10.7717/peerj-cs.1147

**Key findings:**
- No-show rates reach 40-60% in appointment businesses
- Strongest predictors: lead time, historical no-show patterns, appointment time
- Best ML model: AUC 0.718 (68% accuracy)
- Binary sequence representation of history (e.g., `[1,0,1,1]`) outperforms simple percentages

**Our adaptation:**
- Use deterministic rules instead of ML models
- Focus on explainability over accuracy
- Integrate with existing financial tiering (Slice 7)
- Prioritize actionability (reminders, offer loop) over prediction precision

The paper is available at: `docs/requirements/peerj-cs-08-1147.md`
