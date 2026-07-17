# Spec 02 — Transition to `"still-verifying"` on poll exhaustion

## Summary

When the auto-poll reaches attempt 13 (exhaustion), call `setView("still-verifying")` instead of silently clearing the interval.

## Changes

- **File:** `src/components/settings/stripe-connect-card.tsx`
- **Lines 610-614** (poll exhaustion block inside the `setInterval` callback):
  ```ts
  // BEFORE
  if (pollCountRef.current > 12) {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    return;
  }

  // AFTER
  if (pollCountRef.current > 12) {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    console.info("[stripe-connect] Poll exhausted after 12 attempts — transitioning to still-verifying");
    setView("still-verifying");
    return;
  }
  ```

## Acceptance Criteria

- [ ] After 12 failed polls (60s), view transitions from `"verifying"` to `"still-verifying"`
- [ ] `console.info` emits at poll exhaustion with the message above
- [ ] Polling stops (interval cleared) — no further fetches after transition
- [ ] `pnpm check` passes

## Prerequisites

- Spec 01 (`"still-verifying"` must be a valid `View` value)

## Dependencies

Depends on: spec 01.
