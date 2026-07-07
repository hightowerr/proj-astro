# Spec 02: IP Extraction Utility

## Summary

Create a `getClientIp(request: Request): string` function that reliably extracts the client IP address from incoming requests on Vercel.

## Prerequisites

None.

## Changes

| File | Change |
|------|--------|
| `src/lib/rate-limit.ts` (new) | Export `getClientIp()` function |

## Implementation

```ts
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    "unknown"
  );
}
```

## Design Decisions

- **`x-real-ip` first:** Set by Vercel's edge, not spoofable. This is the authoritative source on Vercel.
- **`x-forwarded-for` fallback (last entry):** For local dev where `x-real-ip` isn't set. Last entry is the connecting IP.
- **`"unknown"` fallback:** Local dev without any proxy shares a single bucket — acceptable for development.

## Acceptance Criteria

- [ ] Function exported from `src/lib/rate-limit.ts`
- [ ] Returns `x-real-ip` when present
- [ ] Falls back to last `x-forwarded-for` entry
- [ ] Falls back to `"unknown"` when neither header exists
- [ ] `pnpm check` passes
