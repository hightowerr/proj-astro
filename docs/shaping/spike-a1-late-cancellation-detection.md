# Spike A1: Late Cancellation Detection

## Context

Shape A part A1.1 requires distinguishing between:
- **Refundable cancellations** (before cutoff) — mild penalty in scoring
- **After-cutoff cancellations** (late) — stronger penalty in scoring

We need to understand how to detect late cancellations from the database to aggregate them for scoring.

## Goal

Determine the best way to detect whether a cancellation was before or after the cutoff time, so we can:
1. Query for late cancellation counts in the scoring aggregation
2. Ensure the detection matches the actual cancellation logic
3. Avoid complex recomputation or timezone issues

## Questions

| # | Question |
|---|----------|
| **A1-Q1** | How are cancellations recorded in the database? |
| **A1-Q2** | How is the cutoff time calculated during cancellation? |
| **A1-Q3** | Is the before/after cutoff decision stored, or must it be recomputed? |
| **A1-Q4** | What's the simplest, most reliable way to detect late cancellations for scoring? |

## Investigation

### A1-Q1: How are cancellations recorded?

**Answer:** Cancellations are recorded in the `appointments` table with several key fields:

From schema.ts:318-332:
```typescript
status: "cancelled"
cancelledAt: timestamp          // When cancellation occurred
cancellationSource: text        // "customer" | "system" | "admin"
financialOutcome: enum          // "settled" | "voided" | "refunded"
resolutionReason: text          // Explains why this outcome
resolvedAt: timestamp           // When outcome was resolved
```

**Cancellation flow** (api/manage/[token]/cancel/route.ts):
1. Loads appointment + policy snapshot via `policyVersionId`
2. Calls `calculateCancellationEligibility()` to determine if refund eligible
3. If eligible: calls `processRefund()` → sets outcome
4. If not eligible: directly updates appointment → sets outcome

### A1-Q2: How is cutoff time calculated?

**Answer:** The cutoff is calculated in `calculateCancellationEligibility()` (cancellation.ts:17-53):

```typescript
const cutoffTime = addMinutes(appointmentStartsAt, -cancelCutoffMinutes);
const isBeforeCutoff = isBefore(now, cutoffTime);
```

**Inputs:**
- `appointmentStartsAt` — UTC timestamp from appointments table
- `cancelCutoffMinutes` — from policy snapshot (via `policyVersionId`)
- `now` — current time when cancellation happens

**Example:**
- Appointment at 2026-02-15 14:00 UTC
- Policy cutoff = 1440 minutes (24 hours)
- Cutoff time = 2026-02-14 14:00 UTC
- If cancelled at 2026-02-14 10:00 → before cutoff (eligible for refund)
- If cancelled at 2026-02-14 16:00 → after cutoff (deposit retained)

**Timezone handling:** All calculations in UTC. Display uses shop timezone for UI only.

### A1-Q3: Is the decision stored or recomputed?

**Answer:** ✅ **The decision IS stored** in `resolutionReason` field!

From outcomes.ts:35-58, there are specific resolution reasons for each cancellation type:

| Scenario | financialOutcome | resolutionReason |
|----------|------------------|------------------|
| Cancelled **before** cutoff (refunded) | `"refunded"` | `"cancelled_refunded_before_cutoff"` |
| Cancelled **after** cutoff (no refund) | `"settled"` | `"cancelled_no_refund_after_cutoff"` |
| Cancelled, payment never captured | `"voided"` | `"cancelled_no_payment_captured"` |

**Where set:**

1. **Before-cutoff cancellations** (stripe-refund.ts:91):
   ```typescript
   resolutionReason: "cancelled_refunded_before_cutoff"
   ```

2. **After-cutoff cancellations** (api/manage/[token]/cancel/route.ts:108):
   ```typescript
   resolutionReason: "cancelled_no_refund_after_cutoff"
   ```

**This is ground truth** — it captures the actual decision made at cancellation time, including any edge cases or policy nuances.

### A1-Q4: Best way to detect late cancellations?

**Answer:** Use `resolutionReason` directly — no computation needed!

**Recommended approach:**

```sql
-- Count late cancellations (after cutoff, deposit retained)
COUNT(*) FILTER (
  WHERE resolutionReason = 'cancelled_no_refund_after_cutoff'
) as cancelled_late_count

-- Count refundable cancellations (before cutoff, refunded)
COUNT(*) FILTER (
  WHERE resolutionReason = 'cancelled_refunded_before_cutoff'
) as cancelled_refunded_count

-- Count voided (payment never completed)
COUNT(*) FILTER (
  WHERE financialOutcome = 'voided'
) as voided_count
```

**Advantages:**
- ✅ No joins to `policyVersions` needed
- ✅ No recomputation of cutoff time
- ✅ Matches exact logic used during cancellation (including edge cases)
- ✅ Handles all timezone edge cases consistently
- ✅ Simple, fast query

**Alternative (NOT recommended):** Recompute from scratch by joining to `policyVersions` and comparing `cancelledAt` against computed cutoff. This is:
- ❌ More complex (requires join + date arithmetic)
- ❌ Could diverge from actual cancellation logic
- ❌ Slower (extra join, computation per row)
- ❌ Potential timezone bugs

## Findings

### What We Learned

1. **Cancellation outcomes are deterministic** — computed once at cancellation time and stored
2. **Resolution reason is ground truth** — captures the actual before/after cutoff decision
3. **No recomputation needed** — just filter by `resolutionReason` string
4. **Three cancellation types for scoring:**
   - `cancelled_refunded_before_cutoff` → mild penalty (customer was courteous)
   - `cancelled_no_refund_after_cutoff` → strong penalty (wasted capacity)
   - `cancelled_no_payment_captured` → voided (payment never succeeded)

### Scoring Query Pattern

For the recompute-scores job, the aggregation will be:

```sql
SELECT
  customerId,
  shopId,

  -- Positive signals
  COUNT(*) FILTER (
    WHERE financialOutcome = 'settled'
      AND status = 'booked'  -- completed normally, not cancelled
  ) as settled_count,

  -- Mild negative (refundable cancellation)
  COUNT(*) FILTER (
    WHERE resolutionReason = 'cancelled_refunded_before_cutoff'
  ) as refunded_cancel_count,

  -- Strong negative (late cancellation)
  COUNT(*) FILTER (
    WHERE resolutionReason = 'cancelled_no_refund_after_cutoff'
  ) as late_cancel_count,

  -- Strong negative (payment abandonment)
  COUNT(*) FILTER (
    WHERE financialOutcome = 'voided'
  ) as voided_count,

  MAX(createdAt) as last_activity_at

FROM appointments
WHERE shopId = ?
  AND createdAt >= (NOW() - INTERVAL '180 days')
GROUP BY customerId, shopId
```

**Edge cases handled:**
- NULL `resolutionReason` → excluded from counts (appointments not yet resolved)
- Appointments with no payment required → correctly marked as voided with `no_payment_required` reason
- System/admin cancellations → have distinct `cancellationSource` but same resolution reasons

## Acceptance

✅ **Complete** — We can describe:
- How cancellations are recorded (status, outcome, reason, timestamps)
- How cutoff time is calculated (startsAt - cancelCutoffMinutes in UTC)
- That the before/after decision is stored in `resolutionReason`
- The exact query pattern for detecting late vs early cancellations
- Why using `resolutionReason` is superior to recomputing
