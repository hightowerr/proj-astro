# Slice 3C: Register Transfer Events — Ops Checklist

**Status**: BLOCKED — requires deployment of Waves 1-3 code first.

## Pre-deployment verification
- [ ] `src/lib/stripe-utils.ts` exists with `resolveTransferContext`
- [ ] `connect-webhook/route.ts` handles `transfer.created`, `transfer.failed`, and unhandled events
- [ ] `webhook/route.ts` has `console.warn` for unhandled events
- [ ] `appointments.ts` stores `applicationFeeAmountCents` in metadata
- [ ] All 23 new tests pass (`stripe-utils.test.ts` 5, `appointments-metadata.test.ts` 11, `connect-webhook/route.test.ts` 7)
- [ ] Type-check clean (zero new errors)

## Stripe Dashboard steps (after deployment)
1. Open Stripe Dashboard → Developers → Webhooks
2. Select the Connect webhook endpoint (`/api/stripe/connect-webhook`)
3. Add events: `transfer.created`, `transfer.failed`
4. Save
5. If using separate test/live endpoints, repeat for test mode

## Post-registration verification
1. Create a test booking with a Connected merchant
2. Complete payment
3. Check Vercel production logs for `console.warn("Transfer succeeded", ...)` with populated `appointmentId`, `shopId`
4. Verify structured payload fields are not `"unknown"`

## Bundling opportunity
When the disputes issue ships, register `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed` in the same Stripe Dashboard session.
