# Slice 3C: Register Transfer Events in Stripe Dashboard

## Spec
07-register-transfer-events-stripe

## Files
- None (ops step — Stripe Dashboard configuration)

## Steps

1. Deploy Wave 1 + Wave 2 code to production (handlers must exist before events are registered)
2. Open Stripe Dashboard → Developers → Webhooks
3. Select the Connect webhook endpoint (`/api/stripe/connect-webhook`)
4. Add events: `transfer.created`, `transfer.failed`
5. Save
6. If using separate test/live endpoints, repeat for test mode

## Verification

1. Create a test booking with a Connected merchant
2. Complete payment (triggers charge → automatic transfer)
3. Check Vercel production logs for:
   - `console.info` "Transfer succeeded" with populated `appointmentId`, `shopId`, `transferId`
4. If verification fails: check Stripe Dashboard → Developers → Webhooks → Recent events to confirm the event was sent

## Acceptance criteria
- [ ] `transfer.created` and `transfer.failed` registered on Connect webhook endpoint
- [ ] Test transfer produces `console.info` in Vercel logs with correct structured payload
- [ ] All context fields (`appointmentId`, `shopId`, `shopName`) are populated (not `"unknown"`)

## Dependencies
- Specs 02, 03 deployed to production — code must handle the events before Stripe starts sending them
- This is the LAST step in the feature — deploy code first, register events second

## Bundling opportunity
When the disputes issue ships, `charge.dispute.created`, `charge.dispute.updated`, and `charge.dispute.closed` should be registered in the same Stripe Dashboard session.
