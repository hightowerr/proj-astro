# Email Reminders V1: Send Test Email

**Slice:** V1 of 6
**Status:** ⏳ PENDING
**Goal:** Prove email infrastructure works end-to-end

---

## Overview

This slice establishes the foundational email sending capability. We'll integrate Resend SDK, create a basic `sendEmail()` function, and verify emails can be delivered successfully. This is the minimal viable email infrastructure that all subsequent slices will build upon.

**What this slice does:**
- Installs Resend npm package
- Adds email environment variables
- Creates `src/lib/email.ts` with `sendEmail()` function
- Creates test endpoint at `/api/test-email` for manual verification
- Proves email delivery works before building automation

**What this slice does NOT do:**
- Template system integration (V2)
- Database queries (V4)
- Cron automation (V5)
- User opt-in/opt-out (V3, V6)

---

## Files to Create/Modify

### New Files

1. **`src/lib/email.ts`** - Email service module
2. **`src/app/api/test-email/route.ts`** - Test endpoint (temporary)
3. **`src/lib/__tests__/email.test.ts`** - Unit tests

### Modified Files

1. **`package.json`** - Add resend dependency
2. **`src/lib/env.ts`** - Add email env vars validation
3. **`env.example`** - Document new env vars
4. **`.env`** - Add actual env var values (local only, not committed)

---

## Implementation Steps

### Step 1: Install Resend SDK

```bash
pnpm add resend
```

**Verification:**
```bash
grep "resend" package.json
# Should show: "resend": "^x.x.x"
```

---

### Step 2: Add Environment Variables

**2a. Update `env.example`:**

```bash
# Email service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM_ADDRESS=reminders@yourdomain.com
```

**2b. Update `src/lib/env.ts`:**

Add to the `envSchema` object:

```typescript
// Email service (Resend)
RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
EMAIL_FROM_ADDRESS: z.string().email("EMAIL_FROM_ADDRESS must be a valid email"),
```

**2c. Update your local `.env`:**

```bash
# Get API key from https://resend.com/api-keys after signing up
RESEND_API_KEY=re_your_actual_key_here
EMAIL_FROM_ADDRESS=reminders@yourdomain.com
```

**Note:** For testing, Resend allows sending to your own email address without domain verification. For production, you'll need to verify your domain.

**Verification:**
```bash
pnpm run typecheck
# Should pass without env validation errors
```

---

### Step 3: Create Email Service Module

**Create `src/lib/email.ts`:**

```typescript
import { Resend } from "resend";
import { env } from "./env";

const resend = new Resend(env.RESEND_API_KEY);

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend
 *
 * @param params - Email parameters (to, subject, html)
 * @returns Result with success status and messageId or error
 *
 * @example
 * const result = await sendEmail({
 *   to: "customer@example.com",
 *   subject: "Appointment Reminder",
 *   html: "<p>Your appointment is tomorrow at 2pm</p>"
 * });
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM_ADDRESS,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[sendEmail] Resend API error:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    if (!data) {
      console.error("[sendEmail] No data returned from Resend");
      return {
        success: false,
        error: "No response data from email service",
      };
    }

    console.log("[sendEmail] Email sent successfully:", data.id);
    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sendEmail] Exception:", error);
    return {
      success: false,
      error: message,
    };
  }
}
```

**Key design decisions:**
- Returns structured result object (not throwing errors) for easier error handling
- Logs all operations for debugging
- Follows pattern from `src/lib/twilio.ts` (similar error handling)
- Uses env vars via centralized `env.ts` for validation

---

### Step 4: Create Test Endpoint

**Create `src/app/api/test-email/route.ts`:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

