# Spec 02 — P2a: `charge.dispute.created` webhook handler

## Priority

P2 — HIGH. Enables detection. Independent.

## Summary

Subscribe to `charge.dispute.created` on the Connect webhook. Look up the associated payment/appointment. Set `financialOutcome: "disputed"` and insert a `"dispute_opened"` event. Log with `console.error` (financial consequence, not config issue).

## Changes

- **File:** `src/app/api/stripe/connect-webhook/route.ts`
- **New handler block** (insert before the `else` catch-all at line 225):

  ```ts
  } else if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId = typeof dispute.charge === "string"
      ? dispute.charge
      : dispute.charge?.id;
    const paymentIntentId = typeof dispute.payment_intent === "string"
      ? dispute.payment_intent
      : dispute.payment_intent?.id;

    // Look up payment → appointment via stripePaymentIntentId
    let payment = null;
    if (paymentIntentId) {
      payment = await tx.query.payments.findFirst({
        where: (table, { eq: whereEq }) =>
          whereEq(table.stripePaymentIntentId, paymentIntentId),
      });
    }

    if (payment) {
      // Set financialOutcome to "disputed"
      await tx
        .update(appointments)
        .set({
          financialOutcome: "disputed",
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, payment.appointmentId));

      // Insert dispute_opened event
      await tx
        .insert(appointmentEvents)
        .values({
          shopId: payment.shopId,
          appointmentId: payment.appointmentId,
          type: "dispute_opened",
          occurredAt: new Date(),
          meta: {
            disputeId: dispute.id,
            chargeId,
            paymentIntentId,
            amount: dispute.amount,
            currency: dispute.currency,
            reason: dispute.reason,
            status: dispute.status,
          },
        });

      console.error("Dispute opened — financialOutcome set to disputed", {
        disputeId: dispute.id,
        chargeId,
        paymentIntentId,
        amount: dispute.amount,
        reason: dispute.reason,
        appointmentId: payment.appointmentId,
        shopId: payment.shopId,
      });
    } else {
      console.error("Dispute opened but could not resolve payment context", {
        disputeId: dispute.id,
        chargeId,
        paymentIntentId,
        amount: dispute.amount,
        reason: dispute.reason,
      });
    }
  ```

- **Imports:** Add `appointmentEvents` to the import from `@/lib/schema` (line 5) if not already imported.

## Ops Required (post-deploy)

Register `charge.dispute.created` on the Connect webhook endpoint in the Stripe Dashboard.

## Acceptance Criteria

- [ ] `charge.dispute.created` events are handled within the connect-webhook transaction
- [ ] Payment lookup via `stripePaymentIntentId` resolves the associated appointment
- [ ] `financialOutcome` set to `"disputed"` on the appointment
- [ ] `"dispute_opened"` event inserted into `appointmentEvents` with dispute metadata
- [ ] `console.error` emitted with disputeId, chargeId, amount, reason, appointmentId, shopId
- [ ] Unresolvable disputes (no matching payment) log `console.error` with available context
- [ ] Deduplication via `processedStripeEvents` (existing pattern) prevents double-processing
- [ ] `pnpm check` passes

## Prerequisites

None — schema already has `"disputed"` in `appointmentFinancialOutcomeEnum` and `"dispute_opened"` in `appointmentEventTypeEnum`.

## Dependencies

None — fully independent.
