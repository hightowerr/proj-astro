# V1 Plan — Email Template Editor

**Slice:** V1 of 3
**Status:** ✅ COMPLETE

---

## Goal

Add an email template editor below the existing timing form on `/app/settings/reminders`. Owner can view the current email subject and body, edit them, see a live HTML preview with sample data, and save — which inserts a new version row picked up by the next cron job.

---

## Demo Checkpoint

Owner opens `/app/settings/reminders`. Below the timing section, a new card reads "Email reminder template". Subject line and HTML body are pre-loaded from the database. Owner edits the subject — preview panel re-renders instantly with `{{shopName}}` resolved to the real shop name. Owner saves — confirmation flashes, next `send-email-reminders` cron job picks up the new version.

---

## Files to Change

| File | Change |
|------|--------|
| `src/app/app/settings/reminders/page.tsx` | Load email template via `getOrCreateTemplate`; pass to `EmailTemplateForm` |
| `src/app/app/settings/reminders/actions.ts` | Add `updateEmailTemplate(subject, body)` server action |
| `src/components/settings/email-template-form.tsx` | **New** — client component |

---

## Implementation Steps

### 1. Server action — `updateEmailTemplate`

Add to `src/app/app/settings/reminders/actions.ts`:

```ts
"use server";

import { desc, and, eq } from "drizzle-orm";
import { messageTemplates } from "@/lib/schema";

const EMAIL_REMINDER_KEY = "appointment_reminder_24h";
const DEFAULT_EMAIL_SUBJECT = "Reminder: Your appointment tomorrow at {{shopName}}";
const DEFAULT_EMAIL_BODY = `<!DOCTYPE html>
<html lang="en">
  <body>
    <p>Hi {{customerName}},</p>
    <p>This is a reminder about your appointment tomorrow at {{shopName}}.</p>
    <p>Date: {{appointmentDate}}</p>
    <p>Time: {{appointmentTime}}</p>
    <p><a href="{{bookingUrl}}">Manage your booking</a></p>
  </body>
</html>`;

export async function updateEmailTemplate(subject: string, body: string) {
  const session = await requireAuth();
  // Auth check — templates are global (not per-shop) but only owners should edit
  await getShopByOwnerId(session.user.id); // throws if no shop

  // Validate
  if (!subject.trim() || !body.trim()) {
    throw new Error("Subject and body are required");
  }
  if (subject.length > 200) {
    throw new Error("Subject must be 200 characters or fewer");
  }

  // Find current max version
  const [latest] = await db
    .select({ version: messageTemplates.version })
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.key, EMAIL_REMINDER_KEY),
        eq(messageTemplates.channel, "email")
      )
    )
    .orderBy(desc(messageTemplates.version))
    .limit(1);

  const nextVersion = (latest?.version ?? 0) + 1;

  await db.insert(messageTemplates).values({
    key: EMAIL_REMINDER_KEY,
    version: nextVersion,
    channel: "email",
    subjectTemplate: subject.trim(),
    bodyTemplate: body.trim(),
  });

  revalidatePath("/app/settings/reminders");
}
```

### 2. Page — load email template

In `src/app/app/settings/reminders/page.tsx`:

```ts
import { getOrCreateTemplate } from "@/lib/messages";

// In the server component body, after shop + settings load:
const emailTemplate = await getOrCreateTemplate(
  "appointment_reminder_24h",
  "email",
  1,
  {
    subjectTemplate: DEFAULT_EMAIL_SUBJECT,
    bodyTemplate: DEFAULT_EMAIL_BODY,
  }
);

// Pass to form:
<EmailTemplateForm
  initialSubject={emailTemplate.subjectTemplate ?? ""}
  initialBody={emailTemplate.bodyTemplate}
  shopName={shop.name}
/>
```

The `DEFAULT_EMAIL_SUBJECT` and `DEFAULT_EMAIL_BODY` constants should be co-located in `actions.ts` and imported into both the page and the action.

### 3. Client component — `EmailTemplateForm`

