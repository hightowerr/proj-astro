# Slot Recovery Eligibility — Buffer-Time V1 Plan

## Step 1: Resolve slot effective buffer

Before entering the candidate loop in `getEligibleCustomers`, resolve the
effective buffer for the slot opening so the overlap check accounts for it.

## Step 2: Buffer resolution logic

```typescript
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
```

Key: initialize to `null` (not `0`) so the fallback to shop-level default only
triggers when no event-type buffer is configured, rather than when it is
explicitly set to `0`.

## Step 3: Compute buffered end time

```typescript
const slotBufferedEndsAt = new Date(
  slotOpening.endsAt.getTime() + slotEffectiveBufferMinutes * 60_000
);
```

## Step 4: Buffer-aware overlap query

Replace the simple `startsAt < endsAt && endsAt > startsAt` overlap with:

```typescript
lt(appointments.startsAt, slotBufferedEndsAt)
```

and

```typescript
sql`${appointments.endsAt} + (${appointments.effectiveBufferAfterMinutes} * interval '1 minute') > ${slotOpening.startsAt}`
```

This ensures both the slot's buffer and each candidate appointment's buffer are
considered when checking for overlaps.
