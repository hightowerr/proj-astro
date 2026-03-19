# Email Reminders V2: Schema + Template System

**Slice:** V2 of 6
**Status:** ⏳ PENDING
**Goal:** Database supports email channel and templates render correctly

---

## Overview

This slice extends the database schema to support email as a messaging channel alongside SMS. We'll add the `emailOptIn` preference field, update the message channel enum, create an email template in the database, and verify templates render correctly with booking data.

**What this slice does:**
- Extends `messageChannelEnum` to include "email"
- Adds `emailOptIn` boolean field to `customerContactPrefs` table
- Generates and runs database migration
- Creates `appointment_reminder_24h_email` template
- Verifies template rendering works with real appointment data

**What this slice does NOT do:**
- Booking form UI (V3)
- Automated queries (V4)
- Cron job automation (V5)
- Actual email sending in production context (uses V1's sendEmail but in test)

**Dependencies:**
- ✅ V1 complete (email infrastructure working)

---

## Files to Create/Modify

### New Files

1. **`drizzle/NNNN_email_support.sql`** - Generated migration file
2. **`scripts/seed-email-template.ts`** - Template seeding script
3. **`src/lib/__tests__/email-template-rendering.test.ts`** - Template rendering tests

### Modified Files

1. **`src/lib/schema.ts`** - Update enums and tables
2. **`drizzle/meta/_journal.json`** - Updated by drizzle (auto)
3. **`drizzle/meta/NNNN_snapshot.json`** - Updated by drizzle (auto)

---

## Implementation Steps

### Step 1: Extend Schema for Email Support

**Modify `src/lib/schema.ts`:**

**1a. Update messageChannelEnum (around line 150):**

```typescript
// BEFORE:
export const messageChannelEnum = pgEnum("message_channel", ["sms"]);

// AFTER:
export const messageChannelEnum = pgEnum("message_channel", ["sms", "email"]);
```

**1b. Add emailOptIn to customerContactPrefs (around line 424-438):**

```typescript
// BEFORE:
export const customerContactPrefs = pgTable("customer_contact_prefs", {
  customerId: uuid("customer_id")
    .primaryKey()
    .references(() => customers.id, { onDelete: "cascade" }),
  smsOptIn: boolean("sms_opt_in").default(false).notNull(),
  preferredChannel: text("preferred_channel"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// AFTER:
export const customerContactPrefs = pgTable("customer_contact_prefs", {
  customerId: uuid("customer_id")
    .primaryKey()
    .references(() => customers.id, { onDelete: "cascade" }),
  smsOptIn: boolean("sms_opt_in").default(false).notNull(),
  emailOptIn: boolean("email_opt_in").default(true).notNull(), // NEW: Default true for email
  preferredChannel: text("preferred_channel"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
```

**Key design decision:** `emailOptIn` defaults to `true` (opt-out model), while `smsOptIn` defaults to `false` (opt-in model). This matches industry standards where email reminders are expected by default, but SMS requires explicit consent.

**Verification:**
```bash
pnpm run typecheck
# Should pass - no type errors from schema changes
```

---

### Step 2: Generate and Run Migration

**2a. Generate migration:**

```bash
pnpm db:generate
```

This creates a new migration file in `drizzle/` directory, something like:
- `drizzle/0021_email_support.sql`

**2b. Review generated migration:**

```bash
# Find the latest migration file
ls -lt drizzle/*.sql | head -n 1

# Review the SQL
cat drizzle/0021_email_support.sql
```

**Expected SQL content:**

```sql
-- Modify message_channel enum to add 'email'
ALTER TYPE "message_channel" ADD VALUE 'email';

-- Add emailOptIn column to customer_contact_prefs
ALTER TABLE "customer_contact_prefs" ADD COLUMN "email_opt_in" boolean DEFAULT true NOT NULL;
```

**Important:** PostgreSQL enums are tricky. If you get an error about enum modification, you may need to manually adjust the migration. The safest approach for enum changes is:

```sql
-- If ALTER TYPE fails, use this approach:
-- 1. Create new enum
CREATE TYPE "message_channel_new" AS ENUM('sms', 'email');

-- 2. Update columns to use new enum (example - adjust for your tables)
ALTER TABLE "message_log"
  ALTER COLUMN "channel" TYPE "message_channel_new"
  USING "channel"::text::"message_channel_new";

ALTER TABLE "message_templates"
  ALTER COLUMN "channel" TYPE "message_channel_new"
  USING "channel"::text::"message_channel_new";

-- 3. Drop old enum
DROP TYPE "message_channel";

-- 4. Rename new enum
ALTER TYPE "message_channel_new" RENAME TO "message_channel";

-- 5. Add emailOptIn column
ALTER TABLE "customer_contact_prefs" ADD COLUMN "email_opt_in" boolean DEFAULT true NOT NULL;
```

**2c. Run migration:**

```bash
pnpm db:migrate
```

**Expected output:**
```
Applying migrations...
✓ 0021_email_support.sql applied successfully
Migration complete!
```

**2d. Verify in database:**

```bash
pnpm db:studio
# Opens Drizzle Studio at http://localhost:4983
```

Navigate to:
- `customerContactPrefs` table → should see `email_opt_in` column
- Check enum values → `message_channel` should have both "sms" and "email"

**Verification:**
```bash
# Check schema is in sync
pnpm db:generate
# Should say "No schema changes detected"
```

---

### Step 3: Create Email Template Seeding Script

**Create `scripts/seed-email-template.ts`:**

```typescript
import { db } from "@/lib/db";
import { messageTemplates } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

/**
 * Seeds the appointment_reminder_24h_email template
 *
 * Run with: pnpm tsx scripts/seed-email-template.ts
 */
async function seedEmailTemplate() {
  console.log("🌱 Seeding email template...");

  const templateKey = "appointment_reminder_24h";
  const templateVersion = 1;
  const channel = "email";

  // Check if template already exists
  const existing = await db
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.key, templateKey),
        eq(messageTemplates.version, templateVersion),
        eq(messageTemplates.channel, channel)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    console.log("✓ Template already exists, skipping...");
    console.log("  Template ID:", existing[0].id);
    return;
  }

  // Insert email template
  const [template] = await db
    .insert(messageTemplates)
    .values({
      key: templateKey,
      version: templateVersion,
      channel: channel,
      subjectTemplate: "Reminder: Your appointment tomorrow at {{shopName}}",
      bodyTemplate: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin-top: 0;">Hi {{customerName}}! 👋</h1>

    <p style="font-size: 16px; color: #555;">
      This is a friendly reminder about your upcoming appointment.
    </p>

    <div style="background-color: white; border-left: 4px solid #3498db; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <h2 style="margin-top: 0; color: #2c3e50; font-size: 18px;">Appointment Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 100px;"><strong>Shop:</strong></td>
          <td style="padding: 8px 0; color: #333;">{{shopName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Date:</strong></td>
          <td style="padding: 8px 0; color: #333;">{{appointmentDate}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;"><strong>Time:</strong></td>
          <td style="padding: 8px 0; color: #333;">{{appointmentTime}}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 16px; color: #555; margin-top: 30px;">
      Need to reschedule or cancel? No problem!
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{bookingUrl}}"
         style="display: inline-block; background-color: #3498db; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
        Manage Your Booking
      </a>
    </div>
  </div>

  <div style="text-align: center; color: #999; font-size: 14px; padding: 20px 0; border-top: 1px solid #eee;">
    <p style="margin: 5px 0;">We look forward to seeing you!</p>
    <p style="margin: 5px 0;">
      <a href="{{bookingUrl}}" style="color: #3498db; text-decoration: none;">View booking details</a>
    </p>
  </div>
</body>
</html>
      `.trim(),
    })
    .returning();

  console.log("✅ Email template created successfully!");
  console.log("  Template ID:", template.id);
  console.log("  Key:", template.key);
  console.log("  Version:", template.version);
  console.log("  Channel:", template.channel);

  process.exit(0);
}

