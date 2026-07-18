# Slice 2 — Remove grid-multiple validation

**Spec**: 02
**Wave**: 1 (core unlock)
**Effort**: Small

## Change

`src/app/app/settings/services/actions.ts` — replace `validateDuration` body:

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

**Important**: The `shopId` parameter is now unused by `validateDuration`, but the function signature should stay unchanged — both callers (`runCreateEventType` and `updateEventType`) pass `shop.id`. Removing the parameter would require updating two call sites unnecessarily.

**Import note**: `getBookingSettingsForShop` is still used by `createDefaultEventType()` (line ~235: `const settings = await getBookingSettingsForShop(shop.id)`). Do NOT remove the import.

## Files to modify

| File | Change |
|------|--------|
| `src/app/app/settings/services/actions.ts` | Replace `validateDuration` body |

## Acceptance criteria

1. A service with `durationMinutes=75` on a shop with `slotMinutes=30` is accepted (previously rejected)
2. A service with `durationMinutes=50` on a shop with `slotMinutes=60` is accepted (previously rejected)
3. A service with `durationMinutes=4` is rejected ("at least 5 minutes")
4. A service with `durationMinutes=481` is rejected by the Zod schema ("480 minutes or less")
5. `pnpm check` clean
6. Existing services with grid-aligned durations continue to save without error

## Dependencies

- Slice 1 (MAX raised to 480)
