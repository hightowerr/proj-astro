# Google Calendar Integration — Slices

## Overview

Breaking Shape B into 7 vertical slices, each demo-able with working UI. Every slice includes comprehensive test coverage to ensure no regression of existing tests.

---

## Slice Summary

| Slice | Title | Demo | Status |
|-------|-------|------|--------|
| **V1** | Connect Calendar (OAuth) | Shop owner connects Google Calendar via OAuth, sees connection status | ⏳ Pending |
| **V2** | Create Events on Booking | New bookings create calendar events automatically | ⏳ Pending |
| **V3** | Block Conflicting Slots | Calendar events block slots in availability API | ⏳ Pending |
| **V4** | Prevent Conflict Bookings | Booking shows "Calendar conflict" error if slot conflicts | ⏳ Pending |
| **V5** | Delete Events on Cancel | Cancelled appointments delete calendar events | ⏳ Pending |
| **V6** | Scan Conflicts (Cron Job) | Background job detects conflicts, creates alerts | ⏳ Pending |
| **V7** | Conflicts Dashboard | Shop owner sees conflict alerts, can dismiss or cancel | ⏳ Pending |

---

## V1: Connect Calendar (OAuth)

### What Gets Built

**UI:**
- Calendar settings page at `/app/settings/calendar`
- "Connect Google Calendar" button
- OAuth consent flow (redirect to Google)
- Calendar selection dropdown on callback
- Connection status display
- "Disconnect" button

**Non-UI:**
- OAuth initiation route: `/api/settings/calendar/connect`
- OAuth callback route: `/api/settings/calendar/callback`
- Token encryption service
- Connection storage in database

**Database:**
- `calendar_connections` table (CREATE)

**Affordances:**
- U1, U2, U3, U4 (UI)
- N1, N2, N3, N4 (handlers/services)
- T1 (table)

### Demo

1. Shop owner navigates to `/app/settings/calendar`
2. Clicks "Connect Google Calendar"
3. Redirected to Google OAuth consent screen
4. Grants calendar permissions
5. Selects which calendar to sync
6. Returns to settings page, sees "Connected to: My Calendar"
7. Can disconnect by clicking "Disconnect"

### Test Requirements

**Unit Tests** (`src/lib/__tests__/google-calendar-oauth.test.ts`):
- ✅ `encryptToken()` encrypts tokens correctly
- ✅ `decryptToken()` decrypts tokens correctly
- ✅ OAuth state parameter prevents CSRF
- ✅ Token expiration validation

**Integration Tests** (`src/app/api/settings/calendar/__tests__/`):
- ✅ `/api/settings/calendar/connect` generates valid OAuth URL
- ✅ `/api/settings/calendar/callback` exchanges code for tokens
- ✅ `/api/settings/calendar/callback` stores encrypted tokens in database
- ✅ `/api/settings/calendar/disconnect` soft-deletes connection

**Playwright E2E** (`tests/e2e/calendar-oauth.spec.ts`):
- ✅ Shop owner can navigate to calendar settings
- ✅ "Connect Google Calendar" button redirects to OAuth (mock)
- ✅ OAuth callback saves connection and shows status
- ✅ Disconnect button removes connection status

**Regression Prevention:**
- ✅ No changes to existing booking/availability tests
- ✅ Existing settings page tests still pass

### Implementation Checklist

- [ ] Create `calendar_connections` table migration
- [ ] Implement token encryption utility
- [ ] Create OAuth connect route
- [ ] Create OAuth callback route
- [ ] Create disconnect route
- [ ] Build calendar settings UI page
- [ ] Write unit tests for encryption
- [ ] Write integration tests for OAuth routes
- [ ] Write Playwright test for OAuth flow
- [ ] Run all existing tests to verify no regression

---

## V2: Create Events on Booking

### What Gets Built

**Database:**
- Add `calendarEventId` column to `appointments` table

**Non-UI:**
- `createCalendarEvent()` service in `src/lib/google-calendar.ts`
- `refreshAccessToken()` service
- `invalidateCalendarCache()` helper
- Modify `createAppointment()` to call `createCalendarEvent()` in transaction

**Affordances:**
- N8, N12, N13 (services)
- T3 update (appointments.calendarEventId)

### Demo

1. Customer books an appointment via `/book/{slug}`
2. Booking succeeds
3. Check Google Calendar → new event appears with appointment details
4. Event title: "Appointment: {customer name}"
5. Event time matches appointment start/end
6. If calendar sync fails → booking fails with error

### Test Requirements

