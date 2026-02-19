"use client";

import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  MapPin,
  User,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { calculateCancellationEligibility } from "@/lib/cancellation";
import type { CancellationResponse } from "@/types/cancellation";

interface ManageBookingViewProps {
  appointment: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    durationMinutes: number;
    status: string;
    paymentStatus: string;
    paymentRequired: boolean;
    financialOutcome: string;
  };
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  shop: {
    id: string;
    name: string;
    timezone: string;
  };
  policy: {
    id: string;
    cancelCutoffMinutes: number;
    refundBeforeCutoff: boolean;
    currency: string;
  };
  payment: {
    id: string;
    status: string;
    amountCents: number;
    currency: string;
    refundedAmountCents: number;
    stripeRefundId: string | null;
  } | null;
  token: string;
}

const formatCurrency = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

const formatStatus = (value: string) => value.replace(/_/g, " ");

const formatCutoffWindow = (minutes: number) => {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${minutes} minutes`;
};

export function ManageBookingView({
  appointment,
  customer,
  shop,
  policy,
  payment,
  token,
}: ManageBookingViewProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const eligibility = calculateCancellationEligibility(
    appointment.startsAt,
    policy.cancelCutoffMinutes,
    shop.timezone,
    payment?.status ?? null,
    appointment.status,
    policy.refundBeforeCutoff
  );

  const appointmentTimeFormatted = formatInTimeZone(
    appointment.startsAt,
    shop.timezone,
    "EEEE, MMMM d, yyyy 'at' h:mm a zzz"
  );

  const endTimeFormatted = formatInTimeZone(
    appointment.endsAt,
    shop.timezone,
    "h:mm a zzz"
  );

  const handleCancelConfirm = async () => {
    setIsCancelling(true);
    setCancelError(null);

    try {
      const response = await fetch(`/api/manage/${token}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json()) as CancellationResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to cancel appointment");
      }

      window.location.reload();
    } catch (error) {
      setCancelError(
        error instanceof Error
          ? error.message
          : "Failed to cancel appointment. Please try again."
      );
      setIsCancelling(false);
    } finally {
      setShowConfirmDialog(false);
    }
  };

  const StatusBadge = () => {
    if (appointment.status === "cancelled") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" aria-hidden="true" />
          Cancelled
        </Badge>
      );
    }
    if (appointment.status === "ended") {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" aria-hidden="true" />
          Completed
        </Badge>
      );
    }
    if (appointment.status === "pending") {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          Pending payment
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" aria-hidden="true" />
        Confirmed
      </Badge>
    );
  };

  const refundMessage = () => {
    if (!policy.refundBeforeCutoff) {
      return "This shop does not offer refunds for cancellations.";
    }

    if (!payment) {
      return "No payment has been collected for this appointment.";
    }

    if (payment.status !== "succeeded") {
      return "Your payment has not completed, so refunds are not available yet.";
    }

    if (!eligibility.isBeforeCutoff) {
      return "The cancellation deadline has passed. Your deposit will be retained per the cancellation policy.";
    }

    return `If you cancel now, you'll receive a full refund of ${formatCurrency(
      payment.amountCents,
      payment.currency
    )} to your original payment method.`;
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Manage your booking</h1>
        <p className="text-sm text-muted-foreground">
          View appointment details and cancellation eligibility.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold">Appointment details</h2>
            <p className="text-sm text-muted-foreground">
              Ends at {endTimeFormatted}
            </p>
          </div>
          <StatusBadge />
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted-foreground">Date & time</p>
              <p className="font-medium">{appointmentTimeFormatted}</p>
              <p className="text-sm text-muted-foreground">
                Duration: {appointment.durationMinutes} minutes
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{shop.name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{customer.fullName}</p>
              <p className="text-sm text-muted-foreground">{customer.email}</p>
              <p className="text-sm text-muted-foreground">{customer.phone}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted-foreground">Payment</p>
              {payment ? (
                <>
                  <p className="font-medium">
                    {formatCurrency(payment.amountCents, payment.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    Status: {formatStatus(payment.status)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {appointment.paymentRequired
                    ? "Payment pending"
                    : "No payment required"}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {appointment.status === "booked" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Cancellation policy</h2>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted-foreground">
                Cancellation deadline
              </p>
              <p className="font-medium">{eligibility.cutoffTimeFormatted}</p>
              <p className="text-sm text-muted-foreground">
                ({formatCutoffWindow(policy.cancelCutoffMinutes)} before
                appointment)
              </p>
            </div>
          </div>

          <Separator />

          <div
            className={`flex items-start gap-3 rounded-lg border p-4 ${
              eligibility.isEligibleForRefund
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            {eligibility.isEligibleForRefund ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" aria-hidden="true" />
            )}
            <div className="flex-1">
              <p className="font-semibold mb-1">
                {eligibility.isEligibleForRefund
                  ? "Full refund available"
                  : "No refund available"}
              </p>
              <p className="text-sm text-muted-foreground">{refundMessage()}</p>
            </div>
          </div>
        </Card>
      )}

      {appointment.status === "cancelled" && (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            {appointment.financialOutcome === "refunded" ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Refund Processed</h3>
                  <p className="text-sm text-muted-foreground">
                    Your appointment has been cancelled and a full refund of{" "}
                    {payment
                      ? formatCurrency(
                          payment.refundedAmountCents || payment.amountCents,
                          payment.currency
                        )
                      : "$0.00"}{" "}
                    has been issued to your original payment method.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Refunds typically appear within 5-10 business days.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    Appointment Cancelled
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your appointment has been cancelled. The deposit has been
                    retained per the cancellation policy (cancelled after
                    deadline).
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {appointment.status === "booked" && (
        <div className="flex flex-col gap-4">
          {cancelError ? (
            <p className="text-sm text-destructive" role="alert">{cancelError}</p>
          ) : null}

          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={() => setShowConfirmDialog(true)}
            disabled={isCancelling}
          >
            Cancel appointment
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By clicking &ldquo;Cancel appointment&rdquo;, you understand that{" "}
            {eligibility.isEligibleForRefund
              ? "you will receive a full refund"
              : "your deposit will be retained per the cancellation policy"}
            .
          </p>
        </div>
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel appointment?</DialogTitle>
            <DialogDescription>
              {eligibility.isEligibleForRefund
                ? `You will receive a full refund of ${payment ? formatCurrency(payment.amountCents, payment.currency) : ""} to your original payment method.`
                : "Your deposit will be retained per the cancellation policy. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isCancelling}
            >
              Keep appointment
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling ? "Processing…" : "Cancel appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
