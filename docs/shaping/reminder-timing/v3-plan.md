# V3 Implementation Plan — SMS Multi-Interval Sending

**Slice:** V3 — SMS Multi-Interval Sending
**Source:** `customizable-reminder-timing-slices.md`
**Depends on:** V1 (settings schema), V2 (snapshot schema, `shouldSkipReminder`, `REMINDER_INTERVALS`, `parseReminderInterval`)

Delivers: the SMS cron loops over all 7 intervals and sends to high-risk opted-in customers at each one their appointment snapshot includes. Each `(appointment, interval)` pair sends at most once.

---

## Critical prerequisite: `messagePurposeEnum` is a Postgres enum

**This is the most important thing to understand before touching any code.**

`messageLog.purpose` is backed by a Postgres `CREATE TYPE message_purpose AS ENUM (...)`. The current values are:

```
booking_confirmation
cancellation_confirmation
slot_recovery_offer
appointment_reminder_24h       ← only reminder value today
appointment_confirmation_request
```

**Any interval-aware purpose value that isn't in this enum will throw a Postgres error at runtime.**

This affects V2 as well — `sendAppointmentReminderEmail()` calls `logMessage()` with `purpose: "appointment_reminder_${reminderInterval}"`. If V2 was deployed without adding the enum values, email logging for intervals other than `24h` will be broken.

**Step 1 of this plan adds all 6 missing enum values.** If V2 has already added them, skip Step 1 and verify before proceeding.

---

## Files to create or change

| File | Action |
|------|--------|
| `src/lib/schema.ts` | Add 6 new values to `messagePurposeEnum` |
| `drizzle/0025_reminder_purpose_enum.sql` | Generated migration for enum |
| `src/lib/queries/messages.ts` | Update `checkReminderAlreadySent()` to accept `interval` |
| `src/lib/queries/appointments.ts` | Extend `findHighRiskAppointments()`, add `reminderInterval` to `HighRiskReminderCandidate` |
| `src/lib/messages.ts` | Add `reminderInterval` to `sendAppointmentReminderSMS()` |
| `src/app/api/jobs/send-reminders/route.ts` | Pass `reminderInterval` from candidate to send function |
| `src/lib/__tests__/reminder-job.test.ts` | Update fixtures, add multi-interval query tests, update `checkReminderAlreadySent` tests |
| `src/app/api/jobs/send-reminders/route.test.ts` | NEW — mock-based route handler test |

---

## Step 1 — Extend `messagePurposeEnum` in schema

In `src/lib/schema.ts`:

```typescript
export const messagePurposeEnum = pgEnum("message_purpose", [
  "booking_confirmation",
  "cancellation_confirmation",
  "slot_recovery_offer",
  "appointment_reminder_24h",
  "appointment_confirmation_request",
  // NEW — one value per reminder interval:
  "appointment_reminder_10m",
  "appointment_reminder_1h",
  "appointment_reminder_2h",
  "appointment_reminder_4h",
  "appointment_reminder_48h",
  "appointment_reminder_1w",
]);
```

Then generate and run the migration:

```bash
pnpm db:generate
pnpm db:migrate
```

Drizzle generates `ALTER TYPE ... ADD VALUE ...` statements wrapped in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;` blocks, making them safe to re-run.

Verify the enum values are present:

```sql
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'message_purpose'
ORDER BY enumsortorder;
```

Expected: 11 rows including all 7 `appointment_reminder_*` values.

**Also verify V2 is unblocked:** if email reminders have been triggered for non-24h intervals before this migration, those `logMessage()` calls will have thrown. Check `messageLog` for any rows with `status = 'failed'` and `errorMessage` matching a Postgres enum violation.

---

## Step 2 — Update `checkReminderAlreadySent()`

In `src/lib/queries/messages.ts`, add an `interval` parameter so each `(appointment, interval)` pair is checked independently:

```typescript
/**
 * Returns true when a reminder for the given interval has already
 * been logged for the appointment.
 */
