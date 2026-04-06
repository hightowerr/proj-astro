# V2 Implementation Plan — Email Multi-Interval Sending

**Slice:** V2 — Email Multi-Interval Sending
**Source:** `customizable-reminder-timing-slices.md`
**Depends on:** V1 (schema must have `bookingSettings.reminderTimings`)

Delivers: the email cron loops over all 7 intervals and sends at each one that an appointment's snapshot includes. Appointments booked too recently skip the relevant windows. Each `(appointment, interval)` pair sends at most once.

---

## Files to create or change

| File | Action |
|------|--------|
| `src/lib/schema.ts` | Add `reminderTimingsSnapshot` to `appointments` |
| `drizzle/0024_reminder_timings_snapshot.sql` | Generated migration + manual backfill |
| `src/lib/reminders.ts` | NEW — `parseReminderInterval()` and `shouldSkipReminder()` |
| `src/lib/queries/appointments.ts` | Extend `createAppointment()`, rewrite `findAppointmentsForEmailReminder()`, update `EmailReminderCandidate` type |
| `src/lib/messages.ts` | Add `reminderInterval` param to `sendAppointmentReminderEmail()` |
| `src/app/api/jobs/send-email-reminders/route.ts` | Pass `reminderInterval` from candidate to send function |
| `src/lib/__tests__/reminders.test.ts` | NEW — unit tests for `shouldSkipReminder()` |
| `src/lib/__tests__/email-reminder-query.test.ts` | Update fixtures + add multi-interval tests |
| `src/lib/__tests__/send-email-reminders-job.test.ts` | Update candidate shape, add `reminderInterval` assertion |

---

## Step 1 — Schema change

In `src/lib/schema.ts`, add `reminderTimingsSnapshot` to `appointments`:

```typescript
export const appointments = pgTable("appointments", {
  // ... existing fields unchanged ...

  // NEW:
  reminderTimingsSnapshot: text("reminder_timings_snapshot")
    .array()
    .notNull()
    .default(sql`ARRAY['24h']::text[]`),
});
```

No constraint needed here — the column is written once at booking time and never validated again. Validation happens at the settings layer (V1).

---

## Step 2 — Generate and edit migration

```bash
pnpm db:generate
```

Open the generated file (e.g., `drizzle/0024_reminder_timings_snapshot.sql`) and append the backfill:

```sql
-- Generated:
ALTER TABLE "appointments" ADD COLUMN "reminder_timings_snapshot" text[] NOT NULL DEFAULT ARRAY['24h']::text[];--> statement-breakpoint
-- Backfill (belt-and-suspenders per R13):
UPDATE "appointments"
SET "reminder_timings_snapshot" = ARRAY['24h']::text[]
WHERE "reminder_timings_snapshot" IS NULL
  AND "status" = 'booked';
```

> The `AND status = 'booked'` scope intentionally matches what the cron query will see. Cancelled/ended appointments won't be queried, so backfilling them is not required — but it doesn't hurt to include all rows for consistency.

```bash
pnpm db:migrate
```

Verify:
```sql
SELECT COUNT(*) FROM appointments
WHERE reminder_timings_snapshot IS NULL AND status = 'booked';
-- Expected: 0
```

---

## Step 3 — `src/lib/reminders.ts` (new file)

Create a new module for interval parsing and skip logic. Keeping it separate from `messages.ts` and `queries/appointments.ts` makes it independently testable.

