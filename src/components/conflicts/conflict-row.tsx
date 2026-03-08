"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  cancelAppointmentFromConflict,
  dismissConflictAction,
} from "@/app/app/conflicts/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ConflictWithDetails } from "@/lib/queries/calendar-conflicts";
import { SeverityBadge } from "./severity-badge";

type ConflictRowData = Omit<
  ConflictWithDetails,
  "appointmentStartsAt" | "appointmentEndsAt" | "eventStart" | "eventEnd" | "detectedAt"
> & {
  appointmentStartsAt: string;
  appointmentEndsAt: string;
  eventStart: string;
  eventEnd: string;
  detectedAt: string;
};

type ConflictRowProps = {
  conflict: ConflictRowData;
  timezone: string;
};

const formatDateTime = (value: Date | string, timeZone: string) => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export function ConflictRow({ conflict, timezone }: ConflictRowProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  if (isHidden) {
    return null;
  }

  const handleDismiss = async () => {
    setIsProcessing(true);

    try {
      const result = await dismissConflictAction(conflict.id);

      if (!result.success) {
        toast.error(result.error ?? "Failed to dismiss conflict");
        return;
      }

      setIsHidden(true);
      toast.success("Conflict dismissed");
      router.refresh();
    } catch {
      toast.error("Failed to dismiss conflict");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelConfirm = async () => {
    setIsProcessing(true);

    try {
      const result = await cancelAppointmentFromConflict(conflict.appointmentId);

      if (!result.success) {
        toast.error(result.error ?? "Failed to cancel appointment");
        return;
      }

      setIsHidden(true);

      if (result.refunded && typeof result.amount === "number") {
        toast.success(`Appointment cancelled. Refunded $${result.amount.toFixed(2)}`);
      } else {
        toast.success("Appointment cancelled");
      }

      setShowCancelDialog(false);
      router.refresh();
    } catch {
      toast.error("Failed to cancel appointment");
    } finally {
      setIsProcessing(false);
      setShowCancelDialog(false);
    }
  };

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3">
        <div className="font-medium">
          {formatDateTime(conflict.appointmentStartsAt, timezone)}
        </div>
        <div className="text-xs text-muted-foreground">
          Until {formatDateTime(conflict.appointmentEndsAt, timezone)}
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="font-medium">{conflict.customerName}</div>
        <div className="text-xs text-muted-foreground">
          {conflict.customerEmail || conflict.customerPhone}
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="font-medium">{conflict.eventSummary || "Untitled Event"}</div>
        <div className="text-xs text-muted-foreground">
          {formatDateTime(conflict.eventStart, timezone)} - {" "}
          {formatDateTime(conflict.eventEnd, timezone)}
        </div>
      </td>

      <td className="px-4 py-3">
        <SeverityBadge severity={conflict.severity} />
      </td>

      <td className="px-4 py-3 text-muted-foreground">
        {formatDateTime(conflict.detectedAt, timezone)}
      </td>

      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            disabled={isProcessing}
          >
            Keep Appointment
          </Button>

          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isProcessing}
              >
                Cancel Appointment
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel this appointment?</DialogTitle>
                <DialogDescription>
                  This will cancel the appointment and resolve this conflict alert. Use this only
                  when you need the calendar time back.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCancelDialog(false)}
                  disabled={isProcessing}
                >
                  Keep It
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancelConfirm}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Cancelling..." : "Yes, Cancel Appointment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </td>
    </tr>
  );
}
