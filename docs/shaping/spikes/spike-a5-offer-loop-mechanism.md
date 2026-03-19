# Spike A5: Offer Loop Mechanism

## Context

Shape A part A5.1 requires sorting the eligible customer list by tier priority (top > neutral > risk), then score, then recency. We need to understand how the offer loop currently builds the eligible list and where tier-based sorting should be injected.

## Goal

Understand the offer loop implementation so we can:
1. Identify where eligible customers are selected and ordered
2. Understand the current sorting logic
3. Determine where to inject tier-based prioritization
4. Ensure the integration is clean and doesn't break existing behavior

## Questions

| # | Question |
|---|----------|
| **A5-Q1** | What is the offer loop flow from slot opening to sending an offer? |
| **A5-Q2** | Where and how are eligible customers selected? |
| **A5-Q3** | What is the current sorting/prioritization logic? |
| **A5-Q4** | Where should tier-based sorting be injected? |

## Investigation

### A5-Q1: Offer loop flow

**Answer:** The flow is a multi-step process across several modules:

1. **Cancellation triggers slot opening** (slot-recovery.ts:32-96)
   - `createSlotOpeningFromCancellation(appointment, payment)`
   - Only creates slot opening if payment succeeded and slot is in future
   - Inserts into `slot_openings` table with `status='open'`
   - Triggers offer loop via internal API call to `/api/jobs/offer-loop`

2. **Offer loop sends first offer** (api/jobs/offer-loop/route.ts:39-111)
   - Authenticates via `x-internal-secret` header
   - Loads slot opening from DB
   - Calls `getEligibleCustomers(slotOpening)`
   - Takes first customer from eligible list: `eligibleCustomers[0]`
   - Calls `sendOffer(slotOpening, firstCustomer)`
   - Returns success with customer ID

3. **Offer expiry triggers next offer** (api/jobs/expire-offers/route.ts:16-113)
   - Cron job (authenticated via `x-cron-secret`)
   - Finds expired offers where `expiresAt <= now()` and `status='sent'`
   - Updates each to `status='expired'`
   - Triggers offer loop again for each slot opening (internal API call)

4. **Customer accepts via SMS** (not shown in spike, but referenced)
   - Customer replies "YES"
   - `acceptOffer()` creates appointment with `source='slot_recovery'`
   - Updates slot opening to `status='filled'`
   - Updates offer to `status='accepted'`

**Key insight:** The offer loop is **sequential** — it sends one offer at a time, waits for expiry, then sends the next. This means prioritization matters: top-tier customers should be offered first.

### A5-Q2: Eligible customer selection

**Answer:** The `getEligibleCustomers()` function (slot-recovery.ts:114-165) builds the eligible list.

**Selection filters:**
```typescript
const candidates = await db
  .select({
    id: customers.id,
    phone: customers.phone,
    fullName: customers.fullName,
  })
  .from(customers)
  .innerJoin(customerContactPrefs, eq(customerContactPrefs.customerId, customers.id))
  .leftJoin(slotOffers, /* check for prior offer */)
  .where(
    and(
      eq(customers.shopId, slotOpening.shopId),           // Same shop
      eq(customerContactPrefs.smsOptIn, true),            // Opted in to SMS
      isNull(slotOffers.id),                              // No prior offer for this slot
      sql`${customers.phone} <> ''`                       // Has phone number
    )
  )
  .orderBy(sql`random()`)                                 // ← CURRENT SORTING
  .limit(50);
```

**Additional runtime filters:**
- **No overlapping appointments** — Queries for conflicting `booked`/`pending` appointments for each candidate
- **Not in cooldown** — Checks Redis for 24-hour cooldown (set after acceptance)

**Returns:** Array of `EligibleCustomer[]` with `{ id, phone, fullName }`

### A5-Q3: Current sorting logic

**Answer:** **Random ordering** — `sql`random()`` at line 137.

This means every customer has an equal chance of being selected first, regardless of payment reliability or past behavior.

**Limit:** 50 candidates fetched, then filtered down to truly eligible (no overlaps, no cooldown).

### A5-Q4: Where to inject tier-based sorting

**Answer:** Replace the random ordering in `getEligibleCustomers()` with a deterministic sort.

**Injection point:** slot-recovery.ts:137

**Current:**
```typescript
.orderBy(sql`random()`)
```

**With tier-based prioritization:**
```typescript
.leftJoin(customerScores, eq(customerScores.customerId, customers.id))
.orderBy(
  // Tier priority: top > neutral > risk (NULL treated as neutral)
  sql`CASE
    WHEN ${customerScores.tier} = 'top' THEN 1
    WHEN ${customerScores.tier} = 'neutral' OR ${customerScores.tier} IS NULL THEN 2
    WHEN ${customerScores.tier} = 'risk' THEN 3
    ELSE 2
  END`,
  // Score descending (NULL treated as 50)
  sql`COALESCE(${customerScores.score}, 50) DESC`,
  // Recency descending
  sql`${customerScores.computedAt} DESC NULLS LAST`
)
```

**Alternative (exclude risk tier entirely):**
```typescript
.leftJoin(customerScores, eq(customerScores.customerId, customers.id))
.where(
  and(
    // ... existing filters ...
    or(
      isNull(customerScores.tier),
      ne(customerScores.tier, 'risk')
    )
  )
)
.orderBy(
  // Top tier first, neutral second
  sql`CASE WHEN ${customerScores.tier} = 'top' THEN 1 ELSE 2 END`,
  sql`COALESCE(${customerScores.score}, 50) DESC`,
  sql`${customerScores.computedAt} DESC NULLS LAST`
)
```

**Design decision needed:** Should `risk` tier customers be excluded entirely, or just deprioritized? The pitch says "risk might be excluded entirely" (line 189).

## Findings

### What We Learned

1. **Sequential offer loop** — One offer at a time, expiry triggers next offer
2. **Random selection currently** — No prioritization, all customers equal chance
3. **Clean injection point** — Single `.orderBy()` clause to replace
4. **No breaking changes needed** — Adding a left join to `customer_scores` is additive
5. **Null handling required** — New customers won't have scores, must default gracefully

### Data Flow

```
Cancellation
  ↓
createSlotOpeningFromCancellation()
  ↓
POST /api/jobs/offer-loop
  ↓
getEligibleCustomers() ← TIER SORTING INJECTED HERE
  ↓
Pick first customer (eligibleCustomers[0])
  ↓
sendOffer()
  ↓
Customer accepts → slot filled
  OR
Offer expires → POST /api/jobs/expire-offers
  ↓
Trigger offer-loop again (next customer in priority order)
```

### Implementation Strategy

**Part A5.1 implementation:**
1. Add `customer_scores` left join to `getEligibleCustomers()` query
2. Replace `.orderBy(sql`random()`)` with tier/score/recency sort
3. Handle NULL scores (new customers) by defaulting to neutral tier, score=50
4. **Decision:** Exclude risk tier or just deprioritize? (ask user or make configurable)

**Testing considerations:**
- Verify top tier customers offered first
- Verify customers without scores default to neutral behavior
- Verify risk tier handling (excluded or last)
- Verify tie-breaking by score when same tier
- Verify recency tie-breaking when same tier+score

## Acceptance

✅ **Complete** — We can describe:
- The full offer loop flow from cancellation to acceptance
- Where eligible customers are selected (getEligibleCustomers)
- The current sorting logic (random)
- The exact injection point for tier-based sorting (orderBy clause)
- How to handle customers without scores (NULL defaults)