```typescript
export type ReminderInterval = "10m" | "1h" | "2h" | "4h" | "24h" | "48h" | "1w";

export const REMINDER_INTERVALS: ReminderInterval[] = [
  "10m", "1h", "2h", "4h", "24h", "48h", "1w",
];

/**
 * Converts an interval string to minutes.
 * Returns null for unrecognised values.
 */
export const parseReminderInterval = (interval: string): number | null => {
  switch (interval) {
    case "10m": return 10;
    case "1h":  return 60;
    case "2h":  return 120;
    case "4h":  return 240;
    case "24h": return 1440;
    case "48h": return 2880;
    case "1w":  return 10080;
    default:    return null;
  }
};

/**
 * Returns true if the appointment was booked so recently that
 * the reminder window has already passed — i.e., the reminder
 * should be skipped to avoid sending retroactively.
 *
 * Skip condition: (startsAt - createdAt) < intervalMinutes
 * Boundary: exactly equal is NOT skipped (>= threshold → allow).
 */
export const shouldSkipReminder = (
  startsAt: Date,
  createdAt: Date,
  interval: string
): boolean => {
  const intervalMinutes = parseReminderInterval(interval);
  if (intervalMinutes === null) return true; // unknown interval → skip

  const leadTimeMs = startsAt.getTime() - createdAt.getTime();
  const leadTimeMinutes = leadTimeMs / (1000 * 60);

  return leadTimeMinutes < intervalMinutes;
};
```

---

## Step 4 — Update `findAppointmentsForEmailReminder()`

In `src/lib/queries/appointments.ts`:

**4a — Update the return type:**

```typescript
// Before:
export type EmailReminderCandidate = {
  appointmentId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  startsAt: Date;
  endsAt: Date;
  bookingUrl: string | null;
  shopName: string;
  shopTimezone: string;
};

// After (add reminderInterval):
export type EmailReminderCandidate = {
  appointmentId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  startsAt: Date;
  endsAt: Date;
  bookingUrl: string | null;
  shopName: string;
  shopTimezone: string;
  reminderInterval: string;  // NEW
};
```

**4b — Add the imports at the top of the file:**

```typescript
import { parseReminderInterval, shouldSkipReminder, REMINDER_INTERVALS } from "@/lib/reminders";
```

**4c — Rewrite `findAppointmentsForEmailReminder()`:**

```typescript
export const findAppointmentsForEmailReminder = async (): Promise<
  EmailReminderCandidate[]
> => {
  const now = Date.now();
  const results: EmailReminderCandidate[] = [];

  for (const interval of REMINDER_INTERVALS) {
    const intervalMinutes = parseReminderInterval(interval);
    if (intervalMinutes === null) continue;

    // ±60 minute window centred on the interval
    const windowStart = new Date(now + (intervalMinutes - 60) * 60 * 1000);
    const windowEnd   = new Date(now + (intervalMinutes + 60) * 60 * 1000);

    const rows = await db
      .select({
        appointmentId:  appointments.id,
        shopId:         appointments.shopId,
        customerId:     appointments.customerId,
        customerName:   customers.fullName,
        customerEmail:  customers.email,
        startsAt:       appointments.startsAt,
        endsAt:         appointments.endsAt,
        createdAt:      appointments.createdAt,
        bookingUrl:     appointments.bookingUrl,
        shopName:       shops.name,
        shopTimezone:   bookingSettings.timezone,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .innerJoin(shops, eq(appointments.shopId, shops.id))
      .leftJoin(
        customerContactPrefs,
        eq(appointments.customerId, customerContactPrefs.customerId)
      )
      .leftJoin(bookingSettings, eq(appointments.shopId, bookingSettings.shopId))
      .where(
        and(
          eq(appointments.status, "booked"),
          isNotNull(customers.email),
          gte(appointments.startsAt, windowStart),
          lte(appointments.startsAt, windowEnd),
          sql`${interval} = ANY(${appointments.reminderTimingsSnapshot})`,
          or(
            eq(customerContactPrefs.emailOptIn, true),
            isNull(customerContactPrefs.customerId)
          )
        )
      )
      .orderBy(asc(appointments.startsAt));

    for (const row of rows) {
      if (shouldSkipReminder(row.startsAt, row.createdAt, interval)) continue;
      results.push({
        appointmentId: row.appointmentId,
        shopId:        row.shopId,
        customerId:    row.customerId,
        customerName:  row.customerName,
        customerEmail: row.customerEmail!,
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

> **Why ±60 min window?** Cron runs once per day (or on a fixed schedule). A 2-hour window (interval ± 1h) ensures an appointment is caught even if the cron fires slightly early or late.

---

## Step 5 — Extend `createAppointment()` to capture snapshot

In `src/lib/queries/appointments.ts`, inside `createAppointment()`, after `ensureBookingSettings()` returns:

```typescript
const settings = await ensureBookingSettings(tx, input.shopId);

