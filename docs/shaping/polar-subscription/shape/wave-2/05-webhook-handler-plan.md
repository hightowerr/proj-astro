# Wave 2 — Slice 2b: Webhook Handler

## Spec

05-webhook-handler.md

## Files to create/modify

- **Modify**: `src/lib/auth.ts` — replace webhook callback stubs with full logic

## Dependencies

- Wave 1 slice 1a (01-schema-migration) — needs `subscriptionStatusEnum`, `processedPolarEvents`, `lastWebhookEventAt`
- Wave 1 slice 1c (03-polar-server-plugin) — callback stubs are wired here

## Acceptance Criteria

1. `onSubscriptionActive` callback: begin transaction, insert into `processedPolarEvents` (skip if duplicate), check `lastWebhookEventAt` (skip if older), set `subscriptionStatus = 'active'`, store `polarCustomerId`, update `lastWebhookEventAt`, commit.
2. `onSubscriptionUpdated` callback: same dedup + timestamp guard, set `past_due` if payload status is `past_due`, set `active` if payload status is `active`.
3. `onSubscriptionRevoked` callback: same dedup + timestamp guard, set `subscriptionStatus = 'canceled'`.
4. `onSubscriptionCreated` callback: log at info level, return (no-op).
5. `onSubscriptionCanceled` callback: log at info level, return (no-op).
6. `onSubscriptionUncanceled` callback: log at info level, return (no-op).
7. All state-changing callbacks use a database transaction wrapping dedup insert + state update.
8. Dedup uses `processedPolarEvents` table with event ID as primary key.
9. Timestamp guard compares event timestamp against `lastWebhookEventAt` to prevent out-of-order processing.
10. `pnpm check` passes with zero new errors.
