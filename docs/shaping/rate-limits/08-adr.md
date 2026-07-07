# Spec 08: Architecture Decision Record

## Summary

Document the rate limiting design decisions in `docs/adr/0001-booking-rate-limiting.md` and update `docs/context/architecture-context.md`.

## Prerequisites

- Spec 03 (rate limit module — decisions must be final before documenting)

## Changes

| File | Change |
|------|--------|
| `docs/adr/0001-booking-rate-limiting.md` (new) | ADR capturing key design decisions |
| `docs/context/architecture-context.md` | Add rate limiting to §8 Authorization Model, update §10 Invariants, update §11 Top 3 Risks |

## ADR Content

Record these decisions and their rationale:
1. **Two-layer rate limiting** (per-IP+shop + global per-IP) — why both are needed
2. **`@upstash/ratelimit` over hand-rolled** — why not reuse existing Redis patterns
3. **Both booking routes covered** — why `/api/appointments` gets the same treatment
4. **Sliding window** — why not fixed window
5. **In-handler, not middleware** — why the check lives in the route, not edge middleware
6. **Limits: 5/15min tight, 20/15min loose** — what real usage patterns justify these numbers

## Architecture Context Updates

### §8 Authorization Model — add row:

| Operation | Who | Enforcement | Location |
|-----------|-----|------------|----------|
| Create booking | Public (anyone) | Rate limited: 5/15min per IP+shop, 20/15min per IP (sliding window via Upstash) | `src/lib/rate-limit.ts` |

### §10 Invariants — add:

15. **Public booking endpoints rate-limited** — `POST /api/bookings/create` and `POST /api/appointments` enforce sliding-window rate limits via `@upstash/ratelimit`. Bypassed when `PLAYWRIGHT=true`. `src/lib/rate-limit.ts`

### §11 Top 3 Risks — update:

Remove risk #2 ("No request-level rate limiting on public booking endpoint") — resolved by this feature.

## Acceptance Criteria

- [ ] ADR follows project format (or format in `docs/adr/` template if one exists)
- [ ] Architecture context updated with rate limiting in authorization model
- [ ] New invariant added
- [ ] Risk #2 removed from Top 3 Risks
- [ ] No implementation details in ADR beyond what's needed to understand the decision
