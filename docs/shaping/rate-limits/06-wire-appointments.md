# Spec 06: Wire Rate Limit into /api/appointments

## Summary

Add the same rate limit check to the `POST` handler in `src/app/api/appointments/route.ts` (the no-payment booking path).

## Prerequisites

- Spec 03 (rate limit module)
- Spec 04 (response helper)

## Changes

| File | Change |
|------|--------|
| `src/app/api/appointments/route.ts` | Import `checkBookingRateLimit` + `rateLimitedResponse`, add check after Zod parse |

## Implementation

Insert after Zod parse succeeds, before `getShopBySlug`:

```ts
const { limited, retryAfterSeconds } = await checkBookingRateLimit(req, parsed.data.shop);
if (limited) {
  return rateLimitedResponse(retryAfterSeconds);
}
```

## Design Decisions

- **Same limits as /api/bookings/create:** A fake appointment that blocks a real slot is equally harmful whether or not payment is involved. Same function, same thresholds.
- **Minimal logging:** This route has less verbose logging than the payment route. Keep consistent — no structured logging added here.

## Acceptance Criteria

- [ ] Rate limit check runs before any DB calls
- [ ] 429 returned when limit exceeded
- [ ] Uses the same `checkBookingRateLimit` function as spec 05
- [ ] All existing appointment creation behaviour unchanged for non-limited requests
- [ ] `pnpm check` passes
