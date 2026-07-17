# Spec 01 — Extend View type with `"still-verifying"`

## Summary

Add `"still-verifying"` to the `View` union type in `stripe-connect-card.tsx`.

## Changes

- **File:** `src/components/settings/stripe-connect-card.tsx`
- **Line 8:** Extend `View` type:
  ```ts
  type View = "start" | "redirect" | "pending" | "verifying" | "still-verifying" | "connected" | "suspended";
  ```

## Acceptance Criteria

- [ ] `View` type includes `"still-verifying"` as a valid discriminant
- [ ] `pnpm check` passes with zero new errors
- [ ] No runtime behavior changes — this is type-only

## Prerequisites

None — this is the foundation spec.

## Dependencies

None.
