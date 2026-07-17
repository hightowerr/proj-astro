# Spec 05 — Add `"still-verifying"` to `hasAccent` condition

## Summary

Ensure the 4px left accent border persists when transitioning from `"verifying"` to `"still-verifying"`.

## Changes

- **File:** `src/components/settings/stripe-connect-card.tsx`
- **Line 680** — extend `hasAccent`:
  ```ts
  // BEFORE
  const hasAccent = view === "pending" || view === "verifying" || isConnected || isSuspended;

  // AFTER
  const hasAccent = view === "pending" || view === "verifying" || view === "still-verifying" || isConnected || isSuspended;
  ```

## Acceptance Criteria

- [ ] `"still-verifying"` view shows 4px navy left border (same as `"verifying"` and `"pending"`)
- [ ] Border color remains `--al-primary` (inherited from the existing else branch — not connected, not suspended)
- [ ] No visual jump when transitioning from `"verifying"` to `"still-verifying"`
- [ ] `pnpm check` passes

## Prerequisites

- Spec 01 (type exists)

## Dependencies

Depends on: spec 01.
