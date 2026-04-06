---
shaping: true
---

# V2 — Customer Booking Flow

**Demo:** Customer visits `/book/[shop-slug]`, sees service cards, picks "Colour Session (60 min)", calendar shows slots sized to 60 min, books it. Separately: visit `/book/[shop-slug]?service=<id>` for a hidden service — selector is skipped, correct service loads directly.

**Depends on:** V1 (schema + services — `eventTypes` table, `getEventTypesForShop`, `getEventTypeById` must exist).

---

## Steps

### 1. Update `getAvailabilityForDate` — accept optional `durationMinutes` override and fix availability filter

**File:** `src/lib/queries/appointments.ts`

Two changes are needed here:

**1a — Slot sizing:** `generateSlotsForDate` uses `slotMinutes` for both the step size (grid interval) and each slot's `endsAt`. When an event type has a different duration, the step must stay at `settings.slotMinutes` (the slot grid is immutable) but `endsAt` must reflect the event type's duration.

Change the signature:

```typescript
export const getAvailabilityForDate = async (
  shopId: string,
  dateStr: string,
  durationMinutes?: number   // ← add this
): Promise<Availability> => {
```

After `generateSlotsForDate`, remap `endsAt` when the duration differs from the grid step:

```typescript
const slots = generateSlotsForDate({
  dateStr,
  timeZone: settings.timezone,
  slotMinutes: settings.slotMinutes,
  openTime: hours.openTime,
  closeTime: hours.closeTime,
});

// Remap endsAt if event type duration differs from slot grid
const effectiveDuration = durationMinutes ?? settings.slotMinutes;
const sizedSlots =
  effectiveDuration !== settings.slotMinutes
    ? slots.map((s) => ({
        startsAt: s.startsAt,
        endsAt: new Date(s.startsAt.getTime() + effectiveDuration * 60_000),
      }))
    : slots;
```

**1b — Availability filter: change from exact start-time matching to interval overlap.**

The current filter fetches only `startsAt` of booked appointments and removes candidate slots by exact start-time match. This is only correct when all appointments share the same duration. With variable durations, a 90-min booking at 10:00 ends at 11:30, but the 11:00 candidate slot is not removed — the 11:00 slot would appear available even though it overlaps.

Replace the booked slots query and filter logic:

```typescript
// Change: fetch both startsAt AND endsAt
const bookedSlots = await db
  .select({
    startsAt: appointments.startsAt,
    endsAt: appointments.endsAt,             // ← add endsAt
  })
  .from(appointments)
  .where(
    and(
      eq(appointments.shopId, shopId),
      gte(appointments.startsAt, start),
      lt(appointments.startsAt, end),
      inArray(appointments.status, ["booked", "pending"])
    )
  );

// Change: interval overlap check instead of exact start-time Set
let availableSlots = sizedSlots.filter((slot) => {
  const slotStart = slot.startsAt.getTime();
  const slotEnd = slot.endsAt.getTime();
  const overlaps = bookedSlots.some(
    (b) => slotStart < b.endsAt.getTime() && slotEnd > b.startsAt.getTime()
  );
  if (overlaps) return false;
  if (!isToday) return true;
  return slotStart > now.getTime();
});
```

Note: the `bookedTimes` Set is replaced entirely by the overlap check. Remove the old `bookedTimes` Set.

**1c — Filter slots whose `endsAt` exceeds closing time.**

With variable durations, a slot that starts near closing time can have an `endsAt` past `closeTime`. These slots must be removed before the overlap check:

```typescript
// Remove slots that run past closing time
const dayCloseUtc = /* existing close boundary already computed for the day */;
const sizedSlots = sizedSlotsRemapped.filter(
  (s) => s.endsAt.getTime() <= dayCloseUtc.getTime()
);
```

This uses the same `dayCloseUtc` already computed by `getDayStartEndUtc` / `generateSlotsForDate`. The variable name for the remapped slots above becomes `sizedSlotsRemapped`; `sizedSlots` (used in the overlap filter) is the closing-time-filtered result.

