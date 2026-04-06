# Buffer Time V2: Shop Default

**Slice:** V2 of 2
**Status:** PENDING
**Depends on:** V1 shipped and verified
**Goal:** Shop owner sets a default buffer in `/app/settings/availability`. Services with no buffer configured inherit it.

---

## What This Slice Does

- Adds `defaultBufferMinutes` column to `bookingSettings`
- Extends `updateAvailabilitySettings` action to validate and persist it
- Extends `AvailabilitySettingsForm` with a buffer radio group (None / 5 min / 10 min)
- Extends the `createAppointment()` resolver: `eventType.bufferMinutes ?? shopDefault ?? 0`
- Extends the availability page to load and pass `defaultBufferMinutes` into the form

## What This Slice Does NOT Do

- Per-service buffer — already exists on `EventTypeForm` (unchanged)
- `bufferBefore` — deferred
- Option range expansion — deferred

---

## Files to Change

| File | Change |
|------|--------|
| `src/lib/schema.ts` | Add `defaultBufferMinutes` to `bookingSettings` |
| `drizzle/` | Generated migration |
| `src/app/app/settings/availability/actions.ts` | Validate + persist `defaultBufferMinutes` |
| `src/components/settings/availability-settings-form.tsx` | Add buffer radio group (U1, N7) |
| `src/components/services/event-type-form.tsx` | Add "Shop default" (null) option to BUFFER_OPTIONS; update type to include null |
| `src/app/app/settings/services/actions.ts` | Update Zod schema to accept null for `bufferMinutes` |
| `src/app/app/settings/availability/page.tsx` | Pass `defaultBufferMinutes` into form initial props |
| `src/lib/queries/appointments.ts` | Extend resolver in `createAppointment()` |
| `src/app/app/settings/availability/actions.test.ts` | New test file |

---

## Implementation Steps

### Step 1: Schema — add `defaultBufferMinutes` to `bookingSettings`

**File:** `src/lib/schema.ts`

In the `bookingSettings` table, add after `reminderTimings`:

```typescript
defaultBufferMinutes: integer("default_buffer_minutes")
  .notNull()
  .default(0),
```

Add a check constraint alongside the existing ones:

```typescript
check(
  "booking_settings_default_buffer_minutes_valid",
  sql`${table.defaultBufferMinutes} in (0, 5, 10)`
),
```

Then generate and run the migration:

```bash
pnpm db:generate
# Review SQL — should be ADD COLUMN with DEFAULT 0 and an ADD CONSTRAINT
pnpm db:migrate
```

**Expected migration SQL:**
```sql
ALTER TABLE "booking_settings"
ADD COLUMN "default_buffer_minutes" integer NOT NULL DEFAULT 0;

ALTER TABLE "booking_settings"
ADD CONSTRAINT "booking_settings_default_buffer_minutes_valid"
CHECK (default_buffer_minutes in (0, 5, 10));
```

All existing shops get 0 — correct, matches pre-feature behaviour.

---

### Step 2: Extend `updateAvailabilitySettings` action

**File:** `src/app/app/settings/availability/actions.ts`

Add a schema for `defaultBufferMinutes` validation alongside `slotMinutesSchema`:

```typescript
const defaultBufferMinutesSchema = z.union([
  z.literal(0),
  z.literal(5),
  z.literal(10),
]);
```

Parse and validate it from `formData`:

```typescript
const defaultBufferMinutesRaw = Number(formData.get("defaultBufferMinutes") ?? 0);
const parsedDefaultBuffer = defaultBufferMinutesSchema.safeParse(defaultBufferMinutesRaw);

if (!parsedDefaultBuffer.success) {
  throw new Error("Default buffer time is invalid");
}

const defaultBufferMinutes = parsedDefaultBuffer.data;
```

Include it in the upsert SET:

```typescript
.onConflictDoUpdate({
  target: bookingSettings.shopId,
  set: {
    timezone,
    slotMinutes,
    defaultBufferMinutes,   // add this
  },
})
```

---

### Step 3: Extend `AvailabilitySettingsForm` component

**File:** `src/components/settings/availability-settings-form.tsx`

**3a. Extend the props type:**

```typescript
type AvailabilitySettingsFormProps = {
  action: (formData: FormData) => Promise<void>;
  initial: {
    timezone: string;
    slotMinutes: 15 | 30 | 45 | 60 | 90 | 120;
    defaultBufferMinutes: 0 | 5 | 10;   // add this
    days: DayHoursInput[];
  };
};
```

**3b. Add buffer state (follow the same pattern as `EventTypeForm`):**

```typescript
const BUFFER_OPTIONS = [
  { label: "None", value: 0 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
] as const;

// Inside the component:
const [defaultBufferMinutes, setDefaultBufferMinutes] = useState<0 | 5 | 10>(
  initial.defaultBufferMinutes
);
```

**3c. Add the radio group to the form**, between the slot length control and the business hours section:

```tsx
<fieldset className="space-y-3">
  <legend className="text-sm font-medium">Default buffer between appointments</legend>
  <p className="text-xs text-muted-foreground">
    Padding after each appointment. Applied to services with no buffer set.
  </p>
  <div className="flex flex-wrap gap-3">
    {BUFFER_OPTIONS.map((option) => {
      const isSelected = defaultBufferMinutes === option.value;
      return (
        <label key={option.value} className="...">
          <input
            type="radio"
            name="defaultBufferMinutes"
            value={option.value}
            checked={isSelected}
            onChange={() => setDefaultBufferMinutes(option.value)}
          />
          {option.label}
        </label>
      );
    })}
  </div>
</fieldset>
```