**Unit Tests** (`src/lib/__tests__/google-calendar.test.ts`):
- ✅ `createCalendarEvent()` calls Google Calendar API with correct payload
- ✅ `createCalendarEvent()` handles API errors and throws
- ✅ `refreshAccessToken()` refreshes expired tokens
- ✅ `refreshAccessToken()` updates connection in database
- ✅ `invalidateCalendarCache()` deletes Redis cache key

**Integration Tests** (`src/lib/queries/__tests__/appointments.test.ts`):
- ✅ `createAppointment()` creates calendar event after appointment insert
- ✅ `createAppointment()` writes `calendarEventId` to appointments table
- ✅ `createAppointment()` rollback if calendar event creation fails (R10)
- ✅ `createAppointment()` invalidates cache after success

**Playwright E2E** (`tests/e2e/booking-with-calendar.spec.ts`):
- ✅ Booking creates calendar event (mock Google Calendar API)
- ✅ Booking fails if calendar API returns error
- ✅ `calendarEventId` is stored in database

**Regression Prevention:**
- ✅ Existing booking tests pass (mock calendar connection as null)
- ✅ Booking without calendar connection still works
- ✅ Payment flow tests unaffected

### Implementation Checklist

- [ ] Add `calendarEventId` column migration
- [ ] Implement `createCalendarEvent()` service
- [ ] Implement `refreshAccessToken()` service
- [ ] Implement `invalidateCalendarCache()` helper
- [ ] Modify `createAppointment()` to integrate calendar event creation
- [ ] Write unit tests for calendar services
- [ ] Write integration tests for appointment creation with calendar
- [ ] Write Playwright test for booking flow
- [ ] Run all existing booking tests to verify no regression

---

## V3: Block Conflicting Slots

### What Gets Built

**Non-UI:**
- `fetchCalendarEventsWithCache()` in `src/lib/google-calendar-cache.ts`
- Redis cache layer with 180s TTL
- `fetchFromGoogleAPI()` service
- `filterSlotsForConflicts()` logic
- Modify `getAvailabilityForDate()` to fetch calendar events and filter slots

**Affordances:**
- N5, N6, N7, N9 (caching + filtering)

### Demo

1. Shop owner has connected calendar with events on 2024-03-15 at 2:00 PM
2. Customer opens booking page, selects 2024-03-15
3. Availability API fetches calendar events (cached)
4. Slots that overlap with calendar events are excluded
5. 2:00 PM slot is NOT shown to customer
6. All-day events block entire day

### Test Requirements

**Unit Tests** (`src/lib/__tests__/google-calendar-cache.test.ts`):
- ✅ `fetchCalendarEventsWithCache()` returns cached events on hit
- ✅ `fetchCalendarEventsWithCache()` fetches from API on miss
- ✅ `fetchCalendarEventsWithCache()` caches result with 180s TTL
- ✅ `fetchCalendarEventsWithCache()` gracefully degrades if Redis unavailable
- ✅ `filterSlotsForConflicts()` excludes overlapping slots
- ✅ `filterSlotsForConflicts()` blocks entire day for all-day events (R9)

**Integration Tests** (`src/lib/queries/__tests__/appointments.test.ts`):
- ✅ `getAvailabilityForDate()` excludes slots conflicting with calendar events
- ✅ `getAvailabilityForDate()` includes slots without conflicts
- ✅ `getAvailabilityForDate()` works when no calendar connection exists

**Playwright E2E** (`tests/e2e/availability-with-calendar.spec.ts`):
- ✅ Availability API excludes slots with calendar conflicts
- ✅ All-day event blocks entire day
- ✅ Cache reduces Google Calendar API calls (verify via mock)

**Regression Prevention:**
- ✅ Existing availability tests pass
- ✅ Availability without calendar connection unchanged
- ✅ Redis unavailable doesn't break availability

### Implementation Checklist

- [ ] Implement `fetchCalendarEventsWithCache()` service
- [ ] Implement Redis cache layer
- [ ] Implement `fetchFromGoogleAPI()` service
- [ ] Implement `filterSlotsForConflicts()` logic
- [ ] Modify `getAvailabilityForDate()` to integrate conflict filtering
- [ ] Write unit tests for caching and filtering
- [ ] Write integration tests for availability with conflicts
- [ ] Write Playwright test for availability blocking
- [ ] Run all existing availability tests to verify no regression

---

## V4: Prevent Conflict Bookings

### What Gets Built

**UI:**
- Error message display on booking page: "Calendar conflict"

**Non-UI:**
- `validateBookingConflict()` logic
- `CalendarConflictError` exception
- Modify booking API to validate conflicts before creating appointment
- Return 409 Conflict with error details

