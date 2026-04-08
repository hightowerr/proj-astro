# Vertical Slice 2 Implementation Review
**Date:** 2026-02-10
**Reviewer:** Claude
**Status:** ✅ Core functionality implemented, ❌ TypeScript errors need fixing

## Executive Summary

Vertical Slice 2 (Deposit/prepay proof loop) has been **substantially implemented** with all core features in place. The implementation follows the requirements document closely and includes:

- ✅ Database schema for shop_policies, policy_versions, and payments
- ✅ Stripe PaymentIntent creation and handling
- ✅ Webhook idempotency and state transitions
- ✅ Customer booking flow with Stripe Elements
- ✅ Business dashboard showing payment status
- ✅ Unit tests for webhook handling
- ✅ E2E tests for successful and failed payment flows
- ✅ Payment policy configuration UI

**Critical Issues:** 12 TypeScript errors must be fixed before the slice can be considered complete.

---

## Implementation Checklist

### ✅ Data Model (Complete)

**Schema Implementation:**
- ✅ `shop_policies` table with currency, payment_mode, deposit_amount_cents (src/lib/schema.ts:208-223)
- ✅ `policy_versions` table for immutable snapshots (src/lib/schema.ts:225-240)
- ✅ `payments` table with full Stripe integration (src/lib/schema.ts:319-351)
- ✅ `processed_stripe_events` for idempotency (src/lib/schema.ts:438-443)
- ✅ `appointments` extended with policy_version_id, payment_status, payment_required (src/lib/schema.ts:292-299)

**Migrations:**
- ✅ `0004_policy_payments.sql` - Core payment tables
- ✅ `0006_booking_url_payment.sql` - Added metadata and attempts fields

**Invariants:**
- ✅ Unique constraint on payments.appointment_id (one payment per appointment)
- ✅ Unique constraint on payments.stripe_payment_intent_id
- ✅ Unique constraint on appointments(shop_id, starts_at) prevents double-booking

### ✅ Backend API (Complete with issues)

**Endpoints Implemented:**

#### POST /api/bookings/create (src/app/api/bookings/create/route.ts)
- ✅ Creates appointment with policy version snapshot
- ✅ Creates PaymentIntent via Stripe
- ✅ Returns clientSecret for frontend
- ✅ Handles slot validation and conflicts (SlotTakenError)
- ✅ Phone number normalization with libphonenumber-js
- ⚠️ **Issue:** Lines 375, 413 - `bookingUrl` type error (string | undefined)

