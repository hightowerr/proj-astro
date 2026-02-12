import { addMinutes, isBefore } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export interface CancellationEligibility {
  cutoffTime: Date;
  isEligibleForRefund: boolean;
  isBeforeCutoff: boolean;
  refundAllowedByPolicy: boolean;
  paymentSucceeded: boolean;
  timeUntilCutoff: number;
  cutoffTimeFormatted: string;
}

/**
 * Calculate cancellation eligibility based on policy and payment status.
 */
export function calculateCancellationEligibility(
  appointmentStartsAt: Date,
  cancelCutoffMinutes: number,
  shopTimezone: string,
  paymentStatus: string | null,
  appointmentStatus: string,
  refundBeforeCutoff: boolean
): CancellationEligibility {
  const now = new Date();

  const cutoffTime = addMinutes(appointmentStartsAt, -cancelCutoffMinutes);
  const timeUntilCutoff = cutoffTime.getTime() - now.getTime();
  const isBeforeCutoff = isBefore(now, cutoffTime);
  const paymentSucceeded = paymentStatus === "succeeded";

  const isEligibleForRefund =
    refundBeforeCutoff &&
    isBeforeCutoff &&
    paymentSucceeded &&
    appointmentStatus === "booked";

  const cutoffTimeFormatted = formatInTimeZone(
    cutoffTime,
    shopTimezone,
    "MMM d, yyyy 'at' h:mm a zzz"
  );

  return {
    cutoffTime,
    isEligibleForRefund,
    isBeforeCutoff,
    refundAllowedByPolicy: refundBeforeCutoff,
    paymentSucceeded,
    timeUntilCutoff,
    cutoffTimeFormatted,
  };
}
