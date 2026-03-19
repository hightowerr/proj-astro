# Email Reminders V3: Booking Flow Opt-In

**Slice:** V3 of 6
**Status:** ⏳ PENDING
**Goal:** Customers opt into email reminders during booking

---

## Overview

This slice adds email reminder opt-in to the booking flow. Customers will see a checkbox (default checked) during booking, and their preference will be saved to `customerContactPrefs` table. This ensures we have customer consent before sending email reminders.

**What this slice does:**
- Adds email opt-in checkbox to booking form UI
- Saves `emailOptIn` preference when booking is created
- Handles both new customers (create preference record) and existing customers (update preference record)
- Provides UI feedback for opt-in selection

**What this slice does NOT do:**
- Query appointments for reminders (V4)
- Send emails automatically (V5)
- Opt-out functionality on manage page (V6)

**Dependencies:**
- ✅ V1 complete (email infrastructure)
- ✅ V2 complete (schema has `emailOptIn` field)

---

## Files to Create/Modify

### Modified Files

1. **`src/components/booking/booking-form.tsx`** - Add email opt-in checkbox
2. **`src/app/api/bookings/create/route.ts`** - Save emailOptIn to database
3. **`src/lib/schema.ts`** - No changes (already has emailOptIn from V2)

### New Files (Optional)

1. **`src/lib/__tests__/booking-email-optin.test.ts`** - Unit tests for opt-in logic
2. **`tests/e2e/email-optin-booking.spec.ts`** - E2E test for booking with email opt-in

---

## Implementation Steps

### Step 1: Add Email Opt-In to Booking Form

**Modify `src/components/booking/booking-form.tsx`:**

**1a. Add state for email opt-in:**

Find the state declarations (around line 20-30) and add:

```typescript
const [emailOptIn, setEmailOptIn] = useState(true); // Default checked
```

**1b. Add email opt-in checkbox to the form:**

Find the form fields section (after phone number, before submit button) and add:

```tsx
{/* Email Reminder Opt-In */}
<div className="space-y-2">
  <div className="flex items-start space-x-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
    <Checkbox
      id="emailOptIn"
      checked={emailOptIn}
      onCheckedChange={(checked) => setEmailOptIn(checked === true)}
      className="mt-0.5"
    />
    <div className="flex-1">
      <label
        htmlFor="emailOptIn"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        Send me email reminders
      </label>
      <p className="text-sm text-gray-600 mt-1">
        Get an email reminder 24 hours before your appointment. You can opt out anytime.
      </p>
    </div>
  </div>
</div>
```

**1c. Include emailOptIn in form submission:**

Find the form submission handler (usually `onSubmit` or similar) and ensure `emailOptIn` is included in the booking data:

```typescript
const bookingData = {
  // ... existing fields (fullName, email, phone, etc.)
  emailOptIn, // Add this
};
```

**Verification:**
```bash
pnpm run typecheck
# Should pass without errors
```

---

### Step 2: Update Booking API to Save Email Opt-In

**Modify `src/app/api/bookings/create/route.ts`:**

**2a. Add emailOptIn to request validation schema:**

Find the Zod schema (around line 15-30) and add:

```typescript
const bookingSchema = z.object({
  // ... existing fields
  emailOptIn: z.boolean().optional().default(true), // Add this
});
```

**2b. Save emailOptIn to customerContactPrefs:**

After creating the customer (or finding existing customer), add the contact preference logic.

Find the section after customer creation (around line 100-150):

```typescript
// After customer is created or retrieved
const customer = /* ... existing customer creation/retrieval logic ... */;

// Save or update email opt-in preference
const existingPref = await db
  .select()
  .from(customerContactPrefs)
  .where(eq(customerContactPrefs.customerId, customer.id))
  .limit(1);

if (existingPref.length > 0) {
  // Update existing preference
  await db
    .update(customerContactPrefs)
    .set({
      emailOptIn: validatedData.emailOptIn,
      updatedAt: new Date(),
    })
    .where(eq(customerContactPrefs.customerId, customer.id));
} else {
  // Create new preference record
  await db.insert(customerContactPrefs).values({
    customerId: customer.id,
    emailOptIn: validatedData.emailOptIn,
    smsOptIn: false, // Keep existing default
  });
}
```

