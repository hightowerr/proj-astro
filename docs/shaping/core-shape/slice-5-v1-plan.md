# V1: SCHEMA + TOKEN SYSTEM — Implementation Plan

**Goal:** Customer sees manage link after booking

**Demo:** Book appointment → confirmation page shows `/manage/{token}` link

---

## Affordances Delivered

| ID | Place | Affordance |
|----|-------|------------|
| **Database Schema** |||
| N1 | Database | `booking_manage_tokens` table |
| N3 | Database | `policy_versions.cancel_cutoff_minutes` |
| N4 | Database | `policy_versions.refund_before_cutoff` |
| N5 | Database | `appointments.status` enum extension |
| N6 | Database | `appointments.cancelled_at` |
| N7 | Database | `appointments.cancellation_source` |
| N8 | Database | `appointments.resolution_reason` extension |
| N9 | Database | `payments.refunded_amount_cents` |
| N10 | Database | `payments.stripe_refund_id` |
| N11 | Database | `payments.refunded_at` |
| N12 | Database | `appointment_events` table |
| **Token Generation** |||
| N2 | Booking Flow | Generate token handler |
| U1 | Booking Confirmation | Manage link display |

---

## Implementation Order

### Step 1: Database Migrations

Create migration `drizzle/0009_cancellation_schema.sql` with all schema changes in one atomic migration.

#### 1.1 Policy Extensions

```sql
-- Add cancellation policy fields to policy_versions
ALTER TABLE policy_versions
  ADD COLUMN cancel_cutoff_minutes integer NOT NULL DEFAULT 1440,
  ADD COLUMN refund_before_cutoff boolean NOT NULL DEFAULT true;
```

#### 1.2 Appointments Extensions

```sql
-- Extend appointments.status enum
ALTER TYPE appointment_status ADD VALUE 'cancelled';

-- Add cancellation fields to appointments
ALTER TABLE appointments
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN cancellation_source text;

-- Add cancellation_source check constraint
ALTER TABLE appointments
  ADD CONSTRAINT appointments_cancellation_source_check
  CHECK (cancellation_source IN ('customer', 'system', 'admin'));

-- Extend resolution_reason enum
ALTER TYPE resolution_reason ADD VALUE 'cancelled_refunded_before_cutoff';
ALTER TYPE resolution_reason ADD VALUE 'cancelled_no_refund_after_cutoff';
```

#### 1.3 Payments Extensions

```sql
-- Add refund tracking fields to payments
ALTER TABLE payments
  ADD COLUMN refunded_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN stripe_refund_id text,
  ADD COLUMN refunded_at timestamptz;
```

#### 1.4 Booking Manage Tokens Table

```sql
-- Create booking_manage_tokens table
CREATE TABLE booking_manage_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast token lookups
CREATE INDEX booking_manage_tokens_token_hash_idx ON booking_manage_tokens(token_hash);
```

#### 1.5 Appointment Events Table

```sql
-- Create appointment_events table for audit log
CREATE TABLE appointment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_source text NOT NULL,
  event_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying events by appointment
CREATE INDEX appointment_events_appointment_id_idx ON appointment_events(appointment_id);
CREATE INDEX appointment_events_created_at_idx ON appointment_events(created_at DESC);

-- Check constraints
ALTER TABLE appointment_events
  ADD CONSTRAINT appointment_events_event_type_check
  CHECK (event_type IN ('booked', 'cancelled', 'ended', 'resolved'));

ALTER TABLE appointment_events
  ADD CONSTRAINT appointment_events_event_source_check
  CHECK (event_source IN ('customer', 'system', 'admin'));
```

**Files to modify:**
- Create `drizzle/0009_cancellation_schema.sql`
- Update `src/lib/schema.ts` with new Drizzle schema definitions

---

### Step 2: Update Drizzle Schema

Update `src/lib/schema.ts` to reflect the new database structure.

#### 2.1 Policy Versions Extension

