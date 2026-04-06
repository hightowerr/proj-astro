# V3: Manual Confirmation System

Shop owner can manually send confirmation requests, customer can reply YES via SMS.

---

## What Gets Built

- Database schema changes (add confirmation columns to appointments table)
- Remind button that sends SMS reminder
- Confirm button that sends confirmation request SMS
- Cancel button that navigates to existing cancel flow
- Twilio inbound handler for processing YES replies
- Confirmation status badge updates (None → Pending → Confirmed)
- Toast notifications for all SMS actions

---

## Demo

After implementing this slice, you can:

1. Navigate to `/app/dashboard`
2. Click "Remind" on any appointment → SMS reminder sent
3. Click "Confirm" on high-risk appointment → Confirmation SMS sent
4. See confirmation status badge change to "Pending" (yellow)
5. Customer receives SMS: "Reply YES to confirm your appointment..."
6. Customer replies "YES" → Status badge changes to "Confirmed" (green)
7. Click "Cancel" → navigates to existing cancellation flow

---

## Implementation Steps

### Step 1: Create Database Migration

Create `drizzle/00XX_confirmation_system.sql`:

```sql
-- Add confirmation columns to appointments table
ALTER TABLE appointments
ADD COLUMN confirmation_status TEXT DEFAULT 'none' CHECK (confirmation_status IN ('none', 'pending', 'confirmed', 'expired')),
ADD COLUMN confirmation_sent_at TIMESTAMP,
ADD COLUMN confirmation_deadline TIMESTAMP;

-- Create index for cron job queries
CREATE INDEX idx_appointments_confirmation_pending ON appointments(confirmation_status, confirmation_deadline) WHERE confirmation_status = 'pending';
CREATE INDEX idx_appointments_confirmation_none ON appointments(shop_id, confirmation_status, starts_at) WHERE confirmation_status = 'none';
```

### Step 2: Update Schema

Modify `src/lib/schema.ts`:

```typescript
// Add to appointments table definition
export const appointments = pgTable("appointments", {
  // ... existing columns ...

  confirmationStatus: text("confirmation_status")
    .$type<"none" | "pending" | "confirmed" | "expired">()
    .default("none"),
  confirmationSentAt: timestamp("confirmation_sent_at"),
  confirmationDeadline: timestamp("confirmation_deadline"),
});
```

### Step 3: Run Migration

```bash
pnpm db:migrate
```

### Step 4: Create Confirmation Logic Library

Create `src/lib/confirmation.ts`:

```typescript
import { db } from "@/lib/db";
import { appointments, customers } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { sendSMS } from "@/lib/twilio";
import { generateManageToken } from "@/lib/manage-tokens";

/**
 * Send confirmation request SMS
 * Sets status to 'pending' and deadline to 24h from now
 */
export async function sendConfirmationRequest(appointmentId: string) {
  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
    with: {
      customer: true,
      shop: true,
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (appointment.status !== "booked") {
    throw new Error("Cannot send confirmation for non-booked appointment");
  }

  // Calculate deadline (24 hours from now)
  const now = new Date();
  const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Format appointment time
  const appointmentTime = new Date(appointment.startsAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Send SMS
  const message = `Reply YES to confirm your appointment at ${appointment.shop.name} on ${appointmentTime} or it will be cancelled.`;

  await sendSMS({
    to: appointment.customer.phone,
    body: message,
    // Store appointmentId in Twilio metadata for matching replies
    metadata: { appointmentId },
  });

  // Update appointment
  await db
    .update(appointments)
    .set({
      confirmationStatus: "pending",
      confirmationSentAt: now,
      confirmationDeadline: deadline,
    })
    .where(eq(appointments.id, appointmentId));

  return { success: true };
}

/**
 * Send reminder SMS
 */
export async function sendReminderSMS(appointmentId: string) {
  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
    with: {
      customer: true,
      shop: true,
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  if (appointment.status !== "booked") {
    throw new Error("Cannot send reminder for non-booked appointment");
  }

  // Generate manage token
  const { token } = await generateManageToken(appointmentId);
  const manageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/manage/${token}`;

  // Format appointment time
  const appointmentTime = new Date(appointment.startsAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Send SMS
  const message = `Reminder: You have an appointment at ${appointment.shop.name} on ${appointmentTime}. Manage your booking: ${manageUrl}`;

  await sendSMS({
    to: appointment.customer.phone,
    body: message,
  });

  return { success: true };
}

/**
 * Process confirmation reply (YES)
 * Called from Twilio inbound webhook
 */