export const checkReminderAlreadySent = async (
  appointmentId: string,
  interval: string
): Promise<boolean> => {
  const purpose = `appointment_reminder_${interval}` as typeof messageLog.$inferInsert.purpose;

  const existing = await db
    .select({ id: messageLog.id })
    .from(messageLog)
    .where(
      and(
        eq(messageLog.appointmentId, appointmentId),
        eq(messageLog.purpose, purpose)
      )
    )
    .limit(1);

  return existing.length > 0;
};
```

> **Backward compatibility:** existing callers pass only `appointmentId`. After this change they must also pass `interval`. `pnpm check` will surface every call site — there is exactly one: inside `sendAppointmentReminderSMS()`. Fix it in Step 4.

---

## Step 3 — Extend `findHighRiskAppointments()`

In `src/lib/queries/appointments.ts`:

**3a — Update the return type:**

```typescript
// Before:
export type HighRiskReminderCandidate = {
  appointmentId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  startsAt: Date;
  endsAt: Date;
  bookingUrl: string | null;
  shopName: string;
  shopTimezone: string;
};

// After:
export type HighRiskReminderCandidate = {
  appointmentId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  startsAt: Date;
  endsAt: Date;
  bookingUrl: string | null;
  shopName: string;
  shopTimezone: string;
  reminderInterval: string;  // NEW
};
```

**3b — Rewrite `findHighRiskAppointments()`:**

The new version follows the exact same loop pattern introduced in V2 for `findAppointmentsForEmailReminder()`. Import `REMINDER_INTERVALS`, `parseReminderInterval`, and `shouldSkipReminder` from `@/lib/reminders` (created in V2).

```typescript
export const findHighRiskAppointments = async (): Promise<
  HighRiskReminderCandidate[]
