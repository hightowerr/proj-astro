# Spike A2: Background Job Pattern on Vercel

**Components:**
- A1.3: Enqueue offer loop job
- A3.3: Passive wait mechanism
- A5.1: Cron job setup
- A5.3: Trigger next offer from cron
- A6.3: Move to next customer after payment failure

**Goal:** Choose the simplest background job pattern that fits the 3-day appetite and works reliably on Vercel.

---

## Questions

| # | Question |
|---|----------|
| **A2-Q1** | What background job patterns already exist in the codebase? |
| **A2-Q2** | How should we trigger the offer loop from multiple sources (cancellation, expiry, payment failure)? |
| **A2-Q3** | What is the "passive wait" mechanism for advancing state? |
| **A2-Q4** | How should the expiry cron job work? |

---

## Findings

### Q1: Existing Patterns

The codebase already has a **Vercel Cron + API Route** pattern:

**File:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/jobs/resolve-outcomes",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**File:** `src/app/api/jobs/resolve-outcomes/route.ts`

**Pattern characteristics:**
- ✅ POST endpoint with `x-cron-secret` header authentication
- ✅ PostgreSQL advisory lock prevents concurrent runs (`pg_try_advisory_lock`)
- ✅ Batch processing with limit parameter (default 200, max 1000)
- ✅ Idempotent WHERE clauses (only process `financialOutcome='unresolved'`)
- ✅ Structured response with counts (total, resolved, skipped, errors)

**Environment:**
- `CRON_SECRET` env var (already in `env.example`)

**Why this pattern works well:**
- Simple: No additional infrastructure (queues, workers)
- Vercel native: Built-in cron support
- Safe: Advisory locks + idempotent queries
- Debuggable: Can call endpoint manually for testing

---

### Q2: Triggering the Offer Loop

**Problem:** The offer loop needs to be triggered from 3 sources:
1. Cancellation (A1.3)
2. Offer expiry (A5.3)
3. Payment failure (A6.3)

**Options:**

#### Option 1: Inline Async (Fire-and-Forget)
```typescript
// From cancellation
await createSlotOpening(...);
triggerOfferLoop(slotOpeningId); // No await - fire and forget
```

**Pros:**
- ✅ Simplest
- ✅ Immediate trigger

**Cons:**
- ❌ Risky on Vercel (function timeout affects caller)
- ❌ No retry on failure
- ❌ Hard to debug

#### Option 2: API Route + Internal Fetch
```typescript
// From cancellation
await createSlotOpening(...);
await fetch(`${process.env.APP_URL}/api/jobs/offer-loop`, {
  method: 'POST',
  headers: { 'x-internal-secret': process.env.INTERNAL_SECRET },
  body: JSON.stringify({ slotOpeningId })
});
```