**Affordances:**
- N10, N11, U11 (validation + error)

### Demo

1. Shop owner has calendar event at 2:00 PM on 2024-03-15
2. Customer somehow accesses booking form for 2:00 PM slot (direct link, race condition)
3. Customer submits booking
4. Booking API validates against calendar
5. Detects conflict
6. Returns 409 error: "This time conflicts with an existing calendar event"
7. Booking form shows error message
8. Appointment is NOT created

### Test Requirements

**Unit Tests** (`src/lib/__tests__/calendar-conflicts.test.ts`):
- ✅ `validateBookingConflict()` detects overlapping events
- ✅ `validateBookingConflict()` throws `CalendarConflictError`
- ✅ `validateBookingConflict()` passes when no conflicts

**Integration Tests** (`src/app/api/bookings/__tests__/create.test.ts`):
- ✅ POST `/api/bookings/create` returns 409 when calendar conflict exists
- ✅ 409 response includes conflicting event details
- ✅ Appointment is NOT created when conflict detected
- ✅ Booking succeeds when no conflict exists

**Playwright E2E** (`tests/e2e/booking-conflict-prevention.spec.ts`):
- ✅ Booking form shows "Calendar conflict" error on 409
- ✅ Customer cannot book conflicting slot
- ✅ Error message displays event details

**Regression Prevention:**
- ✅ Existing booking tests pass (no conflicts)
- ✅ SlotTakenError still works for appointment conflicts
- ✅ Payment flow unaffected

### Implementation Checklist

- [ ] Implement `validateBookingConflict()` logic
- [ ] Create `CalendarConflictError` exception class
- [ ] Modify `/api/bookings/create` to validate conflicts
- [ ] Add 409 error handling to booking form UI
- [ ] Write unit tests for conflict validation
- [ ] Write integration tests for 409 response
- [ ] Write Playwright test for conflict error display
- [ ] Run all existing booking tests to verify no regression

---

## V5: Delete Events on Cancel

### What Gets Built

**Non-UI:**
- `deleteCalendarEvent()` service
- `autoResolveAlert()` logic (for future V6/V7)
- Modify cancellation flow to delete calendar event
- Graceful degradation if delete fails

**Affordances:**
- N15, N23 (deletion + auto-resolve)

### Demo

1. Customer has booked appointment (has calendar event)
2. Customer navigates to `/manage/{token}`
3. Clicks "Cancel Appointment"
4. Cancellation processes refund (if eligible)
5. Deletes calendar event from Google Calendar
6. Appointment marked as cancelled
7. Calendar event is gone from Google Calendar

### Test Requirements

**Unit Tests** (`src/lib/__tests__/google-calendar.test.ts`):
- ✅ `deleteCalendarEvent()` calls Google Calendar API delete endpoint
- ✅ `deleteCalendarEvent()` handles 404 gracefully (event already deleted)
- ✅ `deleteCalendarEvent()` logs error but doesn't throw (graceful degradation)

**Integration Tests** (`src/app/api/manage/__tests__/cancel.test.ts`):
- ✅ Cancellation deletes calendar event when connection exists
- ✅ Cancellation succeeds even if calendar delete fails
- ✅ Cancellation works when no calendar connection exists
- ✅ Cache is invalidated after deletion

**Playwright E2E** (`tests/e2e/cancel-with-calendar.spec.ts`):
- ✅ Cancel appointment deletes calendar event (mock API)
- ✅ Cancel succeeds even if Google Calendar API fails

**Regression Prevention:**
- ✅ Existing cancellation tests pass
- ✅ Refund logic unaffected
- ✅ Slot recovery still works

### Implementation Checklist

- [ ] Implement `deleteCalendarEvent()` service
- [ ] Implement `autoResolveAlert()` stub (no-op until V6)
- [ ] Modify cancellation route to integrate calendar deletion
- [ ] Write unit tests for calendar deletion
- [ ] Write integration tests for cancel with calendar
- [ ] Write Playwright test for cancel flow
- [ ] Run all existing cancellation tests to verify no regression

---

## V6: Scan Conflicts (Cron Job)

### What Gets Built

**Database:**
- `calendar_conflict_alerts` table (CREATE)

**Non-UI:**
- Conflict scan cron job at `/api/jobs/scan-calendar-conflicts`
- `scanAndDetectConflicts()` logic
- `calculateOverlapSeverity()` helper
- Cleanup job for old alerts
- Vercel cron configuration

**Affordances:**
- N16, N17, N20, N24 (cron + logic)
- T2 (table)

### Demo

