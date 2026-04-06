# V4 Implementation Plan: Service Name Display

Slice goal: surface the service (event type) name at every place a shop owner or customer encounters an appointment — the appointments list, appointment detail, slot opening detail, and the customer-facing manage page.

No schema changes. All four pages do a left-join onto `eventTypes` via `appointments.eventTypeId`. Appointments created before this slice have `eventTypeId = null`; those render as "—" (owner views) or are silently omitted (customer view).

---

## Step 1 — Update `listAppointmentsForShop` (N11)

**File:** `src/lib/queries/appointments.ts`

### What to change

Add `eventTypes` to the schema import block (line ~34):

```typescript
import {
  appointments,
  bookingSettings,
  customerContactPrefs,
  customerNoShowStats,
  customers,
  eventTypes,          // ← add
  payments,
  policyVersions,
  shopPolicies,
  shops,
  slotOpenings,
} from "@/lib/schema";
```

In `listAppointmentsForShop` (line ~1148):

1. Add to the `.select({…})` block:
   ```typescript
   eventTypeName: eventTypes.name,
   ```

2. Add after the existing `.leftJoin(payments, …)`:
   ```typescript
   .leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))
   ```

The returned type gains `eventTypeName: string | null`.

---

## Step 2 — "Service" column in appointments list (U10)

**File:** `src/app/app/appointments/page.tsx`

Add a `<th>` header after "Customer" (line ~101):

```tsx
<th scope="col" className="px-4 py-2 font-medium">Service</th>
```

Add the corresponding `<td>` after the Customer cell (line ~116):

```tsx
<td className="px-4 py-3 text-muted-foreground">
  {appointment.eventTypeName ?? "—"}
</td>
```

No import changes needed — the data flows from `listAppointmentsForShop`.

---

## Step 3 — Add event type join to appointment detail query (N12)

**File:** `src/app/app/appointments/[id]/page.tsx`

### Schema import

Add `eventTypes` to the schema import (line ~11):

```typescript
import { appointments, customers, eventTypes, messageLog, payments } from "@/lib/schema";
```

### Query changes

Add to the `.select({…})` block (after `currency: payments.currency`):

```typescript
eventTypeName: eventTypes.name,
```

Add after the existing `.leftJoin(payments, …)` (line ~65):

```typescript
.leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))
```

---

## Step 4 — Service name in appointment Details card (U11)

**File:** `src/app/app/appointments/[id]/page.tsx`

In the Details card, after the Status `<p>` (line ~134):

```tsx
{appointment.eventTypeName && (
  <p className="text-sm">
    Service: <span>{appointment.eventTypeName}</span>
  </p>
)}
```

---

## Step 5 — Add event type join to slot opening detail query (N13)

**File:** `src/app/app/slot-openings/[id]/page.tsx`

`slotOpenings` has no `eventTypeId` column yet — that is added in V5. Until then, the service is reached through a two-hop join: `sourceAppointmentId → appointments.eventTypeId → eventTypes`. The current query uses `db.query.slotOpenings.findFirst()` which doesn't support multi-hop joins. Switch to `db.select()`.

> **V5 note:** Once V5 adds `slotOpenings.eventTypeId`, V5 Step 6 replaces this two-hop join with a direct `leftJoin(eventTypes, eq(eventTypes.id, slotOpenings.eventTypeId))` and removes the intermediate `appointments` join. The two-hop join below remains correct after V5 — V5's cleanup is about simplicity, not correctness.

### Schema import

Add `eventTypes` (and `slotOpenings` table ref) — `appointments` is already imported:

```typescript
import { appointments, customers, eventTypes, slotOffers, slotOpenings } from "@/lib/schema";
```

### Replace the `slotRow` query

Replace:
```typescript
db.query.slotOpenings.findFirst({
  where: (table, { and: whereAnd, eq: whereEq }) =>
    whereAnd(whereEq(table.id, id), whereEq(table.shopId, shop.id)),
}),
```

