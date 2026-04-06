"use client";

import { useState } from "react";
import { BookingForm } from "@/components/booking/booking-form";

type EventType = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferMinutes: number | null;
};

type ServiceSelectorProps = {
  eventTypes: EventType[];
  shopSlug: string;
  shopName: string;
  timezone: string;
  slotMinutes: number;
  defaultDate: string;
  paymentsEnabled: boolean;
  forcePaymentSimulator: boolean;
};

export function ServiceSelector({
  eventTypes,
  shopSlug,
  shopName,
  timezone,
  slotMinutes,
  defaultDate,
  paymentsEnabled,
  forcePaymentSimulator,
}: ServiceSelectorProps) {
  const [selected, setSelected] = useState<EventType | null>(null);

  if (selected) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-sm"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: "var(--color-brand)",
            cursor: "pointer",
            transition: `color var(--duration-fast) ease`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-brand-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-brand)";
          }}
        >
          &larr; Change service
        </button>
        <div
          className="max-w-xl"
          style={{
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-xl)",
            padding: "1.5rem",
          }}
        >
          <BookingForm
            shopSlug={shopSlug}
            shopName={shopName}
            timezone={timezone}
            slotMinutes={slotMinutes}
            defaultDate={defaultDate}
            paymentsEnabled={paymentsEnabled}
            forcePaymentSimulator={forcePaymentSimulator}
            selectedEventTypeId={selected.id}
            selectedEventTypeName={selected.name}
            selectedDurationMinutes={selected.durationMinutes}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {eventTypes.map((eventType) => (
        <button
          key={eventType.id}
          type="button"
          onClick={() => setSelected(eventType)}
          className="service-card text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className="text-base font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {eventType.name}
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                <span className="font-mono">
                  {eventType.durationMinutes}
                </span>{" "}
                min
                {eventType.bufferMinutes != null && eventType.bufferMinutes > 0
                  ? ` \u00b7 ${eventType.bufferMinutes} min prep`
                  : ""}
              </p>
              {eventType.description ? (
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {eventType.description}
                </p>
              ) : null}
            </div>
            <span
              className="service-card-arrow shrink-0 text-base"
              style={{ color: "var(--color-brand)" }}
              aria-hidden="true"
            >
              &rarr;
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