> => {
  const now = Date.now();
  const results: HighRiskReminderCandidate[] = [];

  for (const interval of REMINDER_INTERVALS) {
    const intervalMinutes = parseReminderInterval(interval);
    if (intervalMinutes === null) continue;

    const windowStart = new Date(now + (intervalMinutes - 60) * 60 * 1000);
    const windowEnd   = new Date(now + (intervalMinutes + 60) * 60 * 1000);

    const rows = await db
      .select({
        appointmentId: appointments.id,
        shopId:        appointments.shopId,
        customerId:    appointments.customerId,
        customerName:  customers.fullName,
        customerPhone: customers.phone,
        startsAt:      appointments.startsAt,
        endsAt:        appointments.endsAt,
        createdAt:     appointments.createdAt,
        bookingUrl:    appointments.bookingUrl,
        shopName:      shops.name,
        shopTimezone:  bookingSettings.timezone,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .innerJoin(
        customerContactPrefs,
        eq(appointments.customerId, customerContactPrefs.customerId)
      )
      .innerJoin(shops, eq(appointments.shopId, shops.id))
      .leftJoin(bookingSettings, eq(appointments.shopId, bookingSettings.shopId))
      .where(
        and(
          eq(appointments.status, "booked"),
          eq(appointments.noShowRisk, "high"),
          gte(appointments.startsAt, windowStart),
          lte(appointments.startsAt, windowEnd),
          sql`${interval} = ANY(${appointments.reminderTimingsSnapshot})`,
          eq(customerContactPrefs.smsOptIn, true)
        )
      );

    for (const row of rows) {
      if (shouldSkipReminder(row.startsAt, row.createdAt, interval)) continue;
      results.push({
        appointmentId: row.appointmentId,
        shopId:        row.shopId,
        customerId:    row.customerId,
        customerName:  row.customerName,
        customerPhone: row.customerPhone,
        startsAt:      row.startsAt,
        endsAt:        row.endsAt,
        bookingUrl:    row.bookingUrl,
        shopName:      row.shopName,
        shopTimezone:  row.shopTimezone ?? "UTC",
        reminderInterval: interval,
      });
    }
  }

  return results;
};
```

---

## Step 4 — Update `sendAppointmentReminderSMS()`

In `src/lib/messages.ts`, add `reminderInterval` to params and thread it through the dedup check and log:

```typescript
export const sendAppointmentReminderSMS = async (params: {
  appointmentId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  startsAt: Date;
  bookingUrl: string | null;
  shopName: string;
  shopTimezone: string;
  reminderInterval: string;  // NEW
}): Promise<ReminderSendResult> => {
  const { ..., reminderInterval } = params;

  // Interval-aware dedup: check (appointmentId, interval) pair
  const alreadySent = await checkReminderAlreadySent(appointmentId, reminderInterval);
  if (alreadySent) {
    return "already_sent";
  }

  // Interval-aware purpose for messageLog
  const purpose = `appointment_reminder_${reminderInterval}` as MessagePurpose;

  // ... rest of function unchanged except replace every hardcoded
  // "appointment_reminder_24h" with `purpose` ...

  const baseLog = {
    shopId,
    appointmentId,
    customerId,
    channel: "sms" as const,
    purpose,             // ← was "appointment_reminder_24h" as const
    toPhone: customerPhone,
    // ... rest unchanged
  };
};
```

> **Backward compatibility:** for appointments with snapshot `['24h']`, `reminderInterval` will be `"24h"` and `purpose` becomes `"appointment_reminder_24h"` — identical to today's value. Existing `messageLog` rows created before V3 remain valid dedup guards.

---

## Step 5 — Update the cron route

In `src/app/api/jobs/send-reminders/route.ts`, pass `reminderInterval`:

```typescript
const result = await sendAppointmentReminderSMS({
  appointmentId:    appointment.appointmentId,
  shopId:           appointment.shopId,
  customerId:       appointment.customerId,
  customerName:     appointment.customerName,
  customerPhone:    appointment.customerPhone,
  startsAt:         appointment.startsAt,
  bookingUrl:       appointment.bookingUrl,
  shopName:         appointment.shopName,
  shopTimezone:     appointment.shopTimezone,
  reminderInterval: appointment.reminderInterval,  // NEW
});
```

No other changes to the route — interval looping is entirely inside `findHighRiskAppointments()`.

---

## Step 6 — Lint and typecheck

```bash
pnpm check
```

TypeScript will surface:
- Any remaining call sites of `checkReminderAlreadySent` still passing only one argument
- Any call sites of `sendAppointmentReminderSMS` missing `reminderInterval`
- Any call sites of `findHighRiskAppointments` expecting the old shape

Fix all errors before running tests.

---

## Tests

### Integration tests — `reminder-job.test.ts` (update)

This file currently tests both `findHighRiskAppointments()` and `checkReminderAlreadySent()`.

**Fix existing fixture:** The `makeAppointmentFixture` helper inserts appointments without `reminderTimingsSnapshot`. After the V2 schema migration, the column defaults to `['24h']`. Existing tests should still pass — verify first:

```bash
pnpm test src/lib/__tests__/reminder-job.test.ts
```

Then add new tests:

**For `findHighRiskAppointments()`:**

```typescript
it("returns only appointments for intervals in their snapshot", async () => {
  // Insert appointment with reminderTimingsSnapshot = ['2h'] at 24h from now
  // → should NOT appear for the 24h interval pass
  // → should NOT appear for the 2h interval pass (not in that window)
  // Insert appointment with reminderTimingsSnapshot = ['24h'] at 24h from now
  // → should appear with reminderInterval = '24h'
});

it("returns reminderInterval on each result", async () => {
  const { appointment } = await makeAppointmentFixture({ hoursFromNow: 24 });
  // Ensure snapshot = ['24h'] (the default)
  const results = await findHighRiskAppointments();
  const found = results.find((r) => r.appointmentId === appointment.id);
  expect(found?.reminderInterval).toBe("24h");
});

it("skips appointment booked within the reminder window", async () => {
  // Insert appointment 30min from now, created just now, snapshot = ['24h']
  // → shouldSkipReminder returns true → excluded
  const startsAt = new Date(Date.now() + 30 * 60 * 1000);
  // Insert directly with this startsAt and createdAt = now
  const results = await findHighRiskAppointments();
  // Should not be found in any interval pass
});
```

**For `checkReminderAlreadySent()` — update all calls to pass interval:**

The existing tests use `checkReminderAlreadySent(appointment.id)`. After the signature change, they must pass the interval too. Update all three existing tests:

```typescript
// Before:
await expect(checkReminderAlreadySent(appointment.id)).resolves.toBe(true);

// After:
await expect(checkReminderAlreadySent(appointment.id, "24h")).resolves.toBe(true);
```

Add new tests for interval isolation:

```typescript
it("returns false for a different interval even if one interval was already sent", async () => {
  const { shop, customer, appointment } = await makeAppointmentFixture();

  // Log a 24h reminder
  await db.insert(messageLog).values({
    shopId:         shop.id,
    appointmentId:  appointment.id,
    customerId:     customer.id,
    channel:        "sms",
    purpose:        "appointment_reminder_24h",
    // ... rest of fields ...
  });

  // 24h was sent — true
  await expect(checkReminderAlreadySent(appointment.id, "24h")).resolves.toBe(true);
  // 2h was not sent — false
  await expect(checkReminderAlreadySent(appointment.id, "2h")).resolves.toBe(false);
});
```

Run:
```bash
pnpm test src/lib/__tests__/reminder-job.test.ts
```

---

### New route test — `src/app/api/jobs/send-reminders/route.test.ts`

Model after `send-email-reminders-job.test.ts`. Mock `db`, `findHighRiskAppointments`, and `sendAppointmentReminderSMS`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeMock,
  findHighRiskAppointmentsMock,
  sendAppointmentReminderSMSMock,
} = vi.hoisted(() => ({
  executeMock:                    vi.fn(),
  findHighRiskAppointmentsMock:   vi.fn(),
  sendAppointmentReminderSMSMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: { execute: executeMock } }));
vi.mock("@/lib/queries/appointments", () => ({
  findHighRiskAppointments: findHighRiskAppointmentsMock,
}));
vi.mock("@/lib/messages", () => ({
  sendAppointmentReminderSMS: sendAppointmentReminderSMSMock,
}));

const { POST } = await import("@/app/api/jobs/send-reminders/route");

const makeRequest = (secret = "test-cron-secret") =>
  new Request("http://localhost:3000/api/jobs/send-reminders", {
    method: "POST",
    headers: { "x-cron-secret": secret },
  });

const candidate = (id: string, interval = "24h") => ({
  appointmentId:    id,
  shopId:           "shop-1",
  customerId:       `customer-${id}`,
  customerName:     `Customer ${id}`,
  customerPhone:    "+12025551234",
  startsAt:         new Date("2026-03-18T10:00:00.000Z"),
  endsAt:           new Date("2026-03-18T11:00:00.000Z"),
  bookingUrl:       `https://example.com/manage/${id}`,
  shopName:         "Test Shop",
  shopTimezone:     "UTC",
  reminderInterval: interval,
});