seedEmailTemplate().catch((error) => {
  console.error("❌ Failed to seed email template:", error);
  process.exit(1);
});
```

**Run the seed script:**

```bash
pnpm tsx scripts/seed-email-template.ts
```

**Expected output:**
```
🌱 Seeding email template...
✅ Email template created successfully!
  Template ID: [uuid]
  Key: appointment_reminder_24h
  Version: 1
  Channel: email
```

**Verify in database:**

```bash
pnpm db:studio
```

Navigate to `message_templates` table and find the new email template.

**Note:** Template variables like `{{customerName}}`, `{{shopName}}`, etc. will be replaced by the existing `renderTemplate()` function in `src/lib/messages.ts`.

---

### Step 4: Create Template Rendering Tests

**Create `src/lib/__tests__/email-template-rendering.test.ts`:**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../db";
import { messageTemplates } from "../schema";
import { getOrCreateTemplate, renderTemplate } from "../messages";
import { eq, and } from "drizzle-orm";

describe("Email Template Rendering", () => {
  let templateId: string;

  beforeAll(async () => {
    // Ensure email template exists for testing
    const existing = await db
      .select()
      .from(messageTemplates)
      .where(
        and(
          eq(messageTemplates.key, "appointment_reminder_24h"),
          eq(messageTemplates.version, 1),
          eq(messageTemplates.channel, "email")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      templateId = existing[0].id;
    } else {
      // Create template if it doesn't exist (for CI/test environments)
      const [template] = await db
        .insert(messageTemplates)
        .values({
          key: "appointment_reminder_24h",
          version: 1,
          channel: "email",
          subjectTemplate: "Reminder: Your appointment at {{shopName}}",
          bodyTemplate: `
            <html>
              <body>
                <h1>Hi {{customerName}}!</h1>
                <p>Shop: {{shopName}}</p>
                <p>Date: {{appointmentDate}}</p>
                <p>Time: {{appointmentTime}}</p>
                <a href="{{bookingUrl}}">Manage booking</a>
              </body>
            </html>
          `,
        })
        .returning();
      templateId = template.id;
    }
  });

  it("should fetch email template from database", async () => {
    const template = await getOrCreateTemplate(
      "appointment_reminder_24h",
      "email",
      1
    );

    expect(template).toBeDefined();
    expect(template.key).toBe("appointment_reminder_24h");
    expect(template.channel).toBe("email");
    expect(template.version).toBe(1);
    expect(template.bodyTemplate).toContain("{{customerName}}");
    expect(template.subjectTemplate).toContain("{{shopName}}");
  });

  it("should render email template with appointment data", async () => {
    const template = await getOrCreateTemplate(
      "appointment_reminder_24h",
      "email",
      1
    );

    const mockAppointmentData = {
      customerName: "John Doe",
      shopName: "Downtown Barber Shop",
      appointmentDate: "March 18, 2026",
      appointmentTime: "2:00 PM - 3:00 PM",
      bookingUrl: "https://example.com/manage/abc123",
    };

    const rendered = renderTemplate(template.bodyTemplate!, mockAppointmentData);

    // Verify all variables were replaced
    expect(rendered).not.toContain("{{customerName}}");
    expect(rendered).not.toContain("{{shopName}}");
    expect(rendered).not.toContain("{{appointmentDate}}");
    expect(rendered).not.toContain("{{appointmentTime}}");
    expect(rendered).not.toContain("{{bookingUrl}}");

    // Verify actual values are present
    expect(rendered).toContain("John Doe");
    expect(rendered).toContain("Downtown Barber Shop");
    expect(rendered).toContain("March 18, 2026");
    expect(rendered).toContain("2:00 PM - 3:00 PM");
    expect(rendered).toContain("https://example.com/manage/abc123");
  });

  it("should render subject template with appointment data", async () => {
    const template = await getOrCreateTemplate(
      "appointment_reminder_24h",
      "email",
      1
    );

    const mockData = {
      shopName: "Downtown Barber Shop",
    };

    const renderedSubject = renderTemplate(
      template.subjectTemplate!,
      mockData
    );

    expect(renderedSubject).not.toContain("{{shopName}}");
    expect(renderedSubject).toContain("Downtown Barber Shop");
    expect(renderedSubject).toContain("Reminder");
  });

  it("should handle missing variables gracefully", async () => {
    const template = await getOrCreateTemplate(
      "appointment_reminder_24h",
      "email",
      1
    );

    const incompleteData = {
      customerName: "Jane Smith",
      // Missing other variables
    };

    const rendered = renderTemplate(template.bodyTemplate!, incompleteData);

    // Should replace what it can
    expect(rendered).toContain("Jane Smith");
    expect(rendered).not.toContain("{{customerName}}");

    // Should leave missing variables as-is
    expect(rendered).toContain("{{shopName}}");
    expect(rendered).toContain("{{appointmentDate}}");
  });

  it("should preserve HTML structure after rendering", async () => {
    const template = await getOrCreateTemplate(
      "appointment_reminder_24h",
      "email",
      1
    );

    const mockData = {
      customerName: "Test User",
      shopName: "Test Shop",
      appointmentDate: "Tomorrow",
      appointmentTime: "10:00 AM",
      bookingUrl: "https://example.com/manage/test",
    };

    const rendered = renderTemplate(template.bodyTemplate!, mockData);

    // Verify HTML structure is intact
    expect(rendered).toContain("<html>");
    expect(rendered).toContain("</html>");
    expect(rendered).toContain("<body");
    expect(rendered).toContain("</body>");
    expect(rendered).toContain("<h1>");
    expect(rendered).toContain("<a href=");
  });
});
```

