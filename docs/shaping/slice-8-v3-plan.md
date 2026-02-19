# V3: Customer History Card

**Goal:** Add customer appointment history to detail page for explainability

**Appetite:** 0.5 days

**Demo:** Click appointment detail → see customer's last 5 appointments with attendance patterns (✅ completed / 🚫 cancelled / ❌ no-show). Understand WHY a customer has a certain risk score.

---

## Overview

V3 adds explainability to the no-show risk system. When viewing an appointment, businesses can now see the customer's recent appointment history with visual indicators showing their attendance pattern. This makes the risk score transparent and actionable—if a badge shows "high risk," the history card shows exactly why (e.g., "2 no-shows in last 3 appointments"). The card displays the 5 most recent appointments with color-coded icons, dates, and outcome labels.

### What's Built

- Query function: `getCustomerAppointmentHistory()` (last 5 appointments with outcomes)
- UI component: `CustomerHistoryCard` with appointment list and outcome icons
- Integration: Add history card to appointment detail page
- Visual indicators: ✅ completed (green), 🚫 cancelled (yellow), ❌ no-show (red)
- Responsive design that matches existing detail page layout

---

## Scope

### In Scope

- Query: Last 5 appointments for customer at specific shop
- Return: appointment ID, date, status, financialOutcome, resolutionReason
- History card component with appointment list
- Outcome icons: ✅ (completed/settled), 🚫 (cancelled), ❌ (no-show/voided)
- Outcome labels: "Completed", "Cancelled before cutoff", "Cancelled after cutoff", "No-show"
- Display appointment date in shop timezone
- Empty state: "No appointment history yet" for new customers
- Link to each historical appointment (clickable rows)

### Out of Scope

- Pagination (5 most recent is sufficient)
- Filters by date range (V3 is simple display)
- No-show stats summary (already shown in badge tooltip from V2)
- Customer-level page (history card is appointment-scoped)
- Edit/modify history (read-only display)
- Export history (future enhancement)

---

## Implementation Steps

### Step 1: Query Function

**File:** `src/lib/queries/appointments.ts` (add to existing)

```typescript
import { appointments } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Get customer's appointment history at a specific shop.
 *
 * Returns last N appointments sorted by most recent first.
 * Used for customer history card on appointment detail page.
 *
 * @param customerId - Customer UUID
 * @param shopId - Shop UUID (history is per-shop)
 * @param limit - Number of appointments to return (default 5)
 * @returns Array of appointments with outcomes
 */
export async function getCustomerAppointmentHistory(
  customerId: string,
  shopId: string,
  limit: number = 5
): Promise<
  Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: "booked" | "cancelled";
    financialOutcome: "settled" | "voided" | "refunded" | "unresolved";
    resolutionReason: string | null;
    createdAt: Date;
  }>
> {
  const rows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      financialOutcome: appointments.financialOutcome,
      resolutionReason: appointments.resolutionReason,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .where(and(eq(appointments.customerId, customerId), eq(appointments.shopId, shopId)))
    .orderBy(desc(appointments.startsAt))
    .limit(limit);

  return rows;
}
```

---

### Step 2: Customer History Card Component

**File:** `src/components/appointments/customer-history-card.tsx` (new file)