**Alternative (more concise) using upsert pattern:**

If your database supports `ON CONFLICT` (PostgreSQL does), you can simplify:

```typescript
// Upsert email opt-in preference
await db
  .insert(customerContactPrefs)
  .values({
    customerId: customer.id,
    emailOptIn: validatedData.emailOptIn,
    smsOptIn: false, // Default for new records
  })
  .onConflictDoUpdate({
    target: customerContactPrefs.customerId,
    set: {
      emailOptIn: validatedData.emailOptIn,
      updatedAt: new Date(),
    },
  });
```

**Note:** Check if Drizzle supports `.onConflictDoUpdate()` in your version. If not, use the explicit check-then-update approach above.

**2c. Add logging for debugging:**

```typescript
console.log(`[booking] Email opt-in for customer ${customer.id}: ${validatedData.emailOptIn}`);
```

**Verification:**
```bash
pnpm run typecheck
pnpm lint
# Both should pass
```

---

### Step 3: Create Unit Tests (Optional but Recommended)

**Create `src/lib/__tests__/booking-email-optin.test.ts`:**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../db";
import { customers, customerContactPrefs } from "../schema";
import { eq } from "drizzle-orm";

describe("Booking Email Opt-In", () => {
  let testCustomerId: string;
  let testShopId: string;

  beforeEach(async () => {
    // Create test shop (assumes shops table exists)
    // You may need to adjust this based on your test setup
    testShopId = "test-shop-id"; // Or create a real shop for testing

    // Create test customer
    const [customer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Test User",
        email: "test@example.com",
        phone: "+11234567890",
      })
      .returning();
    testCustomerId = customer.id;
  });

  afterEach(async () => {
    // Cleanup
    await db
      .delete(customerContactPrefs)
      .where(eq(customerContactPrefs.customerId, testCustomerId));
    await db.delete(customers).where(eq(customers.id, testCustomerId));
  });

  it("should create contact preference with emailOptIn=true for new customer", async () => {
    // Simulate booking with email opt-in
    await db.insert(customerContactPrefs).values({
      customerId: testCustomerId,
      emailOptIn: true,
      smsOptIn: false,
    });

    const prefs = await db
      .select()
      .from(customerContactPrefs)
      .where(eq(customerContactPrefs.customerId, testCustomerId))
      .limit(1);

    expect(prefs.length).toBe(1);
    expect(prefs[0].emailOptIn).toBe(true);
    expect(prefs[0].smsOptIn).toBe(false);
  });

  it("should create contact preference with emailOptIn=false when unchecked", async () => {
    await db.insert(customerContactPrefs).values({
      customerId: testCustomerId,
      emailOptIn: false,
      smsOptIn: false,
    });

    const prefs = await db
      .select()
      .from(customerContactPrefs)
      .where(eq(customerContactPrefs.customerId, testCustomerId))
      .limit(1);

    expect(prefs.length).toBe(1);
    expect(prefs[0].emailOptIn).toBe(false);
  });

  it("should update existing preference when customer books again", async () => {
    // First booking - opt in
    await db.insert(customerContactPrefs).values({
      customerId: testCustomerId,
      emailOptIn: true,
      smsOptIn: false,
    });

    // Second booking - opt out
    await db
      .update(customerContactPrefs)
      .set({ emailOptIn: false })
      .where(eq(customerContactPrefs.customerId, testCustomerId));

    const prefs = await db
      .select()
      .from(customerContactPrefs)
      .where(eq(customerContactPrefs.customerId, testCustomerId))
      .limit(1);

    expect(prefs.length).toBe(1); // Should still be only one record
    expect(prefs[0].emailOptIn).toBe(false); // Updated value
  });

  it("should default to true when emailOptIn not provided", async () => {
    // Simulate default behavior
    const emailOptIn = undefined;
    const finalValue = emailOptIn ?? true;

    await db.insert(customerContactPrefs).values({
      customerId: testCustomerId,
      emailOptIn: finalValue,
      smsOptIn: false,
    });

    const prefs = await db
      .select()
      .from(customerContactPrefs)
      .where(eq(customerContactPrefs.customerId, testCustomerId))
      .limit(1);

    expect(prefs[0].emailOptIn).toBe(true);
  });
});
```

**Run tests:**
```bash
pnpm test src/lib/__tests__/booking-email-optin.test.ts
```

**Expected output:**
```
✓ src/lib/__tests__/booking-email-optin.test.ts (4 tests)
  ✓ Booking Email Opt-In (4)
    ✓ should create contact preference with emailOptIn=true for new customer
    ✓ should create contact preference with emailOptIn=false when unchecked
    ✓ should update existing preference when customer books again
    ✓ should default to true when emailOptIn not provided

