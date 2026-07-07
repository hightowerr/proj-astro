# Spec 03: Rate Limit Module

## Summary

Create the core rate limiting module in `src/lib/rate-limit.ts` with two sliding-window limiters using `@upstash/ratelimit` and the existing Upstash Redis client.

## Prerequisites

- Spec 01 (dependency installed)
- Spec 02 (IP extraction utility — same file, extends it)

## Changes

| File | Change |
|------|--------|
| `src/lib/rate-limit.ts` | Add `checkBookingRateLimit()` function, two `Ratelimit` instances |

## Implementation

Two limiter instances (module-level singletons):

1. **Per-IP+shop** — `slidingWindow(5, "15 m")` — key: `booking:{ip}:{shopSlug}`
2. **Global per-IP** — `slidingWindow(20, "15 m")` — key: `booking_global:{ip}`

Exported function:

```ts
export async function checkBookingRateLimit(
  request: Request,
  shopSlug: string
): Promise<{ limited: boolean; retryAfterSeconds: number }>
```

Logic:
1. Extract IP via `getClientIp(request)`
2. If `process.env.PLAYWRIGHT === "true"`, return `{ limited: false, retryAfterSeconds: 0 }`
3. Check per-IP+shop limiter first
4. If passed, check global per-IP limiter
5. Return result with `retryAfterSeconds` from the failing limiter's `reset` field

## Design Decisions

- **Test bypass matches Better Auth pattern:** `isPlaywrightE2E` check, same env var (`PLAYWRIGHT`)
- **Sliding window (not fixed):** Prevents boundary-straddling attacks where attacker sends burst at window edge
- **Check tight limit first:** Fails fast on the more specific (cheaper) check before the broader one
- **Single shared function:** Both booking routes call the same function — consistent behaviour

## Acceptance Criteria

- [ ] Two `Ratelimit` instances created with correct windows
- [ ] `checkBookingRateLimit()` returns `{ limited, retryAfterSeconds }`
- [ ] Playwright bypass works when `PLAYWRIGHT=true`
- [ ] Uses existing `getRedisClient()` from `src/lib/redis.ts` (or creates Ratelimit with same credentials)
- [ ] `pnpm check` passes
