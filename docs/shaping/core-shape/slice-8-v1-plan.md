# V1: Dashboard Badges + Infrastructure

**Goal:** Establish database foundation for no-show tracking and add visual indicators on appointments dashboard

**Appetite:** 0.5 days

**Demo:** Dashboard shows no-show risk badges on all appointments (defaults to "medium" until scoring is active in V2)

---

## Overview

V1 creates the infrastructure for attendance reliability tracking and displays initial UI badges. It adds the `customer_no_show_stats` table to store per-customer attendance history, extends the `appointments` table with no-show risk columns, and updates the dashboard to show risk badges with tooltips. This slice is pure infrastructure—no actual scoring happens yet (that's V2). All appointments will show "medium" risk by default until the scoring system is implemented.

### What's Built

- Database schema: `customer_no_show_stats` table (ready for V2 to populate)
- Extend `appointments` table: noShowScore, noShowRisk, noShowComputedAt columns
- UI component: `NoShowRiskBadge` with color-coded display (🟢/🟡/🔴)
- Dashboard integration: Add "No-Show Risk" column to appointments list
- Tooltip: Show score + explanation on hover (placeholder text until V2)
- Database migration

---

## Scope

### In Scope

- `customer_no_show_stats` table with all columns needed for V2-V5
- Extend `appointments` table with noShowScore (int), noShowRisk (enum), noShowComputedAt (timestamptz)
- `NoShowRiskBadge` component with tier-based colors
- Add badge column to appointments list table
- Tooltip showing "Score: — / No history yet" placeholder
- NULL handling for risk (default to "medium" display)

### Out of Scope

- Scoring algorithm (V2)
- Recompute job (V2)
- Booking-time score calculation (V2)
- Customer history card (V3)
- Automated reminders (V4)
- No-show detection (V5)
- Slot recovery integration (V5)

---

## Implementation Steps

### Step 1: Database Schema

**File:** `src/lib/schema.ts`

Add `customer_no_show_stats` table and extend `appointments`:

```typescript
import { pgEnum, pgTable, uuid, integer, timestamp, text, index, uniqueIndex } from "drizzle-orm/pg-core";

// No-show risk tier enum
export const noShowRiskEnum = pgEnum("no_show_risk", ["low", "medium", "high"]);

// Customer no-show statistics table
export const customerNoShowStats = pgTable(
  "customer_no_show_stats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),

    // Aggregate stats (populated by V2 recompute job)
    totalAppointments: integer("total_appointments").notNull().default(0),
    noShowCount: integer("no_show_count").notNull().default(0),
    lateCancelCount: integer("late_cancel_count").notNull().default(0),
    onTimeCancelCount: integer("on_time_cancel_count").notNull().default(0),
    completedCount: integer("completed_count").notNull().default(0),

    // Last no-show tracking
    lastNoShowAt: timestamp("last_no_show_at", { withTimezone: true }),

    // Metadata
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("customer_no_show_stats_customer_shop_idx").on(
      table.customerId,
      table.shopId
    ),
    index("customer_no_show_stats_shop_id_idx").on(table.shopId),
    index("customer_no_show_stats_customer_id_idx").on(table.customerId),
  ]
);

// Extend appointments table (add to existing table definition)
// Add these columns to the existing appointments table:
export const appointments = pgTable(
  "appointments",
  {
    // ... all existing columns ...

    // No-show prediction columns (populated by V2)
    noShowScore: integer("no_show_score"), // 0-100, null until computed
    noShowRisk: noShowRiskEnum("no_show_risk"), // low | medium | high, null until computed
    noShowComputedAt: timestamp("no_show_computed_at", { withTimezone: true }), // when score was calculated

    // ... rest of existing columns ...
  },
  (table) => [
    // ... existing indexes ...
    index("appointments_no_show_risk_idx").on(table.noShowRisk), // For V4 reminder queries
  ]
);

// Relations
export const customerNoShowStatsRelations = relations(customerNoShowStats, ({ one }) => ({
  customer: one(customers, {
    fields: [customerNoShowStats.customerId],
    references: [customers.id],
  }),
  shop: one(shops, {
    fields: [customerNoShowStats.shopId],
    references: [shops.id],
  }),
}));

// Add to customers relations
export const customersRelations = relations(customers, ({ many, one }) => ({
  // ... existing relations ...
  noShowStats: many(customerNoShowStats),
}));
```

**Generate migration:**

```bash
pnpm db:generate
# Review generated SQL in drizzle/
pnpm db:migrate
```

---

### Step 2: NoShowRiskBadge Component

**File:** `src/components/appointments/no-show-risk-badge.tsx` (new file)

```typescript
/**
 * No-Show Risk Badge
 *
 * Displays color-coded risk indicator with tooltip explanation.
 *
 * Risk levels:
 * - Low (🟢): score ≥70 AND no_show_count=0 in last 90 days
 * - Medium (🟡): default for new customers or mid-range behavior
 * - High (🔴): score <40 OR no_show_count ≥2 in last 90 days
 *
 * Handles NULL risk (no score yet) by defaulting to "medium" display.
 */

type NoShowRisk = "low" | "medium" | "high" | null;

interface NoShowRiskBadgeProps {
  risk: NoShowRisk;
  score?: number | null;
  className?: string;
}

export function NoShowRiskBadge({ risk, score, className }: NoShowRiskBadgeProps) {
  // Default to medium if risk is null (no score yet)
  const displayRisk = risk ?? "medium";

  const config = {
    low: {
      label: "Low Risk",
      color: "bg-green-100 text-green-800",
      icon: "🟢",
    },
    medium: {
      label: "Medium Risk",
      color: "bg-yellow-100 text-yellow-800",
      icon: "🟡",
    },
    high: {
      label: "High Risk",
      color: "bg-red-100 text-red-800",
      icon: "🔴",
    },
  };

  const { label, color, icon } = config[displayRisk];

  // Tooltip content
  const tooltipContent = score !== null && score !== undefined
    ? `Score: ${score}/100`
    : "Score: — / No history yet";

  return (
    <div className={className} title={tooltipContent}>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${color}`}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </span>
    </div>
  );
}
```

---

### Step 3: Update Appointments List Query

**File:** `src/lib/queries/appointments.ts`

Extend the `listAppointmentsForShop` query to include no-show risk columns:

```typescript
export async function listAppointmentsForShop(shopId: string) {
  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      paymentStatus: payments.status,
      paymentAmountCents: payments.amountCents,
      paymentCurrency: payments.currency,
      financialOutcome: appointments.financialOutcome,
      resolvedAt: appointments.resolvedAt,
      createdAt: appointments.createdAt,

      // Add no-show risk columns
      noShowScore: appointments.noShowScore,
      noShowRisk: appointments.noShowRisk,
      noShowComputedAt: appointments.noShowComputedAt,
    })
    .from(appointments)
    .leftJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(
      payments,
      and(
        eq(payments.appointmentId, appointments.id),
        eq(payments.status, "succeeded")
      )
    )
    .where(eq(appointments.shopId, shopId))
    .orderBy(desc(appointments.startsAt))
    .limit(50);

  return rows;
}
```

---

### Step 4: Update Appointments Dashboard Page

**File:** `src/app/app/appointments/page.tsx`

Add the "No-Show Risk" column to the appointments table:

```typescript
import { NoShowRiskBadge } from "@/components/appointments/no-show-risk-badge";