Update the return value to surface the effective duration:

```typescript
return {
  date: dateStr,
  timezone: settings.timezone,
  slotMinutes: settings.slotMinutes,
  durationMinutes: effectiveDuration,   // ← add this
  slots: availableSlots,
};
```

Update the `Availability` type (wherever declared) to include `durationMinutes: number`.

---

### 2. Update `GET /api/availability` — accept optional `?service=` param

**File:** `src/app/api/availability/route.ts`

Add `service` to the query schema (optional):

```typescript
import { getEventTypeById } from "@/lib/queries/event-types";

const querySchema = z.object({
  shop: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  service: z.string().uuid().optional(),
});
```

After resolving the shop, load the event type if `service` was provided:

```typescript
let durationMinutes: number | undefined;

if (parsed.data.service) {
  const eventType = await getEventTypeById(parsed.data.service);
  // Only use the event type if it belongs to this shop
  if (eventType && eventType.shopId === shop.id && eventType.isActive) {
    durationMinutes = eventType.durationMinutes;
  }
}
```

Pass `durationMinutes` to `getAvailabilityForDate`:

```typescript
const availability = await getAvailabilityForDate(
  shop.id,
  parsed.data.date,
  durationMinutes
);
```

Include `durationMinutes` in the JSON response:

```typescript
return Response.json({
  date: availability.date,
  timezone: availability.timezone,
  slotMinutes: availability.slotMinutes,
  durationMinutes: availability.durationMinutes,   // ← add this
  slots: availability.slots.map((slot) => ({
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
  })),
});
```

---

### 3. Update `POST /api/bookings/create` — accept optional `eventTypeId`

**File:** `src/app/api/bookings/create/route.ts`

Add `eventTypeId` to the schema (optional):

```typescript
import { getEventTypeById } from "@/lib/queries/event-types";

const createBookingSchema = z.object({
  shop: z.string().min(1),
  startsAt: z.string().datetime(),
  eventTypeId: z.string().uuid().optional(),   // ← add this
  customer: z.object({
    fullName: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(1),
    email: z.string().trim().email(),
    smsOptIn: z.boolean().optional(),
    emailOptIn: z.boolean().optional().default(true),
  }),
});
```

After loading `bookingSettings`, resolve the effective duration and deposit base:

```typescript
let effectiveDurationMinutes = bookingSettings.slotMinutes;
let eventTypeDepositCents: number | null = null;

if (parsed.data.eventTypeId) {
  const eventType = await getEventTypeById(parsed.data.eventTypeId);
  if (!eventType || eventType.shopId !== shop.id || !eventType.isActive) {
    return Response.json({ error: "Event type not found" }, { status: 404 });
  }
  effectiveDurationMinutes = eventType.durationMinutes;
  eventTypeDepositCents = eventType.depositAmountCents;
}
```

Use `effectiveDurationMinutes` in `computeEndsAt` and conflict check:

```typescript
const endsAt = computeEndsAt({
  startsAt,
  timeZone: bookingSettings.timezone,
  slotMinutes: effectiveDurationMinutes,   // ← was: bookingSettings.slotMinutes
});

await validateBookingConflict({
  shopId: shop.id,
  startsAt,
  endsAt,
  timezone: bookingSettings.timezone,
});
```

Pass `eventTypeId` and `eventTypeDepositCents` into `createAppointment`:

```typescript
const result = await createAppointment({
  shopId: shop.id,
  startsAt,
  customer: customerData,
  bookingBaseUrl,
  eventTypeId: parsed.data.eventTypeId ?? null,
  eventTypeDepositCents,                   // ← add this
});
```

---

### 4. Update `createAppointment` — store `eventTypeId`, apply risk-tier floor clamp

**File:** `src/lib/queries/appointments.ts`

Extend the input type:

