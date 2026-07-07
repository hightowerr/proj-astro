# Spec 07: Unit Tests

## Summary

Test the rate limit module: IP extraction, Playwright bypass, and the check function's two-layer logic.

## Prerequisites

- Spec 02 (IP extraction)
- Spec 03 (rate limit module)
- Spec 04 (response helper)

## Changes

| File | Change |
|------|--------|
| `src/lib/__tests__/rate-limit.test.ts` (new) | Unit tests for rate limit module |

## Test Cases

### getClientIp
1. Returns `x-real-ip` when present
2. Returns last `x-forwarded-for` entry when `x-real-ip` absent
3. Returns `"unknown"` when neither header present
4. Handles multi-value `x-forwarded-for` (e.g. `"1.2.3.4, 5.6.7.8"` returns `"5.6.7.8"`)

### checkBookingRateLimit
5. Returns `{ limited: false }` when `PLAYWRIGHT=true`
6. Returns `{ limited: false }` on first call (under limit)
7. Returns `{ limited: true, retryAfterSeconds > 0 }` after exceeding per-shop limit

### rateLimitedResponse
8. Returns 429 status
9. Body contains `error` string
10. `Retry-After` header is an integer string

## Notes

- Tests should mock Redis (`@upstash/ratelimit` supports a custom Redis instance — pass a mock or use `@upstash/ratelimit`'s ephemeral mode if available)
- Alternatively, test `getClientIp` and `rateLimitedResponse` as pure functions, and test the integration via the route tests in spec 08

## Acceptance Criteria

- [ ] All test cases pass via `pnpm test`
- [ ] No real Redis calls in tests
- [ ] `pnpm check` passes