**Pros:**
- ✅ Decoupled (offer loop runs in separate invocation)
- ✅ Consistent pattern (like cron jobs)
- ✅ Can be called manually for testing
- ✅ Timeout isolation (caller doesn't block on offer loop)

**Cons:**
- ⚠️ Requires `APP_URL` env var
- ⚠️ Extra HTTP overhead (minor)

#### Option 3: Queue System (Inngest, QStash, etc.)
**Not recommended:** Adds significant complexity and scope beyond 3-day appetite.

---

**Recommendation: Option 2 (API Route + Internal Fetch)**

Create `/api/jobs/offer-loop` endpoint that:
- Accepts `slotOpeningId` in body
- Validates `x-internal-secret` header
- Loads slot opening
- Processes offer loop logic
- Returns structured response

**Why:** Matches existing cron pattern, provides isolation, debuggable, fits appetite.

---

### Q3: Passive Wait Mechanism

**"Passive wait" means:** The system doesn't block waiting for customer replies. State advances through external triggers.

**Mechanism:**

```
Offer sent → slot_offer.expires_at set → system does nothing
                                          ↓
                          [Time passes, customer may reply or not]
                                          ↓
                Either: Customer replies YES → inbound SMS webhook triggers acceptance
                Or: Time expires → expiry cron detects and marks expired → triggers next offer
```

**Implementation:**
1. When offer is sent: Set `expires_at = now() + 15 minutes` (configurable)
2. System does NOT actively wait or poll
3. State advances via:
   - **Inbound SMS webhook** (customer replies YES) → acceptance flow
   - **Expiry cron job** (runs every 5 minutes) → finds expired offers, marks them, triggers next

**Key insight:** There is no "wait". The database holds state (`slot_offer.status`, `slot_offer.expires_at`). External events (SMS webhook, cron) advance that state.

---

### Q4: Expiry Cron Job

**Purpose:** Find offers that have expired and advance to the next customer.

**Implementation:**

**File:** Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/jobs/resolve-outcomes",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/jobs/expire-offers",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Schedule:** Every 5 minutes (`*/5 * * * *`)

**File:** `src/app/api/jobs/expire-offers/route.ts`

**Logic:**
```typescript
export async function POST(req: Request) {
  // 1. Authenticate with CRON_SECRET
  // 2. Acquire PostgreSQL advisory lock (prevents concurrent runs)

  try {
    // 3. Find expired offers
    const expiredOffers = await db
      .select()
      .from(slotOffers)
      .innerJoin(slotOpenings, eq(slotOpenings.id, slotOffers.slotOpeningId))
      .where(and(
        eq(slotOffers.status, 'sent'),
        sql`${slotOffers.expiresAt} <= now()`,
        eq(slotOpenings.status, 'open')
      ))
      .limit(100);

    let expired = 0;
    let triggered = 0;

    // 4. For each expired offer
    for (const offer of expiredOffers) {
      // 4a. Mark as expired (idempotent)
      await db.update(slotOffers)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(and(
          eq(slotOffers.id, offer.id),
          eq(slotOffers.status, 'sent')
        ));

      expired += 1;

      // 4b. Trigger next offer for that slot
      await fetch(`${process.env.APP_URL}/api/jobs/offer-loop`, {
        method: 'POST',
        headers: { 'x-internal-secret': process.env.INTERNAL_SECRET },
        body: JSON.stringify({ slotOpeningId: offer.slotOpeningId })
      });

      triggered += 1;
    }

    return Response.json({ expired, triggered });
  } finally {
    // 5. Release advisory lock
    await db.execute(sql`select pg_advisory_unlock(${LOCK_ID})`);
  }
}
```

**Why every 5 minutes?**
- Fast enough: Max 5-minute delay after expiry
- Not too frequent: Doesn't spam Vercel with executions
- Matches urgency: Slot recovery isn't time-critical (compared to payment processing)

**If time runs short:** This can be cut from MVP (see cut list in pitch). Manual slot recovery only.

---

## Concrete Implementation Steps

### Step 1: Create offer loop API route

**File:** `src/app/api/jobs/offer-loop/route.ts`

```typescript
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { slotOpenings, slotOffers } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Authenticate
  const internalSecret = process.env.INTERNAL_SECRET;
  if (!internalSecret) {
    return Response.json({ error: "INTERNAL_SECRET not configured" }, { status: 500 });
  }

  const provided = req.headers.get("x-internal-secret");
  if (!provided || provided !== internalSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  const { slotOpeningId } = await req.json();

  // Load slot opening
  const slotOpening = await db.query.slotOpenings.findFirst({
    where: (table, { eq }) => eq(table.id, slotOpeningId),
  });

  if (!slotOpening || slotOpening.status !== 'open') {
    return Response.json({ skipped: true, reason: 'slot_not_open' });
  }

  // Get next eligible customer (from A2)
  const nextCustomer = await getNextEligibleCustomer(slotOpening);

  if (!nextCustomer) {
    // No more customers - mark slot expired
    await db.update(slotOpenings)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(slotOpenings.id, slotOpeningId));

    return Response.json({ completed: true, reason: 'no_eligible_customers' });
  }

  // Send offer
  await sendOffer(slotOpening, nextCustomer);

  return Response.json({ success: true, customerId: nextCustomer.id });
}
```

### Step 2: Create expiry cron job

**File:** `src/app/api/jobs/expire-offers/route.ts` (see Q4 above)

**File:** Update `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/jobs/resolve-outcomes",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/jobs/expire-offers",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Step 3: Add env var

**File:** `env.example`
```
INTERNAL_SECRET=change_me
```

**Note:** Used for internal service-to-service calls. Different from CRON_SECRET (external to Vercel).

### Step 4: Call from trigger points

**From cancellation (A1.1):**
```typescript
await createSlotOpeningFromCancellation(row.appointment, row.payment);
```

**Inside `createSlotOpeningFromCancellation` (A1.3):**
```typescript
// Create slot opening
const [slotOpening] = await db.insert(slotOpenings).values({...}).returning();

// Trigger offer loop
await fetch(`${process.env.APP_URL}/api/jobs/offer-loop`, {
  method: 'POST',
  headers: { 'x-internal-secret': process.env.INTERNAL_SECRET! },
  body: JSON.stringify({ slotOpeningId: slotOpening.id })
});
```

**From payment failure (A6.3):**
```typescript
// In Stripe webhook handler
if (paymentFailed) {
  await db.update(slotOpenings)
    .set({ status: 'open' })
    .where(eq(slotOpenings.id, slotOpeningId));

  // Trigger next offer
  await fetch(`${process.env.APP_URL}/api/jobs/offer-loop`, {
    method: 'POST',
    headers: { 'x-internal-secret': process.env.INTERNAL_SECRET! },
    body: JSON.stringify({ slotOpeningId })
  });
}
```

---

## Architecture Diagram

```
Cancellation          Payment Failure        Expiry Cron (every 5 min)
     ↓                       ↓                        ↓
     └────────────────→ POST /api/jobs/offer-loop ←──┘
                              ↓
                       1. Load slot_opening
                       2. Get next eligible customer
                       3. Send SMS offer
                       4. Create slot_offer record
                              ↓
                       [Passive wait - no blocking]
                              ↓
              ┌────────────────┴────────────────┐
              ↓                                  ↓
    Customer replies YES               Offer expires (15 min)
              ↓                                  ↓
    POST /api/twilio/inbound          Cron detects expired
              ↓                                  ↓
    Accept offer (A4)              Mark expired, trigger next
    Create booking + payment              ↓
    Mark slot filled           POST /api/jobs/offer-loop
```

---

## Alternatives Considered

### Alternative: State Machine with Single Cron
Instead of triggering offer loop from multiple sources, have a single cron that manages all state transitions.

**Pros:**
- Single orchestrator
- All logic in one place

**Cons:**
- Slower: Waits for cron cycle (max 5-minute delay after cancellation)
- More complex state machine
- Less responsive

**Verdict:** Rejected. Hybrid approach (trigger + cron) is more responsive.

---

## Edge Cases

### Case 1: Offer loop called concurrently for same slot
**Scenario:** Expiry cron and payment failure both trigger offer loop

**Mitigation:**
- Idempotent WHERE clause: `slotOpenings.status = 'open'`
- Only one invocation succeeds in sending next offer
- Other invocations skip (slot not open)

### Case 2: APP_URL not set
**Impact:** Cannot trigger offer loop (fetch fails)

**Mitigation:**
- Fail fast: Check `process.env.APP_URL` on startup
- Provide clear error message
- Document in README

### Case 3: Cron runs while offer loop is processing
**Scenario:** Cron detects expired offer, but offer loop is still sending to that customer

**Mitigation:**
- Race condition is acceptable - offer status transitions are idempotent
- Worst case: Duplicate SMS (Twilio handles idempotency via message SID)

---

## Performance Considerations

**Offer loop execution time:**
- Load slot + customer query: ~10ms
- Send SMS (Twilio API): ~200ms
- Insert slot_offer: ~10ms
- **Total: ~220ms per offer**

**Expiry cron execution time:**
- Query expired offers (limit 100): ~20ms
- For each: mark expired + trigger offer loop: ~240ms × 100 = 24 seconds
- **Total: ~24 seconds worst case**

**Vercel limits:**
- Hobby plan: 10-second function timeout
- Pro plan: 60-second function timeout

**Mitigation:** Limit batch size to 25 offers per cron run (keeps under 10 seconds).

---

## Acceptance

✅ Spike is complete. We can describe:

1. **Pattern:** Vercel Cron + API Routes (matches existing resolve-outcomes pattern)
2. **Offer loop trigger:** POST /api/jobs/offer-loop (from cancellation, expiry, payment failure)
3. **Passive wait:** State-based, advances via inbound SMS webhook or expiry cron
4. **Expiry cron:** Every 5 minutes, finds expired offers, marks expired, triggers next
5. **Environment:** Requires `APP_URL` and `INTERNAL_SECRET` env vars

**Flagged unknowns resolved:**
- A1.3: Enqueue offer loop ✅
- A3.3: Passive wait mechanism ✅
- A5.1: Cron job setup ✅
- A5.3: Trigger next offer ✅
- A6.3: Move to next customer ✅

---

## Dependencies

This spike creates dependencies on:
- **A2 (Eligibility filtering)** - `getNextEligibleCustomer()` function needed
- **A4 (Inbound SMS handler)** - Acceptance flow when customer replies YES
- **A7 (Data model)** - `slot_openings` and `slot_offers` tables must exist
- **Environment setup** - `APP_URL`, `INTERNAL_SECRET` env vars
