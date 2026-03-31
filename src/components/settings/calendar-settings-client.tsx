"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type CalendarConnectionView = {
  id: string;
  calendarName: string;
  createdAt: string;
};

type CalendarSettingsClientProps = {
  connection: CalendarConnectionView | null;
  isGoogleOAuthConfigured: boolean;
};

export function CalendarSettingsClient({
  connection,
  isGoogleOAuthConfigured,
}: CalendarSettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const successMessage = searchParams.get("success");
  const errorMessage = searchParams.get("error");

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Google Calendar from this shop?")) {
      return;
    }

    try {
      const response = await fetch("/api/settings/calendar/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Failed to disconnect calendar");
      }

      startTransition(() => {
        router.replace("/app/settings/calendar?success=Google%20Calendar%20disconnected");
        router.refresh();
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to disconnect calendar";
      startTransition(() => {
        router.replace(`/app/settings/calendar?error=${encodeURIComponent(message)}`);
        router.refresh();
      });
    }
  }

  return (
    <div className="space-y-6">
      {successMessage ? (
        <div
          role="status"
          className="rounded-lg px-4 py-3 text-sm"
          style={{ border: "1px solid var(--color-success-border)", background: "var(--color-success-subtle)", color: "var(--color-success)" }}
        >
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg px-4 py-3 text-sm"
          style={{ border: "1px solid var(--color-error-border)", background: "var(--color-error-subtle)", color: "var(--color-error)" }}
        >
          {errorMessage}
        </div>
      ) : null}

      {!isGoogleOAuthConfigured ? (
        <section
          className="space-y-3 rounded-xl p-5"
          style={{ border: "1px solid var(--color-warning-border)", background: "var(--color-warning-subtle)" }}
        >
          <h2 className="text-lg font-semibold">Google OAuth not configured</h2>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and
            `CALENDAR_ENCRYPTION_KEY` to enable calendar connections.
          </p>
        </section>
      ) : null}

      <section
        className="rounded-xl p-6"
        style={{ border: "1px solid var(--color-border-default)", background: "var(--color-surface-raised)" }}
      >
        <h2 className="text-lg font-semibold">Google Calendar connection</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          V1 connects one Google account and stores encrypted OAuth tokens.
        </p>

        {connection ? (
          <div className="mt-5 space-y-4">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
              style={{ border: "1px solid var(--color-success-border)", background: "var(--color-success-subtle)", color: "var(--color-success)" }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--color-success)" }} aria-hidden />
              Connected
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div
                className="rounded-lg p-3"
                style={{ border: "1px solid var(--color-border-default)", background: "var(--color-surface-base)" }}
              >
                <dt className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
                  Calendar
                </dt>
                <dd className="mt-1 font-medium" style={{ color: "var(--color-text-primary)" }}>{connection.calendarName}</dd>
              </div>
              <div
                className="rounded-lg p-3"
                style={{ border: "1px solid var(--color-border-default)", background: "var(--color-surface-base)" }}
              >
                <dt className="text-xs uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
                  Connected
                </dt>
                <dd className="mt-1 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {new Date(connection.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>

            <Button
              type="button"
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isPending}
            >
              {isPending ? "Disconnecting..." : "Disconnect Google Calendar"}
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
              style={{ border: "1px solid var(--color-border-default)", background: "var(--color-surface-base)", color: "var(--color-text-secondary)" }}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--color-text-tertiary)" }} aria-hidden />
              Not connected
            </div>

            <p className="max-w-2xl text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Authorize Google Calendar to prepare automated booking sync in upcoming slices.
              V1 stores the connection and lets you disconnect at any time.
            </p>

            <Button
              asChild
              disabled={!isGoogleOAuthConfigured || isPending}
              aria-disabled={!isGoogleOAuthConfigured || isPending}
            >
              <a href="/api/settings/calendar/connect">Connect Google Calendar</a>
            </Button>
          </div>
        )}
      </section>

      <section
        className="rounded-xl p-5"
        style={{ border: "1px solid var(--color-border-default)", background: "var(--color-surface-raised)" }}
      >
        <h2 className="text-sm font-semibold">What V1 includes</h2>
        <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          <li>OAuth connection and token storage (encrypted at rest)</li>
          <li>Active connection status on this settings page</li>
          <li>Disconnect flow using soft delete</li>
          <li>Primary Google calendar auto-selected for this version</li>
        </ul>
      </section>
    </div>
  );
}
