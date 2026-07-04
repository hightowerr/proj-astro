# Slice 5a: Remove `transfer.failed` Dead Code

**Spec**: 14
**File(s)**: `src/app/api/stripe/connect-webhook/route.ts`, `src/app/api/stripe/connect-webhook/route.test.ts`
**Dependencies**: None

## What to do

### 1. Remove dead handler branch (`route.ts`)
Remove the `else if ((event.type as string) === "transfer.failed")` branch (lines 209-226). The `else` fallback ("Unexpected event type") immediately follows the `transfer.created` handler.

Before:
```
} else if (event.type === "transfer.created") {
  // ... transfer.created handler ...
} else if ((event.type as string) === "transfer.failed") {
  // ... dead code ...
} else {
  // unexpected event fallback
}
```

After:
```
} else if (event.type === "transfer.created") {
  // ... transfer.created handler ...
} else {
  // unexpected event fallback
}
```

### 2. Remove dead test block (`route.test.ts`)
Remove the entire `describe("transfer.failed", ...)` block (lines 240-319). Contains 3 tests:
- "logs error with MANUAL_REVIEW_REQUIRED on happy path"
- "uses 'unknown' fields when context is unresolvable"
- "skips processing on duplicate event (dedup)"

### 3. Verify
- `pnpm check` (lint + typecheck) must pass
- Remaining tests must still pass: `pnpm vitest run src/app/api/stripe/connect-webhook/route.test.ts`

## Acceptance criteria
- [ ] `transfer.failed` handler branch removed from `route.ts`
- [ ] `transfer.failed` describe block removed from `route.test.ts`
- [ ] No `transfer.failed` string remains in either file
- [ ] `pnpm check` passes with zero new errors
- [ ] Existing tests (transfer.created, account.updated) still pass