**Run tests:**

```bash
pnpm test src/lib/__tests__/email-template-rendering.test.ts
```

**Expected output:**
```
✓ src/lib/__tests__/email-template-rendering.test.ts (6 tests)
  ✓ Email Template Rendering (6)
    ✓ should fetch email template from database
    ✓ should render email template with appointment data
    ✓ should render subject template with appointment data
    ✓ should handle missing variables gracefully
    ✓ should preserve HTML structure after rendering

Test Files  1 passed (1)
     Tests  6 passed (6)
```

---

## Testing Strategy

### 1. Unit Tests ✅

**What:** Test template fetching and rendering with mock data
**How:** Run `pnpm test src/lib/__tests__/email-template-rendering.test.ts`
**Covers:**
- Template retrieval from database
- Variable substitution in body
- Variable substitution in subject
- Missing variable handling
- HTML structure preservation

**Success criteria:** All 6 tests pass

---

### 2. Migration Verification ✅

**What:** Verify schema changes applied correctly
**How:**
```bash
# Check migration applied
pnpm db:studio
# Verify:
# 1. customerContactPrefs has email_opt_in column
# 2. message_channel enum has "email" value

# Check schema is in sync
pnpm db:generate
# Should output: "No schema changes detected"
```

**Success criteria:**
- New column exists in database
- Enum has both values
- No schema drift detected