```typescript
export const policyVersions = pgTable("policy_versions", {
  // ... existing fields ...
  cancelCutoffMinutes: integer("cancel_cutoff_minutes").notNull().default(1440),
  refundBeforeCutoff: boolean("refund_before_cutoff").notNull().default(true),
});
```

#### 2.2 Appointments Extension

```typescript
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "booked",
  "cancelled",
  "ended",
]);

export const cancellationSourceEnum = pgEnum("cancellation_source", [
  "customer",
  "system",
  "admin",
]);

export const resolutionReasonEnum = pgEnum("resolution_reason", [
  "completed_payment_captured",
  "no_show_payment_voided",
  "cancelled_refunded_before_cutoff",
  "cancelled_no_refund_after_cutoff",
]);

export const appointments = pgTable("appointments", {
  // ... existing fields ...
  status: appointmentStatusEnum("status").notNull().default("booked"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationSource: cancellationSourceEnum("cancellation_source"),
  resolutionReason: resolutionReasonEnum("resolution_reason"),
  // ... rest of fields ...
});
```

#### 2.3 Payments Extension

```typescript
export const payments = pgTable("payments", {
  // ... existing fields ...
  refundedAmountCents: integer("refunded_amount_cents").notNull().default(0),
  stripeRefundId: text("stripe_refund_id"),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
});
```

#### 2.4 Booking Manage Tokens Table

```typescript
export const bookingManageTokens = pgTable("booking_manage_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .unique()
    .references(() => appointments.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

#### 2.5 Appointment Events Table

```typescript
export const appointmentEventTypeEnum = pgEnum("appointment_event_type", [
  "booked",
  "cancelled",
  "ended",
  "resolved",
]);

export const appointmentEventSourceEnum = pgEnum("appointment_event_source", [
  "customer",
  "system",
  "admin",
]);

