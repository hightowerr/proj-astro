"use client";

import { useState } from "react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  MapPin,
  Tag,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    eventTypeName?: string | null;
  };
  customer: {
    fullName: string;
    email: string;
    phone: string;
    emailOptIn: boolean;
  };
  shop: {
    id: string;
    name: string;
    timezone: string;
    slug: string;
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
  const [emailOptIn, setEmailOptIn] = useState(customer.emailOptIn);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState<string | null>(
    null
  );

  const eligibility = calculateCancellationEligibility(
    appointment.startsAt,
    policy.cancelCutoffMinutes,
    shop.timezone,
    payment?.status ?? null,
    appointment.status,
    policy.refundBeforeCutoff
  );
  const canCancel = appointment.status === "booked" || appointment.status === "pending";
  const isPendingPayment = appointment.status === "pending";

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

  const handleEmailPreferenceChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const nextValue = event.target.checked;

    setEmailOptIn(nextValue);
    setIsUpdatingPreferences(true);
    setPreferencesMessage(null);

    try {
      const response = await fetch(`/api/manage/${token}/update-preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emailOptIn: nextValue }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update preferences");
      }

      setPreferencesMessage(
        data.message ??
          (nextValue
            ? "You'll receive email reminders for future appointments."
            : "Email reminders have been turned off.")
      );
    } catch (error) {
      setEmailOptIn(!nextValue);
      setPreferencesMessage(
        error instanceof Error
          ? error.message
          : "Failed to update preferences. Please try again."
      );
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

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
    const baseStyle = {
      display: "inline-flex" as const,
      alignItems: "center" as const,
      gap: "0.375rem",
      padding: "0.25rem 0.625rem",
      borderRadius: "var(--radius-full)",
      fontSize: "0.6875rem",
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase" as const,
    };

    if (appointment.status === "cancelled") {
      return (
        <span style={{
          ...baseStyle,
          background: "var(--al-status-negative-bg)",
          border: "1px solid var(--al-status-negative-border)",
          color: "var(--al-status-negative)",
        }}>
          <XCircle className="h-3 w-3" aria-hidden="true" />
          Cancelled
        </span>
      );
    }
    if (appointment.status === "ended") {
      return (
        <span style={{
          ...baseStyle,
          background: "rgba(0, 30, 64, 0.08)",
          border: "1px solid var(--al-hairline-rest)",
          color: "var(--al-primary)",
        }}>
          <CheckCircle className="h-3 w-3" aria-hidden="true" />
          Completed
        </span>
      );
    }
    if (appointment.status === "pending") {
      return (
        <span style={{
          ...baseStyle,
          background: "var(--al-status-caution-bg)",
          border: "1px solid var(--al-status-caution-border)",
          color: "var(--al-status-caution)",
        }}>
          <Clock className="h-3 w-3" aria-hidden="true" />
          Pending payment
        </span>
      );
    }
    return (
      <span style={{
        ...baseStyle,
        background: "var(--al-status-positive-bg)",
        border: "1px solid var(--al-status-positive-border)",
        color: "var(--al-status-positive)",
      }}>
        <CheckCircle className="h-3 w-3" aria-hidden="true" />
        Confirmed
      </span>
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
        <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
          View appointment details and cancellation eligibility.
        </p>
        <Link
          href={`/book/${shop.slug}`}
          className="inline-flex items-center"
          style={{
            background: "transparent",
            border: "1px solid var(--al-hairline-rest)",
            color: "var(--al-primary)",
            borderRadius: "var(--radius-lg)",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Book again
        </Link>
      </div>

      <div className="rounded-2xl p-6" style={{
        background: "var(--al-surface-container-lowest)",
        border: "1px solid var(--al-outline-variant)",
      }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold">Appointment details</h2>
            <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
              Ends at {endTimeFormatted}
            </p>
          </div>
          <StatusBadge />
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 mt-0.5" style={{ color: "var(--al-on-surface-variant)" }} aria-hidden="true" />
            <div>
              <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>Date &amp; time</p>
              <p className="font-medium" style={{ color: "var(--al-on-surface)" }}>{appointmentTimeFormatted}</p>
              <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
                Duration: {appointment.durationMinutes} minutes
              </p>
            </div>
          </div>

          {appointment.eventTypeName ? (
            <div className="flex items-start gap-3">
              <Tag className="mt-0.5 h-5 w-5" style={{ color: "var(--al-on-surface-variant)" }} aria-hidden="true" />
              <div>
                <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>Service</p>
                <p className="font-medium" style={{ color: "var(--al-on-surface)" }}>{appointment.eventTypeName}</p>
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 mt-0.5" style={{ color: "var(--al-on-surface-variant)" }} aria-hidden="true" />
            <div>
              <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>Location</p>
              <p className="font-medium" style={{ color: "var(--al-on-surface)" }}>{shop.name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="h-5 w-5 mt-0.5" style={{ color: "var(--al-on-surface-variant)" }} aria-hidden="true" />
            <div>
              <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>Customer</p>
              <p className="font-medium" style={{ color: "var(--al-on-surface)" }}>{customer.fullName}</p>
              <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>{customer.email}</p>
              <p className="text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--al-on-surface-variant)" }}>{customer.phone}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 mt-0.5" style={{ color: "var(--al-on-surface-variant)" }} aria-hidden="true" />
            <div>
              <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>Payment</p>
              {payment ? (
                <>
                  <p className="font-medium" style={{ fontFamily: "var(--font-mono)", color: "var(--al-primary)" }}>
                    {formatCurrency(payment.amountCents, payment.currency)}
                  </p>
                  <p className="text-sm capitalize" style={{ color: "var(--al-on-surface-variant)" }}>
                    Status: {formatStatus(payment.status)}
                  </p>
                </>
              ) : (
                <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
                  {appointment.paymentRequired
                    ? "Payment pending"
                    : "No payment required"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-6 space-y-4" style={{
        background: "var(--al-surface-container-lowest)",
        border: "1px solid var(--al-outline-variant)",
      }}>
        <div>
          <h2 className="text-xl font-semibold">Email preferences</h2>
          <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
            Control whether this booking can receive reminder emails.
          </p>
        </div>

        <label
          htmlFor="emailOptIn"
          className="flex items-start gap-3 cursor-pointer rounded-xl p-4"
          style={{
            background: "var(--al-surface-container-low)",
            border: "1px solid var(--al-outline-variant)",
          }}
        >
          <input
            id="emailOptIn"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input"
            checked={emailOptIn}
            onChange={handleEmailPreferenceChange}
            disabled={isUpdatingPreferences}
          />
          <div className="space-y-1">
            <p className="font-medium">Send me email reminders</p>
            <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
              Get an email reminder about 24 hours before your appointment.
            </p>
          </div>
        </label>

        {preferencesMessage ? (
          <p
            className="text-sm"
            style={{
              color: preferencesMessage.toLowerCase().includes("failed")
                ? "var(--al-status-negative)"
                : "var(--al-status-positive)",
            }}
            role="status"
          >
            {preferencesMessage}
          </p>
        ) : null}
      </div>

      {canCancel && (
        <div className="rounded-2xl p-6 space-y-4" style={{
          background: "var(--al-surface-container-lowest)",
          border: "1px solid var(--al-outline-variant)",
        }}>
          <h2 className="text-xl font-semibold">
            {isPendingPayment ? "Cancellation" : "Cancellation policy"}
          </h2>

          {isPendingPayment ? (
            <div
              className="flex items-start gap-3 rounded-lg p-4"
              style={{
                background: "var(--al-status-positive-bg)",
                border: "1px solid var(--al-status-positive-border)",
              }}
            >
              <CheckCircle className="h-5 w-5 mt-0.5" style={{ color: "var(--al-status-positive)" }} aria-hidden="true" />
              <div className="flex-1">
                <p className="font-semibold mb-1">No payment has been taken</p>
                <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
                  You can cancel this booking now. No refund is needed because the payment is still pending.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 mt-0.5" style={{ color: "var(--al-on-surface-variant)" }} aria-hidden="true" />
                <div>
                  <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
                    Cancellation deadline
                  </p>
                  <p className="font-medium" style={{ color: "var(--al-on-surface)" }}>{eligibility.cutoffTimeFormatted}</p>
                  <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
                    ({formatCutoffWindow(policy.cancelCutoffMinutes)} before
                    appointment)
                  </p>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--al-ghost-border)", margin: "0.25rem 0" }} />

              <div
                className="flex items-start gap-3 rounded-lg p-4"
                style={
                  eligibility.isEligibleForRefund
                    ? {
                        background: "var(--al-status-positive-bg)",
                        border: "1px solid var(--al-status-positive-border)",
                      }
                    : {
                        background: "var(--al-status-caution-bg)",
                        border: "1px solid var(--al-status-caution-border)",
                      }
                }
              >
                {eligibility.isEligibleForRefund ? (
                  <CheckCircle className="h-5 w-5 mt-0.5" style={{ color: "var(--al-status-positive)" }} aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: "var(--al-status-caution)" }} aria-hidden="true" />
                )}
                <div className="flex-1">
                  <p className="font-semibold mb-1">
                    {eligibility.isEligibleForRefund
                      ? "Full refund available"
                      : "No refund available"}
                  </p>
                  <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>{refundMessage()}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {appointment.status === "cancelled" && (
        <div className="rounded-2xl p-6" style={{
          background: "var(--al-surface-container-lowest)",
          border: "1px solid var(--al-outline-variant)",
        }}>
          <div className="flex items-start gap-3">
            {appointment.financialOutcome === "refunded" ? (
              <>
                <CheckCircle className="h-6 w-6 mt-0.5" style={{ color: "var(--al-status-positive)" }} aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">Refund Processed</h3>
                  <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
                    Your appointment has been cancelled and a full refund of{" "}
                    {payment
                      ? formatCurrency(
                          payment.refundedAmountCents || payment.amountCents,
                          payment.currency
                        )
                      : "$0.00"}{" "}
                    has been issued to your original payment method.
                  </p>
                  <p className="text-sm mt-2" style={{ color: "var(--al-on-surface-variant)" }}>
                    Refunds typically appear within 5-10 business days.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 mt-0.5" style={{ color: "var(--al-status-caution)" }} aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    Appointment Cancelled
                  </h3>
                  <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
                    Your appointment has been cancelled. The deposit has been
                    retained per the cancellation policy (cancelled after
                    deadline).
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {canCancel && (
        <div className="flex flex-col gap-4">
          {cancelError ? (
            <p className="text-sm" style={{ color: "var(--al-status-negative)" }} role="alert">{cancelError}</p>
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

          <p className="text-xs text-center" style={{ color: "var(--al-on-surface-variant)" }}>
            By clicking &ldquo;Cancel appointment&rdquo;, you understand that{" "}
            {isPendingPayment
              ? "no payment has been taken"
              : eligibility.isEligibleForRefund
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
              {isPendingPayment
                ? "No payment has been taken yet. This will cancel your booking and cannot be undone."
                : eligibility.isEligibleForRefund
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
              {isCancelling ? "Processing\u2026" : "Cancel appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