---

### 3. Template Seeding ✅

**What:** Verify email template created in database
**How:**
```bash
# Run seed script
pnpm tsx scripts/seed-email-template.ts

# Check in database
pnpm db:studio
# Navigate to message_templates table
# Find appointment_reminder_24h with channel="email"
```

**Success criteria:**
- Template exists in database
- Has correct key, version, channel
- bodyTemplate contains HTML
- subjectTemplate contains subject line

---

### 4. Integration Test (Manual) ✅

**What:** Render template with real appointment data and send via email
**How:** See Demo Script below

**Success criteria:**
- Template renders with no {{}} placeholders
- Email HTML is well-formed
- Email received in inbox with formatted content

---

## Demo Script

### Prerequisites

1. **V1 complete:**
   ```bash
   # Verify sendEmail function exists
   ls src/lib/email.ts
   ```

2. **Database migrated:**
   ```bash
   pnpm db:migrate
   ```

3. **Template seeded:**
   ```bash
   pnpm tsx scripts/seed-email-template.ts
   ```

4. **Dev server running:**
   ```bash
   pnpm dev
   ```

---

### Demo Steps

**Step 1: Verify schema changes**

```bash
# Open Drizzle Studio
pnpm db:studio
```

**Navigate to `customerContactPrefs` table:**
- Should see columns: `customer_id`, `sms_opt_in`, `email_opt_in`, `preferred_channel`, `updated_at`
- `email_opt_in` should have default value `true`

