import { addDays, addHours } from "date-fns";
import { describe, expect, it } from "vitest";
import { calculateCancellationEligibility } from "../cancellation";

describe("calculateCancellationEligibility", () => {
  const shopTimezone = "America/New_York";

  it("returns eligible when before cutoff and payment succeeded", () => {
    const appointmentTime = addDays(new Date(), 7);
    const cutoffMinutes = 1440;

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      shopTimezone,
      "succeeded",
      "booked",
      true
    );

    expect(result.isEligibleForRefund).toBe(true);
    expect(result.timeUntilCutoff).toBeGreaterThan(0);
  });

  it("returns not eligible when past cutoff", () => {
    const appointmentTime = addHours(new Date(), 12);
    const cutoffMinutes = 1440;

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      shopTimezone,
      "succeeded",
      "booked",
      true
    );

    expect(result.isEligibleForRefund).toBe(false);
    expect(result.timeUntilCutoff).toBeLessThan(0);
  });

  it("returns not eligible when payment not succeeded", () => {
    const appointmentTime = addDays(new Date(), 7);
    const cutoffMinutes = 1440;

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      shopTimezone,
      "pending",
      "booked",
      true
    );

    expect(result.isEligibleForRefund).toBe(false);
  });

  it("returns not eligible when appointment already cancelled", () => {
    const appointmentTime = addDays(new Date(), 7);
    const cutoffMinutes = 1440;

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      shopTimezone,
      "succeeded",
      "cancelled",
      true
    );

    expect(result.isEligibleForRefund).toBe(false);
  });

  it("returns not eligible when policy does not allow refunds", () => {
    const appointmentTime = addDays(new Date(), 7);
    const cutoffMinutes = 1440;

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      shopTimezone,
      "succeeded",
      "booked",
      false
    );

    expect(result.isEligibleForRefund).toBe(false);
    expect(result.refundAllowedByPolicy).toBe(false);
  });

  it("calculates cutoff time correctly", () => {
    const appointmentTime = new Date("2025-03-01T14:00:00Z");
    const cutoffMinutes = 1440;

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      shopTimezone,
      "succeeded",
      "booked",
      true
    );

    const expectedCutoff = new Date("2025-02-28T14:00:00Z");
    expect(result.cutoffTime.getTime()).toBe(expectedCutoff.getTime());
  });

  it("formats cutoff time in correct timezone", () => {
    const appointmentTime = new Date("2025-03-01T14:00:00Z");
    const cutoffMinutes = 1440;

    const result = calculateCancellationEligibility(
      appointmentTime,
      cutoffMinutes,
      "America/New_York",
      "succeeded",
      "booked",
      true
    );

    expect(result.cutoffTimeFormatted).toMatch(/EST|EDT/);
  });

  it("handles different cutoff windows", () => {
    const appointmentTime = addDays(new Date(), 3);

    const result48h = calculateCancellationEligibility(
      appointmentTime,
      2880,
      shopTimezone,
      "succeeded",
      "booked",
      true
    );

    const result2h = calculateCancellationEligibility(
      appointmentTime,
      120,
      shopTimezone,
      "succeeded",
      "booked",
      true
    );

    expect(result48h.cutoffTime).not.toEqual(result2h.cutoffTime);
    expect(result48h.timeUntilCutoff).toBeLessThan(result2h.timeUntilCutoff);
  });
});
