# Spec 05: Wire Rate Limit into /api/bookings/create

## Summary

Add the rate limit check at the top of the `POST` handler in `src/app/api/bookings/create/route.ts`, before any DB queries, Stripe calls, or business logic.

## Prerequisites

- Spec 03 (rate limit module)
- Spec 04 (response helper)

## Changes

| File | Change |
|------|--------|
| `src/app/api/bookings/create/route.ts` | Import `checkBookingRateLimit` + `rateLimitedResponse`, add check after JSON parse but before shop lookup |

## Implementation

Insert after the Zod parse succeeds (line ~65 in current file), before `getShopBySlug`:

```ts
const { limited, retryAfterSeconds } = await checkBookingRateLimit(req, parsed.data.shop);
if (limited) {
  console.warn("[booking-create] rate limited", {
    shopSlug: parsed.data.shop,
    durationMs: Date.now() - startedAt,
  });
  return rateLimitedResponse(retryAfterSeconds);
}
```

## Design Decisions

- **After JSON parse + Zod validation:** We need `parsed.data.shop` for the compound key. Invalid requests are rejected before hitting Redis.
- **Before shop lookup:** No DB call is made for rate-limited requests. This is the earliest point after we have the shop slug.
- **Console.warn logging:** Matches existing logging pattern in this handler (`[booking-create]` prefix with structured metadata).

## Acceptance Criteria

- [ ] Rate limit check runs before any DB/Stripe calls
- [ ] 429 returned when limit exceeded
- [ ] `Retry-After` header present on 429 responses
- [ ] Logging matches existing handler pattern
- [ ] All existing booking creation behaviour unchanged for non-limited requests
- [ ] `pnpm check` passes
