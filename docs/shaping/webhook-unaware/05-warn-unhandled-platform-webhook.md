# Spec 05: `console.warn` for Unhandled Events — Platform Webhook

## Summary
Add a `console.warn` default branch in the platform webhook (`webhook/route.ts`) for event types that arrive but have no handler. Currently, unhandled events are silently swallowed after dedup insert — the dedup marks them "processed" but nothing acted on them.

## Behaviour
After the `payment_intent.canceled` block (~line 263), before the transaction closes, add:
```ts
default:
  console.warn("Unexpected event type at platform webhook — check Stripe webhook configuration", {
    eventType: event.type,
    eventId: event.id,
    endpoint: "/api/stripe/webhook",
  });
```
- Continue to return `200` — Stripe must not retry events that will never be handled
- `console.warn` not `console.error` — the webhook IS functioning correctly (valid event, verified signature, dedup recorded); the problem is environment configuration, not runtime failure

## Scope
- Single `default:` case (or `else` branch if using if/else) in `webhook/route.ts`
- ~5 lines of code
- No changes to dedup logic, no changes to return status

## Dependencies
- **Prerequisites**: None — independent of all other specs

## Out of scope
- Changing the dedup insert timing (insert-before-dispatch is the current contract; deferring is a valid future improvement with larger blast radius)
- Dead-letter queue for unhandled events (premature at current scale)
- Returning non-200 for unhandled events (Stripe retries create noise)