Follow the exact markup and class pattern used in `EventTypeForm` for its buffer fieldset to maintain visual consistency.

---

### Step 4: Extend the availability settings page

**File:** `src/app/app/settings/availability/page.tsx`

Pass `defaultBufferMinutes` from the loaded settings into the form:

```typescript
// Before
initial={{
  timezone: settings?.timezone ?? "UTC",
  slotMinutes: (settings?.slotMinutes ?? 60) as 15 | 30 | 45 | 60 | 90 | 120,
  days: DAY_LABELS.map(...),
}}

// After
initial={{
  timezone: settings?.timezone ?? "UTC",
  slotMinutes: (settings?.slotMinutes ?? 60) as 15 | 30 | 45 | 60 | 90 | 120,
  defaultBufferMinutes: (settings?.defaultBufferMinutes ?? 0) as 0 | 5 | 10,   // add this
  days: DAY_LABELS.map(...),
}}
```

---

### Step 5: Extend `createAppointment()` resolver

**File:** `src/lib/queries/appointments.ts`

V1 resolved: `input.eventTypeBufferMinutes ?? 0`

V2 extends to: `input.eventTypeBufferMinutes ?? settings.defaultBufferMinutes ?? 0`

`settings` is already fetched at the top of the transaction (`ensureBookingSettings`). It now has `defaultBufferMinutes` on it after the migration.

```typescript
// Before (V1)
const effectiveBufferAfterMinutes = input.eventTypeBufferMinutes ?? 0;

// After (V2)
const effectiveBufferAfterMinutes =
  input.eventTypeBufferMinutes ?? settings.defaultBufferMinutes ?? 0;
```

That's the only change in `createAppointment()` for V2.

---

## How I Will Test This

### 1. Migration check

```bash
pnpm db:generate
# Inspect drizzle/NNNN_*.sql — ADD COLUMN + ADD CONSTRAINT, no destructive ops
pnpm db:migrate
```

### 2. Type check + lint

```bash
pnpm check
```

Catches: missing `defaultBufferMinutes` in form props, wrong type on the new column, incorrect schema shape.

### 3. Unit tests — new test file for the action

**File:** `src/app/app/settings/availability/actions.test.ts`

```bash
pnpm test src/app/app/settings/availability/actions.test.ts
```

**Test cases:**

| # | Scenario | Expected |
|---|----------|----------|
| T1 | Valid `defaultBufferMinutes = 5` | Saved to DB, revalidatePath called |
| T2 | Valid `defaultBufferMinutes = 0` | Saved as 0 (explicit none) |
| T3 | Invalid `defaultBufferMinutes = 7` | Throws "Default buffer time is invalid" |
| T4 | Missing `defaultBufferMinutes` field | Defaults to 0, saves without error |
| T5 | Unauthenticated request | Throws "Unauthorized" |
| T6 | Shop not owned by session user | Throws "Unauthorized" |

Follow the same mock pattern as `src/app/app/settings/services/actions.test.ts` — mock `requireAuth`, `getShopByOwnerId`, and the DB upsert.

### 4. Unit tests — resolver in `createAppointment()`

Add to the existing `src/lib/__tests__/buffer-time.test.ts` created in V1:

| # | Scenario | Expected |
|---|----------|----------|
| T7 | `eventTypeBufferMinutes = null`, `shopDefault = 5` | `effectiveBufferAfterMinutes = 5` |
| T8 | `eventTypeBufferMinutes = 10`, `shopDefault = 5` | `effectiveBufferAfterMinutes = 10` (event type wins) |
| T9 | `eventTypeBufferMinutes = null`, `shopDefault = 0` | `effectiveBufferAfterMinutes = 0` (no regression from V1) |
| T10 | `eventTypeBufferMinutes = null`, `shopDefault = null` | `effectiveBufferAfterMinutes = 0` (double fallback) |

### 5. No regressions — full test suite

```bash
pnpm test
```

All V1 tests must still pass. Zero new failures.

### 6. Final check

```bash
pnpm check
```

---

## Acceptance Criteria

- [ ] Migration runs cleanly — `ADD COLUMN default_buffer_minutes` + check constraint
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes — all V1 tests + new V2 tests
- [ ] T1: `defaultBufferMinutes = 5` saved via action and readable from `bookingSettings`
- [ ] T3: Invalid value (e.g. 7) rejected by action before hitting DB
- [ ] T7: Service with `bufferMinutes = null` inherits shop default via resolver
- [ ] T8: Service with `bufferMinutes = 10` overrides shop default of 5
- [ ] UI: Buffer radio group renders with correct initial value from saved settings
- [ ] UI: Saving the form persists the selected buffer value

---

## Complete File List for Both Slices

For reference — all files touched across V1 + V2:

| File | V1 | V2 |
|------|----|----|
| `src/lib/schema.ts` | `appointments.effectiveBufferAfterMinutes` | `bookingSettings.defaultBufferMinutes` |
| `src/lib/queries/appointments.ts` | Filter, guard, resolver, INSERT | Resolver fallback |
| `src/app/api/bookings/create/route.ts` | Pass `eventTypeBufferMinutes` | — |
| `src/components/settings/availability-settings-form.tsx` | — | Buffer radio group |
| `src/app/app/settings/availability/actions.ts` | — | Validate + persist `defaultBufferMinutes` |
| `src/app/app/settings/availability/page.tsx` | — | Pass `defaultBufferMinutes` to form |
| `src/lib/__tests__/buffer-time.test.ts` | T1–T9 | T7–T10 added |
| `src/app/app/settings/availability/actions.test.ts` | — | T1–T6 (new file) |