describe("POST /api/jobs/send-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    executeMock.mockResolvedValue([{ locked: true }]);
    findHighRiskAppointmentsMock.mockResolvedValue([]);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns 401 when CRON_SECRET is invalid", async () => {
    const response = await POST(makeRequest("wrong-secret"));
    expect(response.status).toBe(401);
  });

  it("returns 500 when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await POST(makeRequest());
    expect(response.status).toBe(500);
  });

  it("returns skipped when advisory lock is already held", async () => {
    executeMock.mockResolvedValueOnce([{ locked: false }]);
    const response = await POST(makeRequest());
    const body = await response.json() as { skipped: boolean; reason: string };
    expect(body).toEqual({ skipped: true, reason: "locked" });
    expect(findHighRiskAppointmentsMock).not.toHaveBeenCalled();
  });

  it("processes candidates and reports sent, skipped, errors", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    findHighRiskAppointmentsMock.mockResolvedValue([
      candidate("appt-1", "24h"),
      candidate("appt-2", "2h"),
      candidate("appt-3", "24h"),
    ]);
    sendAppointmentReminderSMSMock
      .mockResolvedValueOnce("sent")
      .mockResolvedValueOnce("already_sent")
      .mockRejectedValueOnce(new Error("twilio error"));

    const response = await POST(makeRequest());
    const body = await response.json() as {
      total: number; sent: number; skipped: number;
      errors: number; errorDetails: unknown[];
    };

    expect(body.total).toBe(3);
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(1);
    expect(body.errors).toBe(1);
    expect(body.errorDetails).toEqual([
      { appointmentId: "appt-3", error: "twilio error" },
    ]);
  });

  it("forwards reminderInterval to sendAppointmentReminderSMS", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    findHighRiskAppointmentsMock.mockResolvedValue([candidate("appt-1", "2h")]);
    sendAppointmentReminderSMSMock.mockResolvedValue("sent");

    await POST(makeRequest());

    expect(sendAppointmentReminderSMSMock).toHaveBeenCalledWith(
      expect.objectContaining({ reminderInterval: "2h" })
    );
  });

  it("always releases the advisory lock even if processing throws", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    findHighRiskAppointmentsMock.mockRejectedValue(new Error("query failed"));

    await expect(POST(makeRequest())).rejects.toThrow("query failed");
    expect(executeMock).toHaveBeenCalledTimes(2);
  });

  it("returns zero-count summary when there is no work", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);

    const response = await POST(makeRequest());
    const body = await response.json() as { total: number; sent: number };
    expect(body.total).toBe(0);
    expect(body.sent).toBe(0);
  });
});
```

Run:
```bash
pnpm test src/app/api/jobs/send-reminders/route.test.ts
```

---

### Manual end-to-end verification

**Setup:**
1. Ensure V1 and V2 are in place
2. Ensure the `messagePurposeEnum` migration has run (Step 1 above)
3. Configure shop reminders to `['2h', '24h']` via the settings UI
4. Create a test customer with `noShowRisk = 'high'` and `smsOptIn = true`
5. Book an appointment for that customer 25 hours from now

**Test 1 — 24h SMS fires:**
```bash
curl -X POST http://localhost:3000/api/jobs/send-reminders \
  -H "x-cron-secret: $CRON_SECRET"
