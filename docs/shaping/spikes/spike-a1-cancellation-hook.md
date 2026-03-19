# Spike A1: Cancellation Hook Point

**Component:** A1.1 - Hook into cancellation flow (Slice 5)

**Goal:** Identify where and how to insert slot opening creation logic in the existing cancellation flow.

---

## Questions

| # | Question |
|---|----------|
| **A1-Q1** | Where in the cancellation route should we create slot openings? |
| **A1-Q2** | What data is available at the hook point(s)? |
| **A1-Q3** | Are there one or two hook points (refund path vs no-refund path)? |
| **A1-Q4** | What conditions should we check before creating a slot opening? |

---

## Findings

### Q1: Hook Point Location

**File:** `src/app/api/manage/[token]/cancel/route.ts`

**Two execution paths:**

1. **Refund path** (lines 73-94):
   - Eligible for refund (before cutoff)
   - Calls `processRefund()` → updates appointment to `cancelled` with `financialOutcome="refunded"`
   - **Hook point:** After line 93 (after processRefund completes)

2. **No-refund path** (lines 96-160):
   - Not eligible for refund (after cutoff)
   - Updates appointment to `cancelled` with `financialOutcome="settled"`
   - **Hook point:** After line 143 (after transaction completes)

**Recommendation:** Create a shared helper function called after both paths complete:

```typescript
// Helper function to call after cancellation completes
async function handleSlotOpening(
  appointment: typeof appointments.$inferSelect,
  payment: typeof payments.$inferSelect | undefined
) {
  // Check conditions
  // Create slot opening
  // Enqueue offer loop
}

// Call from refund path (after line 93):
await handleSlotOpening(row.appointment, row.payment);

// Call from no-refund path (after line 143):
await handleSlotOpening(row.appointment, row.payment);
```

---

### Q2: Available Data

At both hook points, we have access to:

| Data | Source | Content |
|------|--------|---------|
| `row.appointment` | DB query (lines 33-46) | id, shopId, startsAt, endsAt, status, policyVersionId |
| `row.payment` | Left join (line 44) | id, appointmentId, status, amountCents, stripePaymentIntentId, stripeRefundId |
| `row.policy` | Inner join (line 43) | cancelCutoffMinutes, refundBeforeCutoff, paymentMode |
| `eligibility` | Calculated (lines 64-71) | isEligibleForRefund, cutoffTime |

**All necessary data for slot opening creation is available:**
- ✅ shopId
- ✅ startsAt
- ✅ endsAt
- ✅ source appointment id
- ✅ payment status (whether it was paid)

---

### Q3: One or Two Hook Points?

**Answer:** Two paths, but we should use **one shared function** called from both.

**Why?** Both paths result in cancelled appointments, and slot recovery applies to both:
- Refund path: Customer cancelled before cutoff → got refund → slot opens
- No-refund path: Customer cancelled after cutoff → deposit retained → slot still opens

The financial outcome differs, but the slot availability is the same.

---

### Q4: Conditions for Creating Slot Opening

Before creating a slot opening, check:

1. ✅ **Appointment was booked** (already enforced by both paths at line 54 and UPDATE WHERE clause)
2. ✅ **Payment exists and succeeded**
   ```typescript
   if (!payment || payment.status !== "succeeded") return;
   ```
3. ✅ **Appointment time is in the future**
   ```typescript
   if (appointment.startsAt <= new Date()) return;
   ```
4. ✅ **Cancellation succeeded** (both paths only reach hook point if update succeeded)

**Important:** R9 requirement states "Only cancelled bookings that were paid create slot openings". This means we MUST check payment status.

---

## Concrete Implementation Steps

### Step 1: Create helper function

Location: `src/lib/slot-recovery.ts` (new file)

```typescript
export async function createSlotOpeningFromCancellation(
  appointment: typeof appointments.$inferSelect,
  payment: typeof payments.$inferSelect | undefined
): Promise<void> {
  // Guard: only create slot openings for paid bookings
  if (!payment || payment.status !== "succeeded") {
    return;
  }

  // Guard: only create slot openings for future appointments
  if (appointment.startsAt <= new Date()) {
    return;
  }

  // Create slot opening (will be detailed in data model spike)
  // Enqueue offer loop (will be detailed in background job spike)
}
```

### Step 2: Import in cancel route

Add to imports (line 13):
```typescript
import { createSlotOpeningFromCancellation } from "@/lib/slot-recovery";
```

### Step 3: Call after refund path

After line 93, before return:
```typescript
// Line 93
});

await createSlotOpeningFromCancellation(row.appointment, row.payment);

return Response.json({
```

### Step 4: Call after no-refund path

After line 143, before return:
```typescript
// Line 143
});

if (updateResult.updated) {
  await createSlotOpeningFromCancellation(row.appointment, row.payment);
}

if (!updateResult.updated) {
```

---

## Edge Cases

### Case 1: Cancellation fails partway through
**Scenario:** processRefund succeeds but slot opening creation fails

**Impact:** Appointment is cancelled, but no slot opening created

**Mitigation:**
- Slot opening creation is non-critical and should not block cancellation response
- Wrap in try-catch, log error, continue
- Future: Add a recovery job to detect cancelled appointments without slot openings

### Case 2: Concurrent cancellations of same time slot
**Scenario:** Two appointments at same shop/time cancelled simultaneously

**Impact:** Two slot openings created for same time

**Mitigation:** Unique constraint on `(shop_id, starts_at)` in slot_openings table (A7.3)

### Case 3: Payment failed but appointment was booked
**Scenario:** Appointment exists but payment.status !== "succeeded"

**Impact:** No slot opening created (desired behavior per R9)

**Action:** None - this is correct per requirements

---

## Acceptance

✅ Spike is complete. We can describe:

1. **Where:** Two hook points (refund path line 93, no-refund path line 143)
2. **How:** Shared helper function `createSlotOpeningFromCancellation()`
3. **What data:** All necessary data is available (appointment, payment)
4. **What conditions:** Payment succeeded + time in future
5. **What to build:** Helper function in `src/lib/slot-recovery.ts` + 2 call sites

**Flagged unknown A1.1 is now resolved.** ✅

---

## Dependencies

This spike reveals dependencies on:
- **A1.3 (Enqueue offer loop)** - Still flagged ⚠️, depends on Spike A2 (Background Job Pattern)
- **A7.1 (slot_openings table)** - Schema needs to be created
- **A7.3 (Unique constraint)** - Prevents duplicate slot openings
