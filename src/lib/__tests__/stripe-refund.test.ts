import { beforeEach, describe, expect, it, vi } from "vitest";
import { appointments, payments } from "@/lib/schema";
import { getStripeClient, stripeIsMocked } from "@/lib/stripe";
import { isReverseTransferFailedError, processRefund } from "@/lib/stripe-refund";
import type Stripe from "stripe";

const refundsCreateMock = vi.fn();
const paymentIntentRetrieveMock = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripeClient: vi.fn(() => ({
    refunds: {
      create: refundsCreateMock,
    },
    paymentIntents: {
      retrieve: paymentIntentRetrieveMock,
    },
  })),
  stripeIsMocked: vi.fn(() => false),
}));

const updateMock = vi.fn();
const insertMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    transaction: vi.fn((callback: (tx: unknown) => unknown) =>
      transactionMock(callback)
    ),
  },
}));

const makeAppointment = (): typeof appointments.$inferSelect => {
  const now = new Date();
  return {
    id: "appt-123",
    shopId: "shop-123",
    customerId: "cust-123",
    startsAt: now,
    endsAt: new Date(now.getTime() + 60 * 60 * 1000),
    status: "booked",
    cancelledAt: null,
    cancellationSource: null,
    policyVersionId: "policy-123",
    eventTypeId: null,
    effectiveBufferAfterMinutes: 0,
    paymentStatus: "paid",
    paymentRequired: true,
    financialOutcome: "unresolved",
    transferHeld: false,
    noShowScore: null,
    noShowRisk: null,
    noShowComputedAt: null,
    confirmationStatus: "none",
    confirmationSentAt: null,
    confirmationDeadline: null,
    resolvedAt: null,
    resolutionReason: null,
    lastEventId: null,
    source: "web",
    sourceSlotOpeningId: null,
    bookingUrl: null,
    reminderTimingsSnapshot: ["24h"],
    calendarEventId: null,
    depositSkipped: null,
    createdAt: now,
    updatedAt: now,
  };
};

const makePayment = (): typeof payments.$inferSelect => {
  const now = new Date();
  return {
    id: "pay-123",
    shopId: "shop-123",
    appointmentId: "appt-123",
    provider: "stripe",
    amountCents: 5000,
    currency: "usd",
    status: "succeeded",
    stripePaymentIntentId: "pi_live_123",
    refundedAmountCents: 0,
    stripeRefundId: null,
    refundedAt: null,
    metadata: null,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
};

type UpdateResult = Array<{ id: string }>;

const setupDbTransaction = (firstUpdateResult: UpdateResult = [{ id: "appt-123" }]) => {
  let updateCall = 0;

  updateMock.mockImplementation(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => {
        updateCall += 1;

        if (updateCall === 1) {
          return {
            returning: vi.fn(async () => firstUpdateResult),
          };
        }

        return {
          returning: vi.fn(async () => [{ id: "event-1" }]),
        };
      }),
    })),
  }));

  insertMock.mockImplementation(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [{ id: "event-1" }]),
    })),
  }));

  transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => {
    const tx = {
      update: updateMock,
      insert: insertMock,
    };

    return callback(tx);
  });
};