if (!settings) {
  throw new Error("Booking settings not found");
}

// NEW: capture reminder timing snapshot at booking time
const reminderTimingsSnapshot = settings.reminderTimings ?? ["24h"];
```

Then include it in `appointmentValues`:

```typescript
const appointmentValues: typeof appointments.$inferInsert = {
  shopId:             input.shopId,
  customerId:         customer.id,
  startsAt:           input.startsAt,
  endsAt,
  status:             paymentRequired ? "pending" : "booked",
  policyVersionId:    policyVersion?.id ?? null,
  paymentStatus:      paymentRequired ? "pending" : "unpaid",
  paymentRequired,
  source:             input.source ?? "web",
  sourceSlotOpeningId: input.sourceSlotOpeningId ?? null,
  bookingUrl:         null,
  reminderTimingsSnapshot,  // NEW
};
```

---

## Step 6 — Update `sendAppointmentReminderEmail()`

In `src/lib/messages.ts`, add `reminderInterval` to the params and use it for the dedup key and log purpose:

```typescript
export const sendAppointmentReminderEmail = async (params: {
  appointmentId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  startsAt: Date;
  endsAt: Date;
  bookingUrl: string | null;
  shopName: string;
  shopTimezone: string;
  reminderInterval: string;  // NEW
}): Promise<EmailReminderSendResult> => {
  const { ..., reminderInterval } = params;

  // Before: `appointment_reminder_24h:email:${appointmentId}`
  // After:  interval-aware (24h key is identical for existing appointments)
  const dedupKey = `appointment_reminder_${reminderInterval}:email:${appointmentId}`;
  const purpose  = `appointment_reminder_${reminderInterval}` as MessagePurpose;

  const sendAllowed = await shouldSendMessage(customerId, purpose, "email", dedupKey);
  if (!sendAllowed) {
    return "already_sent";
  }

  // ... rest of function unchanged, but pass `purpose` to logMessage ...
};
```

> **Backward compatibility:** For any appointment whose snapshot is `['24h']`, `reminderInterval` will be `"24h"` and the dedup key becomes `appointment_reminder_24h:email:{id}` — exactly matching pre-existing dedup records. No old sends will be re-triggered.

---

## Step 7 — Update the cron route

In `src/app/api/jobs/send-email-reminders/route.ts`, pass `reminderInterval` through:

```typescript
const result = await sendAppointmentReminderEmail({
  appointmentId: appointment.appointmentId,
  shopId:        appointment.shopId,
  customerId:    appointment.customerId,
  customerName:  appointment.customerName,
  customerEmail: appointment.customerEmail,
  startsAt:      appointment.startsAt,
  endsAt:        appointment.endsAt,
  bookingUrl:    appointment.bookingUrl,
  shopName:      appointment.shopName,
  shopTimezone:  appointment.shopTimezone,
  reminderInterval: appointment.reminderInterval,  // NEW
});
```

No other changes to the route — the loop over intervals is entirely inside `findAppointmentsForEmailReminder()`.

---

## Step 8 — Lint and typecheck

```bash
pnpm check
```

TypeScript will surface any call sites of `sendAppointmentReminderEmail` or `findAppointmentsForEmailReminder` that aren't passing `reminderInterval` yet. Fix all of them before proceeding.

---

## Tests

### Unit tests — `src/lib/__tests__/reminders.test.ts` (new file)

Pure function tests, no DB required:

```typescript
import { describe, expect, it } from "vitest";
import { parseReminderInterval, shouldSkipReminder } from "@/lib/reminders";

