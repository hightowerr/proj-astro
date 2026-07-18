# Spec 02 — Remove grid-multiple validation

**Priority**: P0 (core unlock — removes the constraint that blocks arbitrary durations)
**Type**: Validation logic change
**Risk**: Low — booking system already handles arbitrary durations

## Change

`src/app/app/settings/services/actions.ts` lines 81-98 — replace `validateDuration`:

```diff
  async function validateDuration(
    shopId: string,
    durationMinutes: number
  ): Promise<ActionFieldError | null> {
-   const settings = await getBookingSettingsForShop(shopId);
-   const slotMinutes = settings?.slotMinutes ?? 60;
-
-   if (durationMinutes % slotMinutes !== 0) {
-     return {
-       ok: false,
-       fieldErrors: {
-         durationMinutes: `Duration must be a multiple of ${slotMinutes} minutes`,
-       },
-     };
-   }
-
-   return null;
+   if (durationMinutes < 5) {
+     return {
+       ok: false,
+       fieldErrors: {
+         durationMinutes: "Duration must be at least 5 minutes",
+       },
+     };
+   }
+
+   return null;
  }
```

The upper bound (`<= MAX_SERVICE_DURATION_MINUTES`) is already enforced by the Zod schema at line 39-41. The `validateDuration` function only needs to enforce the floor.

The `getBookingSettingsForShop` import can be removed if it has no other callers in this file.

## Dependencies

- Spec 01 (MAX raised to 480) — so the Zod upper bound is correct when this validation fires.

## Acceptance Criteria

1. A service with `durationMinutes=75` on a shop with `slotMinutes=30` is accepted (previously rejected).
2. A service with `durationMinutes=50` on a shop with `slotMinutes=60` is accepted (previously rejected).
3. A service with `durationMinutes=4` is rejected ("at least 5 minutes").
4. A service with `durationMinutes=481` is rejected by the Zod schema ("480 minutes or less").
5. `pnpm check` clean.
6. Existing services with grid-aligned durations continue to save without error.
