# Spec 04 — Wire `StillVerifyingView` into render switch

## Summary

Add the `view === "still-verifying"` render branch in the main component JSX.

## Changes

- **File:** `src/components/settings/stripe-connect-card.tsx`
- **After line 708** (after `{view === "verifying" && <VerifyingView />}`), add:
  ```tsx
  {view === "still-verifying" && <StillVerifyingView />}
  ```

## Acceptance Criteria

- [ ] When `view` is `"still-verifying"`, `StillVerifyingView` renders
- [ ] No other view renders simultaneously
- [ ] `pnpm check` passes

## Prerequisites

- Spec 01 (type exists)
- Spec 03 (component exists)

## Dependencies

Depends on: spec 01, spec 03.
