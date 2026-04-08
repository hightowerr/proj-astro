# V1 Implementation Plan — Manual Sync Fixed + Test Green

**Slice:** V1 of `docs/shaping/buffer-time/calendar-sync-buffer-fix.md`
**Parts:** A2.1, A2.2, A3
**Requirements closed:** R1, R2, R3, R4

---

## Files

| File | Action |
|------|--------|
| `src/lib/queries/appointments.ts` | Modify — `syncAppointmentCalendarEvent` |
| `src/lib/__tests__/calendar-sync-buffer.test.ts` | Create |

---

## Step 1 — A2.1: Add column to query

In `syncAppointmentCalendarEvent` (L1219–1230), add `effectiveBufferAfterMinutes: true` to the `columns` allowlist.

**Before:**
```typescript
columns: {
  id: true,
  shopId: true,
  customerId: true,
  startsAt: true,
  endsAt: true,
  status: true,
  paymentStatus: true,
  paymentRequired: true,
  bookingUrl: true,
  calendarEventId: true,
},
```

**After:**
```typescript
columns: {
  id: true,
  shopId: true,
  customerId: true,
  startsAt: true,
  endsAt: true,
  effectiveBufferAfterMinutes: true,
  status: true,
  paymentStatus: true,
  paymentRequired: true,
  bookingUrl: true,
  calendarEventId: true,
},
```

This is a prerequisite for Step 2 — without it, `appointment.effectiveBufferAfterMinutes` does not exist on the TypeScript type and Step 2 will not compile.

---

## Step 2 — A2.2: Computation change

In the same function, replace the raw `endsAt` with the buffered end time (L1274).

**Before:**
```typescript
const calendarEventInput: Parameters<typeof createCalendarEvent>[0] = {
  shopId: appointment.shopId,
  customerName: customer.fullName,
  startsAt: appointment.startsAt,
  endsAt: appointment.endsAt,
  bookingUrl: appointment.bookingUrl ?? null,
};
```

**After:**
```typescript
const calendarEventInput: Parameters<typeof createCalendarEvent>[0] = {
  shopId: appointment.shopId,
  customerName: customer.fullName,
  startsAt: appointment.startsAt,
  endsAt: new Date(
    appointment.endsAt.getTime() +
    appointment.effectiveBufferAfterMinutes * 60_000
  ),
  bookingUrl: appointment.bookingUrl ?? null,
};
```

---

## Step 3 — A3: Test file

Create `src/lib/__tests__/calendar-sync-buffer.test.ts`.

The mock structure follows the established pattern in `calendar-conflicts.test.ts`: all mocks defined in `vi.hoisted()`, then wired via `vi.mock()`.

**What needs mocking:**

| Mock | Why |
|------|-----|
| `db.query.appointments.findFirst` | Returns appointment fixture |
| `db.query.shops.findFirst` | Returns shop fixture (needed for `shopName`) |
| `db.query.customers.findFirst` | Returns customer fixture (guard: returns false if null) |
| `db.query.bookingSettings.findFirst` | Returns settings fixture (used for timezone in `invalidateCalendarCache`) |
| `db.update(...).set(...).where(...).returning()` | Write-back of `calendarEventId` after successful sync |
| `createCalendarEvent` | Target function — captures `endsAt` arg |
| `invalidateCalendarCache` | Called after write-back — no-op |
| `NoCalendarConnectionError`, `CalendarEventCreationError` | Imported by `appointments.ts`; used in `instanceof` guards in the catch block |

**Full test file:**

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  appointmentFindFirstMock,
  shopFindFirstMock,
  customerFindFirstMock,
  bookingSettingsFindFirstMock,
  updateReturningMock,
  createCalendarEventMock,
} = vi.hoisted(() => {
  const updateReturningMock = vi.fn();
  const updateWhereMock = vi.fn(() => ({ returning: updateReturningMock }));
  const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));

  return {
    appointmentFindFirstMock: vi.fn(),
    shopFindFirstMock: vi.fn(),
    customerFindFirstMock: vi.fn(),
    bookingSettingsFindFirstMock: vi.fn(),
    updateReturningMock,
    createCalendarEventMock: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      appointments: { findFirst: appointmentFindFirstMock },
      shops: { findFirst: shopFindFirstMock },
      customers: { findFirst: customerFindFirstMock },
      bookingSettings: { findFirst: bookingSettingsFindFirstMock },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: updateReturningMock,
        })),
      })),
    })),
  },
}));

