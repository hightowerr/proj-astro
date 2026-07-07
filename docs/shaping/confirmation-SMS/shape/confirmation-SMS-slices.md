# Slices — Free Booking Confirmation SMS

## Wave 1 — Template + function logic (single slice, atomic)

### Slice 1-1: Template and function update

**Specs**: 01 + 02 (atomic — must ship together)
**File**: `src/lib/messages.ts`
**Changes**:
1. `DEFAULT_TEMPLATE_VERSION` = 2
2. `DEFAULT_TEMPLATE_BODY`: `Paid {{amount}}.` → `{{paid_line}}`
3. Delete `!payment` bail-out block (lines 321-329)
4. Replace `amountLabel` with `paidLine` conditional (lines 290-292)
5. Update `.replace("{{amount}}", amountLabel)` → `.replace("{{paid_line}}", paidLine)`
**Plan**: `wave-1/slice-1-1-template-function-plan.md`

## Wave 2 — Call sites (two parallel slices)

### Slice 2-1: Primary booking route

**Spec**: 03
**File**: `src/app/api/bookings/create/route.ts`
**Changes**: Add import + SMS call for `!paymentRequired` after `createAppointment()`
**Plan**: `wave-2/slice-2-1-primary-route-plan.md`

### Slice 2-2: Legacy booking route

**Spec**: 04
**File**: `src/app/api/appointments/route.ts`
**Changes**: Add import + SMS call for `!paymentRequired` after `createAppointment()`
**Plan**: `wave-2/slice-2-2-legacy-route-plan.md`
