# Spike A7: Customer Identification for Scoring

## Context

Shape A (Tiering + scoring) requires aggregating appointment outcomes per customer to compute scores and tiers. We need to understand how customers are identified in the existing system and what data is available for aggregation.

## Goal

Understand the customer identification mechanism so we can:
1. Aggregate appointment/payment outcomes per customer per shop
2. Design the scoring aggregation query
3. Identify any gaps in the existing data model

## Questions

| # | Question |
|---|----------|
| **A7-Q1** | How are customers identified and matched across multiple bookings? |
| **A7-Q2** | What uniqueness constraints exist on customer records? |
| **A7-Q3** | What appointment/payment data is available to aggregate per customer? |
| **A7-Q4** | Are there any gaps in the data model for scoring? |

## Investigation

### A7-Q1: How are customers identified?

**Answer:** The system already has a `customers` table (schema.ts:268-287) with per-shop customer identity.

**Customer matching logic** (queries/appointments.ts:152-224, `upsertCustomer`):
1. First attempts to match by `(shopId, phone)`
2. If not found, attempts to match by `(shopId, email)`
3. If neither found, creates a new customer record

**Key insight:** Customers are identified per shop, not globally. Same person booking at different shops will have separate customer records.

### A7-Q2: What uniqueness constraints exist?

**Answer:** Two unique constraints on the `customers` table:
- `customers_shop_phone_unique` on `(shopId, phone)` — schema.ts:283
- `customers_shop_email_unique` on `(shopId, email)` — schema.ts:284

**Implications:**
- Phone is the primary identifier (checked first in matching logic)
- Email is the fallback identifier
- Both are normalized during booking creation (route.ts:24-32)
- Customer identity is **per-shop scoped**

### A7-Q3: What data is available for aggregation?

**Answer:** All necessary data exists in the current schema:

**From `appointments` table:**
- `customerId` — links to customer (schema.ts:312-314)
- `shopId` — scope for scoring
- `status` — to filter booked/cancelled/ended
- `financialOutcome` — settled, voided, refunded, disputed (schema.ts:328-330)
- `cancelledAt` — for recency weighting
- `startsAt` — for time-based windowing
- `policyVersionId` — to get cutoff policy (for late cancel detection)
- `source` — web vs slot_recovery (schema.ts:336)

**From `payments` table:**
- `status` — payment completion status (schema.ts:416)
- `refundedAmountCents` — refund tracking (schema.ts:418-420)
- Joined via `appointmentId`

**From `policyVersions` table:**
- `cancelCutoffMinutes` — to determine if cancellation was before/after cutoff (schema.ts:255-257)
- Joined via `policyVersionId`

**From `slotOffers` table (for offer reliability):**
- `customerId` — links to customer
- `status` — sent, accepted, expired, declined (schema.ts:487-489)
- Optional for V1 scoring

### A7-Q4: Are there gaps in the data model?

**Answer:** No blocking gaps. The existing schema supports all scoring inputs from the pitch:

| Pitch Input | Source |
|-------------|--------|
| `settled_count` | `appointments.financialOutcome = 'settled'` |
| `refunded_count` | `appointments.financialOutcome = 'refunded'` |
| `cancelled_no_refund_count` | `appointments.financialOutcome = 'settled' AND status = 'cancelled'` |
| `voided_count` | `appointments.financialOutcome = 'voided'` |
| `offers_accepted_count` | `slotOffers.status = 'accepted'` (optional) |
| `offers_expired_count` | `slotOffers.status = 'expired'` (optional) |
| `last_activity_at` | `MAX(appointments.createdAt)` or `MAX(appointments.cancelledAt)` |

**One consideration:** Distinguishing "cancelled before cutoff" vs "cancelled after cutoff" requires joining to `policyVersions` to compare `cancelledAt` against `(startsAt - cancelCutoffMinutes)`.

## Findings

### What We Learned

1. **Customer identity exists**: The `customers` table with per-shop uniqueness on phone/email
2. **Customer matching is automatic**: The `upsertCustomer` function already handles matching during booking
3. **All scoring data is available**: `appointments`, `payments`, `policyVersions`, and `slotOffers` tables contain everything needed
4. **Scoping is per-shop**: Customer scores will naturally be per-shop due to the customer identity model

### What We Can Build

**Aggregation query structure:**
```sql
SELECT
  customerId,
  shopId,
  COUNT(*) FILTER (WHERE financialOutcome = 'settled' AND status = 'booked') as settled_count,
  COUNT(*) FILTER (WHERE financialOutcome = 'voided') as voided_count,
  COUNT(*) FILTER (WHERE financialOutcome = 'refunded') as refunded_count,
  COUNT(*) FILTER (WHERE status = 'cancelled' AND ...) as cancelled_late_count,
  MAX(createdAt) as last_activity_at
FROM appointments
WHERE shopId = ?
  AND createdAt >= (NOW() - INTERVAL '180 days')
GROUP BY customerId, shopId
```

### Next Steps

The flagged unknowns in Shape A can now be resolved:
- **A1.1** ⚠️ → ✅ Customer matching by (shopId, phone) or (shopId, email)
- **A2.1** ⚠️ → ✅ `customer_id` references existing `customers` table
- **A4.1** ⚠️ → ✅ Customer ID is available during booking via `upsertCustomer` result

## Acceptance

✅ **Complete** — We can describe:
- How customers are identified (phone/email per shop)
- What data is available for aggregation (all required scoring inputs exist)
- The structure of the aggregation query
- That no schema changes are needed for basic scoring