vi.mock("@/lib/google-calendar", () => ({
  createCalendarEvent: createCalendarEventMock,
  invalidateCalendarCache: vi.fn().mockResolvedValue(undefined),
  NoCalendarConnectionError: class NoCalendarConnectionError extends Error {},
  CalendarEventCreationError: class CalendarEventCreationError extends Error {},
}));

const { syncAppointmentCalendarEvent } = await import(
  "@/lib/queries/appointments"
);

const rawStartsAt = new Date("2026-04-10T13:00:00Z");
const rawEndsAt = new Date("2026-04-10T14:00:00Z");

const makeAppointmentFixture = (effectiveBufferAfterMinutes: number) => ({
  id: "appt-1",
  shopId: "shop-1",
  customerId: "customer-1",
  startsAt: rawStartsAt,
  endsAt: rawEndsAt,
  effectiveBufferAfterMinutes,
  status: "booked" as const,
  paymentStatus: "paid" as const,
  paymentRequired: false,
  bookingUrl: null,
  calendarEventId: null,
});

describe("syncAppointmentCalendarEvent — buffered end time", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shopFindFirstMock.mockResolvedValue({ name: "Test Shop" });
    customerFindFirstMock.mockResolvedValue({ fullName: "Jane Doe" });
    bookingSettingsFindFirstMock.mockResolvedValue({ timezone: "UTC" });
    createCalendarEventMock.mockResolvedValue("cal-event-123");
    updateReturningMock.mockResolvedValue([
      { id: "appt-1", shopId: "shop-1", startsAt: rawStartsAt },
    ]);
  });

  it("passes endsAt + buffer to createCalendarEvent when effectiveBufferAfterMinutes = 10", async () => {
    appointmentFindFirstMock.mockResolvedValue(makeAppointmentFixture(10));

    await syncAppointmentCalendarEvent("appt-1");

    expect(createCalendarEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endsAt: new Date(rawEndsAt.getTime() + 10 * 60_000),
      })
    );
  });

  it("passes raw endsAt to createCalendarEvent when effectiveBufferAfterMinutes = 0", async () => {
    appointmentFindFirstMock.mockResolvedValue(makeAppointmentFixture(0));

    await syncAppointmentCalendarEvent("appt-1");

    expect(createCalendarEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        endsAt: rawEndsAt,
      })
    );
  });
});
```

---

## Step 4 — Self-verification

Run in this order:

```bash
# 1. Type-check — confirms A2.1 exposed the field and A2.2 uses it correctly
pnpm typecheck

# 2. Run the new test — both assertions must pass
pnpm test src/lib/__tests__/calendar-sync-buffer.test.ts

# 3. Lint
pnpm lint

# 4. Run the full existing calendar test suite to confirm no regression
pnpm test src/lib/__tests__/calendar-conflicts.test.ts
pnpm test src/lib/__tests__/google-calendar.test.ts
```

### What passing looks like

```
✓ syncAppointmentCalendarEvent — buffered end time
  ✓ passes endsAt + buffer to createCalendarEvent when effectiveBufferAfterMinutes = 10
  ✓ passes raw endsAt to createCalendarEvent when effectiveBufferAfterMinutes = 0
```

### What to check if a test fails

| Failure | Most likely cause |
|---------|------------------|
| TypeScript error on `appointment.effectiveBufferAfterMinutes` | A2.1 not applied — field not in `columns` |
| Test assertion fails: received `rawEndsAt`, expected `rawEndsAt + 10min` | A2.2 not applied — still passing raw `endsAt` |
| `createCalendarEventMock` not called at all | Guard check returned early — verify `appointmentFindFirstMock` returns `calendarEventId: null` and `status: "booked"` |
| `updateReturningMock` shape error | Drizzle update chain mock not matching — check `set → where → returning` chain |
