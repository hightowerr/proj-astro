# V7: Conflicts Dashboard - Implementation Plan

**Status:** Ready for implementation
**Appetite:** 2-3 days
**Dependencies:** V6 (Conflict alerts)
**Demo:** Shop owner can view, dismiss, or resolve calendar conflicts through dashboard UI

---

## Overview

V7 completes the Google Calendar integration by providing a user interface for managing calendar conflicts. Shop owners can view conflicts detected by V6's cron job, decide how to handle them (keep appointment or cancel), and maintain a clean calendar.

### Goal

Build a conflicts management dashboard that:
1. **Alerts** shop owner when conflicts exist (banner on appointments page)
2. **Displays** all pending conflicts in dedicated conflicts page
3. **Shows** severity with visual badges (full, high, partial, all-day)
4. **Enables** dismissal of false positives ("Keep Appointment")
5. **Enables** cancellation to resolve conflicts ("Cancel Appointment")
6. **Updates** in real-time (optimistic UI updates)
7. **Integrates** with existing cancellation flow

This slice provides the final piece of the calendar integration puzzle, giving shop owners full visibility and control over appointment/calendar conflicts.

---

## Current State Analysis

### Existing Infrastructure

**Appointments Dashboard (Existing):**
- File: `src/app/app/appointments/page.tsx`
- Shows appointments table with outcome summary
- Has slot recovery section
- Uses Next.js App Router server components
- Responsive design with Tailwind CSS

**Conflict Alerts Data (V6):**
- Table: `calendar_conflict_alerts`
- Contains detected conflicts with event snapshots
- Severity classification: full, high, partial, all_day
- Status tracking: pending, dismissed, resolved, auto_resolved_*

**Cancellation Flow (V5):**
- Route: `/api/manage/[token]/cancel`
- Handles refund logic
- Deletes calendar events
- Auto-resolves conflict alerts

**Design Patterns:**
- Server components for data fetching
- Client components for interactivity
- Banner pattern: `src/components/dashboard/success-banner.tsx`
- Badge pattern: `NoShowRiskBadge`, `SlotStatusBadge`
- Table pattern: appointments and slot openings tables

### What's Missing (to be built)

1. **Conflict count query** - Count pending alerts for banner
2. **Conflicts query** - Load full conflict details for table
3. **Alert banner component** - Show on appointments page
4. **Conflicts page** - New route `/app/conflicts`
5. **Severity badge component** - Visual indicators
6. **Dismiss action** - Mark alert as dismissed
7. **Cancel action** - Integrate with cancellation flow
8. **Server actions** - Handle dismiss and cancel requests

---

## Requirements

### Functional Requirements

**FR1: Alert Banner**
- Show banner on `/app/appointments` when conflicts exist
- Display count: "3 appointments conflict with your Google Calendar"
- Include "View conflicts →" link
- Dismissible (client-side, localStorage)
- Only show when pending conflicts exist

**FR2: Conflicts Page**
- New route: `/app/conflicts`
- Table displaying all pending conflicts
- Each row shows:
  - Appointment date/time
  - Customer name
  - Conflicting calendar event summary
  - Event date/time
  - Severity badge
  - Actions: "Keep Appointment" | "Cancel Appointment"
- Empty state when no conflicts

**FR3: Severity Badges**
- Visual indicators for conflict severity:
  - **Full Conflict:** Red badge ("Full Conflict")
  - **High Conflict:** Orange badge ("High Conflict")
  - **Partial Conflict:** Yellow badge ("Partial Conflict")
  - **All-Day Event:** Blue badge ("All-Day Event")
- Color-coded for quick scanning
- Accessible (proper contrast, aria labels)

**FR4: Keep Appointment Action**
- Button: "Keep Appointment"
- Marks alert as dismissed (status='dismissed')
- Updates resolvedAt timestamp
- Removes row from table (optimistic update)
- Toast notification: "Conflict dismissed"
- False positive scenario: shop owner knows event won't conflict

**FR5: Cancel Appointment Action**
- Button: "Cancel Appointment"
- Opens confirmation dialog
- Shows refund amount if eligible
- Triggers cancellation flow
- Auto-resolves conflict alert (via V5 integration)
- Deletes calendar event
- Removes row from table
- Toast notification: "Appointment cancelled"

**FR6: Real-Time Updates**
- Optimistic UI updates for better UX
- Show loading states during actions
- Revalidate data after actions
- Handle errors gracefully

### Non-Functional Requirements

**NFR1: Performance**
- Fast page loads (<2s)
- Efficient queries (indexed lookups)
- Minimal client-side JavaScript
- Server-side rendering for initial load