`src/components/settings/email-template-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { updateEmailTemplate } from "@/app/app/settings/reminders/actions";

const EMAIL_VARIABLES = [
  { token: "{{customerName}}", description: "Customer's full name" },
  { token: "{{shopName}}", description: "Your shop name" },
  { token: "{{appointmentDate}}", description: "Date of appointment (e.g. Wednesday, May 1, 2026)" },
  { token: "{{appointmentTime}}", description: "Time range (e.g. 2:00 PM – 3:00 PM)" },
  { token: "{{bookingUrl}}", description: "Customer self-service link (reschedule/cancel)" },
];

// Inlined renderTemplate — no import needed
function renderTemplateClient(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
}

type Props = {
  initialSubject: string;
  initialBody: string;
  shopName: string;
};

export function EmailTemplateForm({ initialSubject, initialBody, shopName }: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [lastSaved, setLastSaved] = useState({ subject: initialSubject, body: initialBody });
  const [savedKey, setSavedKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const isDirty = subject !== lastSaved.subject || body !== lastSaved.body;

  const sampleData = {
    customerName: "Alex Johnson",
    shopName,
    appointmentDate: "Wednesday, May 1, 2026",
    appointmentTime: "2:00 PM – 3:00 PM",
    bookingUrl: "https://example.com/manage/preview",
  };

  const previewSubject = renderTemplateClient(subject, sampleData);
  const previewBody = renderTemplateClient(body, sampleData);

  function handleSave() {
    const snap = { subject, body };
    startTransition(async () => {
      await updateEmailTemplate(snap.subject, snap.body);
      setLastSaved(snap);
      setSavedKey((k) => k + 1);
    });
  }

  return (
    <div className="space-y-6">
      {/* Variable reference */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2"
           style={{ color: "var(--al-on-surface-variant)" }}>
          Available variables
        </p>
        <div className="flex flex-wrap gap-2">
          {EMAIL_VARIABLES.map((v) => (
            <span
              key={v.token}
              title={v.description}
              className="font-mono text-xs px-2 py-1 rounded"
              style={{
                background: "var(--al-primary-fixed)",
                color: "var(--al-on-primary-fixed)",
                cursor: "help",
              }}
            >
              {v.token}
            </span>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide"
               style={{ color: "var(--al-on-surface-variant)" }}>
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => { setSubject(e.target.value); setSavedKey(0); }}
          maxLength={200}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--al-outline-variant)" }}
        />
      </div>

      {/* Body */}
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide"
               style={{ color: "var(--al-on-surface-variant)" }}>
          Body (HTML)
        </label>
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); setSavedKey(0); }}
          rows={12}
          className="w-full rounded-lg border px-3 py-2 font-mono text-xs"
          style={{ borderColor: "var(--al-outline-variant)" }}
        />
      </div>

      {/* Preview */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2"
           style={{ color: "var(--al-on-surface-variant)" }}>
          Preview — rendered with sample data
        </p>
        <div className="rounded-lg border p-2"
             style={{ borderColor: "var(--al-outline-variant)" }}>
          <p className="text-xs mb-2 px-2 pt-1"
             style={{ color: "var(--al-outline)" }}>
            Subject: {previewSubject}
          </p>
          <iframe
            srcDoc={previewBody}
            title="Email preview"
            className="w-full rounded border-0"
            style={{ height: 280, background: "#fff" }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      {/* Save controls */}
      <div className="flex items-center gap-3 border-t pt-5"
           style={{ borderColor: "var(--al-outline-variant)" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ background: "var(--al-primary)", color: "var(--al-on-primary)" }}
        >
          {isPending ? "Saving…" : "Save email template"}
        </button>
        {savedKey > 0 && !isDirty && (
          <span className="text-xs" style={{ color: "var(--al-status-positive)" }}>Saved</span>
        )}
      </div>
    </div>
  );
}
```

### 4. Wire into the page

In `page.tsx`, add the new section below `ReminderTimingsForm`:

```tsx
<div className="rounded-lg border p-6">
  <h2 className="text-lg font-semibold mb-1">Email reminder template</h2>
  <p className="text-sm mb-6" style={{ color: "var(--al-on-surface-variant)" }}>
    Customize the email sent to customers before their appointment.
    Use <code>{"{{variable}}"}</code> tokens — they are replaced with real data at send time.
  </p>
  <EmailTemplateForm
    initialSubject={emailTemplate.subjectTemplate ?? ""}
    initialBody={emailTemplate.bodyTemplate}
    shopName={shop.name}
  />
</div>
```

---

## Constraints & Edge Cases

| Case | Handling |
|------|----------|
| Owner has no shop | Page already shows "create your shop" message — `EmailTemplateForm` never renders |
| `getOrCreateTemplate` seeds default on first visit | DB row always exists before the form renders; no null checks needed in the form |
| Subject > 200 chars | `maxLength` on input + server-side validation in action |
| Empty subject or body | Server action throws; `useTransition` surfaces via unhandled rejection for now (V1 scope) |
| Concurrent saves (two tabs) | Each save inserts a new version; `getLatestTemplate` always picks max — last write wins, no corruption |
| `{{variable}}` typo by owner | Preview immediately shows the raw `{{typo_var}}` unrendered — visible signal before save |

---

## What's NOT in this slice

- SMS template editor (V2)
- Reset to default (V3)
- Error toast on save failure (acceptable for V1 — transition failure is visible via button state)
- Test send (R9, deferred)