describe("processRefund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDbTransaction();
  });

  it("creates a new refund when none exists", async () => {
    paymentIntentRetrieveMock.mockResolvedValue({} as Stripe.PaymentIntent);
    refundsCreateMock.mockResolvedValue({ id: "re_123" } as Stripe.Refund);

    const result = await processRefund({
      appointment: makeAppointment(),
      payment: makePayment(),
      cutoffTime: new Date(),
    });

    expect(refundsCreateMock).toHaveBeenCalledWith(
      {
        payment_intent: "pi_live_123",
        amount: 5000,
        metadata: {
          appointmentId: "appt-123",
          reason: "customer_cancellation",
        },
      },
      {
        idempotencyKey: "refund-appt-123",
      }
    );

    expect(result).toEqual({
      success: true,
      refundId: "re_123",
      amount: 5000,
    });
  });

  it("returns existing refund when already processed", async () => {
    const paymentWithRefund = {
      ...makePayment(),
      stripeRefundId: "re_existing",
      refundedAmountCents: 5000,
    };

    const result = await processRefund({
      appointment: makeAppointment(),
      payment: paymentWithRefund,
      cutoffTime: new Date(),
    });

    expect(refundsCreateMock).not.toHaveBeenCalled();

    expect(result).toEqual({
      success: true,
      refundId: "re_existing",
      amount: 5000,
    });
  });

  it("handles Stripe rate limit error", async () => {
    paymentIntentRetrieveMock.mockResolvedValue({} as Stripe.PaymentIntent);
    refundsCreateMock.mockRejectedValue({
      type: "StripeRateLimitError",
      message: "Too many requests",
    });

    await expect(
      processRefund({
        appointment: makeAppointment(),
        payment: makePayment(),
        cutoffTime: new Date(),
      })
    ).rejects.toThrow("Too many requests. Please try again in a moment.");
  });

  it("handles already refunded error", async () => {
    refundsCreateMock.mockRejectedValue({
      type: "StripeInvalidRequestError",
      message: "Charge has already been refunded",
    });

    paymentIntentRetrieveMock.mockResolvedValue({
      latest_charge: {
        refunds: {
          data: [{ id: "re_existing" }],
        },
      },
    } as unknown as Stripe.PaymentIntent);

    const result = await processRefund({
      appointment: makeAppointment(),
      payment: makePayment(),
      cutoffTime: new Date(),
    });

    expect(result).toEqual({
      success: true,
      refundId: "re_existing",
      amount: 5000,
    });
  });

  it("uses idempotency key to prevent duplicate refunds", async () => {
    paymentIntentRetrieveMock.mockResolvedValue({} as Stripe.PaymentIntent);
    refundsCreateMock.mockResolvedValue({ id: "re_123" } as Stripe.Refund);

    await processRefund({
      appointment: makeAppointment(),
      payment: makePayment(),
      cutoffTime: new Date(),
    });

    expect(refundsCreateMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        idempotencyKey: "refund-appt-123",
      })
    );
  });

  it("uses mock refund flow for test payment intents", async () => {
    const payment = {
      ...makePayment(),
      stripePaymentIntentId: "pi_test_123",
    };

    const result = await processRefund({
      appointment: makeAppointment(),
      payment,
      cutoffTime: new Date(),
    });

    expect(stripeIsMocked).toHaveBeenCalled();
    expect(getStripeClient).not.toHaveBeenCalled();
    expect(refundsCreateMock).not.toHaveBeenCalled();
    expect(result.refundId.startsWith("re_test_")).toBe(true);
  });

  it("returns success when appointment was already cancelled concurrently", async () => {
    setupDbTransaction([]);
    paymentIntentRetrieveMock.mockResolvedValue({} as Stripe.PaymentIntent);
    refundsCreateMock.mockResolvedValue({ id: "re_123" } as Stripe.Refund);

    const result = await processRefund({
      appointment: makeAppointment(),
      payment: makePayment(),
      cutoffTime: new Date(),
    });

    expect(result).toEqual({
      success: true,
      refundId: "re_123",
      amount: 5000,
    });
  });
});

describe("isReverseTransferFailedError", () => {
  it("returns true for Stripe error with 'no transfer to reverse' message", () => {
    const error = {
      type: "StripeInvalidRequestError",
      message: "There is no transfer to reverse on this charge",
    };

    expect(isReverseTransferFailedError(error)).toBe(true);
  });

  it("returns true for Stripe error with 'transfer not found' message", () => {
    const error = {
      type: "StripeInvalidRequestError",
      message: "The transfer associated with this charge was not found",
    };

    expect(isReverseTransferFailedError(error)).toBe(true);
  });

  it("returns false for Stripe error with 'charge_already_refunded' code", () => {
    const error = {
      type: "StripeInvalidRequestError",
      code: "charge_already_refunded",
      message: "Charge has already been refunded",
    };

    expect(isReverseTransferFailedError(error)).toBe(false);
  });

  it("returns false for non-Stripe error", () => {
    const error = new Error("Something went wrong");

    expect(isReverseTransferFailedError(error)).toBe(false);
  });

  it("returns false for Stripe error with unrelated message", () => {
    const error = {
      type: "StripeInvalidRequestError",
      message: "Amount exceeds maximum refund amount",
    };

    expect(isReverseTransferFailedError(error)).toBe(false);
  });
});