/**
 * Test endpoint for email sending
 *
 * Usage:
 *   GET /api/test-email?to=your@email.com
 *
 * This endpoint is temporary and should be removed after V1 testing is complete.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const toEmail = searchParams.get("to");

  if (!toEmail) {
    return NextResponse.json(
      { error: "Missing 'to' query parameter. Usage: /api/test-email?to=your@email.com" },
      { status: 400 }
    );
  }

  // Validate email format (basic check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(toEmail)) {
    return NextResponse.json(
      { error: "Invalid email address format" },
      { status: 400 }
    );
  }

  const result = await sendEmail({
    to: toEmail,
    subject: "Test Email from Booking System",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #333;">Email Infrastructure Test</h1>
          <p>This is a test email from your booking system.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
          <hr style="margin: 20px 0;" />
          <p style="color: #666; font-size: 14px;">
            If you received this email, your email infrastructure is working correctly!
          </p>
        </body>
      </html>
    `,
  });

  if (!result.success) {
    console.error("[test-email] Failed to send:", result.error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: result.error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Email sent successfully to ${toEmail}`,
    messageId: result.messageId,
  });
}
```

**Security note:** This endpoint is for testing only and should be removed or protected before production deployment.

---

### Step 5: Create Unit Tests

**Create `src/lib/__tests__/email.test.ts`:**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail } from "../email";
import { Resend } from "resend";

// Mock Resend
vi.mock("resend", () => {
  return {
    Resend: vi.fn(() => ({
      emails: {
        send: vi.fn(),
      },
    })),
  };
});

// Mock env
vi.mock("../env", () => ({
  env: {
    RESEND_API_KEY: "re_test_key",
    EMAIL_FROM_ADDRESS: "test@example.com",
  },
}));

describe("sendEmail", () => {
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    const ResendMock = Resend as unknown as ReturnType<typeof vi.fn>;
    const instance = new ResendMock();
    mockSend = instance.emails.send as ReturnType<typeof vi.fn>;
  });

  it("should send email successfully", async () => {
    mockSend.mockResolvedValue({
      data: { id: "msg_123" },
      error: null,
    });

    const result = await sendEmail({
      to: "customer@example.com",
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg_123");
    expect(mockSend).toHaveBeenCalledWith({
      from: "test@example.com",
      to: "customer@example.com",
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });
  });

  it("should handle Resend API errors", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key" },
    });

    const result = await sendEmail({
      to: "customer@example.com",
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid API key");
  });

  it("should handle missing data response", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await sendEmail({
      to: "customer@example.com",
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No response data from email service");
  });

  it("should handle exceptions", async () => {
    mockSend.mockRejectedValue(new Error("Network error"));

    const result = await sendEmail({
      to: "customer@example.com",
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network error");
  });

  it("should support multiple recipients", async () => {
    mockSend.mockResolvedValue({
      data: { id: "msg_456" },
      error: null,
    });

    const result = await sendEmail({
      to: ["customer1@example.com", "customer2@example.com"],
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith({
      from: "test@example.com",
      to: ["customer1@example.com", "customer2@example.com"],
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });
  });
});
```

**Run tests:**
```bash
pnpm test src/lib/__tests__/email.test.ts
```

All tests should pass ✅

---

## Testing Strategy

### 1. Unit Tests ✅

**What:** Test `sendEmail()` function with mocked Resend API
**How:** Run `pnpm test src/lib/__tests__/email.test.ts`
**Covers:**
- Successful email send
- API errors handling
- Missing data handling
- Exception handling
- Multiple recipients

**Success criteria:** All 5 tests pass

---

### 2. Environment Validation ✅

**What:** Verify environment variables are properly validated
**How:**
```bash
# Test with missing vars
unset RESEND_API_KEY
pnpm run typecheck
# Should fail with env validation error

# Test with invalid email
export EMAIL_FROM_ADDRESS="not-an-email"
pnpm run typecheck
# Should fail with email validation error
```

**Success criteria:** Env validation catches missing/invalid vars

---

### 3. Manual Integration Test ✅

**What:** Send real email via test endpoint
**How:** See Demo Script below
**Covers:**
- Real Resend API integration
- Email delivery
- Error handling with real API

**Success criteria:** Email arrives in inbox within 1 minute

---

### 4. Resend Dashboard Verification ✅

**What:** Verify email appears in Resend logs
**Where:** https://resend.com/emails
**Check:**
- Email status: "Delivered"
- Recipient matches test email
- Timestamp is recent
- No errors logged

**Success criteria:** Email shows as delivered in dashboard

---

## Demo Script

### Prerequisites

1. **Resend account setup:**
   ```bash
   # 1. Sign up at https://resend.com
   # 2. Get API key from https://resend.com/api-keys
   # 3. Copy API key to .env
   ```

2. **Environment configured:**
   ```bash
   # Verify env vars are set
   cat .env | grep -E "RESEND_API_KEY|EMAIL_FROM_ADDRESS"
   ```

3. **Dev server running:**
   ```bash
   pnpm dev
   # Wait for server to start on http://localhost:3000
   ```

---

### Demo Steps

**Step 1: Test email sending**

Open your browser or use curl:

```bash
# Replace with your actual email address
curl "http://localhost:3000/api/test-email?to=your.email@example.com"
```

**Expected response:**
```json
{
  "success": true,
  "message": "Email sent successfully to your.email@example.com",
  "messageId": "msg_abc123xyz"
}
```

**Step 2: Check your inbox**

- Open your email inbox
- Look for email with subject: "Test Email from Booking System"
- Email should arrive within 1 minute

**Expected email content:**
```
Subject: Test Email from Booking System

Email Infrastructure Test

This is a test email from your booking system.

Timestamp: 2026-03-17T15:30:00.000Z
Environment: development

────────────────────────────────────────

If you received this email, your email infrastructure is working correctly!
```

**Step 3: Verify in Resend dashboard**

1. Go to https://resend.com/emails
2. Find the email in the list (most recent)
3. Check status: should be "Delivered"
4. Click to view details

**Expected details:**
- **To:** your.email@example.com
- **From:** reminders@yourdomain.com
- **Status:** Delivered
- **Opens:** 0 or more (if you opened it)

**Step 4: Test error handling**

```bash
# Test with invalid email
curl "http://localhost:3000/api/test-email?to=not-an-email"

# Expected response:
{
  "error": "Invalid email address format"
}
```

```bash
# Test with missing parameter
curl "http://localhost:3000/api/test-email"

# Expected response:
{
  "error": "Missing 'to' query parameter. Usage: /api/test-email?to=your@email.com"
}
```

**Step 5: Check logs**

```bash
# In terminal where dev server is running, you should see:
[sendEmail] Email sent successfully: msg_abc123xyz
```

---

### Demo Success Criteria

✅ Email arrives in inbox within 1 minute
✅ Email content matches expected format
✅ Resend dashboard shows "Delivered" status
✅ Error handling works (invalid email, missing param)
✅ Server logs show successful send
✅ messageId is returned in response

---

## Troubleshooting

### Email not arriving

**Check 1: Resend API key**
```bash
# Verify API key is set and starts with "re_"
echo $RESEND_API_KEY
```

**Check 2: Resend dashboard**
- Check https://resend.com/emails for delivery status
- Look for errors like "Invalid API key" or "Domain not verified"

**Check 3: Spam folder**
- Check your spam/junk folder
- First emails from new domains often go to spam

**Check 4: Email address**
- For testing, Resend allows sending to any email without domain verification
- For production, you'll need to verify your domain

### Environment validation errors

**Error:** `RESEND_API_KEY is required`

**Fix:**
```bash
# Add to .env
echo "RESEND_API_KEY=re_your_key_here" >> .env
```

**Error:** `EMAIL_FROM_ADDRESS must be a valid email`

**Fix:**
```bash
# Use valid email format
echo "EMAIL_FROM_ADDRESS=reminders@yourdomain.com" >> .env
```

### TypeScript errors

**Error:** `Cannot find module 'resend'`

**Fix:**
```bash
pnpm add resend
pnpm run typecheck
```

---

## Cleanup After V1

After V1 is verified and you move to V2:

1. **Keep:** `src/lib/email.ts` - This is core infrastructure
2. **Keep:** Unit tests - Will be used throughout
3. **Remove:** `src/app/api/test-email/route.ts` - Temporary test endpoint
4. **Keep:** Environment variables - Needed for all slices

**Cleanup command:**
```bash
rm src/app/api/test-email/route.ts
git add -A
git commit -m "Remove temporary test-email endpoint after V1 verification"
```

---

## Success Criteria

V1 is complete when:

- ✅ Resend package installed (`pnpm add resend`)
- ✅ Environment variables configured and validated
- ✅ `src/lib/email.ts` created with `sendEmail()` function
- ✅ Unit tests pass (5/5)
- ✅ Test endpoint created and working
- ✅ Manual test: Email successfully delivered to inbox
- ✅ Resend dashboard shows delivered status
- ✅ Error handling tested and working
- ✅ `pnpm lint && pnpm typecheck` passes with no errors

---

## Next: V2

Once V1 is complete, proceed to V2: Schema + Template System

V2 will:
- Extend database schema to support email channel
- Add `emailOptIn` field to customer preferences
- Create email template in database
- Integrate template rendering with message system

The `sendEmail()` function from V1 will be used by V2's template rendering system.