export async function processConfirmationReply(phone: string, body: string, messageSid?: string) {
  // Check if body contains "YES" (case-insensitive)
  const isYes = /\byes\b/i.test(body.trim());

  if (!isYes) {
    return { matched: false };
  }

  // Find customer by phone
  const customer = await db.query.customers.findFirst({
    where: eq(customers.phone, phone),
  });

  if (!customer) {
    return { matched: false };
  }

  // Find pending confirmation appointments for this customer
  const pendingAppointments = await db.query.appointments.findMany({
    where: and(
      eq(appointments.customerId, customer.id),
      eq(appointments.confirmationStatus, "pending")
    ),
    orderBy: (appointments, { asc }) => [asc(appointments.startsAt)],
  });

  if (pendingAppointments.length === 0) {
    return { matched: false };
  }

  // If messageSid provided, try to match via Twilio metadata (more reliable)
  // For V3, we'll use simple matching by closest appointment
  // V4 will implement metadata matching with proper Twilio integration

  // Confirm the closest pending appointment
  const appointmentToConfirm = pendingAppointments[0];

  await db
    .update(appointments)
    .set({
      confirmationStatus: "confirmed",
    })
    .where(eq(appointments.id, appointmentToConfirm.id));

  // Send confirmation message
  await sendSMS({
    to: phone,
    body: "Thanks! Your appointment is confirmed.",
  });

  return { matched: true, appointmentId: appointmentToConfirm.id };
}
```

### Step 5: Update Twilio Library

Modify `src/lib/twilio.ts` to support metadata:

```typescript
// Add metadata parameter to sendSMS
export async function sendSMS({
  to,
  body,
  metadata,
}: {
  to: string;
  body: string;
  metadata?: Record<string, string>;
}) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    throw new Error("Twilio credentials not configured");
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const messageOptions: any = {
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  };

  // Add status callback URL if metadata provided (for tracking)
  if (metadata) {
    messageOptions.statusCallback = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`;
    // Twilio doesn't directly support custom metadata, but we can store in status callback URL params
    const metadataStr = new URLSearchParams(metadata).toString();
    messageOptions.statusCallback += `?${metadataStr}`;
  }

  const message = await client.messages.create(messageOptions);

  return message.sid;
}
```

### Step 6: Create Reminder SMS Route

Create `/app/api/appointments/[id]/remind/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { shops, appointments } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { sendReminderSMS } from "@/lib/confirmation";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify shop ownership
    const shop = await db.query.shops.findFirst({
      where: eq(shops.userId, session.user.id),
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Verify appointment belongs to shop
    const appointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, params.id),
        eq(appointments.shopId, shop.id)
      ),
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Send reminder
    await sendReminderSMS(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending reminder:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}
```

### Step 7: Create Confirmation Request Route

Create `/app/api/appointments/[id]/confirm/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { shops, appointments } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { sendConfirmationRequest } from "@/lib/confirmation";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify shop ownership
    const shop = await db.query.shops.findFirst({
      where: eq(shops.userId, session.user.id),
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Verify appointment belongs to shop
    const appointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.id, params.id),
        eq(appointments.shopId, shop.id)
      ),
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Send confirmation request
    await sendConfirmationRequest(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending confirmation:", error);
    return NextResponse.json(
      { error: "Failed to send confirmation" },
      { status: 500 }
    );
  }
}
```

### Step 8: Update Twilio Inbound Handler

Modify `/app/api/twilio/inbound/route.ts`:

```typescript
import { processConfirmationReply } from "@/lib/confirmation";

// Add to existing inbound handler
export async function POST(request: NextRequest) {
  // ... existing Twilio signature verification ...

  const formData = await request.formData();
  const from = formData.get("From") as string;
  const body = formData.get("Body") as string;
  const messageSid = formData.get("MessageSid") as string;

  // Try to process as confirmation reply first
  const confirmationResult = await processConfirmationReply(from, body, messageSid);

  if (confirmationResult.matched) {
    // Confirmation processed successfully
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        headers: { "Content-Type": "application/xml" },
      }
    );
  }

  // ... existing inbound logic (fallback) ...
}
```

### Step 9: Update Action Buttons Component

Modify `src/components/dashboard/action-buttons.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Phone, Mail, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { ContactPopover } from "./contact-popover";
import { toast } from "sonner";

type ActionButtonsProps = {
  appointmentId: string;
  customerPhone: string;
  customerEmail: string;
  confirmationStatus: "none" | "pending" | "confirmed" | "expired";
  onStatusUpdate?: () => void;
};

export function ActionButtons({
  appointmentId,
  customerPhone,
  customerEmail,
  confirmationStatus,
  onStatusUpdate,
}: ActionButtonsProps) {
  const router = useRouter();
  const [showContact, setShowContact] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleView = () => {
    router.push(`/app/appointments/${appointmentId}`);
  };

  const handleRemind = async () => {
    setLoading("remind");
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/remind`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to send reminder");
      }

      toast.success("Reminder sent!");
    } catch (error) {
      toast.error("Failed to send reminder");
    } finally {
      setLoading(null);
    }
  };

  const handleConfirm = async () => {
    setLoading("confirm");
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/confirm`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to send confirmation");
      }

      toast.success("Confirmation request sent!");
      onStatusUpdate?.();
    } catch (error) {
      toast.error("Failed to send confirmation");
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = () => {
    router.push(`/api/manage/${appointmentId}/cancel`); // Will need manage token
    // TODO: Update to use proper manage token URL
  };

  return (
    <div className="flex items-center gap-2">
      {/* View Button */}
      <button
        onClick={handleView}
        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
      >
        <Eye className="w-4 h-4" />
        View
      </button>

      {/* Contact Button */}
      <div className="relative">
        <button
          onClick={() => setShowContact(!showContact)}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
        >
          <Phone className="w-4 h-4" />
          Contact
        </button>

        {showContact && (
          <ContactPopover
            phone={customerPhone}
            email={customerEmail}
            onClose={() => setShowContact(false)}
          />
        )}
      </div>

      {/* Remind Button */}
      <button
        onClick={handleRemind}
        disabled={loading === "remind"}
        className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 flex items-center gap-1 disabled:opacity-50"
      >
        <MessageSquare className="w-4 h-4" />
        {loading === "remind" ? "Sending..." : "Remind"}
      </button>

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        disabled={loading === "confirm" || confirmationStatus === "confirmed"}
        className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 flex items-center gap-1 disabled:opacity-50"
      >
        <CheckCircle className="w-4 h-4" />
        {loading === "confirm" ? "Sending..." : "Confirm"}
      </button>

      {/* Cancel Button */}
      <button
        onClick={handleCancel}
        className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 flex items-center gap-1"
      >
        <XCircle className="w-4 h-4" />
        Cancel
      </button>
    </div>
  );
}
```

### Step 10: Update Confirmation Status Badge

Modify `src/components/dashboard/attention-required-table.tsx` and `all-appointments-table.tsx`:

```typescript
const getConfirmationBadge = (status: string) => {
  if (status === "confirmed") {
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
        Confirmed
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
        Expired
      </span>
    );
  }
  return (
    <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-600">
      None
    </span>
  );
};
```

### Step 11: Update Dashboard Queries

Modify `src/lib/queries/dashboard.ts` to fetch real confirmationStatus:

```typescript
// Replace sql<string>`'none'` with actual column
confirmationStatus: appointments.confirmationStatus,
```

### Step 12: Run Lint and Typecheck

```bash
pnpm lint
pnpm typecheck
```

---

## Testing

### Unit Tests

Create `src/lib/__tests__/confirmation.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { sendConfirmationRequest, sendReminderSMS, processConfirmationReply } from "../confirmation";
import { appointments, customers, shops } from "@/lib/schema";

vi.mock("@/lib/twilio", () => ({
  sendSMS: vi.fn(() => Promise.resolve("mock-sid")),
}));

describe("Confirmation System", () => {
  let testAppointmentId: string;
  let testCustomerPhone: string;

  beforeEach(async () => {
    // Setup test data
    // ... create shop, customer, appointment
  });

  it("should send confirmation request and set status to pending", async () => {
    await sendConfirmationRequest(testAppointmentId);

    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, testAppointmentId),
    });

    expect(appointment?.confirmationStatus).toBe("pending");
    expect(appointment?.confirmationSentAt).toBeTruthy();
    expect(appointment?.confirmationDeadline).toBeTruthy();
  });

  it("should process YES reply and confirm appointment", async () => {
    // Set appointment to pending
    await sendConfirmationRequest(testAppointmentId);

    // Process YES reply
    const result = await processConfirmationReply(testCustomerPhone, "YES");

    expect(result.matched).toBe(true);

    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, testAppointmentId),
    });

    expect(appointment?.confirmationStatus).toBe("confirmed");
  });

  it("should not match non-YES replies", async () => {
    await sendConfirmationRequest(testAppointmentId);

    const result = await processConfirmationReply(testCustomerPhone, "MAYBE");

    expect(result.matched).toBe(false);
  });
});
```

### E2E Tests

Create `tests/e2e/confirmation-system.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { appointments } from "@/lib/schema";

test.describe("Manual Confirmation System", () => {
  test("should send confirmation request", async ({ page }) => {
    // Login and navigate to dashboard
    await page.goto("/app/dashboard");

    // Click Confirm button on first high-risk appointment
    await page.click("button:has-text('Confirm'):first");

    // Toast should appear
    await expect(page.getByText("Confirmation request sent!")).toBeVisible();

    // Status badge should update to Pending
    await expect(page.locator(".bg-yellow-100").first()).toBeVisible();
  });

  test("should send reminder SMS", async ({ page }) => {
    await page.goto("/app/dashboard");

    await page.click("button:has-text('Remind'):first");

    await expect(page.getByText("Reminder sent!")).toBeVisible();
  });

  // More E2E tests for full confirmation flow...
});
```

---

## Acceptance Criteria

- [ ] Database migration adds confirmation columns
- [ ] Remind button sends SMS with appointment details and manage link
- [ ] Confirm button sends SMS requesting YES reply
- [ ] Confirmation status updates to "pending" after sending
- [ ] Customer can reply "YES" (case-insensitive) to confirm
- [ ] Status updates to "confirmed" after YES reply
- [ ] Confirmation SMS includes cancellation warning
- [ ] Toast notifications appear for all actions
- [ ] Cancel button navigates to existing cancel flow
- [ ] Twilio inbound handler processes YES replies correctly
- [ ] Phone number matching works for customers with multiple pending confirmations
- [ ] Lint and typecheck pass
- [ ] Unit tests pass
- [ ] E2E tests pass

---

## Next Steps

After completing V3, move to V4 to add Automatic Confirmation System (cron jobs for auto-sending and auto-cancellation).