```
Expected response: `{ sent: 1, skipped: 0, errors: 0 }`.

Verify in DB:
```sql
SELECT purpose, status, rendered_body
FROM message_log
WHERE appointment_id = '<appointmentId>'
AND channel = 'sms'
ORDER BY created_at DESC;
-- Should show: appointment_reminder_24h | sent
```

**Test 2 — Dedup prevents second 24h SMS:**
Run the same curl immediately. Expected: `{ sent: 0, skipped: 1 }`.

Verify `checkReminderAlreadySent` logic:
```sql
SELECT COUNT(*) FROM message_log
WHERE appointment_id = '<appointmentId>'
AND purpose = 'appointment_reminder_24h'
AND channel = 'sms';
-- Expected: 1 (not 2)
```

**Test 3 — Interval isolation (2h fires independently):**
Advance time or book an appointment 2h from now. Trigger cron. The 2h reminder should fire for that appointment.

```sql
SELECT purpose, status FROM message_log
WHERE appointment_id = '<appointmentId>'
AND channel = 'sms';
-- Should have both:
-- appointment_reminder_24h | sent
-- appointment_reminder_2h  | sent
```

**Test 4 — Snapshot isolation:**
Change shop settings to `['1w']`. Book a new appointment 25h from now. Trigger cron:
- Original appointment (snapshot `['2h', '24h']`): already sent for 24h → skipped
- New appointment (snapshot `['1w']`): 25h window doesn't match 1w → not returned

Expected response: `{ sent: 0, skipped: 1, errors: 0 }`.

**Test 5 — Enum validation (sanity check):**
```sql
-- This should fail with: invalid input value for enum message_purpose
INSERT INTO message_log (purpose, ...) VALUES ('appointment_reminder_15min', ...);
-- Expected: ERROR: invalid input value for enum message_purpose: "appointment_reminder_15min"
-- Confirms the enum correctly rejects unknown intervals
```

---

## Definition of Done

- [ ] `pnpm check` passes with no errors
- [ ] `messagePurposeEnum` has 11 values; all 7 `appointment_reminder_*` variants present in DB
- [ ] `pnpm test src/lib/__tests__/reminder-job.test.ts` — all existing tests updated and passing; new multi-interval and isolation tests passing
- [ ] `pnpm test src/app/api/jobs/send-reminders/route.test.ts` — all 6 new tests passing
- [ ] `checkReminderAlreadySent(appointmentId, interval)` correctly returns `false` for unsent intervals and `true` only for the specific interval that was sent
- [ ] Manual curl: 24h SMS fires once; second curl shows `skipped: 1`
- [ ] `messageLog` shows `purpose = appointment_reminder_24h` (not the old hardcoded string)
- [ ] Two intervals in snapshot (`['2h', '24h']`) produce two independent `messageLog` rows as the appointment moves through its windows
- [ ] Changing settings after booking does not affect existing appointment's SMS schedule