Test Files  1 passed (1)
     Tests  4 passed (4)
```

---

### Step 4: Create E2E Test (Optional but Recommended)

**Create `tests/e2e/email-optin-booking.spec.ts`:**

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { customerContactPrefs, customers } from "@/lib/schema";
import { eq } from "drizzle-orm";

test.describe("Email Opt-In During Booking", () => {
  let testEmail: string;

  test.beforeEach(() => {
    testEmail = `test-${Date.now()}@example.com`;
  });

  test("should save emailOptIn=true when checkbox is checked (default)", async ({
    page,
  }) => {
    // Navigate to booking page (adjust URL to your booking page)
    await page.goto("/book/test-shop-slug");

    // Fill in booking form
    await page.fill('input[name="fullName"]', "John Doe");
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="phone"]', "+11234567890");

    // Email opt-in checkbox should be checked by default
    const emailOptInCheckbox = page.locator('input[id="emailOptIn"]');
    await expect(emailOptInCheckbox).toBeChecked();

    // Select time slot (adjust selectors based on your UI)
    await page.click('button:has-text("2:00 PM")');

    // Submit booking
    await page.click('button[type="submit"]:has-text("Book")');

    // Wait for success message
    await expect(page.locator('text=Booking confirmed')).toBeVisible({
      timeout: 10000,
    });

    // Verify in database
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.email, testEmail))
      .limit(1);

    expect(customer.length).toBe(1);

    const prefs = await db
      .select()
      .from(customerContactPrefs)
      .where(eq(customerContactPrefs.customerId, customer[0].id))
      .limit(1);

    expect(prefs.length).toBe(1);
    expect(prefs[0].emailOptIn).toBe(true);
  });

  test("should save emailOptIn=false when checkbox is unchecked", async ({
    page,
  }) => {
    await page.goto("/book/test-shop-slug");

    await page.fill('input[name="fullName"]', "Jane Smith");
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="phone"]', "+11234567891");

    // Uncheck email opt-in
    const emailOptInCheckbox = page.locator('input[id="emailOptIn"]');
    await emailOptInCheckbox.uncheck();
    await expect(emailOptInCheckbox).not.toBeChecked();

    await page.click('button:has-text("2:00 PM")');
    await page.click('button[type="submit"]:has-text("Book")');

    await expect(page.locator('text=Booking confirmed')).toBeVisible({
      timeout: 10000,
    });

    // Verify in database
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.email, testEmail))
      .limit(1);

    const prefs = await db
      .select()
      .from(customerContactPrefs)
      .where(eq(customerContactPrefs.customerId, customer[0].id))
      .limit(1);

    expect(prefs[0].emailOptIn).toBe(false);
  });

  test.afterEach(async () => {
    // Cleanup test data
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.email, testEmail))
      .limit(1);

    if (customer.length > 0) {
      await db
        .delete(customerContactPrefs)
        .where(eq(customerContactPrefs.customerId, customer[0].id));
      await db.delete(customers).where(eq(customers.id, customer[0].id));
    }
  });
});
```

**Run E2E tests:**
```bash
pnpm test:e2e tests/e2e/email-optin-booking.spec.ts
```

---

## Testing Strategy

### 1. Unit Tests ✅

**What:** Test database logic for saving email opt-in preference
**How:** Run `pnpm test src/lib/__tests__/booking-email-optin.test.ts`
**Covers:**
- Creating preference with emailOptIn=true
- Creating preference with emailOptIn=false
- Updating existing preference
- Default behavior (true when not provided)

**Success criteria:** All 4 tests pass

---

### 2. E2E Tests ✅