```typescript
import Link from "next/link";

/**
 * Customer History Card
 *
 * Displays a customer's recent appointment history with visual outcome indicators.
 * Shows why a customer has a certain no-show risk score (explainability).
 *
 * Outcome icons:
 * - ✅ Completed: Customer showed up, payment settled
 * - 🚫 Cancelled: Customer cancelled (before or after cutoff)
 * - ❌ No-show: Customer didn't show up, appointment voided
 */

interface AppointmentHistoryItem {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "booked" | "cancelled";
  financialOutcome: "settled" | "voided" | "refunded" | "unresolved";
  resolutionReason: string | null;
  createdAt: Date;
}

interface CustomerHistoryCardProps {
  customerName: string;
  history: AppointmentHistoryItem[];
  timezone: string;
  className?: string;
}

export function CustomerHistoryCard({
  customerName,
  history,
  timezone,
  className,
}: CustomerHistoryCardProps) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Determine outcome display
  const getOutcomeDisplay = (
    item: AppointmentHistoryItem
  ): {
    icon: string;
    label: string;
    color: string;
  } => {
    // Completed: settled outcome
    if (item.financialOutcome === "settled") {
      return {
        icon: "✅",
        label: "Completed",
        color: "text-green-700",
      };
    }

    // No-show: voided outcome (customer didn't show, appointment ended)
    if (item.financialOutcome === "voided") {
      return {
        icon: "❌",
        label: "No-show",
        color: "text-red-700",
      };
    }

    // Cancelled before cutoff: refunded
    if (
      item.status === "cancelled" &&
      item.resolutionReason === "cancelled_refunded_before_cutoff"
    ) {
      return {
        icon: "🚫",
        label: "Cancelled (on-time)",
        color: "text-yellow-700",
      };
    }

    // Cancelled after cutoff: late cancel
    if (
      item.status === "cancelled" &&
      item.resolutionReason === "cancelled_no_refund_after_cutoff"
    ) {
      return {
        icon: "🚫",
        label: "Cancelled (late)",
        color: "text-orange-700",
      };
    }

    // Unresolved or unknown
    if (item.financialOutcome === "unresolved") {
      const now = new Date();
      const appointmentEnded = item.endsAt < now;

      if (item.status === "booked" && appointmentEnded) {
        // Likely a no-show that hasn't been processed yet
        return {
          icon: "⏳",
          label: "Pending resolution",
          color: "text-muted-foreground",
        };
      }

      // Upcoming or in-progress
      return {
        icon: "📅",
        label: "Upcoming",
        color: "text-blue-700",
      };
    }

    // Fallback
    return {
      icon: "•",
      label: item.status,
      color: "text-muted-foreground",
    };
  };

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${className ?? ""}`}>
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-muted-foreground">
          Appointment History
        </h2>
        <p className="text-base font-medium">{customerName}</p>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No appointment history yet. This is the customer's first booking.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Last {history.length} appointment{history.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-1">
            {history.map((item) => {
              const outcome = getOutcomeDisplay(item);
              return (
                <Link
                  key={item.id}
                  href={`/app/appointments/${item.id}`}
                  className="block rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg" title={outcome.label}>
                        {outcome.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {formatter.format(new Date(item.startsAt))}
                        </div>
                        <div className={`text-xs ${outcome.color}`}>
                          {outcome.label}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Step 3: Integrate into Appointment Detail Page

**File:** `src/app/app/appointments/[id]/page.tsx` (extend existing)

Add customer history query and display:

```typescript
import { CustomerHistoryCard } from "@/components/appointments/customer-history-card";
import { getCustomerAppointmentHistory } from "@/lib/queries/appointments";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    // ... existing no-shop handling ...
  }

  const { id } = await params;

  // ... existing appointment query ...

  if (appointmentRows.length === 0 || !appointmentRows[0]) {
    notFound();
  }

  const appointment = appointmentRows[0];

  // NEW: Fetch customer history
  const customerHistory = await getCustomerAppointmentHistory(
    appointment.customerId, // Need to add customerId to select
    shop.id,
    5
  );

  const [settings, messages] = await Promise.all([
    getBookingSettingsForShop(shop.id),
    db
      .select({
        // ... existing message query ...
      })
      .from(messageLog)
      .where(
        and(eq(messageLog.shopId, shop.id), eq(messageLog.appointmentId, id))
      )
      .orderBy(desc(messageLog.createdAt)),
  ]);

  const timezone = settings?.timezone ?? "UTC";

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/app/appointments"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to appointments
        </Link>
        <h1 className="text-3xl font-semibold">Appointment</h1>
        <p className="text-sm text-muted-foreground">
          {appointment.customerName}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ... existing Details card ... */}
        {/* ... existing Payment card ... */}
      </div>

      {/* Existing Customer card - KEEP for contact info */}
      <div className="rounded-lg border p-4 space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Customer</h2>
        <p className="text-base font-medium">{appointment.customerName}</p>
        <p className="text-sm text-muted-foreground">
          {appointment.customerEmail ?? appointment.customerPhone}
        </p>
      </div>

      {/* NEW: Customer History Card */}
      <CustomerHistoryCard
        customerName={appointment.customerName}
        history={customerHistory}
        timezone={timezone}
      />

      {/* ... existing Messages section ... */}
      {/* ... existing Rendered Bodies section ... */}
    </div>
  );
}
```

**IMPORTANT:** Need to add `customerId` to the appointment query select:

```typescript
const appointmentRows = await db
  .select({
    id: appointments.id,
    customerId: appointments.customerId, // ADD THIS LINE
    startsAt: appointments.startsAt,
    endsAt: appointments.endsAt,
    // ... rest of existing fields ...
  })
  .from(appointments)
  // ... rest of query ...
```

---

### Step 4: Update Schema Type Exports (if needed)

**File:** `src/lib/schema.ts` (verify types)

Ensure the appointment status and outcome enums are properly exported for the component:

```typescript
// These should already exist from previous slices
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "booked",
  "cancelled",
]);

export const appointmentFinancialOutcomeEnum = pgEnum(
  "appointment_financial_outcome",
  ["settled", "voided", "refunded", "unresolved"]
);
```

---

## Testing Checklist

### Manual Testing

1. **View appointment with history:**
   - Navigate to `/app/appointments`
   - Click "View" on any appointment
   - Scroll to "Appointment History" section

   **Verify:**
   - ✅ History card displays below customer contact info
   - ✅ Shows "Last N appointments" header
   - ✅ Lists up to 5 most recent appointments
   - ✅ Sorted by most recent first (descending date)

2. **Verify outcome icons:**
   Create test appointments with different outcomes:
   - Completed appointment (settled)
   - No-show appointment (voided)
   - Cancelled before cutoff (refunded)
   - Cancelled after cutoff (late cancel)

   **Verify:**
   - ✅ Completed shows ✅ green icon + "Completed" label
   - ✅ No-show shows ❌ red icon + "No-show" label
   - ✅ On-time cancel shows 🚫 yellow icon + "Cancelled (on-time)" label
   - ✅ Late cancel shows 🚫 orange icon + "Cancelled (late)" label

3. **New customer (no history):**
   - Create a new customer's first appointment
   - View appointment detail

   **Verify:**
   - ✅ History card shows "No appointment history yet. This is the customer's first booking."
   - ✅ Empty state is clear and helpful

4. **Upcoming appointment:**
   - View an upcoming appointment (endsAt > now, status=booked)

   **Verify:**
   - ✅ Shows 📅 blue icon + "Upcoming" label
   - ✅ Included in history list

5. **Pending resolution:**
   - View an appointment that ended but hasn't been resolved yet
   - (status=booked, endsAt < now, financialOutcome=unresolved)

   **Verify:**
   - ✅ Shows ⏳ gray icon + "Pending resolution" label
   - ✅ Indicates resolver hasn't run yet

6. **Clickable history:**
   - Click on a historical appointment in the card

   **Verify:**
   - ✅ Navigates to that appointment's detail page
   - ✅ Hover state shows background change

7. **Timezone handling:**
   - Set shop timezone to different zone (e.g., "America/New_York")
   - View appointment history

   **Verify:**
   - ✅ Dates displayed in shop timezone
   - ✅ Format matches other dates on page

8. **Responsive design:**
   - View on mobile (narrow width)
   - View on tablet (medium width)
   - View on desktop (wide width)

   **Verify:**
   - ✅ Card layout doesn't break
   - ✅ Icons and text remain readable
   - ✅ Matches existing page design system

9. **Code quality:**
   ```bash
   pnpm lint
   pnpm typecheck
   ```

   **Expected:**
   - ✅ No linting errors
   - ✅ No TypeScript errors

### Automated Testing (Optional)

For comprehensive coverage, add integration tests:

**File:** `tests/e2e/customer-history.spec.ts` (new file)

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { appointments } from "@/lib/schema";

test.describe("Customer History Card", () => {
  test("shows history for customer with multiple appointments", async ({
    page,
  }) => {
    // Setup: Create customer with 3 appointments
    // - 1 completed (settled)
    // - 1 no-show (voided)
    // - 1 cancelled (refunded)

    // Navigate to appointment detail
    await page.goto("/app/appointments/[appointment-id]");

    // Verify history card visible
    await expect(page.getByText("Appointment History")).toBeVisible();

    // Verify outcome icons
    await expect(page.locator('text="✅"')).toBeVisible(); // Completed
    await expect(page.locator('text="❌"')).toBeVisible(); // No-show
    await expect(page.locator('text="🚫"')).toBeVisible(); // Cancelled
  });

  test("shows empty state for new customer", async ({ page }) => {
    // Setup: Create customer's first appointment

    // Navigate to appointment detail
    await page.goto("/app/appointments/[appointment-id]");

    // Verify empty state
    await expect(
      page.getByText("No appointment history yet")
    ).toBeVisible();
  });

  test("limits history to 5 most recent", async ({ page }) => {
    // Setup: Create customer with 10 appointments

    // Navigate to appointment detail
    await page.goto("/app/appointments/[appointment-id]");

    // Verify only 5 shown
    const historyItems = page.locator('[href^="/app/appointments/"]');
    await expect(historyItems).toHaveCount(5);
  });
});
```

---

## Acceptance Criteria

- ✅ `getCustomerAppointmentHistory()` query implemented
- ✅ Query returns last 5 appointments sorted by most recent
- ✅ `CustomerHistoryCard` component created
- ✅ Component displays appointment list with dates
- ✅ Outcome icons correctly mapped:
  - ✅ Green checkmark for completed (settled)
  - ❌ Red X for no-show (voided)
  - 🚫 Yellow/orange prohibition for cancelled
- ✅ Outcome labels are clear and descriptive
- ✅ Empty state shown for new customers
- ✅ History card integrated into appointment detail page
- ✅ History items are clickable links to appointment details
- ✅ Dates formatted in shop timezone
- ✅ Responsive design matches existing page
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Component is accessible (semantic HTML, proper aria labels)

---

## Dependencies

**Required:**
- V1: Database schema (appointments table with outcomes)
- V2: Appointment outcomes properly set (settled, voided, refunded)
- Existing appointment detail page (`src/app/app/appointments/[id]/page.tsx`)
- Existing schema with financialOutcome and resolutionReason fields

**Enables:**
- Businesses can understand WHY a customer has a certain risk score
- Transparency builds trust in the no-show prediction system
- Actionable insights (e.g., "Customer has 2 no-shows, consider reminder")

---

## Cut Strategy

If time runs short:

**Must have (core explainability):**
- ✅ Query function (N10)
- ✅ Basic history card (U3)
- ✅ Outcome icons (U4)

**Nice to have:**
- Clickable history items (can add links later)
- Enhanced empty state messaging
- Pending resolution state

**Can cut entirely:**
- E2E tests (manual testing sufficient for V3)
- Multiple outcome label variants (can simplify to Completed/Cancelled/No-show)

Core history display is more important than polish.

---

## Notes

### Design Principles

1. **Explainability:** Users see concrete evidence, not just a score
2. **Visual clarity:** Icons provide instant pattern recognition
3. **Non-judgmental:** Labels are factual ("No-show") not punitive ("Unreliable")
4. **Contextual:** History is per-shop (same customer may differ across shops)
5. **Actionable:** Businesses can decide on intervention (e.g., call customer)

### UX Considerations

- **Color semantics:**
  - Green (✅): Positive outcome, customer showed up
  - Red (❌): Negative outcome, customer no-show
  - Yellow (🚫): Neutral outcome, customer cancelled
  - Blue (📅): Informational, upcoming appointment
  - Gray (⏳): Pending, waiting for resolution

- **Icon choices:**
  - ✅ Checkmark: Universal symbol for completion/success
  - ❌ X mark: Universal symbol for failure/absence
  - 🚫 Prohibition: Universal symbol for cancellation
  - 📅 Calendar: Indicates future/upcoming
  - ⏳ Hourglass: Indicates waiting/pending

- **Label clarity:**
  - "Completed" is better than "Settled" (business jargon)
  - "No-show" is better than "Voided" (clearer intent)
  - "Cancelled (on-time)" vs "Cancelled (late)" explains refund eligibility

### Accessibility Notes

- Icons have text labels (not icon-only)
- Links are keyboard navigable
- Color is not the only indicator (icons + text)
- Semantic HTML (`<h2>`, `<Link>`, etc.)

### Performance Considerations

- Single query for history (limit 5, efficient)
- No N+1 queries (history loaded once)
- Minimal overhead (query is lightweight)
- No real-time updates needed (static display)

### Future Enhancements (Out of Scope)

- Expand history to show all appointments (pagination)
- Filter history by date range or outcome type
- Export customer history as CSV
- Show stats summary (e.g., "80% attendance rate")
- Link to customer-level page with full history
- Timeline view with visual patterns

---

## Rollback Plan

If V3 causes issues:

1. **Remove history card:** Comment out `<CustomerHistoryCard>` in detail page
2. **Revert query:** No database changes, safe to remove function
3. **Delete component:** Remove `customer-history-card.tsx` file

V3 is purely additive UI. No database changes, no impact on booking flow. Fully safe to deploy and rollback if needed.

---

## Next Steps

After V3 ships:

1. Gather feedback from businesses on history card usefulness
2. Monitor for any confusion about outcome labels
3. Consider adding stats summary ("3 completed, 1 no-show out of 4 total")
4. Begin V4: Automated Reminders (proactive intervention for high-risk)
5. Consider customer-level history page (future enhancement)

V3 completes the transparency loop: businesses can now see score (V2) AND understand why (V3).