describe("parseReminderInterval", () => {
  it.each([
    ["10m",  10],
    ["1h",   60],
    ["2h",   120],
    ["4h",   240],
    ["24h",  1440],
    ["48h",  2880],
    ["1w",   10080],
  ])("parses %s → %d minutes", (interval, expected) => {
    expect(parseReminderInterval(interval)).toBe(expected);
  });

  it("returns null for unrecognised intervals", () => {
    expect(parseReminderInterval("15min")).toBeNull();
    expect(parseReminderInterval("")).toBeNull();
    expect(parseReminderInterval("3d")).toBeNull();
  });
});

describe("shouldSkipReminder", () => {
  const appointment = (minutesFromNow: number, createdMinutesAgo: number) => {
    const now = Date.now();
    return {
      startsAt:  new Date(now + minutesFromNow * 60 * 1000),
      createdAt: new Date(now - createdMinutesAgo * 60 * 1000),
    };
  };

  it("does not skip when booked well before the reminder window", () => {
    // Booked 2 days ago, appointment in 25h → lead time 49h >> 24h interval
    const { startsAt, createdAt } = appointment(25 * 60, 24 * 60);
    expect(shouldSkipReminder(startsAt, createdAt, "24h")).toBe(false);
  });

  it("skips when booked within the reminder window", () => {
    // Booked 30min ago, appointment in 30min → lead time 1h < 24h interval
    const { startsAt, createdAt } = appointment(30, 30);
    expect(shouldSkipReminder(startsAt, createdAt, "24h")).toBe(true);
  });

  it("does not skip when lead time equals the interval exactly", () => {
    // Lead time exactly 24h → boundary, should NOT skip
    const { startsAt, createdAt } = appointment(24 * 60, 0);
    expect(shouldSkipReminder(startsAt, createdAt, "24h")).toBe(false);
  });

  it("skips short-lead appointments for a long interval but not a short one", () => {
    // Booked 5min ago, appointment in 15min → lead time 20min
    const { startsAt, createdAt } = appointment(15, 5);
    expect(shouldSkipReminder(startsAt, createdAt, "24h")).toBe(true);  // skip 24h
    expect(shouldSkipReminder(startsAt, createdAt, "10m")).toBe(false); // keep 10m
  });

  it("skips for unknown interval", () => {
    const { startsAt, createdAt } = appointment(25 * 60, 24 * 60);
    expect(shouldSkipReminder(startsAt, createdAt, "15min")).toBe(true);
  });
});
```

Run:
```bash
pnpm test src/lib/__tests__/reminders.test.ts
```

Expected: all pass, no DB needed.

---

### Integration tests — `email-reminder-query.test.ts` (update)

The existing tests insert appointments without `reminderTimingsSnapshot`. After the schema change, the column defaults to `['24h']`, so existing tests should still pass — verify first:

```bash
pnpm test src/lib/__tests__/email-reminder-query.test.ts
```

Then add new tests for multi-interval behaviour. Add to the `makeFixture` helper a `reminderTimingsSnapshot` parameter, then:

```typescript
it("only returns an appointment for intervals in its snapshot", async () => {
  // Appointment with snapshot ['10m', '2h'] — 24h window should NOT match
  const shop = await createShop({ ownerUserId: userId, ... });
  // Insert appointment with reminderTimingsSnapshot = ['10m', '2h']
  // Place it 24h from now (in the 24h window)
  // → findAppointmentsForEmailReminder() should NOT return it (24h not in snapshot)
  // → but if placed 2h from now, it should return it with reminderInterval = '2h'
});

it("returns the appointment once per matching interval", async () => {
  // Snapshot ['2h', '24h'], appointment 24h from now
  // → returned once with reminderInterval = '24h'
  // → NOT returned for '2h' (appointment is not in the 2h window)
});