#### POST /api/stripe/webhook (src/app/api/stripe/webhook/route.ts)
- ✅ Signature verification
- ✅ Event idempotency via `processed_stripe_events` table
- ✅ Handles `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
- ✅ State transitions: pending → paid/failed
- ✅ Sends booking confirmation SMS on success
- ✅ Transaction safety for webhook processing

#### POST /app/payments/reconcile (src/app/app/payments/reconcile/route.ts)
- ✅ Manual reconciliation endpoint for out-of-sync payments
- ⚠️ **Issue:** Line 1 - Unused imports (and, inArray, isNotNull)

**Stripe Integration (src/lib/stripe.ts):**
- ✅ Singleton Stripe client
- ✅ Webhook secret management
- ✅ Status normalization helper
- ⚠️ **Issue:** Line 18 - API version mismatch (`"2024-04-10"` vs required `"2024-06-20"`)

### ✅ Frontend (Complete)

**Customer Booking Flow:**
- ✅ `/book/[slug]/page.tsx` - Booking page with payment support
- ✅ `src/components/booking/booking-form.tsx` - Full booking + payment flow
  - ✅ Slot selection
  - ✅ Customer details form
  - ✅ Stripe Elements integration
  - ✅ Payment confirmation
  - ✅ Resume payment from booking URL
  - ✅ Error handling for slot conflicts and payment failures

**Business Dashboard:**
- ✅ `/app/appointments/page.tsx` - Lists appointments with payment status
  - Shows: Start time, Customer name, Payment status, Amount, Created date
  - ✅ Payment reconciliation button
  - ✅ Currency formatting
  - ✅ Timezone-aware display

**Payment Policy UI:**
- ✅ `/app/settings/payment-policy/page.tsx` - Configure deposit/prepay settings
- ⚠️ **Issue:** Line 116 - Type error in PaymentPolicyForm props

### ✅ Testing (Partial)

**Unit Tests:**
- ✅ `src/app/api/stripe/webhook/route.test.ts` - Webhook handler tests
  - ✅ Rejects requests without signature
  - ✅ Idempotency check (ignores duplicate events)
  - ✅ Updates payment and appointment on success
  - ✅ Marks payment failed on payment_intent.payment_failed
  - ⚠️ **Issues:**
    - Lines 18-19: Unused imports
    - Lines 73, 77: Cannot assign to read-only NODE_ENV

**E2E Tests:**
- ✅ `tests/e2e/payment-flow.spec.ts` - End-to-end payment testing
  - ✅ Full booking + payment flow with Stripe test card
  - ✅ Payment failure handling
  - ✅ Confirmation screen verification
  - ✅ Dashboard verification

**Missing Tests:**
- ❌ Unit tests for createAppointment function
- ❌ Unit tests for policy snapshot creation
- ❌ Integration test for duplicate webhook events
- ❌ Test for slot collision during payment

---

## Requirements Compliance

### In Scope (from requirements doc)

| Requirement | Status | Notes |
|------------|--------|-------|
| Default policy per shop | ✅ Complete | DEFAULT_PAYMENT_POLICY in appointments.ts:22-26 |
| Stripe PaymentIntent creation | ✅ Complete | createAppointment function creates PI |
| Webhook handling + idempotency | ✅ Complete | processed_stripe_events table enforces |
| Appointment ↔ payment linkage | ✅ Complete | Foreign key + unique constraints |
| Payment step UI | ✅ Complete | Stripe Elements with PaymentElement |
| Confirmation page | ✅ Complete | "Booking confirmed" screen |
| Back-office list view | ✅ Complete | /app/appointments with payment status |

### Out of Scope (correctly deferred)

- ✅ Refunds/cancellations - Not implemented (as specified)
- ✅ Disputes/chargebacks - Not implemented (as specified)
- ✅ Tier-based policies - Not implemented (as specified)
- ✅ Manual capture (Option B) - Correctly chose Option A (immediate capture)
- ✅ SMS notifications - Implemented in Slice 3 (correct sequencing)

### Design Choices

**✅ Option A: Capture immediately** - Correctly chosen
- PaymentIntent is captured immediately
- Appointment becomes `paid` when webhook confirms
- Simplest implementation, matches "payment as proof"

---

## Issues Found

### 🔴 Critical (Blocking)

#### 1. TypeScript Errors (12 total)
These must be fixed before deployment:

**A. Stripe API Version Mismatch** (src/lib/stripe.ts:18)
```typescript
// Current (WRONG):
apiVersion: "2024-04-10"

// Required:
apiVersion: "2024-06-20"
```

**B. Booking URL Type Errors** (src/lib/queries/appointments.ts:365, 413)
```typescript
// Issue: bookingUrl is string | undefined, but typed as string
bookingUrl: bookingUrl ?? null,  // Type error
```

**C. Payment Policy Form Props** (src/app/settings/payment-policy/page.tsx:116)
```typescript
// Missing type definition for PaymentPolicyForm component
<PaymentPolicyForm action={updatePolicy} initial={{...}} />
```

**D. Unused Imports** (multiple files)
- src/app/api/stripe/webhook/route.test.ts:18-19
- src/app/app/payments/reconcile/route.ts:1
- src/lib/queries/shops.ts:1

**E. Test Environment Issues** (src/app/api/stripe/webhook/route.test.ts:73, 77)
```typescript
// Cannot reassign read-only process.env.NODE_ENV
// Need to use vi.stubEnv() instead
```

### 🟡 Medium (Should Fix)

#### 2. Lint Warnings (3 total)
```
- src/app/api/stripe/webhook/route.test.ts:17:1 - Empty line between imports
- src/app/app/page.tsx:2:1 - Import order (next/headers before next/link)
- src/app/app/page.tsx:4:1 - Import order (next/cache before next/link)
```

#### 3. Missing Error Scenarios
- No test for Stripe API failure during PaymentIntent creation
- No test for race condition (slot taken between validation and creation)
- No test for webhook arriving before appointment is fully created

### 🟢 Low (Nice to Have)

#### 4. Code Quality Improvements
- `createAppointment` function is 280 lines - consider extracting helpers
- Duplicate timezone formatter code across components
- Magic numbers (2000 cents = $20 default deposit) should be constants

---

## Correctness Verification

### ✅ Idempotency (PASS)

**Webhook Idempotency:**
```typescript
// src/app/api/stripe/webhook/route.ts:98-106
await tx.insert(processedStripeEvents)
  .values({ id: event.id })
  .onConflictDoNothing()
  .returning();