```typescript
export const createAppointment = async (input: {
  shopId: string;
  startsAt: Date;
  customer: { ... };
  paymentsEnabled?: boolean;
  bookingBaseUrl?: string | null;
  source?: "web" | "slot_recovery";
  sourceSlotOpeningId?: string | null;
  eventTypeId?: string | null;              // ← add this
  eventTypeDepositCents?: number | null;    // ← add this
}) => {
```

In the payments block, resolve the base deposit and apply `applyTierPricingOverride` unchanged. Then apply a **risk-tier-only** floor clamp — top-tier waivers and reductions must not be blocked:

```typescript
// Resolve base deposit: event type override ?? shop policy
const baseDepositCents =
  input.eventTypeDepositCents != null
    ? input.eventTypeDepositCents
    : policy.depositAmountCents;

const tier = customerScore?.tier ?? null;

const tierPricing = applyTierPricingOverride(
  tier,
  {
    paymentMode: policy.paymentMode,
    depositAmountCents: baseDepositCents,   // ← resolved base
  },
  {
    riskPaymentMode: policy.riskPaymentMode,
    riskDepositAmountCents: policy.riskDepositAmountCents,
    topDepositWaived: policy.topDepositWaived,
    topDepositAmountCents: policy.topDepositAmountCents,
  }
);

// Risk-tier floor clamp only: prevents a shop-wide risk override from
// accidentally under-charging for a higher-priced service.
// Top-tier waivers (topDepositWaived → 0) and reductions are intentional
// downward adjustments — they must not be clamped.
if (
  tier === "risk" &&
  input.eventTypeDepositCents != null &&
  (tierPricing.depositAmountCents ?? 0) < input.eventTypeDepositCents
) {
  tierPricing.depositAmountCents = input.eventTypeDepositCents;
}
```

**Add explicit overlap guard before the insert.** The `appointments_shop_starts_unique` unique constraint only catches exact same-start collisions. With variable durations, two appointments at different start times can overlap (e.g. 10:00 for 90 min vs 11:00 for 60 min). Add an overlap query inside the transaction, after computing `endsAt` and before the insert:

```typescript
const overlapping = await tx
  .select({ id: appointments.id })
  .from(appointments)
  .where(
    and(
      eq(appointments.shopId, input.shopId),
      inArray(appointments.status, ["booked", "pending"]),
      lt(appointments.startsAt, endsAt),
      gt(appointments.endsAt, input.startsAt)
    )
  )
  .limit(1);

if (overlapping.length > 0) {
  throw new SlotTakenError();
}
```

This check lives immediately before the `tx.insert(appointments)` call. The existing unique constraint remains as a final safety net for concurrent inserts.

When inserting the appointment, include `eventTypeId`:

```typescript
const appointmentValues: typeof appointments.$inferInsert = {
  shopId: input.shopId,
  customerId: customer.id,
  startsAt: input.startsAt,
  endsAt,
  eventTypeId: input.eventTypeId ?? null,   // ← add this
  status: paymentRequired ? "pending" : "booked",
  ...
};
```

---

### 5. Update `/book/[slug]/page.tsx` — load event types, handle `?service=` param

**File:** `src/app/book/[slug]/page.tsx`

This is a server component. Add `searchParams` and load event types:

```typescript
import { getEventTypesForShop } from "@/lib/queries/event-types";
import { getEventTypeById } from "@/lib/queries/event-types";
import { ServiceSelector } from "@/components/booking/service-selector";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { slug } = await params;
  const { service: serviceParam } = await searchParams;

  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  const settings = await getBookingSettingsForShop(shop.id);
  const timezone = settings?.timezone ?? "UTC";
  const slotMinutes = settings?.slotMinutes ?? 60;
  const defaultDate = formatDateInTimeZone(new Date(), timezone);

  // Direct-link bypass: ?service=<id> skips the selector
  if (serviceParam) {
    const eventType = await getEventTypeById(serviceParam);
    // Allow hidden services via direct link; reject inactive or wrong shop
    if (!eventType || eventType.shopId !== shop.id || !eventType.isActive) {
      notFound();
    }

    return (
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Book with {shop.name}</h1>
          <p className="text-sm text-muted-foreground">{eventType.name}</p>
        </div>
        <div className="max-w-xl rounded-lg border p-6">
          <BookingForm
            shopSlug={shop.slug}
            shopName={shop.name}
            timezone={timezone}
            slotMinutes={slotMinutes}
            defaultDate={defaultDate}
            paymentsEnabled={true}
            forcePaymentSimulator={process.env.PLAYWRIGHT === "true"}
            selectedEventTypeId={eventType.id}
            selectedDurationMinutes={eventType.durationMinutes}
          />
        </div>
      </div>
    );
  }

  // Service selector path: show active visible event types
  const eventTypes = await getEventTypesForShop(shop.id, {
    isActive: true,
    isHidden: false,
  });

  // If only one active visible event type exists, skip the selector
  if (eventTypes.length === 1) {
    const only = eventTypes[0]!;
    return (
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Book with {shop.name}</h1>
          <p className="text-sm text-muted-foreground">{only.name}</p>
        </div>
        <div className="max-w-xl rounded-lg border p-6">
          <BookingForm
            shopSlug={shop.slug}
            shopName={shop.name}
            timezone={timezone}
            slotMinutes={slotMinutes}
            defaultDate={defaultDate}
            paymentsEnabled={true}
            forcePaymentSimulator={process.env.PLAYWRIGHT === "true"}
            selectedEventTypeId={only.id}
            selectedDurationMinutes={only.durationMinutes}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Book with {shop.name}</h1>
        <p className="text-sm text-muted-foreground">
          Pick a time that works for you.
        </p>
      </div>
      <ServiceSelector
        eventTypes={eventTypes}
        shopSlug={shop.slug}
        shopName={shop.name}
        timezone={timezone}
        slotMinutes={slotMinutes}
        defaultDate={defaultDate}
        paymentsEnabled={true}
        forcePaymentSimulator={process.env.PLAYWRIGHT === "true"}
      />
    </div>
  );
}
```

Note: Next.js 16 — `searchParams` is a Promise; `await` it.

---

### 6. New component — `ServiceSelector`

**File:** `src/components/booking/service-selector.tsx` (new)

Client component. Renders a card grid of event types. When a card is clicked, replaces itself with the `BookingForm` for that service.

```typescript
"use client";

import { useState } from "react";
import { BookingForm } from "./booking-form";

type EventType = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferMinutes: number;
};

type Props = {
  eventTypes: EventType[];
  shopSlug: string;
  shopName: string;
  timezone: string;
  slotMinutes: number;
  defaultDate: string;
  paymentsEnabled: boolean;
  forcePaymentSimulator: boolean;
};

export function ServiceSelector({
  eventTypes,
  shopSlug,
  shopName,
  timezone,
  slotMinutes,
  defaultDate,
  paymentsEnabled,
  forcePaymentSimulator,
}: Props) {
  const [selected, setSelected] = useState<EventType | null>(null);

  if (selected) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Change service
        </button>
        <div className="max-w-xl rounded-lg border p-6">
          <BookingForm
            shopSlug={shopSlug}
            shopName={shopName}
            timezone={timezone}
            slotMinutes={slotMinutes}
            defaultDate={defaultDate}
            paymentsEnabled={paymentsEnabled}
            forcePaymentSimulator={forcePaymentSimulator}
            selectedEventTypeId={selected.id}
            selectedDurationMinutes={selected.durationMinutes}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {eventTypes.map((et) => (
        <button
          key={et.id}
          onClick={() => setSelected(et)}
          className="rounded-lg border p-4 text-left hover:bg-muted transition-colors"
        >
          <p className="font-medium">{et.name}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {et.durationMinutes} min
            {et.bufferMinutes > 0 ? ` · ${et.bufferMinutes} min prep` : ""}
          </p>
          {et.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {et.description}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}
```