**What:** Test complete booking flow with email opt-in
**How:** Run `pnpm test:e2e tests/e2e/email-optin-booking.spec.ts`
**Covers:**
- Checkbox is checked by default
- Booking saves emailOptIn=true to database
- Unchecking checkbox saves emailOptIn=false
- Success message appears after booking

**Success criteria:** All 2 E2E tests pass

---

### 3. Manual UI Testing ✅

**What:** Verify checkbox appears and behaves correctly
**How:** See Demo Script below
**Covers:**
- Checkbox renders in form
- Default state is checked
- Checkbox can be toggled
- Help text is clear
- Form submits with checkbox value

**Success criteria:** UI renders correctly, checkbox toggles work

---

### 4. Database Verification ✅

**What:** Verify preference is saved correctly
**How:** Check database after booking
**Covers:**
- New customer creates preference record
- Existing customer updates preference record
- emailOptIn value matches checkbox state

**Success criteria:** Database reflects checkbox selection

---

## Demo Script

### Prerequisites

1. **V2 complete:**
   ```bash
   # Verify schema has emailOptIn field
   pnpm db:studio
   # Check customerContactPrefs table has email_opt_in column
   ```

2. **Dev server running:**
   ```bash
   pnpm dev
   ```

3. **Shop exists for booking:**
   - Ensure you have at least one shop in database for testing
   - Note the shop's booking URL slug

---

### Demo Steps

**Step 1: Navigate to booking page**

```bash
# Open browser to booking page
# Replace 'your-shop-slug' with actual shop slug
http://localhost:3000/book/your-shop-slug
```

**Expected:**
- Booking form loads
- Form fields visible: name, email, phone

---

**Step 2: Verify email opt-in checkbox appears**

**Look for:**
- Checkbox labeled "Send me email reminders"
- Help text: "Get an email reminder 24 hours before your appointment. You can opt out anytime."
- Checkbox should be **checked by default**

**Visual check:**
- ✅ Checkbox visible
- ✅ Checkbox checked by default
- ✅ Label and help text clear and readable
- ✅ Checkbox styled consistently with form

---

**Step 3: Test booking with email opt-in (default)**

**Fill in form:**
- **Full Name:** "Alex Test"
- **Email:** "alex.test@example.com"
- **Phone:** "+11234567890"
- **Email opt-in:** Leave checked (default)

**Select time slot:**
- Click on available time slot (e.g., "2:00 PM")

**Submit booking:**
- Click "Book Appointment" or similar button

**Expected result:**
- Success message appears
- Booking confirmation shown
- Redirect to confirmation page or show success state

---

**Step 4: Verify in database (opt-in checked)**

```bash
# Open Drizzle Studio
pnpm db:studio
```

**Navigate to customers table:**
- Find customer with email "alex.test@example.com"
- Note the customer ID

**Navigate to customerContactPrefs table:**
- Filter by customer ID from above
- **Check values:**
  - `email_opt_in` = `true` ✅
  - `sms_opt_in` = `false` (default)
  - `updated_at` = recent timestamp

**Success criteria:**
- ✅ One record exists for customer
- ✅ `email_opt_in` = true
- ✅ Record created/updated at booking time

---

**Step 5: Test booking with email opt-out**

**Create new booking:**
- Navigate back to booking page
- **Full Name:** "Sam NoEmail"
- **Email:** "sam.noemail@example.com"
- **Phone:** "+11234567891"
- **Email opt-in:** **Uncheck the checkbox** ❌

**Visual verification:**
- Checkbox should toggle to unchecked state
- Help text still visible

**Submit booking:**
- Select time slot
- Click "Book Appointment"
- Wait for success message

---

**Step 6: Verify in database (opt-in unchecked)**

```bash
pnpm db:studio
```

**Find new customer:**
- Email: "sam.noemail@example.com"

**Check customerContactPrefs:**
- Filter by new customer ID
- **Check values:**
  - `email_opt_in` = `false` ✅
  - `sms_opt_in` = `false`

**Success criteria:**
- ✅ `email_opt_in` = false (matches unchecked state)

---

**Step 7: Test existing customer rebooking**

**Book again with first customer:**
- Use same email: "alex.test@example.com"
- Different name (or same name)
- **This time:** Uncheck email opt-in ❌

**Submit booking:**
- Complete booking flow

