# Review 02 — Buffer Time Implementation Review

**Date:** 2026-04-08
**Reviewer:** Implementation Reviewer
**Inputs:** calendar-sync-buffer-fix, conflict-scanner-buffer, Slot Recovery Eligibility, bug-report-02.md
**Status:** REQUEST CHANGES

---

## Overall Verdict

| Feature Area | Status | Notes |
|---|---|---|
| Calendar Sync Buffer (V1 + V2) | ✅ APPROVE | Code matches shape exactly |
| Conflict Scanner Buffer (V1) | ✅ APPROVE | Code matches shape exactly |
| Slot Recovery Eligibility (V1) | ❌ NOT IMPLEMENTED | Plan written; source code unchanged |
| Bug Report 02 — Bug #5 (plan defect) | ❌ FIX BEFORE IMPL | `=== 0` fallback in v1-plan.md is semantically wrong |

---

## Feature Verification

### 1. Calendar Sync Buffer — APPROVE

**V1 (manual sync — `syncAppointmentCalendarEvent`):**

- `effectiveBufferAfterMinutes: true` present in `findFirst` columns — `appointments.ts:1230` ✅
- `new Date(appointment.endsAt.getTime() + appointment.effectiveBufferAfterMinutes * 60_000)` — `appointments.ts:1280-1283` ✅
- Test file exists: `src/lib/__tests__/calendar-sync-buffer.test.ts` ✅

**V2 (initial sync — `createAppointment`):**

- `new Date(appointmentWithBookingUrl.endsAt.getTime() + appointmentWithBookingUrl.effectiveBufferAfterMinutes * 60_000)` — `appointments.ts:948-951` ✅
- Field present on `.returning()` result — no query change needed, confirmed by V2 plan rationale ✅

All R0–R4 satisfied. No premature visual optimisation. No scope creep.

---

### 2. Conflict Scanner Buffer — APPROVE

- `appointmentBlockedEndMs` exported from `calendar-conflict-rules.ts:15` ✅
- `debugScanConflictsForShop` — `effectiveBufferAfterMinutes: true` in columns (`calendar-conflicts.ts:373`); overlap replaced with `overlapsWithCalendarConflictBuffer` using `appointmentBlockedEndMs` (`calendar-conflicts.ts:443-451`) ✅
- `scanAndDetectConflicts` — `effectiveBufferAfterMinutes: true` in columns (`calendar-conflicts.ts:526`); overlap replaced with `overlapsWithCalendarConflictBuffer` using `appointmentBlockedEndMs` (`calendar-conflicts.ts:568-576`) ✅
- `overlapsWithCalendarConflictBuffer` signature unchanged — existing callers unaffected ✅

All R0–R8 satisfied. No raw overlap check remains in either scanner.

---

### 3. Slot Recovery Eligibility — NOT IMPLEMENTED

The V1 plan was written (`Slot Recovery Eligibility/v1-plan.md`) but `src/lib/slot-recovery.ts` is unchanged.

Confirmed by reading `slot-recovery.ts:224-233`:

```typescript
// CURRENT — still present in source, plan NOT applied:
const overlapping = await db.query.appointments.findFirst({
  where: (table, { and, eq, gt, inArray, lt }) =>
    whereAnd(
      ...
      whereLt(table.startsAt, slotOpening.endsAt),   // ← raw slot end, no buffer
      whereGt(table.endsAt, slotOpening.startsAt)    // ← raw existing end, no buffer
    ),
});
```

No `slotEffectiveBufferMinutes` resolution before the loop. No `getBookingSettingsForShop` import. The fix has not been applied.

---

## Bug Report 02 — Confirmation

All five findings confirmed against source.

| Bug | Location | Confirmed? | Severity |
|-----|----------|:----------:|----------|
| #1 — `validateBookingConflict` ignores candidate buffer | `calendar-conflicts.ts:233` — `slotEndMs: bookingEnd` uses raw `input.endsAt` | ✅ | Medium |
| #2 — `filterSlotsForConflicts` ignores candidate buffer | `google-calendar-cache.ts:325` — `slotEndMs: slotEnd` uses raw `slot.endsAt.getTime()`; slot type has no buffer field | ✅ | Medium |
| #3 — `acceptOffer` missing calendar validation | `slot-recovery.ts:411` — calls `createAppointment` with no prior `validateBookingConflict` call | ✅ | Critical |
| #4 — `getEligibleCustomers` missing calendar check | `slot-recovery.ts:145-249` — no calendar event lookup; offers can be sent for calendar-blocked slots | ✅ | Medium |
| #5 — Fallback logic uses `=== 0` not `=== null` | In `v1-plan.md` Step 2 — code not yet written, but the plan contains the defect | ✅ | Medium (plan defect) |

**Note on Bug #5:** The source code hasn't been written yet, but the plan at `Slot Recovery Eligibility/v1-plan.md` Step 2 contains:

