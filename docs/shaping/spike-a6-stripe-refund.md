# Spike A6: Stripe Refund Integration & Transaction Handling

**Related to:** Slice 5 Cancellation Shaping, Shape A Part A6
**Date:** 2026-02-11

---

## Context

Shape A Part A6 (Cancellation endpoint with refund logic) is flagged unknown. We need to understand:
- How to issue Stripe refunds programmatically
- How to ensure idempotency with Stripe API
- How to maintain atomicity between Stripe API calls and database updates
- How to handle various Stripe API error scenarios

This spike blocks three critical requirements:
- **R3:** Automatic full refund via Stripe when cancelled before cutoff
- **R5:** Idempotent cancellation endpoint (no double refunds)
- **R6:** Atomic state transitions across appointment, payment, and financial outcome

---

## Goal

Learn how the Stripe refund API works and identify the concrete steps needed to implement A6.5 (refund logic) with proper error handling and atomicity guarantees.

---

## Questions

| # | Question |
|---|----------|
| **A6-Q1** | What Stripe API method do we use to issue a refund? What parameters are required? |
| **A6-Q2** | Does Stripe support idempotency keys for refund requests? How do we use them? |
| **A6-Q3** | What does the existing codebase already have for Stripe integration? (client setup, error handling patterns) |
| **A6-Q4** | What errors can Stripe refund API return, and how should we handle each? |
| **A6-Q5** | How do we achieve atomicity: Stripe API call inside DB transaction, or outside with compensating logic? |
| **A6-Q6** | If Stripe refund succeeds but DB update fails, how do we recover? |
| **A6-Q7** | If DB update succeeds but Stripe call fails, how do we prevent retry from double-refunding? |
| **A6-Q8** | What is the existing pattern for handling Stripe webhooks? Can we use webhook confirmation for refund success? |

---

## Investigation

### A6-Q1: Stripe Refund API Method

**Answer:** Use `stripe.refunds.create()` method.

**Key parameters:**
- `payment_intent`: The ID of the PaymentIntent to refund (from `payments.stripePaymentIntentId`)
- `amount` (optional): Amount in smallest currency unit (cents). If omitted, refunds the full amount.
- `reason` (optional): `duplicate | fraudulent | requested_by_customer` (use `requested_by_customer`)
- `metadata` (optional): Key-value pairs for tracking

**Example call:**
```typescript
const refund = await stripe.refunds.create({
  payment_intent: payment.stripePaymentIntentId,
  amount: payment.amountCents, // Full refund
  reason: 'requested_by_customer',
  metadata: {
    appointmentId: appointment.id,
    cancelledAt: new Date().toISOString(),
  }
});
```

**Response:** Returns a `Refund` object with `id`, `status`, `amount`, etc.