export default async function AppointmentsPage() {
  // ... existing code ...

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      {/* ... existing header and stats ... */}

      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recent or upcoming appointments. Share your booking link to get started.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Start</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Payment</th>
                <th className="px-4 py-2 font-medium">Outcome</th>
                <th className="px-4 py-2 font-medium">No-Show Risk</th>
                <th className="px-4 py-2 font-medium">Resolved</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="border-t">
                  <td className="px-4 py-3">
                    {formatter.format(new Date(appointment.startsAt))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{appointment.customerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {appointment.customerEmail ?? appointment.customerPhone}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium capitalize">
                      {appointment.paymentStatus}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currencyFormatter(
                        appointment.paymentAmountCents,
                        appointment.paymentCurrency
                      ) ?? (appointment.paymentRequired ? "—" : "No charge")}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize">
                      {appointment.financialOutcome}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <NoShowRiskBadge
                      risk={appointment.noShowRisk}
                      score={appointment.noShowScore}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {appointment.resolvedAt
                      ? formatter.format(new Date(appointment.resolvedAt))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatter.format(new Date(appointment.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/appointments/${appointment.id}`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ... existing slot recovery section ... */}
    </div>
  );
}
```

---

### Step 5: Extend Message Purpose Enum (Preparation for V4)

**File:** `src/lib/schema.ts`

Add new message purpose for V4 reminder system:

```typescript
export const messagePurposeEnum = pgEnum("message_purpose", [
  "booking_confirmation",
  "cancellation_confirmation",
  "slot_recovery_offer",
  "appointment_reminder_24h", // NEW: for V4 automated reminders
]);
```

**Generate migration:**

```bash
pnpm db:generate
# Review generated SQL in drizzle/
pnpm db:migrate
```

---

## Testing Checklist

### Manual Testing

1. **Database setup:**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:studio  # Verify tables created
   ```

   **Verify:**
   - ✅ `customer_no_show_stats` table exists with all columns
   - ✅ `appointments` table has noShowScore, noShowRisk, noShowComputedAt columns
   - ✅ `no_show_risk` enum type created (low, medium, high)
   - ✅ Unique index on (customer_id, shop_id) in customer_no_show_stats
   - ✅ `message_purpose` enum extended with 'appointment_reminder_24h'

2. **Dashboard display:**
   ```bash
   # User starts dev server
   # Navigate to /app/appointments
   ```

   **Verify:**
   - ✅ "No-Show Risk" column appears in appointments table
   - ✅ All appointments show "Medium Risk" badge (🟡) by default
   - ✅ Tooltip shows "Score: — / No history yet" on hover
   - ✅ Badge styling matches design (yellow background, centered)
   - ✅ Table layout not broken (columns align properly)

3. **NULL handling:**
   ```bash
   # In Drizzle Studio, manually set one appointment:
   # - noShowRisk = 'low'
   # - noShowScore = 85
   # Set another appointment:
   # - noShowRisk = 'high'
   # - noShowScore = 25
   # Leave third appointment with NULL values
   ```

   **Verify:**
   - ✅ Low risk shows green badge (🟢) with "Score: 85/100" tooltip
   - ✅ High risk shows red badge (🔴) with "Score: 25/100" tooltip
   - ✅ NULL risk shows yellow badge (🟡) with "Score: — / No history yet" tooltip

4. **Code quality:**
   ```bash
   pnpm lint
   pnpm typecheck
   ```

   **Expected:**
   - ✅ No linting errors
   - ✅ No TypeScript errors
   - ✅ Badge component properly typed

### Automated Testing

Not required for V1 (pure UI + infrastructure). V2 will add scoring logic tests.

---

## Acceptance Criteria

- ✅ `customer_no_show_stats` table created with all required columns
- ✅ `appointments` table extended with noShowScore, noShowRisk, noShowComputedAt
- ✅ `no_show_risk` enum created (low, medium, high)
- ✅ `message_purpose` enum extended with 'appointment_reminder_24h'
- ✅ Migration runs without errors on fresh database
- ✅ `NoShowRiskBadge` component displays color-coded badges
- ✅ Appointments list shows "No-Show Risk" column
- ✅ NULL risk defaults to "medium" (yellow badge)
- ✅ Tooltip shows score when available, placeholder when NULL
- ✅ Dashboard layout not broken (responsive, aligned)
- ✅ No TypeScript errors
- ✅ No linting errors

---

## Dependencies

**Required:**
- Existing schema (customers, appointments, shops, messageLog)
- Existing appointments list page (`src/app/app/appointments/page.tsx`)
- PostgreSQL database
- Drizzle ORM

**Enables:**
- V2: Scoring + Recompute Job (populates noShowScore, noShowRisk)
- V3: Customer History Card (reads customer_no_show_stats)
- V4: Automated Reminders (queries appointments by noShowRisk='high')
- V5: No-Show Detection (increments customer_no_show_stats counters)

---

## Cut Strategy

If time runs short:

**Must have (core infrastructure):**
- ✅ Database tables and columns (N1, N2)
- ✅ Badge component (U1)
- ✅ Dashboard integration (basic column)

**Nice to have:**
- Tooltip polish (can add later)
- Badge icon refinement

**Can cut entirely:**
- Message purpose enum extension (can add in V4 if needed)

Database schema is critical. UI can be refined in V2.

---

## Notes

### Design Principles

1. **Default to Medium:** New appointments with no score default to "medium" risk (neutral, non-punitive)
2. **Non-blocking:** V1 has zero impact on booking flow (columns are nullable)
3. **Visual Clarity:** Color-coded badges (green/yellow/red) provide instant risk assessment
4. **Explainability:** Tooltip shows score (or "no history") for transparency
5. **Future-ready:** Schema includes all columns needed for V2-V5

### UI/UX Considerations

- **Color choices:**
  - Green (🟢): Low risk, safe to book
  - Yellow (🟡): Medium risk, standard caution
  - Red (🔴): High risk, may need intervention

- **Tooltip content:**
  - V1: "Score: — / No history yet" (placeholder)
  - V2+: "Score: 65/100 — 3 completed, 1 no-show in last 180 days"

- **Non-punitive language:**
  - Never shows "unreliable" or "bad customer"
  - Risk levels are internal business signals, not customer labels

### Security Notes

- No customer-facing changes (dashboard is business-only)
- NULL handling prevents display errors
- No sensitive data exposed (scores are internal)

### Performance Considerations

- Badge component is lightweight (no API calls)
- Query adds 3 columns (minimal overhead)
- Index on noShowRisk prepared for V4 reminder queries
- No impact on page load time

### Future Enhancements (Out of Scope)

- Animated badge transitions when score updates (V2+)
- Risk trend indicators (↑↓ arrows showing change)
- Clickable badge to filter by risk level
- Export appointments by risk tier

---

## Rollback Plan

If V1 causes issues:

1. **Database:** Migrations are additive, no data loss
   - Can drop `customer_no_show_stats` table cleanly
   - Can remove appointment columns with `ALTER TABLE DROP COLUMN`

2. **UI:** Comment out badge column in appointments list
   - Revert `src/app/app/appointments/page.tsx` to remove "No-Show Risk" column
   - Delete `NoShowRiskBadge` component

3. **Query:** Revert `listAppointmentsForShop` to remove noShow* fields

V1 is isolated and has zero impact on existing booking/cancellation flows. Fully safe to deploy.

---

## Next Steps

After V1 ships:

1. Verify dashboard displays correctly (all badges show "medium")
2. Manually test NULL handling in Drizzle Studio
3. Begin V2: Scoring + Recompute Job (make badges show real data)
4. Monitor for any layout issues with new column

V1 is the foundation. V2 will bring it to life with actual scoring.