With (inside the `Promise.all`, as the second element):
```typescript
db
  .select({
    id: slotOpenings.id,
    shopId: slotOpenings.shopId,
    startsAt: slotOpenings.startsAt,
    endsAt: slotOpenings.endsAt,
    status: slotOpenings.status,
    sourceAppointmentId: slotOpenings.sourceAppointmentId,
    createdAt: slotOpenings.createdAt,
    updatedAt: slotOpenings.updatedAt,
    eventTypeName: eventTypes.name,
  })
  .from(slotOpenings)
  .leftJoin(
    appointments,
    eq(appointments.id, slotOpenings.sourceAppointmentId)
  )
  .leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))
  .where(and(eq(slotOpenings.id, id), eq(slotOpenings.shopId, shop.id)))
  .limit(1),
```

Then destructure the array result:

Replace:
```typescript
const [settings, slotRow, offers, recoveredBookings] = await Promise.all([…]);
if (!slotRow) { notFound(); }
```

With:
```typescript
const [settings, slotRows, offers, recoveredBookings] = await Promise.all([…]);
const slotRow = slotRows[0] ?? null;
if (!slotRow) { notFound(); }
```

The existing template references (`slotRow.startsAt`, `.endsAt`, `.status`, `.createdAt`) continue to work because all those columns are in the select.

---

## Step 6 — Service name in slot opening Details card (U12)

**File:** `src/app/app/slot-openings/[id]/page.tsx`

In the Details card, after the "Opened" `<p>` (line ~104):

```tsx
{slotRow.eventTypeName && (
  <p className="text-sm text-muted-foreground">
    Service: <span className="text-foreground">{slotRow.eventTypeName}</span>
  </p>
)}
```

---

## Step 7 — Add event type join to manage page query (N14)

**File:** `src/app/manage/[token]/page.tsx`

### Schema import

Add `eventTypes` to the existing schema import (line ~6):

```typescript
import {
  appointments,
  bookingSettings,
  customerContactPrefs,
  customers,
  eventTypes,          // ← add
  payments,
  policyVersions,
  shops,
} from "@/lib/schema";
```

### Query changes

Add to the `.select({…})` block (after `paymentStripeRefundId`):

```typescript
eventTypeName: eventTypes.name,
```

Add after the existing `.leftJoin(payments, …)` (line ~66):

```typescript
.leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))
```

Pass to the component:

```tsx
<ManageBookingView
  appointment={{
    …
    eventTypeName: row.eventTypeName ?? null,
  }}
  …
/>
```

---

## Step 8 — Display service name in `ManageBookingView` (U13)

**File:** `src/components/manage/manage-booking-view.tsx`

### Props type

Extend the `appointment` prop (line ~32):

```typescript
appointment: {
  …
  eventTypeName?: string | null;
};
```

### Add `Tag` import

Add `Tag` to the lucide-react import:

```typescript
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  MapPin,
  Tag,      // ← add
  User,
  XCircle,
} from "lucide-react";
```

### Render service name

After the Date & time block (after the closing `</div>` of the Calendar section, line ~287), add:

```tsx
{appointment.eventTypeName && (
  <div className="flex items-start gap-3">
    <Tag className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden="true" />
    <div>
      <p className="text-sm text-muted-foreground">Service</p>
      <p className="font-medium">{appointment.eventTypeName}</p>
    </div>
  </div>
)}
```

---

## Verification

### Automated checks

Run after all steps are complete:

```bash
pnpm lint && pnpm typecheck
```

Expected: zero errors. The `eventTypeName: string | null` type flows through all four query sites without any coercion.

### Manual browser checklist

1. **Appointments list** (`/app/appointments`)
   - Confirm "Service" column appears between "Customer" and "Payment"
   - For an appointment booked with a service, the cell shows the service name
   - For appointments created before the migration (null `eventTypeId`), the cell shows "—"

2. **Appointment detail** (`/app/appointments/[id]`)
   - Open an appointment with a service → Details card shows "Service: {name}"
   - Open an old appointment without a service → no Service line rendered (condition is falsy)

3. **Slot opening detail** (`/app/slot-openings/[id]`)
   - Open a slot opening whose source appointment had a service → Details card shows "Service: {name}"
   - Open one where the source had no service → no Service line rendered

4. **Customer manage page** (`/manage/[token]`)
   - Navigate to the manage page for an appointment with a service
   - "Appointment details" card shows a Tag row with the service name
   - Navigate to one without a service → Tag row is absent

### Regression checks

- Appointments list still loads for shops with no event types (all `eventTypeName` are null)
- `pnpm test` — unit tests for `listAppointmentsForShop` still pass (left join adds null column; existing assertions are unaffected)