**Check message_channel enum:**
- Open `message_log` or `message_templates` table
- Click on `channel` column
- Dropdown should show: "sms", "email"

✅ **Success:** Schema supports email channel

---

**Step 2: Verify email template exists**

In Drizzle Studio, navigate to `message_templates` table:

**Filter by:**
- `key` = "appointment_reminder_24h"
- `channel` = "email"

**Expected result:**
- 1 row found
- `version` = 1
- `subject_template` contains "Reminder: Your appointment"
- `body_template` contains HTML with {{variables}}

✅ **Success:** Email template created

---

**Step 3: Test template rendering**

**Create test file `src/app/api/test-template/route.ts`:**

```typescript
import { NextResponse } from "next/server";
import { getOrCreateTemplate, renderTemplate } from "@/lib/messages";
import { sendEmail } from "@/lib/email";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const toEmail = searchParams.get("to");

  if (!toEmail) {
    return NextResponse.json(
      { error: "Missing 'to' query parameter" },
      { status: 400 }
    );
  }

  try {
    // Fetch email template
    const template = await getOrCreateTemplate(
      "appointment_reminder_24h",
      "email",
      1
    );

    // Mock appointment data
    const appointmentData = {
      customerName: "Alex Johnson",
      shopName: "Downtown Barber Shop",
      appointmentDate: "March 18, 2026",
      appointmentTime: "2:00 PM - 3:00 PM",
      bookingUrl: "https://example.com/manage/demo123",
    };

    // Render templates
    const subject = renderTemplate(template.subjectTemplate!, appointmentData);
    const body = renderTemplate(template.bodyTemplate!, appointmentData);

    // Send email
    const result = await sendEmail({
      to: toEmail,
      subject,
      html: body,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send email", details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Template rendered and email sent to ${toEmail}`,
      messageId: result.messageId,
      preview: {
        subject,
        bodyPreview: body.substring(0, 200) + "...",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

**Test the endpoint:**

```bash
curl "http://localhost:3000/api/test-template?to=your.email@example.com"
```

**Expected response:**
```json
{
  "success": true,
  "message": "Template rendered and email sent to your.email@example.com",
  "messageId": "msg_xyz789",
  "preview": {
    "subject": "Reminder: Your appointment at Downtown Barber Shop",
    "bodyPreview": "<!DOCTYPE html><html lang=\"en\"><head>  <meta charset=\"UTF-8\">  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">  <title>Appointment Reminder</title></head><body style=\"font-family..."
  }
}
```

---

**Step 4: Check email in inbox**

**Open your email inbox:**

**Expected email:**
- **Subject:** "Reminder: Your appointment at Downtown Barber Shop"
- **From:** reminders@yourdomain.com
- **Body:**
  - Greeting: "Hi Alex Johnson! 👋"
  - Shop name: "Downtown Barber Shop"
  - Date: "March 18, 2026"
  - Time: "2:00 PM - 3:00 PM"
  - Blue "Manage Your Booking" button
  - Link to: https://example.com/manage/demo123

**Visual check:**
- ✅ No {{}} placeholders visible
- ✅ HTML renders properly (not showing as plain text)
- ✅ Styling applied (colors, padding, borders)
- ✅ Button is clickable
- ✅ Professional appearance

---

**Step 5: Verify template variables**

**Modify test endpoint to show before/after:**

Add to the response:
```typescript
return NextResponse.json({
  success: true,
  templateVariables: {
    found: ["customerName", "shopName", "appointmentDate", "appointmentTime", "bookingUrl"],
    replaced: 5,
    remaining: 0, // Should be 0 - no unreplaced {{variables}}
  },
  // ... rest of response
});
```

**Check in response:**
- `replaced: 5` - All variables substituted
- `remaining: 0` - No {{placeholders}} left

---

**Step 6: Test with missing data**

**Modify test endpoint to use incomplete data:**

```typescript
const incompleteData = {
  customerName: "Test User",
  // Missing shopName, appointmentDate, etc.
};
```

**Send test email:**
```bash
curl "http://localhost:3000/api/test-template?to=your.email@example.com"
```

**Check email:**
- "Test User" appears (replaced)
- {{shopName}}, {{appointmentDate}}, etc. appear as-is (not replaced)

**Expected behavior:** Template renders partially, showing which variables are missing. This helps debug data issues.

---

### Demo Success Criteria

✅ Schema changes applied (email_opt_in column exists, enum has "email")
✅ Email template exists in database with correct key/channel
✅ Template fetches successfully from database
✅ Variables render correctly (no {{}} in output)
✅ Subject line renders with shop name
✅ HTML email is well-formatted and styled
✅ Email received in inbox with all data populated
✅ Unit tests pass (6/6)
✅ `pnpm lint && pnpm typecheck` passes

---

## Troubleshooting

### Migration fails with enum error

**Error:** `Cannot alter enum type "message_channel"`

**Cause:** PostgreSQL doesn't support direct enum modification in some cases.

**Fix:** Use the manual migration approach from Step 2b (create new enum, migrate columns, drop old enum, rename new enum).

---

### Template not found in tests

**Error:** `Template appointment_reminder_24h not found`

**Fix:**
```bash
# Run seed script
pnpm tsx scripts/seed-email-template.ts

# Verify in database
pnpm db:studio
```

---

### Variables not rendering

**Error:** Email shows {{customerName}} instead of actual name

**Cause:** `renderTemplate()` function issue or incorrect variable names.

**Fix:**
```typescript
// Check variable names match exactly (case-sensitive)
const data = {
  customerName: "John", // Must match {{customerName}} in template
  shopName: "Shop",     // Must match {{shopName}} in template
};

// Verify renderTemplate is called
const rendered = renderTemplate(template.bodyTemplate!, data);
```

---

### Email HTML not rendering

**Error:** Email shows HTML tags as plain text

**Cause:** Email client treating as plain text instead of HTML.

**Fix:** Verify sendEmail uses `html` parameter:
```typescript
await sendEmail({
  to: email,
  subject: subject,
  html: body, // NOT 'text' - must be 'html'
});
```

---

## Cleanup After V2

After V2 is verified and you move to V3:

1. **Keep:** Schema changes - Core infrastructure
2. **Keep:** Email template in database - Will be used by all slices
3. **Keep:** Seed script - May need to run again in other environments
4. **Keep:** Unit tests - Will be used throughout
5. **Remove:** `src/app/api/test-template/route.ts` - Temporary test endpoint

**Cleanup command:**
```bash
rm src/app/api/test-template/route.ts
git add -A
git commit -m "Remove temporary test-template endpoint after V2 verification"
```

---

## Success Criteria

V2 is complete when:

- ✅ `messageChannelEnum` includes "email"
- ✅ `customerContactPrefs.emailOptIn` field added (default true)
- ✅ Migration generated and applied successfully
- ✅ No schema drift (`pnpm db:generate` shows "No changes")
- ✅ Email template seeded in database
- ✅ Template fetches correctly via `getOrCreateTemplate()`
- ✅ Template renders with `renderTemplate()` (all variables replaced)
- ✅ Unit tests pass (6/6)
- ✅ Manual test: Email with rendered template received in inbox
- ✅ HTML email displays correctly (styled, no placeholders)
- ✅ `pnpm lint && pnpm typecheck` passes with no errors

---

## Next: V3

Once V2 is complete, proceed to V3: Booking Flow Opt-In

V3 will:
- Add email opt-in checkbox to booking form (default checked)
- Save `emailOptIn` to `customerContactPrefs` when booking is created
- Handle existing vs. new customers
- Demo: Book appointment → verify emailOptIn=true in database

The schema changes and template system from V2 will be used by V3's booking flow.