```typescript
// DEFECTIVE — in the plan, not yet in source:
if (slotEffectiveBufferMinutes === 0) {   // ← wrong: 0 is a valid explicit value
  const settings = await getBookingSettingsForShop(...);
  slotEffectiveBufferMinutes = settings?.defaultBufferMinutes ?? 0;
}
```

`0` is a valid value in the schema (`check in (0, 5, 10)`). Using `=== 0` as the fallback trigger incorrectly overrides an explicit zero-buffer eventType with the shop default. The plan must be corrected before implementation.

---

## TODO Implementation Plans — Confirmed Gaps

### TODO-1: Fix fallback semantics in Slot Recovery V1 plan (Bug #5)

**File:** `docs/shaping/buffer-time/Slot Recovery Eligibility/v1-plan.md`
**Action:** Update Step 2 to use a `null` sentinel, not `=== 0`.

Replace the buffer resolution block with:

```typescript
// Resolve slot effective buffer using null-sentinel, matching createAppointment's
// precedence: eventType.bufferMinutes ?? settings.defaultBufferMinutes ?? 0
// ?? only triggers on null/undefined — explicit 0 on an eventType is respected.
let slotEffectiveBufferMinutes: number | null = null;
if (slotOpening.eventTypeId) {
  const [et] = await db
    .select({ bufferMinutes: eventTypes.bufferMinutes })
    .from(eventTypes)
    .where(eq(eventTypes.id, slotOpening.eventTypeId))
    .limit(1);
  slotEffectiveBufferMinutes = et?.bufferMinutes ?? null;
}
if (slotEffectiveBufferMinutes === null) {
  const settings = await getBookingSettingsForShop(slotOpening.shopId);
  slotEffectiveBufferMinutes = settings?.defaultBufferMinutes ?? 0;
}
const slotBufferedEndsAt = new Date(
  slotOpening.endsAt.getTime() + slotEffectiveBufferMinutes * 60_000
);
```

**Why:** `??` only triggers on `null | undefined`. `if (=== 0)` silently overrides any eventType that explicitly sets a 0-minute buffer. Match `createAppointment`'s `input.eventTypeBufferMinutes ?? settings.defaultBufferMinutes ?? 0` exactly.

**Test:** Add a third test case to the buffer-overlap integration test — eventType with `bufferMinutes: 0` and shop default of 10 min; confirm `slotBufferedEndsAt === slotOpening.endsAt` (buffer of 0 respected, not overridden).

---

### TODO-2: `validateBookingConflict` — pass candidate buffer (Bug #1)

**File:** `src/lib/calendar-conflicts.ts`
**Shaping needed:** No — straight fix.

**Step 1 — Extend signature:**
```typescript
// Before:
export async function validateBookingConflict(input: {
  shopId: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
}): Promise<void>

// After:
export async function validateBookingConflict(input: {
  shopId: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  bufferAfterMinutes?: number;      // add
}): Promise<void>
```

**Step 2 — Use buffer in overlap check (`calendar-conflicts.ts:212-233`):**
```typescript
// Before:
const bookingEnd = input.endsAt.getTime();

// After:
const bookingEnd =
  input.endsAt.getTime() + (input.bufferAfterMinutes ?? 0) * 60_000;
```

**Step 3 — Update call site in `src/app/api/bookings/create/route.ts`:**
Find the `validateBookingConflict` call and add `bufferAfterMinutes: effectiveBufferAfterMinutes` (the value is already resolved earlier in that handler).

**Test:** Add a unit test in `calendar-conflicts.test.ts`: event starts after raw `endsAt` but inside the candidate's buffer — assert `CalendarConflictError` is thrown.

---

### TODO-3: `filterSlotsForConflicts` — pass slot buffer (Bug #2)

**File:** `src/lib/google-calendar-cache.ts`
**Also touches:** `src/lib/queries/appointments.ts` (call site)
**Shaping needed:** No — straight fix.

**Step 1 — Extend slot type and function signature:**
```typescript
// Before:
export function filterSlotsForConflicts(
  slots: { startsAt: Date; endsAt: Date }[],
  events: CalendarEvent[]
): { startsAt: Date; endsAt: Date }[]

// After:
export function filterSlotsForConflicts(
  slots: { startsAt: Date; endsAt: Date; bufferAfterMinutes?: number }[],
  events: CalendarEvent[]
): { startsAt: Date; endsAt: Date; bufferAfterMinutes?: number }[]
```

**Step 2 — Use buffer in overlap check (`google-calendar-cache.ts:323-328`):**
```typescript
// Before:
overlapsWithCalendarConflictBuffer({
  slotStartMs: slotStart,
  slotEndMs: slotEnd,
  ...
})

// After:
overlapsWithCalendarConflictBuffer({
  slotStartMs: slotStart,
  slotEndMs: slotEnd + (slot.bufferAfterMinutes ?? 0) * 60_000,
  ...
})
```

**Step 3 — Update call site in `getAvailabilityForDate` (`appointments.ts:259`):**
The `sizedSlots` array (computed at line 198-206) needs `bufferAfterMinutes: effectiveBufferAfterMinutes` added to each slot object before being passed to `filterSlotsForConflicts`.

