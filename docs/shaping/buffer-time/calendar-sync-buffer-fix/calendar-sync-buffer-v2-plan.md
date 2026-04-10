# V2 Implementation Plan — Initial Sync Fixed

**Slice:** V2 of `docs/shaping/buffer-time/calendar-sync-buffer-fix.md`
**Parts:** A1
**Requirements closed:** R0
**Depends on:** V1 complete (test must be green before this ships)

---

## Files

| File | Action |
|------|--------|
| `src/lib/queries/appointments.ts` | Modify — `createAppointment()`, calendar sync branch |

---

## Step 1 — A1: Computation change

Inside `createAppointment()`, in the `if (!paymentRequired)` block (L943–948), replace the raw `endsAt` with the buffered end time.

**Before:**
```typescript
const calendarEventInput: Parameters<typeof createCalendarEvent>[0] = {
  shopId: input.shopId,
  customerName: customer.fullName,
  startsAt: appointmentWithBookingUrl.startsAt,
  endsAt: appointmentWithBookingUrl.endsAt,
  bookingUrl,
};
```

**After:**
```typescript
const calendarEventInput: Parameters<typeof createCalendarEvent>[0] = {
  shopId: input.shopId,
  customerName: customer.fullName,
  startsAt: appointmentWithBookingUrl.startsAt,
  endsAt: new Date(
    appointmentWithBookingUrl.endsAt.getTime() +
    appointmentWithBookingUrl.effectiveBufferAfterMinutes * 60_000
  ),
  bookingUrl,
};
```

No query change needed. `appointmentWithBookingUrl` comes from `.returning()` after the insert (L904–907) or, when a booking URL is set, from a second `.returning()` after the update (L919–926). Both return the full row — `effectiveBufferAfterMinutes` is present on the type in either branch. TypeScript will confirm this.

---

## Why there is no new test

`createAppointment` is a large database transaction with Stripe calls, policy version logic, overlap guards, and SMS/calendar side effects. Isolating the calendar sync branch at unit level would require mocking all of that context — far more complexity than the change warrants and nothing that V1 hasn't already proved.

The confidence basis for V2 is:

| Evidence | What it proves |
|----------|---------------|
| `pnpm typecheck` passes | `appointmentWithBookingUrl.effectiveBufferAfterMinutes` exists on the type — the field is present on the `.returning()` result |
| Expression is identical to V1's N5 | If `new Date(endsAt.getTime() + buffer * 60_000)` is correct in `syncAppointmentCalendarEvent`, it is correct here |
| V1 test still passes | No regression introduced — the test file is unchanged |

---

## Step 2 — Self-verification

```bash
# 1. Type-check — confirms effectiveBufferAfterMinutes is present on appointmentWithBookingUrl
#    and the expression is type-correct
pnpm typecheck

# 2. Lint
pnpm lint

# 3. V1 test — must still pass (no regression)
pnpm test src/lib/__tests__/calendar-sync-buffer.test.ts

# 4. Broader calendar and buffer regression suite
pnpm test src/lib/__tests__/calendar-conflicts.test.ts
pnpm test src/lib/__tests__/google-calendar.test.ts
pnpm test src/lib/__tests__/buffer-time.test.ts
```

### What passing looks like

```
pnpm typecheck  →  no errors
pnpm lint       →  no errors

✓ syncAppointmentCalendarEvent — buffered end time
  ✓ passes endsAt + buffer to createCalendarEvent when effectiveBufferAfterMinutes = 10
  ✓ passes raw endsAt to createCalendarEvent when effectiveBufferAfterMinutes = 0

✓ calendar-conflicts  (all existing)
✓ google-calendar     (all existing)
✓ buffer-time         (all existing, subject to POSTGRES_URL)
```

### What to check if verification fails

| Failure | Most likely cause |
|---------|------------------|
| TypeScript error: property `effectiveBufferAfterMinutes` does not exist | Wrong object referenced — confirm you are editing `appointmentWithBookingUrl`, not `appointment` (they differ when `bookingUrl` is set) |
| TypeScript error: `effectiveBufferAfterMinutes` possibly undefined | Drizzle schema has it nullable — check `src/lib/schema.ts` and use `?? 0` if needed |
| V1 test fails after V2 change | `createAppointment` and `syncAppointmentCalendarEvent` are in the same file — confirm the edit did not accidentally touch the wrong function |
| `buffer-time.test.ts` skips | `POSTGRES_URL` not set — expected, not a failure |