---

### 7. Update `BookingForm` — forward `selectedEventTypeId` and `selectedDurationMinutes`

**File:** `src/components/booking/booking-form.tsx`

Add two optional props:

```typescript
type BookingFormProps = {
  // ... existing props ...
  selectedEventTypeId?: string;
  selectedDurationMinutes?: number;
};
```

In the component, derive the effective duration:

```typescript
const effectiveDurationMinutes = selectedDurationMinutes ?? slotMinutes;
```

Update the availability fetch URL to include `service` when provided:

```typescript
const params = new URLSearchParams({
  shop: shopSlug,
  date: selectedDate,
});
if (selectedEventTypeId) {
  params.set("service", selectedEventTypeId);
}
const res = await fetch(`/api/availability?${params.toString()}`);
```

Update the booking submit body to include `eventTypeId`:

```typescript
const body = {
  shop: shopSlug,
  startsAt: selectedSlot.startsAt,
  ...(selectedEventTypeId ? { eventTypeId: selectedEventTypeId } : {}),
  customer: { ... },
};
```

Wherever `slotMinutes` is used to display slot duration (e.g., in time labels or duration hints), use `effectiveDurationMinutes` instead.

---

## Acceptance

- [ ] `GET /api/availability?shop=&date=` (no service) — returns slots at `slotMinutes` grid, `durationMinutes = slotMinutes` in response
- [ ] `GET /api/availability?shop=&date=&service=<id>` — returns same slot starts, but `endsAt` and `durationMinutes` reflect the event type's `durationMinutes`
- [ ] Invalid or inactive `service` param on availability — falls back silently to `slotMinutes` (note: the booking endpoint returns 404 for the same condition; this asymmetry is deliberate — availability is best-effort, booking is strict)
- [ ] `POST /api/bookings/create` with `eventTypeId` — appointment `endsAt = startsAt + eventType.durationMinutes`, `eventTypeId` stored on appointment
- [ ] `POST /api/bookings/create` without `eventTypeId` — behaves identically to before (no regression)
- [ ] Availability interval overlap: a 90-min event type booked at 10:00 causes both the 10:00 and 11:00 (60-min grid) slots to be hidden from availability for any subsequent request on the same day
- [ ] Booking overlap guard: a direct `createAppointment` call with `startsAt=11:00` and `durationMinutes=60` is rejected with `SlotTakenError` when a 90-min booking exists at 10:00 on the same shop
- [ ] Risk-tier floor clamp: risk customer booking a service with `depositAmountCents=5000` cannot be charged less than 5000 even if `riskDepositAmountCents` is lower
- [ ] Top-tier waivers and reductions are unaffected by the clamp: top customer with `topDepositWaived=true` pays 0 even for a service with `depositAmountCents=5000`; top customer with `topDepositAmountCents=1000` pays 1000 for a service with `depositAmountCents=5000`
- [ ] `/book/[slug]` with multiple active visible event types — service cards rendered
- [ ] Card click transitions to `BookingForm` pre-scoped to that service; "← Change service" back button works
- [ ] `/book/[slug]` with one active visible event type — selector skipped, form shown directly
- [ ] `/book/[slug]?service=<id>` for a visible service — selector skipped, service name shown as subheading
- [ ] `/book/[slug]?service=<id>` for a hidden service — selector skipped, loads correctly (direct link supports hidden services)
- [ ] `/book/[slug]?service=<inactive-id>` — `notFound()` response
- [ ] Slots near closing time: a slot whose `endsAt` (computed from the event type duration) would fall after `closeTime` must not be returned in availability — `sizedSlots` must be filtered to remove any slot where `slot.endsAt > dayCloseUtc`
- [ ] `pnpm lint && pnpm typecheck` passes clean
