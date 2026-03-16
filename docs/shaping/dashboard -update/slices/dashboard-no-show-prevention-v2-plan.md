# V2: Action Buttons - View & Contact

Add navigation and contact info actions to appointment rows.

---

## What Gets Built

- View button that navigates to appointment detail page
- Contact button that opens a popover with phone and email
- Copy-to-clipboard functionality for phone and email
- Toast notifications for successful copies
- Action buttons added to both Attention Required and All Appointments tables

---

## Demo

After implementing this slice, you can:

1. Navigate to `/app/dashboard`
2. See action buttons on every appointment row
3. Click "View" → navigates to `/app/appointments/[id]`
4. Click "Contact" → popover appears with phone and email
5. Click copy icon next to phone → phone copied, toast shows "Phone copied!"
6. Click copy icon next to email → email copied, toast shows "Email copied!"
7. Click outside popover → popover closes

---

## Implementation Steps

### Step 1: Create Action Buttons Component

Create `src/components/dashboard/action-buttons.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Phone, Mail, Copy, Check } from "lucide-react";
import { ContactPopover } from "./contact-popover";

type ActionButtonsProps = {
  appointmentId: string;
  customerPhone: string;
  customerEmail: string;
};

export function ActionButtons({
  appointmentId,
  customerPhone,
  customerEmail,
}: ActionButtonsProps) {
  const router = useRouter();
  const [showContact, setShowContact] = useState(false);

  const handleView = () => {
    router.push(`/app/appointments/${appointmentId}`);
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

      {/* Placeholder for future buttons (V3 will add Remind, Confirm, Cancel) */}
    </div>
  );
}
```

### Step 2: Create Contact Popover Component

Create `src/components/dashboard/contact-popover.tsx`:

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

type ContactPopoverProps = {
  phone: string;
  email: string;
  onClose: () => void;
};

