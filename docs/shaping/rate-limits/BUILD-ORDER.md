# Rate Limiting — Build Order

## Dependency Graph

```
01 Install dependency ─────────────────────┐
                                           ▼
02 IP extraction utility ──────────► 03 Rate limit module
                                           │
                                           ▼
                                    04 Response helper
                                           │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                    05 Wire /bookings  06 Wire /appts  07 Unit tests
                              │            │            │
                              └────────────┼────────────┘
                                           ▼
                                    08 ADR + arch docs
```

## Phased Build Order

### Phase 1 — Foundation (parallel)

| Spec | Title | Depends on | Files | Effort |
|------|-------|-----------|-------|--------|
| 01 | Install `@upstash/ratelimit` | — | `package.json` | XS |
| 02 | IP extraction utility | — | `src/lib/rate-limit.ts` (new) | XS |

### Phase 2 — Core (sequential within phase, depends on Phase 1)

| Spec | Title | Depends on | Files | Effort |
|------|-------|-----------|-------|--------|
| 03 | Rate limit module | 01, 02 | `src/lib/rate-limit.ts` | S |
| 04 | 429 response helper | 03 | `src/lib/rate-limit.ts` | XS |

### Phase 3 — Integration (parallel, depends on Phase 2)

| Spec | Title | Depends on | Files | Effort |
|------|-------|-----------|-------|--------|
| 05 | Wire `/api/bookings/create` | 03, 04 | `src/app/api/bookings/create/route.ts` | XS |
| 06 | Wire `/api/appointments` | 03, 04 | `src/app/api/appointments/route.ts` | XS |
| 07 | Unit tests | 02, 03, 04 | `src/lib/__tests__/rate-limit.test.ts` (new) | S |

### Phase 4 — Documentation (depends on Phase 3)

| Spec | Title | Depends on | Files | Effort |
|------|-------|-----------|-------|--------|
| 08 | ADR + architecture docs | 03, 05, 06 | `docs/adr/0001-booking-rate-limiting.md` (new), `docs/context/architecture-context.md` | S |

## Critical Path

```
01 Install dependency
  → 03 Rate limit module
    → 04 Response helper
      → 05 Wire /bookings/create
        → 08 ADR + arch docs
```

**Length:** 5 specs (longest sequential chain).  
**Total specs:** 8.  
**Parallelism:** Specs 01+02 (Phase 1), Specs 05+06+07 (Phase 3).

## Design Impact

**No UI design work required.** This feature is entirely backend.

- The booking form (`src/components/booking/booking-form.tsx`) already handles non-OK API responses by reading `data?.error` from the JSON body and displaying it in the existing error banner. A 429 response with `{ error: "Too many booking attempts..." }` will render through the existing error flow with zero frontend changes.
- No new pages, no new components, no visual changes.

### Pages Impacted (code only, no visual change)

| Page / Route | Impact |
|-------------|--------|
| `POST /api/bookings/create` | 4 lines added (import + rate limit check) |
| `POST /api/appointments` | 4 lines added (import + rate limit check) |

### New Files

| File | Purpose |
|------|---------|
| `src/lib/rate-limit.ts` | `getClientIp()`, `checkBookingRateLimit()`, `rateLimitedResponse()` |
| `src/lib/__tests__/rate-limit.test.ts` | Unit tests |
| `docs/adr/0001-booking-rate-limiting.md` | Architecture decision record |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Add `@upstash/ratelimit` dependency |
| `src/app/api/bookings/create/route.ts` | Import + rate limit guard |
| `src/app/api/appointments/route.ts` | Import + rate limit guard |
| `docs/context/architecture-context.md` | §8 auth model row, §10 invariant, §11 risk removal |
