"use client";

import { useState, useTransition } from "react";
import {
  updateSmsTemplate,
  resetSmsTemplate,
} from "@/app/app/settings/reminders/actions";
import { SMS_REMINDER_DEFAULTS } from "@/app/app/settings/reminders/template-constants";
import { Button } from "@/components/ui/button";

type Props = {
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
  { token: "{{shop_name}}", description: "Your shop name" },
  { token: "{{time}}", description: "Appointment date and time" },
  { token: "{{manage_link}}", description: "Customer self-service link prefix" },
] as const;

export function SmsTemplateForm({ initialBody, shopName }: Props) {
  const [body, setBody] = useState(initialBody);
  const [lastSaved, setLastSaved] = useState(initialBody);
  const [savedKey, setSavedKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, startResetTransition] = useTransition();

  const isDirty = body !== lastSaved;

  const sampleData: Record<string, string> = {
    shop_name: shopName,
    time: "5/1/26, 2:00 PM",
    manage_link: "Manage: https://example.com/manage/preview ",
  };

  const previewBody = renderTemplateClient(body, sampleData);

  const charCount = body.length;
  const segmentCount = Math.ceil(charCount / 160) || 1;
  const counterLabel = `${charCount} chars \u00B7 ${segmentCount} SMS segment${segmentCount !== 1 ? "s" : ""}`;

  function handleSave() {
    const nextBody = body;

    startTransition(async () => {
      await updateSmsTemplate(nextBody);
      setLastSaved(nextBody);
      setSavedKey((k) => k + 1);
    });
  }

  function handleReset() {
    startResetTransition(async () => {
      await resetSmsTemplate();
      setShowResetConfirm(false);
      // Sync local state to factory defaults so the dirty-check reflects the
      // new server-side version and the form shows "Saved" briefly.
      setBody(SMS_REMINDER_DEFAULTS.bodyTemplate);
      setLastSaved(SMS_REMINDER_DEFAULTS.bodyTemplate);
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

      {/* ── Body textarea ── */}
      <div>
        <label
          htmlFor="sms-body"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          Body
        </label>
        <textarea
          id="sms-body"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 font-mono text-sm"
          style={{
            borderColor: "var(--al-outline-variant)",
            background: "var(--al-surface)",
            color: "var(--al-on-surface)",
          }}
        />
        {/* ── Char/segment counter ── */}
        <p
          className="mt-1 text-right text-xs"
          style={{
            color: charCount > 320 ? "var(--al-error)" : "var(--al-outline)",
          }}
        >
          {counterLabel}
        </p>
      </div>

      {/* ── Preview panel ── */}
      <div>
        <span
          className="mb-2 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          Preview — rendered with sample data
        </span>
        <div
          className="rounded-lg border px-4 py-3"
          style={{
            borderColor: "var(--al-outline-variant)",
            background: "var(--al-surface-container-low)",
            color: "var(--al-on-surface)",
          }}
        >
          <p className="whitespace-pre-wrap text-sm">{previewBody || "\u00A0"}</p>
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