describe("processRefund — fallback retry logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDbTransaction();
  });

  it("succeeds on first attempt with reverse_transfer — no retry", async () => {
    paymentIntentRetrieveMock.mockResolvedValue({
      transfer_data: { destination: "acct_connected_123" },
    } as unknown as Stripe.PaymentIntent);

    refundsCreateMock.mockResolvedValue({ id: "re_connect_123" } as Stripe.Refund);

    const result = await processRefund({
      appointment: makeAppointment(),
      payment: makePayment(),
      cutoffTime: new Date(),
    });

    expect(refundsCreateMock).toHaveBeenCalledTimes(1);
    expect(refundsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reverse_transfer: true,
        refund_application_fee: true,
      }),
      expect.objectContaining({
        idempotencyKey: "refund-appt-123",
      })
    );

    expect(result).toEqual({
      success: true,
      refundId: "re_connect_123",
      amount: 5000,
    });
  });

  it("retries without reverse_transfer on no-transfer error", async () => {
    paymentIntentRetrieveMock.mockResolvedValue({
      transfer_data: { destination: "acct_connected_123" },
    } as unknown as Stripe.PaymentIntent);

    const reverseTransferError = {
      type: "StripeInvalidRequestError",
      message: "There is no transfer to reverse on this charge",
    };

    refundsCreateMock
      .mockRejectedValueOnce(reverseTransferError)
      .mockResolvedValueOnce({ id: "re_fallback_123" } as Stripe.Refund);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await processRefund({
      appointment: makeAppointment(),
      payment: makePayment(),
      cutoffTime: new Date(),
    });

    expect(refundsCreateMock).toHaveBeenCalledTimes(2);

    // Second call should NOT have reverse_transfer or refund_application_fee
    const secondCallParams = refundsCreateMock.mock.calls[1]![0] as Stripe.RefundCreateParams;
    expect(secondCallParams.reverse_transfer).toBeUndefined();
    expect(secondCallParams.refund_application_fee).toBeUndefined();
    const fallbackMeta = secondCallParams.metadata as Record<string, string> | undefined;
    expect(fallbackMeta?.fallback).toBe("reverse_transfer_failed");

    expect(result).toEqual({
      success: true,
      refundId: "re_fallback_123",
      amount: 5000,
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[refund-fallback]")
    );

    warnSpy.mockRestore();
  });

  it("propagates error when fallback also fails", async () => {
    paymentIntentRetrieveMock.mockResolvedValue({
      transfer_data: { destination: "acct_connected_123" },
    } as unknown as Stripe.PaymentIntent);

    const reverseTransferError = {
      type: "StripeInvalidRequestError",
      message: "There is no transfer to reverse on this charge",
    };

    const fallbackError = {
      type: "StripeInvalidRequestError",
      message: "Some other invalid request error",
    };

    refundsCreateMock
      .mockRejectedValueOnce(reverseTransferError)
      .mockRejectedValueOnce(fallbackError);

    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      processRefund({
        appointment: makeAppointment(),
        payment: makePayment(),
        cutoffTime: new Date(),
      })
    ).rejects.toThrow();

    expect(refundsCreateMock).toHaveBeenCalledTimes(2);

    vi.restoreAllMocks();
  });

  it("does not retry on non-reverse-transfer Stripe error", async () => {
    paymentIntentRetrieveMock.mockResolvedValue({
      transfer_data: { destination: "acct_connected_123" },
    } as unknown as Stripe.PaymentIntent);

    refundsCreateMock.mockRejectedValue({
      type: "StripeCardError",
      message: "Card was declined",
    });

    await expect(
      processRefund({
        appointment: makeAppointment(),
        payment: makePayment(),
        cutoffTime: new Date(),
      })
    ).rejects.toThrow("Card refund failed. Please contact support.");

    expect(refundsCreateMock).toHaveBeenCalledTimes(1);
  });

  it("uses 'refund-fallback-' idempotency key prefix on retry", async () => {
    paymentIntentRetrieveMock.mockResolvedValue({
      transfer_data: { destination: "acct_connected_123" },
    } as unknown as Stripe.PaymentIntent);

    refundsCreateMock
      .mockRejectedValueOnce({
        type: "StripeInvalidRequestError",
        message: "There is no transfer to reverse on this charge",
      })
      .mockResolvedValueOnce({ id: "re_fallback_456" } as Stripe.Refund);

    vi.spyOn(console, "warn").mockImplementation(() => {});

    await processRefund({
      appointment: makeAppointment(),
      payment: makePayment(),
      cutoffTime: new Date(),
    });

    expect(refundsCreateMock).toHaveBeenCalledTimes(2);

    // First call uses standard key
    expect(refundsCreateMock.mock.calls[0]![1]).toEqual(
      expect.objectContaining({
        idempotencyKey: "refund-appt-123",
      })
    );

    // Second call uses fallback key
    expect(refundsCreateMock.mock.calls[1]![1]).toEqual(
      expect.objectContaining({
        idempotencyKey: "refund-fallback-appt-123",
      })
    );

    vi.restoreAllMocks();
  });
});
