import type { ReactNode } from "react";
import Link from "next/link";
import {
  Ban,
  Calendar,
  CheckCircle2,
  Clock3,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import type { CustomerAppointmentHistoryItem } from "@/lib/queries/appointments";

type CustomerHistoryCardProps = {
  customerName: string;
  history: CustomerAppointmentHistoryItem[];
  timezone: string;
  className?: string;
};

type OutcomeDisplay = {
  icon: ReactNode;
  label: string;
  toneClassName: string;
};

const getOutcomeDisplay = (
  appointment: CustomerAppointmentHistoryItem
): OutcomeDisplay => {
  const now = new Date();

  if (appointment.financialOutcome === "settled") {
    return {
      icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
      label: "Completed",
      toneClassName: "text-green-700",
    };
  }

  if (
    appointment.financialOutcome === "voided" ||
    appointment.resolutionReason === "no_show"
  ) {
    return {
      icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
      label: "No-show",
      toneClassName: "text-red-700",
    };
  }

  if (
    appointment.status === "cancelled" &&
    (appointment.financialOutcome === "refunded" ||
      appointment.resolutionReason === "cancelled_refunded_before_cutoff")
  ) {
    return {
      icon: <Ban className="h-4 w-4" aria-hidden="true" />,
      label: "Cancelled (on-time)",
      toneClassName: "text-yellow-700",
    };
  }

  if (appointment.status === "cancelled") {
    return {
      icon: <Ban className="h-4 w-4" aria-hidden="true" />,
      label: "Cancelled (late)",
      toneClassName: "text-orange-700",
    };
  }

  if (appointment.financialOutcome === "unresolved") {
    if (appointment.endsAt < now) {
      return {
        icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
        label: "Pending resolution",
        toneClassName: "text-muted-foreground",
      };
    }

    return {
      icon: <Calendar className="h-4 w-4" aria-hidden="true" />,
      label: "Upcoming",
      toneClassName: "text-blue-700",
    };
  }

  return {
    icon: <TriangleAlert className="h-4 w-4" aria-hidden="true" />,
    label: "Other outcome",
    toneClassName: "text-muted-foreground",
  };
};

export function CustomerHistoryCard({
  customerName,
  history,
  timezone,
  className,
}: CustomerHistoryCardProps) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${className ?? ""}`}>
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-muted-foreground">
          Appointment History
        </h2>
        <p className="text-base font-medium">{customerName}</p>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No appointment history yet. This is the customer&apos;s first booking.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Last {history.length} appointment{history.length === 1 ? "" : "s"}
          </p>
          <div className="space-y-1">
            {history.map((item) => {
              const outcome = getOutcomeDisplay(item);

              return (
                <Link
                  key={item.id}
                  href={`/app/appointments/${item.id}`}
                  className="block rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={outcome.toneClassName}>{outcome.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {formatter.format(new Date(item.startsAt))}
                      </p>
                      <p className={`text-xs ${outcome.toneClassName}`}>
                        {outcome.label}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
