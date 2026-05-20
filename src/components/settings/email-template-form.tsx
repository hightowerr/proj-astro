"use client";

import { useState, useTransition } from "react";
import {
  updateEmailTemplate,
  resetEmailTemplate,
} from "@/app/app/settings/reminders/actions";
import { EMAIL_REMINDER_DEFAULTS } from "@/app/app/settings/reminders/template-constants";
import { Button } from "@/components/ui/button";

type Props = {
  initialSubject: string;
  initialBody: string;
  shopName: string;
};

/** Client-side template renderer — mirrors server logic without importing the server module. */
function renderTemplateClient(
  template: string,
  data: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => data[key] ?? `{{${key}}}`);
}

const AVAILABLE_VARIABLES = [
  { token: "{{customerName}}", description: "Customer's full name" },
  { token: "{{shopName}}", description: "Your shop name" },
  { token: "{{appointmentDate}}", description: "Date (e.g. Wednesday, May 1, 2026)" },
  { token: "{{appointmentTime}}", description: "Time range (e.g. 2:00 PM \u2013 3:00 PM)" },
  { token: "{{bookingUrl}}", description: "Customer self-service link" },
] as const;

export function EmailTemplateForm({ initialSubject, initialBody, shopName }: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [lastSaved, setLastSaved] = useState({ subject: initialSubject, body: initialBody });
  const [savedKey, setSavedKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, startResetTransition] = useTransition();

  const isDirty = subject !== lastSaved.subject || body !== lastSaved.body;

  const sampleData: Record<string, string> = {
    customerName: "Alex Johnson",
    shopName,
    appointmentDate: "Wednesday, May 1, 2026",
    appointmentTime: "2:00 PM \u2013 3:00 PM",
    bookingUrl: "https://example.com/manage/preview",
  };

  const previewSubject = renderTemplateClient(subject, sampleData);
  const previewBody = renderTemplateClient(body, sampleData);

  function handleSave() {
    const nextSubject = subject;
    const nextBody = body;

    startTransition(async () => {
      await updateEmailTemplate(nextSubject, nextBody);
      setLastSaved({ subject: nextSubject, body: nextBody });
      setSavedKey((k) => k + 1);
    });
  }

  function handleReset() {
    startResetTransition(async () => {
      await resetEmailTemplate();
      setShowResetConfirm(false);
      // Sync local state to factory defaults so the dirty-check reflects the
      // new server-side version and the form shows "Saved" briefly.
      setSubject(EMAIL_REMINDER_DEFAULTS.subjectTemplate);
      setBody(EMAIL_REMINDER_DEFAULTS.bodyTemplate);
      setLastSaved({
        subject: EMAIL_REMINDER_DEFAULTS.subjectTemplate,
        body: EMAIL_REMINDER_DEFAULTS.bodyTemplate,
      });
      setSavedKey((k) => k + 1);
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Variable pills ── */}
      <div>
        <span
          className="mb-2 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          Available variables
        </span>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES.map((v) => (
            <span
              key={v.token}
              title={v.description}
              className="inline-block rounded-full px-2.5 py-0.5 font-mono text-xs font-medium select-none"
              style={{
                background: "var(--al-primary-fixed)",
                color: "var(--al-on-primary-fixed)",
              }}
            >
              {v.token}
            </span>
          ))}
        </div>
      </div>

      {/* ── Subject input ── */}
      <div>
        <label
          htmlFor="email-subject"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          Subject
        </label>
        <input
          id="email-subject"
          type="text"
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--al-outline-variant)",
            background: "var(--al-surface)",
            color: "var(--al-on-surface)",
          }}
        />
      </div>

      {/* ── Body textarea ── */}
      <div>
        <label
          htmlFor="email-body"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          Body (HTML)
        </label>
        <textarea
          id="email-body"
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 font-mono text-xs"
          style={{
            borderColor: "var(--al-outline-variant)",
            background: "var(--al-surface)",
            color: "var(--al-on-surface)",
          }}
        />
      </div>

      {/* ── Preview panel ── */}
      <div>
        <span
          className="mb-2 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          Preview
        </span>
        <div
          className="rounded-lg border"
          style={{ borderColor: "var(--al-outline-variant)" }}
        >
          <div
            className="border-b px-4 py-2 text-sm font-medium"
            style={{
              borderColor: "var(--al-outline-variant)",
              background: "var(--al-surface-container-low)",
              color: "var(--al-on-surface)",
            }}
          >
            {previewSubject || "\u00A0"}
          </div>
          <iframe
            srcDoc={previewBody}
            sandbox="allow-same-origin"
            title="Email preview"
            className="w-full border-0"
            style={{ height: 280, background: "var(--al-surface)" }}
          />
        </div>
      </div>

      {/* ── Save controls ── */}
      <div
        className="flex items-center gap-3 border-t pt-5"
        style={{ borderColor: "var(--al-outline-variant)" }}
      >
        <Button
          variant="al-primary"
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || isPending}
        >
          {isPending ? "Saving\u2026" : "Save template"}
        </Button>

        {savedKey > 0 && !isDirty && (
          <span
            className="text-xs"
            style={{ color: "var(--al-status-positive)" }}
          >
            Saved
          </span>
        )}

        {/* ── Reset to default ── */}
        {!showResetConfirm ? (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="ml-auto text-xs"
            style={{
              color: "var(--al-outline)",
              textDecoration: "underline",
              cursor: "pointer",
              background: "none",
              border: "none",
            }}
          >
            Reset to default
          </button>
        ) : (
          <span
            className="ml-auto flex items-center gap-2 text-xs"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            Reset to factory default?
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="text-xs font-semibold"
              style={{
                color: "var(--al-error, #c00)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {isResetting ? "Resetting\u2026" : "Yes, reset"}
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="text-xs"
              style={{
                color: "var(--al-outline)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