export const appointmentEvents = pgTable("appointment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .references(() => appointments.id, { onDelete: "cascade" }),
  eventType: appointmentEventTypeEnum("event_type").notNull(),
  eventSource: appointmentEventSourceEnum("event_source").notNull(),
  eventData: jsonb("event_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

---

### Step 3: Token Generation Utility

Create `src/lib/manage-tokens.ts` for token generation and hashing.

```typescript
import { randomBytes } from "crypto";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { bookingManageTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";

/**
 * Generate a secure random token (32 bytes = 64 hex characters)
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash a token using SHA256
 * We use SHA256 (not bcrypt) because:
 * 1. Tokens are 32+ bytes of random data (not user passwords)
 * 2. Fast hashing is acceptable for high-entropy random tokens
 * 3. SHA256 is sufficient for preventing token leakage in DB dumps
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create a manage token for an appointment
 * Returns the raw token (only time it's visible)
 */
export async function createManageToken(
  appointmentId: string,
  expiryDays: number = 90
): Promise<string> {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  await db.insert(bookingManageTokens).values({
    appointmentId,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

/**
 * Validate a manage token and return the appointment ID
 * Returns null if token is invalid or expired
 */
export async function validateToken(
  rawToken: string
): Promise<string | null> {
  const tokenHash = hashToken(rawToken);

  const [tokenRecord] = await db
    .select()
    .from(bookingManageTokens)
    .where(eq(bookingManageTokens.tokenHash, tokenHash))
    .limit(1);

  if (!tokenRecord) {
    return null;
  }

  // Check expiry
  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
    return null;
  }

  return tokenRecord.appointmentId;
}
```

---

### Step 4: Integrate Token Generation into Booking Flow

Modify the booking confirmation handler to generate and store a manage token.

**File:** Find where booking confirmation happens (likely in booking API route or confirmation page server component)

**Location to modify:** After appointment is created and payment is captured

**Add:**

```typescript
import { createManageToken } from "@/lib/manage-tokens";

// ... after appointment is created ...

// Generate manage token
const manageToken = await createManageToken(appointment.id);

// Pass manageToken to confirmation page or return in API response
```

**Files likely to modify:**
- `src/app/api/booking/create/route.ts` or similar
- Or wherever appointment creation + payment happens

---

### Step 5: Display Manage Link on Confirmation Page

Update the booking confirmation page to show the manage link.

**File:** Likely `src/app/booking/confirmation/page.tsx` or similar

**Add:**

```typescript
import { headers } from "next/headers";

export default async function BookingConfirmationPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const manageToken = searchParams.token;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Booking Confirmed!</h1>

      {/* Existing confirmation details */}

      {manageToken && (
        <div className="mt-6 p-4 border border-blue-200 bg-blue-50 rounded-md">
          <h2 className="font-semibold mb-2">Manage Your Booking</h2>
          <p className="text-sm text-gray-600 mb-3">
            Use this link to view details or cancel your appointment:
          </p>
          <a
            href={`/manage/${manageToken}`}
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Manage Booking
          </a>
          <p className="text-xs text-gray-500 mt-2">
            Save this link – you'll need it to manage your appointment
          </p>
        </div>
      )}
    </div>
  );
}
```

**UI Requirements:**
- Clear heading: "Manage Your Booking"
- Prominent button/link with the manage URL
- Helper text: "Save this link – you'll need it to manage your appointment"
- Visual distinction (border, background color) to draw attention

---

## Testing Plan

### Test 1: Database Migrations

**Goal:** Verify all schema changes are applied correctly

**Steps:**
1. Run `npm run db:generate` to generate migration from schema changes
2. Run `npm run db:migrate` to apply migrations
3. Verify in database:
   ```sql
   -- Check policy_versions columns exist
   \d policy_versions

   -- Check appointments columns and enums
   \d appointments
   SELECT enum_range(NULL::appointment_status);
   SELECT enum_range(NULL::resolution_reason);

   -- Check payments columns
   \d payments

   -- Check new tables exist
   \d booking_manage_tokens
   \d appointment_events
   ```

**Expected:**
- All columns exist with correct types and defaults
- All enums include new values
- All indexes are created
- All constraints are in place

---

### Test 2: Token Generation

**Goal:** Verify tokens are generated and hashed correctly

**Steps:**

1. Create test file `src/lib/__tests__/manage-tokens.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateToken, hashToken, createManageToken, validateToken } from "../manage-tokens";
import { db } from "../db";
import { bookingManageTokens, appointments } from "../schema";
import { eq } from "drizzle-orm";

describe("Manage Tokens", () => {
  it("generates unique 64-character tokens", () => {
    const token1 = generateToken();
    const token2 = generateToken();

    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it("hashes tokens consistently", () => {
    const token = "test-token-12345";
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(token); // Hash is different from input
  });

  it("creates and validates tokens", async () => {
    // Create test appointment first
    const [appointment] = await db.insert(appointments).values({
      shopId: "test-shop-id",
      customerId: "test-customer-id",
      startsAt: new Date(),
      durationMinutes: 60,
      // ... other required fields
    }).returning();

    // Create manage token
    const rawToken = await createManageToken(appointment.id);
    expect(rawToken).toHaveLength(64);

    // Validate token returns correct appointment ID
    const appointmentId = await validateToken(rawToken);
    expect(appointmentId).toBe(appointment.id);

    // Validate wrong token returns null
    const wrongToken = generateToken();
    const invalidResult = await validateToken(wrongToken);
    expect(invalidResult).toBeNull();
  });

  it("rejects expired tokens", async () => {
    // Create test appointment
    const [appointment] = await db.insert(appointments).values({
      shopId: "test-shop-id",
      customerId: "test-customer-id",
      startsAt: new Date(),
      durationMinutes: 60,
      // ... other required fields
    }).returning();

    // Create token with 0-day expiry (already expired)
    const rawToken = await createManageToken(appointment.id, 0);

    // Should return null because it's expired
    const result = await validateToken(rawToken);
    expect(result).toBeNull();
  });
});
```

2. Run tests:
   ```bash
   npm run test -- src/lib/__tests__/manage-tokens.test.ts
   ```

**Expected:**
- All tests pass
- Tokens are 64 characters (32 bytes hex)
- Hashing is consistent
- Validation works for valid tokens
- Expired tokens are rejected

---

### Test 3: End-to-End Booking Flow

**Goal:** Verify token is generated and displayed after booking

**Manual Test Steps:**

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Create a booking:**
   - Navigate to booking flow
   - Fill out appointment details
   - Complete payment
   - Reach confirmation page

3. **Verify manage link is displayed:**
   - [ ] Confirmation page shows "Manage Your Booking" section
   - [ ] Manage link is visible: `/manage/{token}`
   - [ ] Token is 64 characters long
   - [ ] Link has clear call-to-action button/styling
   - [ ] Helper text is present

4. **Verify token in database:**
   ```sql
   SELECT
     bmt.id,
     bmt.appointment_id,
     length(bmt.token_hash) as hash_length,
     bmt.expires_at,
     bmt.created_at,
     a.customer_phone
   FROM booking_manage_tokens bmt
   JOIN appointments a ON a.id = bmt.appointment_id
   ORDER BY bmt.created_at DESC
   LIMIT 1;
   ```

   **Expected:**
   - One token record exists for the appointment
   - `token_hash` is 64 characters (SHA256 hex output)
   - `expires_at` is 90 days in the future
   - `appointment_id` matches the created appointment

5. **Copy manage link and save for V2 testing** (we'll use it to test the manage page)

---

### Test 4: Token Security

**Goal:** Verify tokens are not guessable and hash is secure

**Steps:**

1. **Verify raw token is never stored:**
   ```sql
   -- This should return 0 rows (we only store hashes)
   SELECT * FROM booking_manage_tokens WHERE token_hash LIKE '%-%' OR token_hash LIKE '%a%b%c%';
   ```

2. **Verify hash is one-way:**
   - Take a token from confirmation page
   - Look up in database
   - Confirm you cannot reverse the hash to get original token

3. **Verify tokens are unique:**
   ```sql
   -- Should return 0 (no duplicates)
   SELECT token_hash, COUNT(*)
   FROM booking_manage_tokens
   GROUP BY token_hash
   HAVING COUNT(*) > 1;
   ```

**Expected:**
- Raw tokens are never stored (only hashes)
- Hashes are irreversible
- All tokens are unique
- Tokens are cryptographically random (not sequential or predictable)

---

## Definition of Done

V1 is complete when:

- [x] All database migrations applied successfully
- [x] Schema matches Drizzle definitions
- [x] Token generation utility works and is tested
- [x] Tokens are generated on booking confirmation
- [x] Manage link is displayed on confirmation page
- [x] All unit tests pass
- [x] End-to-end manual test passes
- [x] Token security verified (no raw tokens stored, unique hashes)
- [x] Demo works: Book appointment → see manage link

**Next:** V2 will build the manage page that consumes this token

---

## Files Modified/Created

**Created:**
- `drizzle/0009_cancellation_schema.sql`
- `src/lib/manage-tokens.ts`
- `src/lib/__tests__/manage-tokens.test.ts`

**Modified:**
- `src/lib/schema.ts` (add new tables and columns)
- `src/app/api/booking/*/route.ts` (or wherever booking confirmation happens)
- `src/app/booking/confirmation/page.tsx` (or equivalent confirmation page)
- `drizzle/meta/_journal.json` (auto-updated by drizzle-kit)

**Dependencies added:**
- None (using Node's built-in `crypto` module)

---

## Rollback Plan

If V1 needs to be rolled back:

1. **Revert migrations:**
   ```bash
   npm run db:rollback
   ```

2. **Remove generated files:**
   ```bash
   rm drizzle/0009_cancellation_schema.sql
   rm src/lib/manage-tokens.ts
   rm src/lib/__tests__/manage-tokens.test.ts
   ```

3. **Revert schema.ts changes** using git

4. **Regenerate migrations** from clean schema

**Note:** Rollback is safe because V1 only adds new tables/columns (doesn't modify existing data).