**Source:** [Stripe API - Create a refund](https://docs.stripe.com/api/refunds/create)

---

### A6-Q2: Stripe Idempotency Keys

**Answer:** YES, Stripe supports idempotency keys for all POST requests, including `refunds.create()`.

**How to use:**
- Pass idempotency key in `Idempotency-Key` header
- Use V4 UUID or random string with high entropy (up to 255 chars)
- Keys expire after 24 hours
- Same key with same parameters returns cached result (no duplicate refund)
- Different parameters with same key returns error

**In Stripe Node SDK:**
```typescript
const refund = await stripe.refunds.create(
  {
    payment_intent: payment.stripePaymentIntentId,
    amount: payment.amountCents,
  },
  {
    idempotencyKey: `refund-${appointment.id}`, // Unique per appointment
  }
);
```

**Key generation strategy for this project:**
- Use `refund-${appointmentId}` as idempotency key
- Guarantees only one refund per appointment (even if endpoint called multiple times)
- Simple, deterministic, and safe

**Sources:**
- [Stripe API - Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe Blog - Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency)

---

### A6-Q3: Existing Stripe Integration Pattern

**Findings from codebase:**

**Stripe client setup:** `src/lib/stripe.ts`
- Singleton pattern via `getStripeClient()`
- API version: `2024-06-20`
- Environment: `STRIPE_SECRET_KEY` required

**Webhook pattern:** `src/app/api/stripe/webhook/route.ts`
- Uses `processedStripeEvents` table for idempotency (event deduplication)
- Pattern: `INSERT ... ON CONFLICT DO NOTHING` to prevent duplicate processing
- Transaction wraps both event insertion and business logic
- Handles: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`

**Key insight:** Existing code uses **event deduplication at DB level** (not Stripe idempotency keys) for webhook handling. We should apply similar pattern for cancellation endpoint.

---

### A6-Q4: Stripe Refund API Errors

**Common error scenarios:**

1. **Already refunded:**
   - Error: `charge_already_refunded` or similar
   - Cause: PaymentIntent already fully refunded
   - **Our handling:** Check `payments.stripe_refund_id` before calling Stripe. If exists, skip API call, return success.

2. **Insufficient funds in Stripe account:**
   - **Not an error!** Refund status becomes `pending` instead of `succeeded`
   - Stripe processes when funds available
   - **Our handling:** Accept `pending` status as success (customer will get refund eventually). Store status in DB.

3. **Invalid PaymentIntent ID:**
   - Error: `resource_missing`
   - Cause: PaymentIntent doesn't exist or already refunded
   - **Our handling:** This should never happen (data integrity issue). Log error, fail cancellation request, alert for manual review.

4. **Network/timeout errors:**
   - Error: Connection timeout, 500 errors, rate limit (429)
   - **Our handling:** Fail cancellation request, return "Please try again" message. Idempotency key ensures retry safety.

5. **Refund amount exceeds available:**
   - Error: `charge_exceeded_refund_limit`
   - Cause: Trying to refund more than original charge
   - **Our handling:** Should never happen (we refund exact amount). If occurs, log error and fail.

**Sources:**
- [Stripe API - Refunds](https://docs.stripe.com/api/refunds)
- [Stripe Support - Pending refunds](https://support.stripe.com/questions/pending-refunds-due-to-insufficient-funds-or-stripe-balance)

---

### A6-Q5: Transaction Boundaries & Atomicity

**Decision: Stripe call OUTSIDE DB transaction with idempotency safeguards**

**Rationale:**
1. **Cannot rollback Stripe API calls** - If Stripe refund succeeds but DB transaction fails, we can't undo the refund
2. **Long-running transactions are bad** - Stripe API call can take seconds, holding DB locks
3. **Idempotency makes it safe** - Using idempotency keys + DB checks prevents double refunds

**Recommended flow:**

```
1. Start DB transaction
2. SELECT appointment + payment FOR UPDATE (lock rows)
3. Validate: status=booked, no existing refund
4. Compute cutoff, check eligibility
5. COMMIT transaction
6. Call Stripe refunds.create() with idempotency key (OUTSIDE transaction)
7. If Stripe succeeds:
   - Start new DB transaction
   - Check payment.stripe_refund_id still NULL (idempotency check)
   - Update appointments + payments
   - COMMIT
8. If Stripe fails:
   - Return error to customer
   - No DB changes (appointment remains booked)
```

**Why this works:**
- Step 2-5: Validates eligibility and prevents concurrent cancellations (row lock)
- Step 6: Stripe idempotency key prevents duplicate refunds on retry
- Step 7: DB idempotency check (`stripe_refund_id` NULL) prevents race conditions
- If step 7 fails after Stripe succeeds, retry will skip Stripe (idempotency) and just update DB

**Alternative considered: Stripe inside transaction**
- ❌ Problematic: Can't rollback Stripe calls
- ❌ Holds DB locks during network I/O
- ❌ If transaction fails after Stripe succeeds, refund issued but DB not updated (inconsistent state)

---

### A6-Q6: Recovery if Stripe Succeeds but DB Update Fails

**Scenario:** Stripe refund succeeds (customer gets money), but DB update fails (appointments.status still `booked`).

**Recovery strategy:**

**Option A: Retry with idempotency (RECOMMENDED)**
- Customer retries cancellation request
- Endpoint validates, calls Stripe with same idempotency key
- Stripe returns cached refund (no duplicate)
- DB update succeeds on retry
- ✅ Eventually consistent

**Option B: Webhook confirmation**
- Stripe sends `charge.refunded` webhook when refund completes
- Webhook handler updates DB: `stripe_refund_id`, `status=cancelled`, `financial_outcome=refunded`
- ✅ Self-healing via webhook
- ⚠️ Requires webhook handler implementation (not in current scope)

**Option C: Reconciliation job**
- Periodic job queries Stripe API for refunds
- Compares with DB state
- Updates missing refunds
- ✅ Catches all inconsistencies
- ⚠️ Requires background job (not in current scope)

**For Slice 5: Use Option A (retry with idempotency)**
- Simplest, no new infrastructure
- Customer can retry if they notice issue
- Idempotency guarantees safety
- Document webhook/reconciliation as future improvements

---

### A6-Q7: Recovery if DB Update Succeeds but Stripe Call Fails

**Scenario:** DB shows `status=cancelled`, `financial_outcome=refunded`, but Stripe refund never happened (customer didn't get money).

**This is WORSE than Q6** - customer thinks they got refund but didn't.

**Prevention strategy:**
- **NEVER update DB to `refunded` state until Stripe confirms success**
- If Stripe call fails, leave appointment as `booked` (or create intermediate `cancelling` state)
- Customer sees "Cancellation failed, please try again"
- Only mark `refunded` after Stripe returns success response

**Flow:**
```
1. Validate eligibility
2. Call Stripe
3. If Stripe fails → return error, no DB changes
4. If Stripe succeeds → update DB to refunded
5. If DB update fails → customer retries (Q6 scenario)
```

**This ensures:** DB state never claims refund happened before Stripe confirms it.

---

### A6-Q8: Existing Webhook Pattern

**Current webhook handling:** `src/app/api/stripe/webhook/route.ts`

**Pattern used:**
1. Insert event ID into `processedStripeEvents` with `ON CONFLICT DO NOTHING`
2. If insert returns 0 rows → event already processed, skip
3. If insert succeeds → process event in same transaction

**Webhook events handled:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`

**For refunds, would need to add:**
- `charge.refunded` or `refund.created` event handling

**Current scope (Slice 5):**
- ✅ Use idempotency for cancellation endpoint
- ❌ Don't rely on webhooks for refund confirmation (add in later slice if needed)
- Document webhook as improvement for self-healing

---

## Concrete Implementation Steps

Based on investigation, here's the step-by-step implementation for A6:

### 1. Add Refund Idempotency Helper

**File:** `src/lib/stripe-refund.ts` (new file)

```typescript
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { payments } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function issueRefund(appointmentId: string) {
  // Get payment
  const payment = await db.query.payments.findFirst({
    where: (table, { eq }) => eq(table.appointmentId, appointmentId),
  });

  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "succeeded") {
    throw new Error("Cannot refund non-successful payment");
  }

  // Check if already refunded (idempotency)
  if (payment.stripeRefundId) {
    return {
      refundId: payment.stripeRefundId,
      alreadyRefunded: true,
    };
  }

  // Call Stripe with idempotency key
  const stripe = getStripeClient();
  const refund = await stripe.refunds.create(
    {
      payment_intent: payment.stripePaymentIntentId,
      amount: payment.amountCents,
      reason: "requested_by_customer",
      metadata: {
        appointmentId,
        cancelledAt: new Date().toISOString(),
      },
    },
    {
      idempotencyKey: `refund-${appointmentId}`,
    }
  );

  return {
    refundId: refund.id,
    status: refund.status, // succeeded | pending | failed
    alreadyRefunded: false,
  };
}
```

### 2. Cancellation Endpoint

**File:** `src/app/api/manage/[token]/cancel/route.ts` (new file)

```typescript
import { db } from "@/lib/db";
import { appointments, payments } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { issueRefund } from "@/lib/stripe-refund";

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  // 1. Validate token, load appointment + policy
  const appointment = await validateTokenAndLoadAppointment(params.token);

  // 2. Validate cancellable
  if (appointment.status !== "booked") {
    return Response.json(
      { error: "Appointment cannot be cancelled" },
      { status: 400 }
    );
  }

  // 3. Compute cutoff
  const cutoffTime = new Date(
    appointment.startsAt.getTime() -
    appointment.policySnapshot.cancelCutoffMinutes * 60 * 1000
  );
  const now = new Date();
  const isRefundable = now <= cutoffTime;

  // 4. Handle refundable case
  if (isRefundable) {
    try {
      // Issue Stripe refund (idempotent, outside transaction)
      const refundResult = await issueRefund(appointment.id);

      // Update DB
      await db.transaction(async (tx) => {
        // Double-check no race condition
        const payment = await tx.query.payments.findFirst({
          where: (table, { eq }) =>
            eq(table.appointmentId, appointment.id),
        });

        if (payment?.stripeRefundId && !refundResult.alreadyRefunded) {
          // Race condition: another request already processed
          return;
        }

        await tx.update(payments).set({
          stripeRefundId: refundResult.refundId,
          refundedAmountCents: payment.amountCents,
          refundedAt: new Date(),
        }).where(eq(payments.appointmentId, appointment.id));

        await tx.update(appointments).set({
          status: "cancelled",
          cancelledAt: now,
          cancellationSource: "customer",
          financialOutcome: "refunded",
          resolvedAt: now,
          resolutionReason: "cancelled_refunded_before_cutoff",
        }).where(eq(appointments.id, appointment.id));

        // Write audit event
        await tx.insert(appointmentEvents).values({
          appointmentId: appointment.id,
          event: "cancelled",
          metadata: {
            refundId: refundResult.refundId,
            refundStatus: refundResult.status,
          },
        });
      });

      return Response.json({
        success: true,
        refunded: true,
        message: "Cancelled — refund issued",
      });
    } catch (error) {
      console.error("Refund failed", { appointmentId: appointment.id, error });
      return Response.json(
        { error: "Cancellation failed. Please try again." },
        { status: 500 }
      );
    }
  }

  // 5. Handle non-refundable case (after cutoff)
  await db.transaction(async (tx) => {
    await tx.update(appointments).set({
      status: "cancelled",
      cancelledAt: now,
      cancellationSource: "customer",
      financialOutcome: "settled", // Deposit retained
      resolvedAt: now,
      resolutionReason: "cancelled_no_refund_after_cutoff",
    }).where(eq(appointments.id, appointment.id));

    await tx.insert(appointmentEvents).values({
      appointmentId: appointment.id,
      event: "cancelled",
      metadata: { refundEligible: false, reason: "after_cutoff" },
    });
  });

  return Response.json({
    success: true,
    refunded: false,
    message: "Cancelled — deposit retained (after cutoff)",
  });
}
```

### 3. Error Handling Summary

| Scenario | Handling |
|----------|----------|
| Stripe returns already refunded | Check `stripe_refund_id` before calling, skip if exists |
| Stripe returns pending (insufficient funds) | Accept as success, store refund ID |
| Stripe timeout/500 | Return error, customer can retry (idempotency ensures safety) |
| Stripe succeeds, DB fails | Customer retries, idempotency prevents double refund |
| DB says refunded but Stripe never called | **Prevented by design:** Only set refunded after Stripe confirms |
| Concurrent cancellation requests | Row-level lock in validation step, second request sees already cancelled |

---

## Answers Summary

| Question | Answer |
|----------|--------|
| **Q1: API method** | `stripe.refunds.create()` with `payment_intent` parameter |
| **Q2: Idempotency** | Yes, use `Idempotency-Key` header with `refund-${appointmentId}` |
| **Q3: Existing pattern** | Webhook uses event deduplication; we'll use idempotency keys for API calls |
| **Q4: Error types** | Already refunded (check first), pending (accept), network errors (retry), invalid ID (alert) |
| **Q5: Atomicity** | Stripe OUTSIDE transaction, idempotency keys + DB checks ensure safety |
| **Q6: Stripe ok, DB fails** | Retry with idempotency (eventually consistent) |
| **Q7: DB ok, Stripe fails** | **Prevented:** Never mark refunded until Stripe confirms |
| **Q8: Webhooks** | Exists for payments; could add `charge.refunded` later for self-healing |

---

## Acceptance

✅ **Spike is complete.** We can now describe:

1. **How to call Stripe refund API:** `stripe.refunds.create()` with payment_intent ID and idempotency key
2. **How to ensure idempotency:** Use `refund-${appointmentId}` as idempotency key + DB check for existing `stripe_refund_id`
3. **How to handle atomicity:** Call Stripe outside transaction, use idempotency for safety, only mark refunded after Stripe confirms
4. **How to handle errors:** Check before calling, accept pending status, retry on network errors, prevent DB-first updates
5. **Concrete implementation steps:** Helper function + endpoint with proper error handling (shown above)

This resolves:
- **R3:** Automatic full refund via Stripe ✅
- **R5:** Idempotent cancellation endpoint ✅
- **R6:** Atomic state transitions ✅

---

## Sources

- [Stripe API - Create a refund](https://docs.stripe.com/api/refunds/create)
- [Stripe API - The Refund object](https://docs.stripe.com/api/refunds/object)
- [Stripe API - Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe Blog - Designing robust and predictable APIs with idempotency](https://stripe.com/blog/idempotency)
- [Stripe Support - Pending refunds due to insufficient funds](https://support.stripe.com/questions/pending-refunds-due-to-insufficient-funds-or-stripe-balance)
- [Stripe Documentation - Refund and cancel payments](https://docs.stripe.com/refunds)
