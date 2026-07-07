# Spec 01: Install @upstash/ratelimit

## Summary

Add `@upstash/ratelimit` as a production dependency. This package provides sliding-window rate limiting on top of the existing `@upstash/redis` client.

## Prerequisites

None. This is the foundation spec.

## Changes

| File | Change |
|------|--------|
| `package.json` | Add `@upstash/ratelimit` to dependencies |
| `pnpm-lock.yaml` | Updated by `pnpm add` |

## Acceptance Criteria

- [ ] `pnpm add @upstash/ratelimit` completes without errors
- [ ] `pnpm check` passes (lint + typecheck)
- [ ] No other files modified

## Notes

- `@upstash/ratelimit` is a thin wrapper (~4KB) over `@upstash/redis` — no new infrastructure dependency
- Already using `@upstash/redis` 1.36.1 in `src/lib/redis.ts` for locks and cooldowns
