---
shaping: true
---

# Spike: slotOpenings Event Type Scoping (A7.1)

## Context

Shape B adds `eventTypeId` to appointments. When an appointment is cancelled and a `slotOpening` is created, the opening represents a specific time slot for a specific service. Without `eventTypeId` on the slot opening, the offer loop and accept flow have no way to know which event type to book when a customer responds "YES" to the offer SMS.

## Goal

Identify exactly which columns `slotOpenings` needs, which functions must change, and whether the existing uniqueness constraint and overlap check still hold with multiple event types.

---

## Questions

| # | Question |
|---|----------|
| **Q1** | What data does `acceptOffer` pass to `createAppointment` today? What's missing for event types? |
| **Q2** | How is the offer SMS link constructed? Does it need `eventTypeId`? |
| **Q3** | Does the uniqueness constraint `(shopId, startsAt)` still hold when multiple event types have different durations? |
| **Q4** | Does the customer overlap check in `getEligibleCustomers` need to change? |
| **Q5** | What columns need to be added to `slotOpenings`, and with what nullability? |

---

## Findings

### Q1 — What acceptOffer passes to createAppointment

Current call in `slot-recovery.ts`:

```typescript
const booking = await createAppointment({
  shopId: slotOpening.shopId,
  startsAt: slotOpening.startsAt,
  customer: { fullName, phone, email, smsOptIn: true },
  source: "slot_recovery",
  sourceSlotOpeningId: slotOpening.id,
  bookingBaseUrl,
  paymentsEnabled: true,
  // ← eventTypeId is absent
});
```

`createAppointment` today uses `bookingSettings.slotMinutes` to compute `endsAt`. With event types, it needs `eventTypeId` to look up `durationMinutes`. Without it, the wrong duration would be used (or the function would fall back to `slotMinutes` which may not match the cancelled service).

**Missing:** `eventTypeId` must be read from `slotOpening` and forwarded to `createAppointment`.

### Q2 — Offer SMS link construction

The offer SMS message (in `sendOffer`):

```typescript
const message = `A slot opened: ${timeStr}. Reply YES to book. Deposit required.`;
```

The customer replies YES → `findLatestOpenOffer` → `acceptOffer` → `createAppointment`. The SMS itself is a plain-text message, no booking URL in the SMS flow.

However, `acceptOffer` builds a confirmation URL after booking:

```typescript
const bookingBaseUrl = `${appOrigin}/book/${shop.slug}`;
const paymentUrl = `${bookingBaseUrl}?appointment=${booking.appointment.id}`;
```

This URL links to the booking page for payment completion. With event types, the booking is already created by this point (before the URL is sent), so no `eventTypeId` is needed in the URL for the accept flow.

**The web-based offer flow** (if offered in future via link rather than SMS reply) would need `?eventTypeId=` in the booking URL. This is not in current scope — current flow is SMS reply only.

**Impact:** No change to the SMS message or confirmation URL format. `eventTypeId` is needed for `createAppointment` internally, not for URL construction.

### Q3 — Uniqueness constraint (shopId, startsAt)

Current: `uniqueIndex("slot_openings_unique_slot").on(table.shopId, table.startsAt)`

With multiple event types: a 30-min cut cancelled at 10:00 and a 60-min colour cancelled at 10:00 would both have `startsAt = 10:00`. The uniqueness constraint would block the second slot opening.

**However**, the appointments table itself has: `uniqueIndex("appointments_shop_starts_unique").on(table.shopId, table.startsAt)` filtered to `status in ('pending', 'booked')`. Two appointments with the same `startsAt` cannot coexist. Therefore two slot openings with the same `startsAt` cannot arise from two different cancelled appointments — only one appointment can occupy a given `startsAt`.

**Conclusion:** The `(shopId, startsAt)` uniqueness constraint on `slotOpenings` remains valid. No change needed.

### Q4 — Customer overlap check

Current check in `getEligibleCustomers`:

```typescript
whereLt(table.startsAt, slotOpening.endsAt),
whereGt(table.endsAt, slotOpening.startsAt)
```

The slot opening's `endsAt` is copied from the cancelled appointment's `endsAt`, which is `startsAt + eventType.durationMinutes`. The duration is already encoded in the time range. A customer with a conflicting appointment of any duration will still be excluded correctly.

**Conclusion:** No change to the overlap check.

### Q5 — Columns to add to slotOpenings

One column required:

| Column | Type | Nullable | Reason |
|--------|------|----------|--------|
| `eventTypeId` | `uuid` FK → `eventTypes.id` | **Nullable**, `onDelete: set null` | Must be nullable to not break existing rows; `set null` on delete means if an event type is deactivated/deleted, the slot opening degrades gracefully rather than cascading |

No other columns are needed. `endsAt` already encodes duration implicitly.

---

## Functions that need changing

| Function | Change |
|----------|--------|
| `createSlotOpeningFromCancellation` | Read `appointment.eventTypeId`, pass it into the `slotOpenings` insert |
| `acceptOffer` | Read `slotOpening.eventTypeId`, pass it to `createAppointment` |
| `createAppointment` | Accept `eventTypeId` as input (already required by Shape B generally) |

`getEligibleCustomers`, `sendOffer`, `findLatestOpenOffer` — **no changes needed**.

---

## Answers

| # | Answer |
|---|--------|
| Q1 | `eventTypeId` is missing. `acceptOffer` must read it from `slotOpening` and forward to `createAppointment` |
| Q2 | No URL change needed for the current SMS-reply flow. Booking is created before the confirmation URL is sent |
| Q3 | Uniqueness constraint holds. Two appointments (and therefore two slot openings) with the same `startsAt` cannot coexist for the same shop |
| Q4 | Overlap check is duration-agnostic — it compares time ranges, which already encode duration via `endsAt` |
| Q5 | One column: nullable `eventTypeId uuid` FK with `onDelete: set null` |

---

## Impact on Shaping Doc

- **A7.1 flag resolved:** `slotOpenings` needs one new nullable column: `eventTypeId`. Two functions change: `createSlotOpeningFromCancellation` (pass through from appointment) and `acceptOffer` (forward to `createAppointment`). Uniqueness constraint and overlap check require no changes.
