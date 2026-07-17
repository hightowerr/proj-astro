# Spec 03 — P2b: `charge.dispute.updated` and `charge.dispute.closed` handlers

## Priority

P2 — HIGH. Lifecycle tracking. Ships with spec 02.

## Summary

Handle `charge.dispute.updated` (status changes during dispute) and `charge.dispute.closed` (final resolution — won or lost) on the Connect webhook. Logging only for `updated`; outcome persistence for `closed`.

## Changes

- **File:** `src/app/api/stripe/connect-webhook/route.ts`
- **New handler blocks** (insert after the `charge.dispute.created` handler from spec 02):

  ```ts
  } else if (event.type === "charge.dispute.updated") {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId = typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

    console.warn("Dispute updated", {
      disputeId: dispute.id,
      status: dispute.status,
      reason: dispute.reason,
      amount: dispute.amount,
      paymentIntentId,
      eventId: event.id,
    });

  } else if (event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId = typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

    // Resolve the financial outcome based on dispute result
    let payment = null;
    if (paymentIntentId) {
      payment = await tx.query.payments.findFirst({
        where: (table, { eq: whereEq }) =>
          whereEq(table.stripePaymentIntentId, paymentIntentId),
      });
    }

    if (payment) {
      // Won = merchant keeps deposit → revert to settled
      // Lost = funds deducted → stay disputed (or could add "dispute_lost")
      const newOutcome = dispute.status === "won" ? "settled" : "disputed";

      await tx
        .update(appointments)
        .set({
          financialOutcome: newOutcome as "settled" | "disputed",
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, payment.appointmentId));

      console.warn("Dispute closed", {
        disputeId: dispute.id,
        status: dispute.status,
        outcome: newOutcome,
        amount: dispute.amount,
        appointmentId: payment.appointmentId,
        shopId: payment.shopId,
        eventId: event.id,
      });
    } else {
      console.warn("Dispute closed but could not resolve payment context", {
        disputeId: dispute.id,
        status: dispute.status,
        amount: dispute.amount,
        paymentIntentId,
        eventId: event.id,
      });
    }
  ```

## Ops Required (post-deploy)

Register `charge.dispute.updated` and `charge.dispute.closed` on the Connect webhook endpoint in the Stripe Dashboard.

## Acceptance Criteria

- [ ] `charge.dispute.updated` logs status, reason, amount via `console.warn`
- [ ] `charge.dispute.closed` resolves financial outcome: `"settled"` if won, remains `"disputed"` if lost
- [ ] Payment lookup via `stripePaymentIntentId` for `closed` handler
- [ ] Both handlers deduplicated via `processedStripeEvents`
- [ ] `pnpm check` passes

## Prerequisites

- Spec 02 (the `charge.dispute.created` handler must exist before lifecycle handlers make sense structurally, though they're technically independent blocks)

## Dependencies

Depends on: spec 02 (same file, sequential insertion).
