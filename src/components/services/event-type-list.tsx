"use client";

import { useState } from "react";
import { EventTypeForm } from "@/components/services/event-type-form";

type EventTypeItem = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferMinutes: 0 | 5 | 10 | null;
  depositAmountCents: number | null;
  isHidden: boolean;
  isActive: boolean;
  isDefault: boolean;
};

type EventTypeListProps = {
  eventTypes: EventTypeItem[];
  bookingBaseUrl: string;
  slotMinutes: number;
  updateAction: (id: string, formData: FormData) => Promise<void>;
};

const formatDeposit = (amountCents: number) =>
  `Deposit override: $${(amountCents / 100).toFixed(2)}`;

/** Status pill mapped to design system semantic tokens */
function StatusPill({
  label,
  variant,
}: {
  label: string;
  variant: "default" | "hidden" | "inactive";
}) {
  const styles: Record<string, React.CSSProperties> = {
    default: {
      background: "var(--color-brand-subtle)",
      border: "1px solid var(--color-brand-border)",
      color: "var(--color-brand)",
    },
    hidden: {
      background: "var(--color-warning-subtle)",
      border: "1px solid var(--color-warning-border)",
      color: "var(--color-warning)",
    },
    inactive: {
      background: "var(--color-error-subtle)",
      border: "1px solid var(--color-error-border)",
      color: "var(--color-error)",
    },
  };

  return (
    <span
      className="status-pill"
      style={styles[variant]}
    >
      {label}
    </span>
  );
}

export function EventTypeList({
  eventTypes,
  bookingBaseUrl,
  slotMinutes,
  updateAction,
}: EventTypeListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleCopyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${bookingBaseUrl}?service=${id}`);
      setCopyError(null);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2000);
    } catch (error) {
      console.error("Failed to copy booking link", error);
      setCopiedId(null);
      setCopyError("Could not copy the booking link. Copy it manually instead.");
    }
  };

  if (eventTypes.length === 0) {
    return (
      <section
        className="p-6"
        style={{
          borderRadius: "var(--radius-xl)",
          border: "1px dashed var(--color-border-medium)",
          background: "var(--color-surface-raised)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          No services yet. Add one below to start organizing your booking page.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {eventTypes.map((eventType) => {
        const isExpanded = expandedId === eventType.id;

        return (
          <article
            key={eventType.id}
            className="p-4"
            style={{
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--color-border-default)",
              background: "var(--color-surface-raised)",
            }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {eventType.name}
                  </h2>
                  {eventType.isDefault ? (
                    <StatusPill label="Default" variant="default" />
                  ) : null}
                  {eventType.isHidden ? (
                    <StatusPill label="Hidden" variant="hidden" />
                  ) : null}
                  {!eventType.isActive ? (
                    <StatusPill label="Inactive" variant="inactive" />
                  ) : null}
                </div>

                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {eventType.durationMinutes} min
                  {eventType.bufferMinutes != null && eventType.bufferMinutes > 0
                    ? ` \u2022 ${eventType.bufferMinutes} min buffer`
                    : ""}
                </p>

                {eventType.depositAmountCents !== null ? (
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {formatDeposit(eventType.depositAmountCents)}
                  </p>
                ) : null}

                {eventType.description ? (
                  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {eventType.description}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleCopyLink(eventType.id);
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--color-brand-border)",
                    color: "var(--color-brand)",
                    borderRadius: "var(--radius-lg)",
                    padding: "0.5rem 1rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {copiedId === eventType.id ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId((current) =>
                      current === eventType.id ? null : eventType.id
                    )
                  }
                  style={{
                    background: "var(--color-brand)",
                    color: "var(--color-surface-void)",
                    borderRadius: "var(--radius-lg)",
                    padding: "0.5rem 1rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {isExpanded ? "Close" : "Edit"}
                </button>
              </div>
            </div>

            {copyError ? (
              <p className="mt-3 text-sm" style={{ color: "var(--color-error)" }}>
                {copyError}
              </p>
            ) : null}

            {isExpanded ? (
              <div
                className="mt-6 pt-6"
                style={{ borderTop: "1px solid var(--color-border-subtle)" }}
              >
                <EventTypeForm
                  action={updateAction.bind(null, eventType.id)}
                  slotMinutes={slotMinutes}
                  initial={{
                    name: eventType.name,
                    description: eventType.description ?? "",
                    durationMinutes: eventType.durationMinutes,
                    bufferMinutes: eventType.bufferMinutes,
                    depositAmountCents: eventType.depositAmountCents,
                    isHidden: eventType.isHidden,
                    isActive: eventType.isActive,
                  }}
                  submitLabel="Update service"
                  showActiveField
                  onSuccess={() => setExpandedId(null)}
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