**NFR2: Usability**
- Clear action buttons
- Confirmation dialogs for destructive actions
- Loading indicators during operations
- Error messages for failed actions
- Responsive design (mobile-friendly)

**NFR3: Accessibility**
- Semantic HTML
- ARIA labels for badges
- Keyboard navigation
- Screen reader friendly
- Sufficient color contrast

**NFR4: Reliability**
- Graceful error handling
- Transaction safety for actions
- Idempotent operations
- Audit trail (resolvedAt, resolvedBy)

---

## Implementation Steps

### Step 1: Conflict Queries

**File:** `src/lib/queries/calendar-conflicts.ts` (new file)

**Purpose:** Database queries for conflict alerts

```typescript
import { db } from "@/lib/db";
import { calendarConflictAlerts, appointments, customers } from "@/lib/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export type ConflictWithDetails = {
  id: string;
  appointmentId: string;
  appointmentStartsAt: Date;
  appointmentEndsAt: Date;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  calendarEventId: string;
  eventSummary: string | null;
  eventStart: Date;
  eventEnd: Date;
  severity: "full" | "high" | "partial" | "all_day";
  detectedAt: Date;
};

/**
 * Get count of pending conflict alerts for a shop
 */
export async function getConflictCount(shopId: string): Promise<number> {
  const result = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(calendarConflictAlerts)
    .where(
      and(
        eq(calendarConflictAlerts.shopId, shopId),
        eq(calendarConflictAlerts.status, "pending")
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Get all pending conflicts for a shop with appointment and customer details
 */
export async function getConflicts(shopId: string): Promise<ConflictWithDetails[]> {
  const results = await db
    .select({
      id: calendarConflictAlerts.id,
      appointmentId: calendarConflictAlerts.appointmentId,
      appointmentStartsAt: appointments.startsAt,
      appointmentEndsAt: appointments.endsAt,
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      calendarEventId: calendarConflictAlerts.calendarEventId,
      eventSummary: calendarConflictAlerts.eventSummary,
      eventStart: calendarConflictAlerts.eventStart,
      eventEnd: calendarConflictAlerts.eventEnd,
      severity: calendarConflictAlerts.severity,
      detectedAt: calendarConflictAlerts.detectedAt,
    })
    .from(calendarConflictAlerts)
    .innerJoin(appointments, eq(calendarConflictAlerts.appointmentId, appointments.id))
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .where(
      and(
        eq(calendarConflictAlerts.shopId, shopId),
        eq(calendarConflictAlerts.status, "pending")
      )
    )
    .orderBy(desc(appointments.startsAt));

  return results;
}

/**
 * Dismiss a conflict alert (mark as false positive)
 */
export async function dismissAlert(alertId: string, shopId: string): Promise<void> {
  const now = new Date();

  await db
    .update(calendarConflictAlerts)
    .set({
      status: "dismissed",
      resolvedAt: now,
      resolvedBy: "user",
      updatedAt: now,
    })
    .where(
      and(
        eq(calendarConflictAlerts.id, alertId),
        eq(calendarConflictAlerts.shopId, shopId),
        eq(calendarConflictAlerts.status, "pending")
      )
    );
}
```

**Key Design Decisions:**
- **Join queries:** Fetch all needed data in one query
- **Pending only:** Only show unresolved conflicts
- **Order by date:** Most urgent conflicts first (soonest appointments)
- **Shop isolation:** Always filter by shopId for security

---

### Step 2: Server Actions

**File:** `src/app/app/conflicts/actions.ts` (new file)

**Purpose:** Server actions for conflict management

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { dismissAlert } from "@/lib/queries/calendar-conflicts";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

/**
 * Dismiss a conflict alert (mark as false positive)
 */
export async function dismissConflictAction(alertId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await requireAuth();
    const shop = await getShopByOwnerId(session.user.id);

    if (!shop) {
      return { success: false, error: "Shop not found" };
    }

    await dismissAlert(alertId, shop.id);

    // Revalidate conflicts page and appointments page
    revalidatePath("/app/conflicts");
    revalidatePath("/app/appointments");

    return { success: true };
  } catch (error) {
    console.error("Failed to dismiss conflict:", error);
    return { success: false, error: "Failed to dismiss conflict" };
  }
}

/**
 * Cancel appointment to resolve conflict
 *
 * This triggers the existing cancellation flow which:
 * 1. Cancels the appointment
 * 2. Processes refund if eligible
 * 3. Deletes calendar event
 * 4. Auto-resolves conflict alert (via V5)
 */
