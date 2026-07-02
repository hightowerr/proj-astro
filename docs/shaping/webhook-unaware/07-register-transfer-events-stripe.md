# Spec 07: Register Transfer Events in Stripe Dashboard

## Summary
Ops checklist: add `transfer.created` and `transfer.failed` to the Connect webhook endpoint's event subscriptions in the Stripe Dashboard. Code must be deployed before events are registered — otherwise events arrive with no handler and get dedup-locked (marked "processed" before specs 02/03 exist to handle them).

## Steps
1. Open Stripe Dashboard → Developers → Webhooks
2. Select the Connect webhook endpoint (`/api/stripe/connect-webhook`)
3. Add events: `transfer.created`, `transfer.failed`
4. Save
5. Repeat for test-mode endpoint if using separate test/live endpoints

## Verification
- Trigger a test transfer (create a booking with Connect, complete payment)
- Check Vercel logs for the `console.info` (transfer.created) structured payload
- Confirm `appointmentId`, `shopId`, `transferId` are populated (not `"unknown"`)

## Dependencies
- **Prerequisites**: Specs 02, 03 deployed to production — handlers must exist before events are registered
- **Sequencing**: This is the LAST step — deploy code first, register events second

## Out of scope
- Registering dispute events (`charge.dispute.created`) — that's the disputes issue
- Registering payout events — future work
