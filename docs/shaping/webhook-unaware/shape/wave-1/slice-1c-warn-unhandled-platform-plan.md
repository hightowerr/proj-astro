# Slice 1C: console.warn for Unhandled Events — Platform Webhook

## Spec
05-warn-unhandled-platform-webhook

## Files
- **Modify**: `src/app/api/stripe/webhook/route.ts` (~line 263)

## Implementation

The platform webhook dispatches on `event.type` via if/else. After the last handled case (`payment_intent.canceled`), add a default branch:

```ts
// After the payment_intent.canceled block:
} else {
  console.warn("Unexpected event type at platform webhook — check Stripe webhook configuration", {
    eventType: event.type,
    eventId: event.id,
    endpoint: "/api/stripe/webhook",
  });
}
```

No changes to:
- Return value (still `200`)
- Dedup logic (event already marked processed before dispatch)
- Any existing handler

## Acceptance criteria
- [ ] Unhandled event types produce a `console.warn` with `eventType`, `eventId`, `endpoint`
- [ ] Handled event types (`payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`) are NOT affected
- [ ] Webhook still returns 200 for unhandled events
- [ ] lint + type-check pass

## Dependencies
None