export async function cancelAppointmentFromConflict(
  appointmentId: string
): Promise<{
  success: boolean;
  refunded?: boolean;
  amount?: number;
  error?: string;
}> {
  try {
    const session = await requireAuth();
    const shop = await getShopByOwnerId(session.user.id);

    if (!shop) {
      return { success: false, error: "Shop not found" };
    }

    // Load appointment with manage token
    const { appointments, manageTokens, payments, policyVersions } = await import("@/lib/schema");
    const { db } = await import("@/lib/db");
    const { eq, and } = await import("drizzle-orm");

    const appointmentData = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, appointmentId),
        eq(appointments.shopId, shop.id)
      ),
      with: {
        payment: true,
        policyVersion: true,
      },
    });

    if (!appointmentData) {
      return { success: false, error: "Appointment not found" };
    }

    if (appointmentData.status !== "booked") {
      return { success: false, error: "Appointment is not booked" };
    }

    // Use existing cancellation logic
    const { processRefund } = await import("@/lib/stripe-refund");
    const { calculateCancellationEligibility } = await import("@/lib/cancellation");
    const { getBookingSettingsForShop } = await import("@/lib/queries/appointments");
    const { deleteCalendarEvent, autoResolveAlert } = await import("@/lib/google-calendar");
    const { invalidateCalendarCache } = await import("@/lib/google-calendar-cache");
    const { formatDateInTimeZone } = await import("@/lib/booking");
    const { createSlotOpeningFromCancellation } = await import("@/lib/slot-recovery");

    const settings = await getBookingSettingsForShop(shop.id);
    const timezone = settings?.timezone ?? "UTC";

    const eligibility = calculateCancellationEligibility(
      appointmentData.startsAt,
      appointmentData.policyVersion!.cancelCutoffMinutes,
      timezone,
      appointmentData.payment?.status ?? null,
      appointmentData.status,
      appointmentData.policyVersion!.refundBeforeCutoff
    );

    let refunded = false;
    let amount = 0;

    // Cancel with refund if eligible
    if (eligibility.isEligibleForRefund && appointmentData.payment) {
      const refundResult = await processRefund({
        appointment: appointmentData,
        payment: appointmentData.payment,
        cutoffTime: eligibility.cutoffTime,
      });

      refunded = true;
      amount = appointmentData.payment.amountCents / 100;
    } else {
      // Cancel without refund
      const now = new Date();

      await db
        .update(appointments)
        .set({
          status: "cancelled",
          financialOutcome: "settled",
          resolvedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(appointments.id, appointmentId),
            eq(appointments.status, "booked")
          )
        );
    }

    // Delete calendar event if exists
    if (appointmentData.calendarEventId) {
      const deleted = await deleteCalendarEvent({
        shopId: shop.id,
        calendarEventId: appointmentData.calendarEventId,
      });

      if (deleted) {
        // Auto-resolve conflict alert
        await autoResolveAlert(shop.id, appointmentData.calendarEventId);

        // Invalidate calendar cache
        const dateStr = formatDateInTimeZone(appointmentData.startsAt, timezone);
        await invalidateCalendarCache(shop.id, dateStr);
      }
    }

    // Create slot opening for recovery
    await createSlotOpeningFromCancellation(appointmentData, appointmentData.payment);

    // Revalidate pages
    revalidatePath("/app/conflicts");
    revalidatePath("/app/appointments");

    return { success: true, refunded, amount };
  } catch (error) {
    console.error("Failed to cancel appointment from conflict:", error);
    return { success: false, error: "Failed to cancel appointment" };
  }
}
```

**Key Design Decisions:**
- **Reuse cancellation logic:** Don't duplicate V5 code
- **Atomic operations:** Transaction for database updates
- **Revalidation:** Update both conflicts and appointments pages
- **Security:** Always verify shop ownership

---

### Step 3: Conflicts Page UI

**File:** `src/app/app/conflicts/page.tsx` (new file)

**Purpose:** Conflicts dashboard page

```typescript
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { getConflicts } from "@/lib/queries/calendar-conflicts";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { requireAuth } from "@/lib/session";
import { ConflictRow } from "@/components/conflicts/conflict-row";
import { SeverityBadge } from "@/components/conflicts/severity-badge";