if (inserted.length === 0) {
  return; // Event already processed
}
```
✅ Uses database constraint to prevent duplicate processing
✅ Tested in route.test.ts:147-174

**Booking Idempotency:**
```typescript
// src/lib/queries/appointments.ts:310-316
uniqueIndex("appointments_shop_starts_unique").on(
  table.shopId,
  table.startsAt
)
```
✅ Database constraint prevents double-booking
✅ Throws SlotTakenError (status 409) in createBookingSchema

### ✅ Policy Versioning (PASS)

**Immutable Snapshots:**
```typescript
// src/lib/queries/appointments.ts:388-402
const [createdPolicyVersion] = await tx
  .insert(policyVersions)
  .values({
    shopId: input.shopId,
    currency: policy.currency,
    paymentMode: policy.paymentMode,
    depositAmountCents: policy.depositAmountCents,
  })
  .returning();
```
✅ Each appointment references a frozen policy_version
✅ Changing shop_policy doesn't affect existing bookings

### ✅ State Transitions (PASS)

**Appointment Payment Status Flow:**
```
pending (created) → paid (webhook succeeds)
                  → failed (webhook fails)
```

**Verified in tests:**
- route.test.ts:176-207 - Success transition
- route.test.ts:209-242 - Failure transition

### ⚠️ Race Conditions (PARTIAL)

**Slot Collision Protection:**
- ✅ Unique constraint on (shop_id, starts_at)
- ✅ Transaction wraps appointment + payment creation
- ❌ Missing test for: Payment succeeds but appointment insert fails

**Webhook vs Appointment Race:**
- ✅ Webhook looks up payment by stripe_payment_intent_id
- ❌ What if webhook arrives before PaymentIntent ID is stored?
  - Currently handled by: payment created with status "processing" first
  - PaymentIntent ID updated immediately after creation
  - Timing makes this unlikely but not impossible

---

## Functional Requirements Verification

### ✅ User Journey (COMPLETE)

**1. Business has default payment policy**
- ✅ Implemented: ensureShopPolicy creates DEFAULT_PAYMENT_POLICY if missing
- ✅ UI: /app/settings/payment-policy allows configuration

**2. Customer selects slot**
- ✅ Implemented: booking-form.tsx shows available slots
- ✅ Filters out past slots and booked slots

**3. Customer completes payment**
- ✅ Implemented: Stripe Elements PaymentElement
- ✅ Handles 3D Secure (redirect: "if_required")
- ✅ Test cards work (4242..., 4000...0002)

**4. Customer sees confirmation**
- ✅ Implemented: "Booking confirmed" screen
- ✅ Shows time and timezone

**5. Business sees appointment with payment status**
- ✅ Implemented: /app/appointments table
- ✅ Shows: paid/pending/failed status + amount

---

## Performance & Security

### ✅ Security

**Stripe Webhook Verification:**
```typescript
// src/app/api/stripe/webhook/route.ts:85-91
event = stripe.webhooks.constructEvent(
  payload,
  signature,
  getStripeWebhookSecret()
);
```
✅ Signature verification prevents spoofing

**SQL Injection Prevention:**
✅ All queries use Drizzle ORM parameterization
✅ No raw SQL with user input

**Phone Normalization:**
✅ Uses libphonenumber-js for validation (src/app/api/bookings/create/route.ts:26-31)

### 🟡 Performance

**Database Queries:**
- ✅ Indexes on: shop_id, stripe_payment_intent_id, appointment_id
- 🟡 listAppointmentsForShop joins 3 tables - consider denormalization later
- ✅ Transactions used for consistency

**Stripe API Calls:**
- ✅ Only one PaymentIntent.create per booking
- 🟡 Reconcile endpoint loops over payments (could batch in future)

---

## Code Quality Assessment

### Strengths

1. **Clear separation of concerns:**
   - API routes handle HTTP
   - lib/queries handles business logic
   - Components handle UI only

2. **Comprehensive error handling:**
   - Custom error types (SlotTakenError, InvalidSlotError)
   - HTTP status codes match error types
   - User-friendly error messages

3. **Type safety:**
   - Zod schemas for API validation
   - Drizzle inference for database types
   - TypeScript throughout

4. **Testing approach:**
   - Unit tests for webhook logic
   - E2E tests for full flow
   - Mock vs real Stripe handling

### Weaknesses

1. **TypeScript errors must be fixed** (see Critical Issues)

2. **Large functions:**
   - createAppointment: 280 lines
   - Should extract: customer upsert, policy logic, payment creation

3. **Magic constants:**
   ```typescript
   depositAmountCents: 2000  // $20 - should be named constant
   ```

4. **Duplicated timezone formatting:**
   - Same Intl.DateTimeFormat code in multiple components

5. **Missing edge case tests:**
   - Stripe API timeout
   - Database transaction rollback scenarios
   - Concurrent bookings for same slot

---

## Recommendations

### Must Fix (Before Deployment)

1. **Fix all 12 TypeScript errors** (see Issues section)
2. **Update Stripe API version** to 2024-06-20
3. **Fix bookingUrl type handling** in createAppointment
4. **Create PaymentPolicyForm component types**
5. **Remove unused imports** and fix test environment setup

### Should Fix (This Week)

6. **Add missing test coverage:**
   - createAppointment unit tests
   - Policy snapshot creation tests
   - Stripe API failure scenarios

7. **Refactor createAppointment:**
   - Extract customer upsert logic
   - Extract policy resolution logic
   - Extract payment creation logic

8. **Fix lint warnings** (run `pnpm lint --fix`)

### Consider (Future Slices)

9. **Add monitoring:**
   - Log failed webhook processing
   - Alert on payment reconciliation issues
   - Track payment success rate

10. **Optimize database queries:**
    - Add composite indexes for common filters
    - Consider read replicas for dashboard

11. **Improve error messages:**
    - Show specific Stripe error codes to admins
    - Provide retry guidance for payment failures

---

## Migration Notes

All migrations are clean and idempotent:
- `0004_policy_payments.sql` - Creates core payment tables
- `0006_booking_url_payment.sql` - Adds metadata fields

**Rollback Plan:**
```sql
-- If needed, can roll back by:
DROP TABLE processed_stripe_events;
DROP TABLE payments;
DROP TABLE policy_versions;
DROP TABLE shop_policies;
ALTER TABLE appointments DROP COLUMN policy_version_id;
ALTER TABLE appointments DROP COLUMN payment_status;
ALTER TABLE appointments DROP COLUMN payment_required;
```

---

## Definition of Done Checklist

### Functional Requirements

- ✅ Customer completes payment and sees confirmation
- ✅ Business dashboard shows booking with `paid` status
- ✅ Failed payment leaves booking in `failed` state

### Correctness Requirements

- ✅ Webhook is idempotent (tested)
- ✅ Duplicate "Pay" submissions prevented by unique constraint
- ✅ Every appointment references immutable policy_version

### Delivery Requirements

- ✅ Migrations apply cleanly
- ⚠️ **BLOCKED:** TypeScript errors prevent clean build
- ❓ Deployed environment webhook testing not verified in this review

### QA Plan Status

- ✅ Unit tests (Vitest) - 4/4 passing
- ✅ E2E tests (Playwright) - 2/2 passing
- ⚠️ **Missing:** Integration tests for webhook idempotency

---

## Conclusion

**Overall Grade: B+ (85%)**

Vertical Slice 2 is **functionally complete** and demonstrates solid architectural decisions. The implementation correctly follows the requirements document, choosing Option A (immediate capture), implementing comprehensive idempotency, and creating immutable policy snapshots.

**Strengths:**
- Complete feature implementation
- Good test coverage (unit + E2E)
- Proper security (webhook verification)
- Clean data model with appropriate constraints

**Must Fix Before Production:**
- 12 TypeScript errors (1-2 hours of work)
- Stripe API version update
- Missing type definitions

**Recommendation:** Fix the TypeScript errors and this slice is ready to ship. The core logic is sound, the tests pass, and the user experience is complete. The issues found are all technical debt that can be addressed quickly.

**Next Steps:**
1. Fix TypeScript errors (Priority 1)
2. Run `pnpm build` to verify clean build
3. Test Stripe webhooks in staging environment
4. Proceed to Slice 3 (Customer notifications)
