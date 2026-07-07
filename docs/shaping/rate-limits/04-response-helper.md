# Spec 04: 429 Response Helper

## Summary

Create a helper that returns a standardized 429 `Response` with a friendly JSON body and `Retry-After` header.

## Prerequisites

- Spec 03 (rate limit module — same file, uses its return type)

## Changes

| File | Change |
|------|--------|
| `src/lib/rate-limit.ts` | Add `rateLimitedResponse()` helper |

## Implementation

```ts
export function rateLimitedResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many booking attempts. Please try again in a few minutes." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(retryAfterSeconds)) },
    }
  );
}
```

## Design Decisions

- **Friendly message:** The booking form reads `data?.error` and displays it to the user. This message is customer-appropriate.
- **`Retry-After` header:** Standard HTTP header. Expressed in seconds (integer, ceiling-rounded).
- **No limit structure disclosure:** Message doesn't reveal the exact limit or window — just "try again in a few minutes."

## Acceptance Criteria

- [ ] Returns status 429
- [ ] JSON body has `error` string matching booking form's expected shape
- [ ] `Retry-After` header present with integer seconds
- [ ] `pnpm check` passes