it("skips appointment booked within the reminder window", async () => {
  // Snapshot ['24h'], appointment 30min from now, created 1min ago
  // → shouldSkipReminder returns true → not included in results
});
```

---

### Unit tests — `send-email-reminders-job.test.ts` (update)

The `candidate()` helper currently does not include `reminderInterval`. Add it and update the assertion that `sendAppointmentReminderEmail` was called with the right params:

```typescript
const candidate = (id: string) => ({
  appointmentId:    id,
  shopId:           "shop-1",
  customerId:       `customer-${id}`,
  customerName:     `Customer ${id}`,
  customerEmail:    `${id}@example.com`,
  startsAt:         new Date("2026-03-18T10:00:00.000Z"),
  endsAt:           new Date("2026-03-18T11:00:00.000Z"),
  bookingUrl:       `https://example.com/manage/${id}`,
  shopName:         "Test Shop",
  shopTimezone:     "UTC",
  reminderInterval: "24h",  // NEW
});
```

Add an assertion that `reminderInterval` is forwarded:

```typescript
expect(sendAppointmentReminderEmailMock).toHaveBeenCalledWith(
  expect.objectContaining({ reminderInterval: "24h" })
);
```

Run all updated tests:
```bash
pnpm test src/lib/__tests__/send-email-reminders-job.test.ts
pnpm test src/lib/__tests__/email-reminder-query.test.ts
```

---

### Manual end-to-end verification

**Setup:**
1. Ensure V1 is deployed — visit `/settings/reminders` and set timings to `['10m', '24h']`
2. Book a test appointment approximately 25 hours from now (so it's in the 24h window but not the 10m window)

**Test 1 — 24h reminder fires:**
```bash
curl -X POST http://localhost:3000/api/jobs/send-email-reminders \
  -H "x-cron-secret: $CRON_SECRET"
```
Check response: `{ sent: 1, skipped: 0, errors: 0 }`. Verify email arrived.

**Test 2 — Dedup prevents double-send:**
Run the same curl again immediately. Response should be `{ sent: 0, skipped: 1 }`.

Verify in DB:
```sql
SELECT dedup_key FROM message_dedup
WHERE dedup_key LIKE 'appointment_reminder_%:email:%'
ORDER BY created_at DESC LIMIT 5;
-- Should show: appointment_reminder_24h:email:{appointmentId}
```

**Test 3 — Snapshot isolation:**
Change shop settings to `['1w']` (via settings UI). Book a *new* appointment 25h from now. Trigger cron.
- Original appointment (snapshot `['10m', '24h']`): already sent/deduped → skipped
- New appointment (snapshot `['1w']`): not in 24h window → not returned

```sql
SELECT id, reminder_timings_snapshot FROM appointments
ORDER BY created_at DESC LIMIT 5;
-- Row 1: {1w}    ← new appointment
-- Row 2: {10m,24h} ← original appointment
```

**Test 4 — shouldSkipReminder in practice:**
Book a same-day appointment 30 minutes from now. Trigger cron. Appointment should not appear in sent count, regardless of snapshot — it was booked within both the 10m and 24h windows, so both are skipped.

---

## Definition of Done

- [ ] `pnpm check` passes with no errors
- [ ] `pnpm test src/lib/__tests__/reminders.test.ts` — all pass (no DB required)
- [ ] `pnpm test src/lib/__tests__/email-reminder-query.test.ts` — existing tests still pass, new multi-interval tests pass
- [ ] `pnpm test src/lib/__tests__/send-email-reminders-job.test.ts` — `reminderInterval` forwarded correctly
- [ ] Migration applied; all booked appointments have `reminder_timings_snapshot` set
- [ ] `createAppointment()` writes snapshot from live settings
- [ ] Manual curl: 24h reminder fires once; second curl shows `skipped: 1`
- [ ] `messageDedup` row uses interval-aware key (`appointment_reminder_24h:email:{id}`)
- [ ] Changing settings after booking does not affect existing appointment snapshot
- [ ] Same-day booking (short lead time) is not sent for long-window intervals
