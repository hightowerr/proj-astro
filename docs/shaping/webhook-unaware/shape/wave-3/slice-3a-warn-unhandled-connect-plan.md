# Slice 3A: console.warn for Unhandled Events — Connect Webhook

## Spec
06-warn-unhandled-connect-webhook

## Files
- **Modify**: `src/app/api/stripe/connect-webhook/route.ts` (after the last handler)

## Implementation

After the `transfer.failed` block (added in slice 2A), add the else branch:

```ts
} else {
  console.warn("Unexpected event type at Connect webhook — check Stripe webhook configuration", {
    eventType: event.type,
    eventId: event.id,
    endpoint: "/api/stripe/connect-webhook",
  });
}
```

Same pattern as slice 1C (platform webhook).

## Acceptance criteria
- [ ] Unhandled event types produce `console.warn` with `eventType`, `eventId`, `endpoint`
- [ ] Handled events (`account.updated`, `transfer.created`, `transfer.failed`) NOT affected
- [ ] Webhook returns 200 for unhandled events
- [ ] lint + type-check pass

## Dependencies
- Specs 02, 03 (slice 2A) — transfer handlers must exist; otherwise this else branch would warn on transfer events before their handlers exist