**Test:** Update `google-calendar-cache.test.ts` — add a case where the event falls inside the buffer window only; confirm the slot is filtered out.

---

### TODO-4: `acceptOffer` — add calendar validation (Bug #3) [Critical]

**File:** `src/lib/slot-recovery.ts`
**Shaping needed:** No — straight fix.

Add a `validateBookingConflict` call inside the Redis lock, after the freshness check (line ~389), before `createAppointment`.

```typescript
// After fresh status check, before createAppointment:
const settings = await getBookingSettingsForShop(slotOpening.shopId);
if (!settings) throw new Error("BOOKING_SETTINGS_NOT_FOUND");

try {
  await validateBookingConflict({
    shopId: slotOpening.shopId,
    startsAt: slotOpening.startsAt,
    endsAt: slotOpening.endsAt,
    timezone: settings.timezone,
    bufferAfterMinutes: eventTypeBufferMinutes ?? settings.defaultBufferMinutes ?? 0,
  });
} catch (error) {
  if (error instanceof CalendarConflictError) {
    throw new Error("SLOT_NO_LONGER_AVAILABLE");
  }
  // Non-conflict errors (no calendar connected etc.) should not block booking
}
```

**Notes:**
- `eventTypeBufferMinutes` is already resolved at lines 391-404 — move that block before this check.
- `getBookingSettingsForShop` is already being added in Slot Recovery V1 — reuse it here.
- Import `validateBookingConflict` and `CalendarConflictError` from `@/lib/calendar-conflicts`.
- Calendar errors (no connection, API timeout) must NOT throw `SLOT_NO_LONGER_AVAILABLE` — only `CalendarConflictError` should block.

**Test:** Integration or unit test — mock `validateBookingConflict` to throw `CalendarConflictError`; assert `acceptOffer` throws `SLOT_NO_LONGER_AVAILABLE`.

---

### TODO-5: `getEligibleCustomers` — add calendar conflict pre-check (Bug #4)

**File:** `src/lib/slot-recovery.ts`
**Shaping needed:** No — straight fix.

This check should run once before the candidate loop (not per-candidate). If the slot itself is blocked by a calendar event, abort entirely — no point iterating candidates.

```typescript
// After resolving slotBufferedEndsAt (from Slot Recovery V1), before the candidate query:
const slotDateStr = formatDateInTimeZone(slotOpening.startsAt, settings.timezone);
const calendarEvents = await fetchCalendarEventsWithCache(
  slotOpening.shopId,
  slotDateStr,
  settings.timezone
);
const slotIsBlocked = calendarEvents.some((event) => {
  if (isAllDayEvent(event)) return true;
  const eventStartMs = event.start.dateTime ? Date.parse(event.start.dateTime) : NaN;
  const eventEndMs = event.end.dateTime ? Date.parse(event.end.dateTime) : NaN;
  if (!isFinite(eventStartMs) || !isFinite(eventEndMs)) return false;
  return overlapsWithCalendarConflictBuffer({
    slotStartMs: slotOpening.startsAt.getTime(),
    slotEndMs: slotBufferedEndsAt.getTime(),
    eventStartMs,
    eventEndMs,
  });
});
if (slotIsBlocked) {
  console.warn("[slot-recovery] slot blocked by calendar event; aborting offer loop", {
    slotOpeningId: slotOpening.id,
  });
  return [];
}
```

**Notes:**
- `settings` comes from the `getBookingSettingsForShop` call added in V1 — needs timezone field.
- Import `fetchCalendarEventsWithCache`, `isAllDayEvent`, `overlapsWithCalendarConflictBuffer` from `@/lib/google-calendar-cache` and `@/lib/calendar-conflict-rules`.
- Import `formatDateInTimeZone` from `@/lib/date-utils` (or wherever it lives in this codebase).
- This is a best-effort guard: if `fetchCalendarEventsWithCache` throws, catch and log, then continue (same pattern as availability calculation).

**Test:** Mock `fetchCalendarEventsWithCache` to return a conflicting event for the slot window; assert `getEligibleCustomers` returns `[]`.

---

## Summary of Required Actions

| # | Action | Owner | Priority |
|---|--------|-------|----------|
| 1 | Implement Slot Recovery V1 (overlap fix, after correcting TODO-1 first) | Dev | High |
| 2 | Fix v1-plan.md fallback semantics (`=== null` not `=== 0`) | Dev | High — do before impl |
| 3 | TODO-2: `validateBookingConflict` buffer pass-through | Dev | Medium |
| 4 | TODO-3: `filterSlotsForConflicts` buffer pass-through | Dev | Medium |
| 5 | TODO-4: `acceptOffer` calendar validation | Dev | Critical |
| 6 | TODO-5: `getEligibleCustomers` calendar pre-check | Dev | Medium |

Calendar Sync and Conflict Scanner features are production-ready. Slot Recovery has an unimplemented plan with a known defect. Bugs #3 (critical) and #1/#2/#4 are all confirmed true positives from the bug report.
