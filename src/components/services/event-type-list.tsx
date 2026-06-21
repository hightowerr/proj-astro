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
      background: "rgba(0, 30, 64, 0.08)",
      border: "1px solid var(--al-hairline-rest)",
      color: "var(--al-primary)",
    },
    hidden: {
      background: "var(--al-status-caution-bg)",
      border: "1px solid var(--al-status-caution-border)",
      color: "var(--al-status-caution)",
    },
    inactive: {
      background: "var(--al-status-negative-bg)",
      border: "1px solid var(--al-status-negative-border)",
      color: "var(--al-status-negative)",
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
          border: "1px dashed var(--al-outline-variant)",
          background: "var(--al-surface-container-lowest)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
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
              border: "1px solid var(--al-outline-variant)",
              background: "var(--al-surface-container-lowest)",
            }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--al-on-surface)" }}
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

                <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
                  {eventType.durationMinutes} min
                  {eventType.bufferMinutes != null && eventType.bufferMinutes > 0
                    ? ` \u2022 ${eventType.bufferMinutes} min buffer`
                    : ""}
                </p>

                {eventType.depositAmountCents !== null ? (
                  <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
                    {formatDeposit(eventType.depositAmountCents)}
                  </p>
                ) : null}

                {eventType.description ? (
                  <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
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
                    border: "1px solid var(--al-hairline-rest)",
                    color: "var(--al-primary)",
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
                    background: "var(--al-primary)",
                    color: "var(--al-on-primary)",
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
              <p className="mt-3 text-sm" style={{ color: "var(--al-status-negative)" }}>
                {copyError}
              </p>
            ) : null}

            {isExpanded ? (
              <div
                className="mt-6 pt-6"
                style={{ borderTop: "1px solid var(--al-ghost-border)" }}
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