export default async function ConflictsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Calendar Conflicts</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to manage calendar conflicts.
        </p>
      </div>
    );
  }

  const [conflicts, settings] = await Promise.all([
    getConflicts(shop.id),
    getBookingSettingsForShop(shop.id),
  ]);

  const timezone = settings?.timezone ?? "UTC";

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <header className="space-y-4">
        <Link
          href="/app/appointments"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Appointments
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Calendar Conflicts</h1>
          <p className="text-sm text-muted-foreground">
            Resolve conflicts between booked appointments and your Google Calendar events.
          </p>
        </div>
      </header>

      {conflicts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No conflicts found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your appointments don't conflict with any calendar events.
          </p>
          <Link
            href="/app/appointments"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Appointments
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900">
                  {conflicts.length} {conflicts.length === 1 ? "conflict" : "conflicts"} detected
                </p>
                <p className="text-sm text-amber-700">
                  These appointments overlap with events in your Google Calendar. You can keep the
                  appointment (dismiss alert) or cancel it to free up your calendar.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Appointment
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Calendar Event
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Severity
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Detected
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((conflict) => (
                  <ConflictRow
                    key={conflict.id}
                    conflict={conflict}
                    formatter={formatter}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
```

---

### Step 4: Conflict Row Component

**File:** `src/components/conflicts/conflict-row.tsx` (new file)

**Purpose:** Interactive table row with actions

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SeverityBadge } from "./severity-badge";
import { dismissConflictAction, cancelAppointmentFromConflict } from "@/app/app/conflicts/actions";
import type { ConflictWithDetails } from "@/lib/queries/calendar-conflicts";

type ConflictRowProps = {
  conflict: ConflictWithDetails;
  formatter: Intl.DateTimeFormat;
};

export function ConflictRow({ conflict, formatter }: ConflictRowProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleDismiss = async () => {
    setIsProcessing(true);

    try {
      const result = await dismissConflictAction(conflict.id);

      if (result.success) {
        toast.success("Conflict dismissed");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to dismiss conflict");
      }
    } catch (error) {
      toast.error("Failed to dismiss conflict");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelConfirm = async () => {
    setIsProcessing(true);

    try {
      const result = await cancelAppointmentFromConflict(conflict.appointmentId);

      if (result.success) {
        if (result.refunded) {
          toast.success(
            `Appointment cancelled. Refunded $${result.amount?.toFixed(2) ?? "0.00"}`
          );
        } else {
          toast.success("Appointment cancelled");
        }
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to cancel appointment");
      }
    } catch (error) {
      toast.error("Failed to cancel appointment");
    } finally {
      setIsProcessing(false);
      setShowCancelDialog(false);
    }
  };

  return (
    <>
      <tr className="border-t">
        <td className="px-4 py-3">
          <div className="font-medium">
            {formatter.format(conflict.appointmentStartsAt)}
          </div>
          <div className="text-xs text-muted-foreground">
            Until {formatter.format(conflict.appointmentEndsAt)}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium">{conflict.customerName}</div>
          <div className="text-xs text-muted-foreground">
            {conflict.customerEmail ?? conflict.customerPhone}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium">
            {conflict.eventSummary || "Untitled Event"}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatter.format(conflict.eventStart)} -{" "}
            {formatter.format(conflict.eventEnd)}
          </div>
        </td>
        <td className="px-4 py-3">
          <SeverityBadge severity={conflict.severity} />
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {formatter.format(conflict.detectedAt)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              disabled={isProcessing}
              className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              Keep Appointment
            </button>
            <button
              onClick={() => setShowCancelDialog(true)}
              disabled={isProcessing}
              className="rounded-md border border-destructive bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
            >
              Cancel Appointment
            </button>
          </div>
        </td>
      </tr>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <tr>
          <td colSpan={6} className="border-t bg-muted/30 px-4 py-4">
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Are you sure you want to cancel this appointment?
              </p>
              <p className="text-sm text-muted-foreground">
                This will cancel the appointment, delete the calendar event, and resolve the
                conflict. The customer will be notified.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelConfirm}
                  disabled={isProcessing}
                  className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                >
                  {isProcessing ? "Cancelling..." : "Yes, Cancel Appointment"}
                </button>
                <button
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isProcessing}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  No, Keep It
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
```

---

### Step 5: Severity Badge Component

**File:** `src/components/conflicts/severity-badge.tsx` (new file)

**Purpose:** Visual severity indicators

```typescript
import { AlertCircle, AlertTriangle, Info, Calendar } from "lucide-react";

type SeverityBadgeProps = {
  severity: "full" | "high" | "partial" | "all_day";
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = {
    full: {
      label: "Full Conflict",
      color: "bg-red-100 text-red-800 border-red-200",
      icon: AlertCircle,
    },
    high: {
      label: "High Conflict",
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: AlertTriangle,
    },
    partial: {
      label: "Partial Conflict",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Info,
    },
    all_day: {
      label: "All-Day Event",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: Calendar,
    },
  };

  const { label, color, icon: Icon } = config[severity];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${color}`}
      role="status"
      aria-label={`Conflict severity: ${label}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
```

---

### Step 6: Alert Banner Component

**File:** `src/components/conflicts/conflict-alert-banner.tsx` (new file)

**Purpose:** Banner on appointments page

```typescript
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

type ConflictAlertBannerProps = {
  conflictCount: number;
  shopId: string;
};

const DISMISSED_CONFLICT_BANNER_KEY = "dismissedConflictBanner";

const readDismissedShops = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DISMISSED_CONFLICT_BANNER_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
};

const writeDismissedShops = (shopIds: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DISMISSED_CONFLICT_BANNER_KEY, JSON.stringify(shopIds));
};

export function ConflictAlertBanner({ conflictCount, shopId }: ConflictAlertBannerProps) {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [dismissedShopIds, setDismissedShopIds] = useState<string[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDismissedShopIds(readDismissedShops());
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const visible =
    hasHydrated &&
    conflictCount > 0 &&
    !dismissedShopIds.includes(shopId);

  const handleDismiss = () => {
    if (dismissedShopIds.includes(shopId)) {
      return;
    }

    const nextDismissedShopIds = [...dismissedShopIds, shopId];
    setDismissedShopIds(nextDismissedShopIds);
    writeDismissedShops(nextDismissedShopIds);
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-amber-900">
            {conflictCount} {conflictCount === 1 ? "appointment conflicts" : "appointments conflict"}{" "}
            with your Google Calendar
          </p>
          <Link
            href="/app/conflicts"
            className="text-sm font-medium text-amber-700 underline-offset-4 hover:underline"
          >
            View conflicts →
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 text-amber-600 transition-colors duration-200 hover:text-amber-900"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
```

---

### Step 7: Update Appointments Page

**File:** `src/app/app/appointments/page.tsx` (update)

**Purpose:** Add conflict alert banner

```typescript
// Add import at top
import { ConflictAlertBanner } from "@/components/conflicts/conflict-alert-banner";
import { getConflictCount } from "@/lib/queries/calendar-conflicts";

// ... existing imports ...

export default async function AppointmentsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Appointments</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to start receiving bookings.
        </p>
      </div>
    );
  }

  // Add conflict count to parallel queries
  const [settings, appointments, outcomeSummary, slotOpenings, conflictCount] = await Promise.all([
    getBookingSettingsForShop(shop.id),
    listAppointmentsForShop(shop.id),
    getOutcomeSummaryForShop(shop.id),
    listSlotOpeningsForShop(shop.id),
    getConflictCount(shop.id), // V7: Load conflict count
  ]);

  const timezone = settings?.timezone ?? "UTC";

  // ... existing formatter code ...

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Recent and upcoming appointments for {shop.name}.
          </p>
        </div>
        <ReconcilePaymentsButton />
      </header>

      {/* V7: Conflict Alert Banner */}
      <ConflictAlertBanner conflictCount={conflictCount} shopId={shop.id} />

      {/* ... rest of existing code (outcome summary, appointments table, slot recovery) ... */}
    </div>
  );
}
```

---

## Testing Plan

### Unit Tests

**File:** `src/lib/queries/__tests__/calendar-conflicts.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getConflictCount,
  getConflicts,
  dismissAlert,
} from "@/lib/queries/calendar-conflicts";
import { db } from "@/lib/db";
import {
  shops,
  bookingSettings,
  appointments,
  customers,
  policyVersions,
  calendarConflictAlerts,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { addDays } from "date-fns";

describe("Calendar Conflict Queries", () => {
  let testShopId: string;
  let testAlertId: string;

  beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "Conflict Query Test",
        slug: "conflict-query-test",
        currency: "USD",
        ownerId: "owner-test",
        status: "active",
      })
      .returning();

    testShopId = shop.id;

    // Create customer
    const [customer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Test Customer",
        phone: "+15551234567",
        email: "test@test.com",
      })
      .returning();

    // Create policy version
    const [policy] = await db
      .insert(policyVersions)
      .values({
        shopId: testShopId,
        currency: "USD",
        paymentMode: "deposit",
        depositAmountCents: 2000,
      })
      .returning();

    // Create future appointment
    const tomorrow = addDays(new Date(), 1);
    const [appointment] = await db
      .insert(appointments)
      .values({
        shopId: testShopId,
        customerId: customer.id,
        startsAt: tomorrow,
        endsAt: addDays(tomorrow, 0, 1), // +1 hour
        status: "booked",
        policyVersionId: policy.id,
        paymentRequired: false,
      })
      .returning();

    // Create conflict alert
    const [alert] = await db
      .insert(calendarConflictAlerts)
      .values({
        shopId: testShopId,
        appointmentId: appointment.id,
        calendarEventId: "event-123",
        eventSummary: "Team Meeting",
        eventStart: tomorrow,
        eventEnd: addDays(tomorrow, 0, 1),
        severity: "full",
        status: "pending",
      })
      .returning();

    testAlertId = alert.id;
  });

  afterEach(async () => {
    await db.delete(calendarConflictAlerts).where(eq(calendarConflictAlerts.shopId, testShopId));
    await db.delete(appointments).where(eq(appointments.shopId, testShopId));
    await db.delete(customers).where(eq(customers.shopId, testShopId));
    await db.delete(policyVersions).where(eq(policyVersions.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  describe("getConflictCount", () => {
    it("should return count of pending alerts", async () => {
      const count = await getConflictCount(testShopId);
      expect(count).toBe(1);
    });

    it("should return 0 when no pending alerts", async () => {
      // Dismiss the alert
      await dismissAlert(testAlertId, testShopId);

      const count = await getConflictCount(testShopId);
      expect(count).toBe(0);
    });
  });

  describe("getConflicts", () => {
    it("should return conflicts with appointment and customer details", async () => {
      const conflicts = await getConflicts(testShopId);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        id: testAlertId,
        customerName: "Test Customer",
        eventSummary: "Team Meeting",
        severity: "full",
      });
    });

    it("should not return dismissed alerts", async () => {
      await dismissAlert(testAlertId, testShopId);

      const conflicts = await getConflicts(testShopId);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe("dismissAlert", () => {
    it("should update alert status to dismissed", async () => {
      await dismissAlert(testAlertId, testShopId);

      const alert = await db.query.calendarConflictAlerts.findFirst({
        where: eq(calendarConflictAlerts.id, testAlertId),
      });

      expect(alert?.status).toBe("dismissed");
      expect(alert?.resolvedBy).toBe("user");
      expect(alert?.resolvedAt).toBeTruthy();
    });

    it("should only dismiss alerts for correct shop", async () => {
      // Try to dismiss with wrong shop ID
      await dismissAlert(testAlertId, "wrong-shop-id");

      const alert = await db.query.calendarConflictAlerts.findFirst({
        where: eq(calendarConflictAlerts.id, testAlertId),
      });

      expect(alert?.status).toBe("pending"); // Still pending
    });
  });
});
```

---

### Playwright E2E Tests

**File:** `tests/e2e/conflicts-dashboard.spec.ts` (new file)

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import {
  shops,
  bookingSettings,
  appointments,
  customers,
  policyVersions,
  calendarConflictAlerts,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { addDays } from "date-fns";

test.describe("Conflicts Dashboard", () => {
  let testShopId: string;
  let testAlertId: string;

  test.beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "E2E Conflicts Test",
        slug: "e2e-conflicts-test",
        currency: "USD",
        ownerId: "owner-e2e",
        status: "active",
      })
      .returning();

    testShopId = shop.id;

    // Create booking settings
    await db.insert(bookingSettings).values({
      shopId: testShopId,
      timezone: "America/New_York",
      slotMinutes: 60,
    });

    // Create customer
    const [customer] = await db
      .insert(customers)
      .values({
        shopId: testShopId,
        fullName: "Conflict Customer",
        phone: "+15559999999",
        email: "conflict@test.com",
      })
      .returning();

    // Create policy
    const [policy] = await db
      .insert(policyVersions)
      .values({
        shopId: testShopId,
        currency: "USD",
        paymentMode: "deposit",
        depositAmountCents: 2000,
      })
      .returning();

    // Create appointment
    const tomorrow = addDays(new Date(), 1);
    const [appointment] = await db
      .insert(appointments)
      .values({
        shopId: testShopId,
        customerId: customer.id,
        startsAt: tomorrow,
        endsAt: addDays(tomorrow, 0, 1),
        status: "booked",
        policyVersionId: policy.id,
        paymentRequired: false,
      })
      .returning();

    // Create conflict alert
    const [alert] = await db
      .insert(calendarConflictAlerts)
      .values({
        shopId: testShopId,
        appointmentId: appointment.id,
        calendarEventId: "event-e2e",
        eventSummary: "Important Meeting",
        eventStart: tomorrow,
        eventEnd: addDays(tomorrow, 0, 1),
        severity: "high",
        status: "pending",
      })
      .returning();

    testAlertId = alert.id;
  });

  test.afterEach(async () => {
    await db.delete(calendarConflictAlerts).where(eq(calendarConflictAlerts.shopId, testShopId));
    await db.delete(appointments).where(eq(appointments.shopId, testShopId));
    await db.delete(customers).where(eq(customers.shopId, testShopId));
    await db.delete(policyVersions).where(eq(policyVersions.shopId, testShopId));
    await db.delete(bookingSettings).where(eq(bookingSettings.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  test("should show conflict alert banner on appointments page", async ({ page }) => {
    await page.goto("/app/appointments");

    // Should see banner
    await expect(page.getByText(/1 appointment conflicts/)).toBeVisible();
    await expect(page.getByText("View conflicts →")).toBeVisible();
  });

  test("should navigate to conflicts page from banner", async ({ page }) => {
    await page.goto("/app/appointments");

    await page.click('text="View conflicts →"');

    await page.waitForURL("/app/conflicts");
    await expect(page.getByText("Calendar Conflicts")).toBeVisible();
  });

  test("should display conflicts in table", async ({ page }) => {
    await page.goto("/app/conflicts");

    // Should see conflict details
    await expect(page.getByText("Conflict Customer")).toBeVisible();
    await expect(page.getByText("Important Meeting")).toBeVisible();
    await expect(page.getByText("High Conflict")).toBeVisible();
  });

  test("should dismiss conflict with Keep Appointment button", async ({ page }) => {
    await page.goto("/app/conflicts");

    await page.click('button:has-text("Keep Appointment")');

    // Should show success toast
    await expect(page.getByText("Conflict dismissed")).toBeVisible();

    // Row should disappear
    await expect(page.getByText("Important Meeting")).not.toBeVisible();

    // Should show empty state
    await expect(page.getByText("No conflicts found")).toBeVisible();
  });

  test("should cancel appointment with confirmation", async ({ page }) => {
    await page.goto("/app/conflicts");

    // Click cancel button
    await page.click('button:has-text("Cancel Appointment")');

    // Should show confirmation dialog
    await expect(page.getByText("Are you sure you want to cancel")).toBeVisible();

    // Confirm cancellation
    await page.click('button:has-text("Yes, Cancel Appointment")');

    // Should show success toast
    await expect(page.getByText("Appointment cancelled")).toBeVisible();

    // Row should disappear
    await expect(page.getByText("Important Meeting")).not.toBeVisible();
  });

  test("should hide banner after dismissing all conflicts", async ({ page }) => {
    await page.goto("/app/appointments");

    // Banner visible
    await expect(page.getByText(/1 appointment conflicts/)).toBeVisible();

    // Navigate to conflicts and dismiss
    await page.click('text="View conflicts →"');
    await page.click('button:has-text("Keep Appointment")');

    // Return to appointments
    await page.goto("/app/appointments");

    // Banner should be gone
    await expect(page.getByText(/appointment conflicts/)).not.toBeVisible();
  });

  test("should show empty state when no conflicts", async ({ page }) => {
    // Delete all alerts first
    await db.delete(calendarConflictAlerts).where(eq(calendarConflictAlerts.shopId, testShopId));

    await page.goto("/app/conflicts");

    await expect(page.getByText("No conflicts found")).toBeVisible();
    await expect(page.getByText("Your appointments don't conflict")).toBeVisible();
  });
});
```

---

## Regression Prevention

### Critical Test Files to Monitor

```bash
# New tests - Conflicts
pnpm test src/lib/queries/__tests__/calendar-conflicts.test.ts
pnpm test:e2e tests/e2e/conflicts-dashboard.spec.ts

# Existing tests - Appointments page
pnpm test:e2e tests/e2e/manage-booking.spec.ts

# All tests
pnpm test
pnpm test:e2e
```

### Expected Behavior

- Existing appointments page tests pass
- Cancellation flow tests pass
- No changes to booking creation
- Calendar integration tests (V1-V6) unaffected

---

## Implementation Checklist

### Queries & Actions

- [ ] Create `src/lib/queries/calendar-conflicts.ts`
- [ ] Implement `getConflictCount()`
- [ ] Implement `getConflicts()`
- [ ] Implement `dismissAlert()`
- [ ] Create `src/app/app/conflicts/actions.ts`
- [ ] Implement `dismissConflictAction()`
- [ ] Implement `cancelAppointmentFromConflict()`

### UI Components

- [ ] Create `src/app/app/conflicts/page.tsx`
- [ ] Build conflicts table layout
- [ ] Add empty state
- [ ] Create `src/components/conflicts/conflict-row.tsx`
- [ ] Implement dismiss action UI
- [ ] Implement cancel action UI with confirmation
- [ ] Add loading states
- [ ] Create `src/components/conflicts/severity-badge.tsx`
- [ ] Implement badge variants
- [ ] Create `src/components/conflicts/conflict-alert-banner.tsx`
- [ ] Implement dismissible banner

### Integration

- [ ] Update `src/app/app/appointments/page.tsx`
- [ ] Add conflict count query
- [ ] Integrate alert banner
- [ ] Add Sonner toast provider (if not already present)

### Testing

- [ ] Create `src/lib/queries/__tests__/calendar-conflicts.test.ts`
- [ ] Write unit tests for queries
- [ ] Create `tests/e2e/conflicts-dashboard.spec.ts`
- [ ] Write E2E test for banner
- [ ] Write E2E test for navigation
- [ ] Write E2E test for dismiss action
- [ ] Write E2E test for cancel action
- [ ] Write E2E test for empty state
- [ ] Run all tests: `pnpm test && pnpm test:e2e`

### Code Quality

- [ ] Run `pnpm lint` and fix errors
- [ ] Run `pnpm typecheck` and fix errors
- [ ] Add accessibility attributes
- [ ] Review mobile responsiveness
- [ ] Add loading states

### Documentation

- [ ] Update README.md with conflicts dashboard
- [ ] Update CLAUDE.md with V7 notes
- [ ] Add inline comments to complex logic
- [ ] Document action flows

---

## Demo Script

### Preparation

1. Complete V1-V6
2. Create test appointments
3. Manually add conflicting calendar events
4. Run conflict scan cron job
5. Start dev server

### Demo Flow

1. **View Alert Banner**
   - Navigate to `/app/appointments`
   - See banner: "3 appointments conflict with your Google Calendar"
   - Click "View conflicts →"

2. **Conflicts Dashboard**
   - See table with 3 conflicts
   - Each row shows:
     - Appointment time and customer
     - Calendar event details
     - Severity badge (colored)
     - Action buttons

3. **Dismiss False Positive**
   - Click "Keep Appointment" on first conflict
   - See toast: "Conflict dismissed"
   - Row disappears from table
   - Alert status updated in database

4. **Cancel to Resolve**
   - Click "Cancel Appointment" on second conflict
   - See confirmation dialog
   - Click "Yes, Cancel Appointment"
   - See toast: "Appointment cancelled. Refunded $20.00"
   - Row disappears
   - Calendar event deleted
   - Slot opening created

5. **Empty State**
   - Dismiss last conflict
   - See empty state: "No conflicts found"
   - Navigate back to appointments
   - Banner is gone

---

## Success Criteria

V7 is complete when:

✅ Conflict alert banner shows on appointments page
✅ Banner shows correct conflict count
✅ "View conflicts →" navigates to conflicts page
✅ Conflicts table displays all pending alerts
✅ Severity badges color-coded correctly
✅ "Keep Appointment" dismisses alerts
✅ "Cancel Appointment" triggers cancellation flow
✅ Confirmation dialog prevents accidental cancellations
✅ Optimistic UI updates work smoothly
✅ Toast notifications inform user of actions
✅ Empty state displays when no conflicts
✅ Banner dismissible via localStorage
✅ All unit tests pass
✅ All E2E tests pass
✅ No regression in existing tests
✅ Code quality checks pass
✅ Accessible (keyboard, screen reader)
✅ Responsive design works

---

## Estimated Timeline

**Total: 2-3 days**

**Day 1:**
- Morning: Queries, server actions (4 hours)
- Afternoon: Conflicts page, table UI (4 hours)

**Day 2:**
- Morning: Severity badges, conflict row actions (4 hours)
- Afternoon: Alert banner, appointments page integration (4 hours)

**Day 3 (optional):**
- Testing, polish, documentation (4-8 hours)

**Buffer:** 1 day for UI polish and edge cases

---

## Known Limitations (V7)

1. **No Bulk Actions** - Dismiss/cancel one at a time (acceptable for MVP)
2. **No Filtering** - Show all pending conflicts (acceptable for most shops)
3. **No Pagination** - All conflicts in single page (add if needed)
4. **Client-Side Banner Dismiss** - Uses localStorage (acceptable)
5. **No Push Notifications** - Only in-app alerts (future enhancement)

---

## Next Steps After V7

**Google Calendar Integration Complete!**

V7 completes the full Google Calendar integration (V1-V7). Shop owners can now:
- Connect their Google Calendar (V1)
- Auto-create events on booking (V2)
- Block conflicting slots (V3)
- Prevent conflict bookings (V4)
- Delete events on cancel (V5)
- Detect conflicts automatically (V6)
- Manage conflicts via dashboard (V7)

**Future Enhancements:**
- Multi-calendar support
- Calendar sync preferences (sync types)
- Conflict auto-resolution rules
- Email/SMS notifications for conflicts
- Event modification detection
- Two-way sync (create appointments from calendar events)

---

## Rollback Plan

If V7 needs to be rolled back:

1. **Code Rollback:**
   - Remove `src/app/app/conflicts/` directory
   - Remove `src/components/conflicts/` directory
   - Remove `src/lib/queries/calendar-conflicts.ts`
   - Revert `src/app/app/appointments/page.tsx`

2. **Database:**
   - No database changes (uses V6 schema)

3. **Verify:**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:e2e
   ```

All V1-V6 functionality remains unchanged.