**Verify in database:**
- Find "alex.test@example.com" customer
- Check customerContactPrefs
- **Check values:**
  - Still only **one record** (not two) ✅
  - `email_opt_in` = `false` (updated from true) ✅
  - `updated_at` = new timestamp (more recent)

**Success criteria:**
- ✅ Preference updated, not duplicated
- ✅ New value reflects latest booking choice

---

**Step 8: Test form validation**

**Try to submit without filling fields:**
- Leave fields empty
- Try to submit

**Expected:**
- Form validation prevents submission
- Email opt-in checkbox state doesn't affect validation
- Can submit with checkbox checked or unchecked

---

### Demo Success Criteria

✅ Email opt-in checkbox appears on booking form
✅ Checkbox is checked by default
✅ Checkbox can be toggled on/off
✅ Help text is clear and informative
✅ Booking with checked box saves emailOptIn=true to database
✅ Booking with unchecked box saves emailOptIn=false to database
✅ Existing customer rebooking updates preference (doesn't duplicate)
✅ Form validation works regardless of checkbox state
✅ Unit tests pass (4/4)
✅ E2E tests pass (2/2)
✅ `pnpm lint && pnpm typecheck` passes

---

## Troubleshooting

### Checkbox not appearing

**Symptom:** Form renders but no email opt-in checkbox

**Possible causes:**
1. Component didn't re-render after code changes
2. Import missing for Checkbox component
3. Conditional rendering hiding the checkbox

**Fix:**
```bash
# Restart dev server
pnpm dev

# Check browser console for errors
# Check that Checkbox is imported:
import { Checkbox } from "@/components/ui/checkbox";
```

---

### Checkbox state not saving

**Symptom:** Checkbox works in UI but database always shows default value

**Possible causes:**
1. emailOptIn not included in form submission
2. API not receiving emailOptIn value
3. Database update logic not executing

**Debug:**
```typescript
// In booking-form.tsx, log before submission:
console.log("Submitting with emailOptIn:", emailOptIn);

// In route.ts, log after validation:
console.log("Received emailOptIn:", validatedData.emailOptIn);

// After database update:
console.log("Saved emailOptIn for customer:", customer.id);
```

**Fix:** Ensure `emailOptIn` is included in all data passing steps:
1. Form state → submission payload
2. API request body → validation schema
3. Validated data → database insert/update

---

### Preference not updating for existing customer

**Symptom:** First booking works, second booking creates duplicate or doesn't update

**Possible cause:** Missing upsert logic or incorrect WHERE clause

**Fix:** Use the upsert pattern from Step 2b, or ensure your check-then-update logic correctly identifies existing records:

```typescript
// Check for existing preference by customerId
const existingPref = await db
  .select()
  .from(customerContactPrefs)
  .where(eq(customerContactPrefs.customerId, customer.id)) // Must use customer.id
  .limit(1);
```

---

### TypeScript errors

**Error:** `Property 'emailOptIn' does not exist on type...`

**Fix:** Ensure Zod schema includes emailOptIn:
```typescript
const bookingSchema = z.object({
  // ... other fields
  emailOptIn: z.boolean().optional().default(true),
});
```

---

## Success Criteria

V3 is complete when:

- ✅ Email opt-in checkbox added to booking form
- ✅ Checkbox is checked by default
- ✅ Checkbox label and help text are clear
- ✅ Booking API accepts `emailOptIn` parameter
- ✅ New customer booking creates `customerContactPrefs` record
- ✅ Existing customer booking updates `customerContactPrefs` record
- ✅ Database reflects checkbox selection (true or false)
- ✅ No duplicate preference records created
- ✅ Unit tests pass (4/4)
- ✅ E2E tests pass (2/2)
- ✅ Manual testing: Both checked and unchecked states work
- ✅ `pnpm lint && pnpm typecheck` passes with no errors

---

## Next: V4

Once V3 is complete, proceed to V4: Query + Message Infrastructure

V4 will:
- Create `findAppointmentsForEmailReminder()` query
- Query appointments 23-25 hours before start time
- Filter by `emailOptIn = true`
- Create manual send endpoint for testing
- Integrate with deduplication and logging

The email opt-in preferences saved in V3 will be used by V4's query to determine which customers should receive email reminders.