1. Shop owner has calendar connection
2. Shop owner has appointment on 2024-03-20 at 10:00 AM
3. Shop owner adds calendar event on 2024-03-20 at 10:00 AM (external, in Google Calendar)
4. Cron job runs at 4:00 AM next day
5. Job detects conflict between appointment and calendar event
6. Creates alert in `calendar_conflict_alerts` table
7. Alert includes event snapshot (summary, start, end)
8. Trigger manually: `curl -X POST /api/jobs/scan-calendar-conflicts -H "x-cron-secret: $CRON_SECRET"`
9. Check database → alert exists with status='pending'

### Test Requirements

**Unit Tests** (`src/lib/__tests__/calendar-conflicts.test.ts`):
- ✅ `scanAndDetectConflicts()` detects appointment/event overlaps
- ✅ `scanAndDetectConflicts()` creates alerts for new conflicts
- ✅ `scanAndDetectConflicts()` skips if alert already exists (de-duplication)
- ✅ `scanAndDetectConflicts()` auto-resolves past appointments
- ✅ `calculateOverlapSeverity()` returns 'full', 'high', 'partial' correctly

**Integration Tests** (`src/app/api/jobs/__tests__/scan-calendar-conflicts.test.ts`):
- ✅ POST `/api/jobs/scan-calendar-conflicts` requires CRON_SECRET
- ✅ Job detects conflicts and creates alerts
- ✅ Job uses PostgreSQL advisory lock
- ✅ Job processes multiple shops
- ✅ Cleanup job deletes alerts older than 30 days

**Playwright E2E** (manual test, not automated):
- ✅ Manually trigger cron job
- ✅ Verify alerts created in database

**Regression Prevention:**
- ✅ Existing cron jobs unaffected
- ✅ No changes to appointment/booking flows

### Implementation Checklist

- [ ] Create `calendar_conflict_alerts` table migration
- [ ] Implement conflict scan cron job route
- [ ] Implement `scanAndDetectConflicts()` logic
- [ ] Implement `calculateOverlapSeverity()` helper
- [ ] Implement cleanup job for old alerts
- [ ] Add cron schedule to `vercel.json`
- [ ] Write unit tests for conflict detection
- [ ] Write integration tests for cron job
- [ ] Run all existing cron job tests to verify no regression

---

## V7: Conflicts Dashboard

### What Gets Built

**UI:**
- Alert banner on `/app/appointments` page
- "View conflicts →" link
- New page: `/app/conflicts` with conflicts table
- Severity badges (Full, High, Partial, All-Day)
- "Keep Appointment" button
- "Cancel Appointment" button

**Non-UI:**
- `getConflictCount()` query
- `getConflicts()` query
- `dismissAlert()` handler
- `cancelAppointment()` handler (integrates N22)

**Affordances:**
- U5, U6, U7, U8, U9, U10 (UI)
- N18, N19, N21, N22 (queries + handlers)

### Demo

1. Shop owner has pending conflict alerts (from V6)
2. Shop owner navigates to `/app/appointments`
3. Sees banner: "3 appointments conflict with your Google Calendar. View conflicts →"
4. Clicks link → navigates to `/app/conflicts`
5. Sees table with 3 conflicts:
   - Appointment on 2024-03-20 at 10:00 AM
   - Conflicting event: "Team Meeting"
   - Badge: "High Conflict" (orange)
   - Actions: "Keep Appointment" | "Cancel Appointment"
6. Clicks "Keep Appointment" → alert dismissed, row disappears
7. Clicks "Cancel Appointment" on another → triggers cancel flow, event deleted, alert auto-resolved

### Test Requirements

**Unit Tests** (`src/lib/__tests__/calendar-conflicts.test.ts`):
- ✅ `getConflictCount()` returns correct count of pending alerts
- ✅ `getConflicts()` returns alerts with appointment and event details
- ✅ `dismissAlert()` updates alert status to 'dismissed'

**Integration Tests** (`src/app/app/conflicts/__tests__/page.test.ts`):
- ✅ Conflicts page queries and displays alerts
- ✅ Severity badges calculated correctly
- ✅ "Keep Appointment" button dismisses alert
- ✅ "Cancel Appointment" button triggers cancel flow

**Playwright E2E** (`tests/e2e/conflicts-dashboard.spec.ts`):
- ✅ Alert banner shows on appointments page when conflicts exist
- ✅ "View conflicts →" link navigates to conflicts page
- ✅ Conflicts table displays alerts with severity badges
- ✅ "Keep Appointment" button dismisses alert
- ✅ "Cancel Appointment" button cancels appointment and resolves alert
- ✅ Banner disappears when no conflicts remain

