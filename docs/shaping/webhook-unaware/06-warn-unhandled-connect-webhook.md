# Spec 06: `console.warn` for Unhandled Events — Connect Webhook

## Summary
Add a `console.warn` else branch in the Connect webhook (`connect-webhook/route.ts`) for event types that arrive but have no handler. Same pattern as spec 05 but in the Connect webhook — and must ship AFTER specs 02/03 add the transfer handlers, since the "unhandled" set changes.

## Behaviour
After the last handled event type block (which will be `transfer.failed` once specs 02/03 ship), add:
```ts
else {
  console.warn("Unexpected event type at Connect webhook — check Stripe webhook configuration", {
    eventType: event.type,
    eventId: event.id,
    endpoint: "/api/stripe/connect-webhook",
  });
}
```
- Same semantics as spec 05: return `200`, `console.warn` not `console.error`
- This is the safety net that catches Stripe Dashboard misconfiguration (e.g., `payment_intent.succeeded` accidentally registered on the Connect endpoint)

## Scope
- Single `else` branch in `connect-webhook/route.ts` after the `transfer.failed` case
- ~5 lines of code

## Dependencies
- **Prerequisites**: Specs 02, 03 — the transfer handlers must exist first, otherwise this `else` branch would warn on `transfer.created`/`transfer.failed` events before their handlers are added
- Note: spec 05 (platform webhook version) has no such dependency and can ship independently

## Out of scope
- Same exclusions as spec 05 (no dead-letter queue, no non-200 returns, no dedup timing changes)