export function ContactPopover({ phone, email, onClose }: ContactPopoverProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      toast.success("Phone copied!");
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch (err) {
      toast.error("Failed to copy phone");
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(true);
      toast.success("Email copied!");
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (err) {
      toast.error("Failed to copy email");
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4"
    >
      <div className="space-y-3">
        {/* Phone */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Phone:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900">{phone}</span>
            <button
              onClick={handleCopyPhone}
              className="p-1 hover:bg-gray-100 rounded"
              title="Copy phone"
            >
              {copiedPhone ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Email:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900 truncate max-w-[180px]" title={email}>
              {email}
            </span>
            <button
              onClick={handleCopyEmail}
              className="p-1 hover:bg-gray-100 rounded"
              title="Copy email"
            >
              {copiedEmail ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Update Attention Required Table

Modify `src/components/dashboard/attention-required-table.tsx`:

```typescript
// Add import
import { ActionButtons } from "./action-buttons";

// ... existing code ...

// In the table body, replace the actions cell:
<td className="px-6 py-4 whitespace-nowrap text-sm">
  <ActionButtons
    appointmentId={appointment.id}
    customerPhone={appointment.customerPhone}
    customerEmail={appointment.customerEmail}
  />
</td>
```

### Step 4: Update All Appointments Table

Modify `src/components/dashboard/all-appointments-table.tsx`:

```typescript
// Add import
import { ActionButtons } from "./action-buttons";

// ... existing code ...

// In the table body, replace the actions cell:
<td className="px-6 py-4 whitespace-nowrap text-sm">
  <ActionButtons
    appointmentId={appointment.id}
    customerPhone={appointment.customerPhone}
    customerEmail={appointment.customerEmail}
  />
</td>
```

### Step 5: Install Sonner for Toast Notifications

```bash
pnpm add sonner
```

### Step 6: Add Toast Provider to Layout

Modify `src/app/layout.tsx` (or your app layout):

```typescript
import { Toaster } from "sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
```

### Step 7: Verify Appointment Detail Page Exists

Check that `/app/app/appointments/[id]/page.tsx` exists. If not, create a basic one:

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { appointments, customers, shops } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { format } from "date-fns";

export default async function AppointmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  // Get shop for this user
  const shop = await db.query.shops.findFirst({
    where: eq(shops.userId, session.user.id),
  });

  if (!shop) {
    redirect("/app/onboarding");
  }

  // Get appointment
  const appointment = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.id, params.id),
      eq(appointments.shopId, shop.id)
    ),
    with: {
      customer: true,
      payment: true,
    },
  });

  if (!appointment) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Appointment Details</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="text-sm font-medium">{appointment.customer.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Phone</dt>
              <dd className="text-sm font-medium">{appointment.customer.phone}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm font-medium">{appointment.customer.email || "—"}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Appointment Information</h2>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-gray-500">Service</dt>
              <dd className="text-sm font-medium">{appointment.serviceName}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Time</dt>
              <dd className="text-sm font-medium">
                {format(new Date(appointment.startsAt), "MMMM d, yyyy 'at' h:mm a")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Status</dt>
              <dd className="text-sm font-medium capitalize">{appointment.status}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
```

### Step 8: Run Lint and Typecheck

```bash
pnpm lint
pnpm typecheck
```

---

## Testing

### Component Tests

Create `src/components/dashboard/__tests__/action-buttons.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ActionButtons } from "../action-buttons";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("ActionButtons", () => {
  it("should render view and contact buttons", () => {
    render(
      <ActionButtons
        appointmentId="test-id"
        customerPhone="+15555551234"
        customerEmail="test@example.com"
      />
    );

    expect(screen.getByText("View")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  it("should show contact popover on click", () => {
    render(
      <ActionButtons
        appointmentId="test-id"
        customerPhone="+15555551234"
        customerEmail="test@example.com"
      />
    );

    fireEvent.click(screen.getByText("Contact"));
    expect(screen.getByText("Phone:")).toBeInTheDocument();
    expect(screen.getByText("+15555551234")).toBeInTheDocument();
  });
});
```

Create `src/components/dashboard/__tests__/contact-popover.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ContactPopover } from "../contact-popover";

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe("ContactPopover", () => {
  it("should display phone and email", () => {
    render(
      <ContactPopover
        phone="+15555551234"
        email="test@example.com"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("+15555551234")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("should copy phone to clipboard", async () => {
    render(
      <ContactPopover
        phone="+15555551234"
        email="test@example.com"
        onClose={vi.fn()}
      />
    );

    const copyButtons = screen.getAllByTitle(/copy/i);
    fireEvent.click(copyButtons[0]); // Click phone copy button

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("+15555551234");
    });
  });

  it("should copy email to clipboard", async () => {
    render(
      <ContactPopover
        phone="+15555551234"
        email="test@example.com"
        onClose={vi.fn()}
      />
    );

    const copyButtons = screen.getAllByTitle(/copy/i);
    fireEvent.click(copyButtons[1]); // Click email copy button

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test@example.com");
    });
  });

  it("should close on outside click", async () => {
    const onClose = vi.fn();
    render(
      <ContactPopover
        phone="+15555551234"
        email="test@example.com"
        onClose={onClose}
      />
    );

    // Click outside
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
```

### E2E Tests

Create `tests/e2e/dashboard-actions.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Dashboard Action Buttons", () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to dashboard
    await page.goto("/");
    // ... login flow
    await page.goto("/app/dashboard");
  });

  test("should navigate to appointment detail on View click", async ({ page }) => {
    // Wait for appointments to load
    await page.waitForSelector("button:has-text('View')");

    // Click first View button
    await page.click("button:has-text('View'):first");

    // Should navigate to appointment detail
    await expect(page).toHaveURL(/\/app\/appointments\/[a-z0-9-]+/);
    await expect(page.getByRole("heading", { name: "Appointment Details" })).toBeVisible();
  });

  test("should show contact popover on Contact click", async ({ page }) => {
    // Wait for appointments to load
    await page.waitForSelector("button:has-text('Contact')");

    // Click first Contact button
    await page.click("button:has-text('Contact'):first");

    // Popover should appear
    await expect(page.getByText("Phone:")).toBeVisible();
    await expect(page.getByText("Email:")).toBeVisible();
  });

  test("should copy phone to clipboard", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Click Contact button
    await page.click("button:has-text('Contact'):first");

    // Click phone copy button
    const phoneCopyButton = page.locator('button[title="Copy phone"]');
    await phoneCopyButton.click();

    // Toast should appear
    await expect(page.getByText("Phone copied!")).toBeVisible();

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/^\+1\d{10}$/); // Phone format
  });

  test("should close popover on outside click", async ({ page }) => {
    // Click Contact button
    await page.click("button:has-text('Contact'):first");

    // Popover should be visible
    await expect(page.getByText("Phone:")).toBeVisible();

    // Click outside (on page heading)
    await page.click("h1:has-text('Dashboard')");

    // Popover should close
    await expect(page.getByText("Phone:")).not.toBeVisible();
  });
});
```

---

## Acceptance Criteria

- [ ] View button navigates to `/app/appointments/[id]`
- [ ] Contact button opens popover with phone and email
- [ ] Copy phone button copies phone to clipboard
- [ ] Copy email button copies email to clipboard
- [ ] Toast notifications appear on successful copy
- [ ] Popover closes on outside click
- [ ] Action buttons appear in both Attention Required and All Appointments tables
- [ ] Appointment detail page exists and displays data
- [ ] Lint and typecheck pass
- [ ] Component tests pass
- [ ] E2E tests pass

---

## Next Steps

After completing V2, move to V3 to add Manual Confirmation System (Remind, Confirm, Cancel buttons + SMS functionality).