**Regression Prevention:**
- ✅ Existing appointments page tests pass
- ✅ No changes to other dashboard pages

### Implementation Checklist

- [ ] Implement `getConflictCount()` query
- [ ] Implement `getConflicts()` query
- [ ] Implement `dismissAlert()` handler
- [ ] Implement `cancelAppointment()` integration with N22
- [ ] Build alert banner component for appointments page
- [ ] Build conflicts page UI
- [ ] Write unit tests for queries and handlers
- [ ] Write integration tests for conflicts page
- [ ] Write Playwright tests for conflicts dashboard
- [ ] Run all existing dashboard tests to verify no regression

---

## Test Regression Prevention Strategy

### Before Each Slice

1. **Run full test suite:**
   ```bash
   pnpm test              # All unit tests
   pnpm test:e2e          # All Playwright tests
   ```

2. **Verify baseline:**
   - All tests passing
   - No skipped tests
   - No flaky tests

### During Each Slice

1. **Write tests first (TDD where applicable)**
   - Unit tests for new services/logic
   - Integration tests for API routes
   - Playwright tests for UI flows

2. **Mock calendar integration in existing tests:**
   ```typescript
   // In existing booking tests
   vi.mock('@/lib/google-calendar', () => ({
     createCalendarEvent: vi.fn().mockResolvedValue({ id: 'mock-event-id' }),
   }));
   ```

3. **Conditional execution:**
   ```typescript
   // In createAppointment()
   if (calendarConnection) {
     await createCalendarEvent(connection, appointment);
   }
   // Existing tests work because calendarConnection is null
   ```

### After Each Slice

1. **Run full test suite again:**
   ```bash
   pnpm test
   pnpm test:e2e
   ```

2. **Verify no regression:**
   - All pre-existing tests still pass
   - New tests added for slice functionality
   - No increase in test execution time (caching works)

### Critical Test Files to Monitor

**Existing tests that must not regress:**

- `src/lib/__tests__/booking.test.ts` - Booking creation logic
- `src/lib/queries/__tests__/appointments.test.ts` - Appointment queries
- `tests/e2e/booking.spec.ts` - E2E booking flow
- `tests/e2e/manage-booking.spec.ts` - E2E cancellation flow
- `tests/e2e/payment-flow.spec.ts` - Payment integration
- `src/app/api/jobs/__tests__/*.test.ts` - Cron jobs

**New test files to add:**

- `src/lib/__tests__/google-calendar-oauth.test.ts` (V1)
- `src/lib/__tests__/google-calendar.test.ts` (V2, V5)
- `src/lib/__tests__/google-calendar-cache.test.ts` (V3)
- `src/lib/__tests__/calendar-conflicts.test.ts` (V4, V6, V7)
- `tests/e2e/calendar-oauth.spec.ts` (V1)
- `tests/e2e/booking-with-calendar.spec.ts` (V2)
- `tests/e2e/availability-with-calendar.spec.ts` (V3)
- `tests/e2e/booking-conflict-prevention.spec.ts` (V4)
- `tests/e2e/cancel-with-calendar.spec.ts` (V5)
- `tests/e2e/conflicts-dashboard.spec.ts` (V7)

---

## Slice Dependencies

```
V1 (OAuth)
 ├─→ V2 (Create Events) ────→ V5 (Delete Events)
 ├─→ V3 (Block Slots) ───────→ V4 (Prevent Conflicts)
 └─→ V6 (Scan Conflicts) ────→ V7 (Conflicts Dashboard)
```

**Can be built in parallel:**
- V2 and V3 (both depend on V1 only)
- V6 (independent, depends on V1 only)

**Must be sequential:**
- V1 → V2 → V5
- V1 → V3 → V4
- V1 → V6 → V7

---

## Implementation Order

**Recommended sequence:**

1. **V1** - OAuth foundation (everything depends on this)
2. **V2** - Create events (core feature, high value)
3. **V3** - Block slots (conflict prevention, builds on V2)
4. **V4** - Prevent bookings (completes conflict prevention)
5. **V5** - Delete events (completes booking lifecycle)
6. **V6** - Scan conflicts (enables alerts)
7. **V7** - Conflicts dashboard (UI for alerts, final polish)

**Estimated complexity:**
- V1: 2-3 days (OAuth boilerplate)
- V2: 2-3 days (transaction coordination)
- V3: 2-3 days (caching layer)
- V4: 1 day (validation logic)
- V5: 1 day (deletion, graceful degradation)
- V6: 2 days (cron job, conflict detection)
- V7: 2-3 days (UI components, dashboard)

**Total: ~13-16 days** for full implementation with tests
