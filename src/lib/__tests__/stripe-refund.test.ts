import { beforeEach, describe, expect, it, vi } from "vitest";
import { appointments, payments } from "@/lib/schema";
import { getStripeClient, stripeIsMocked } from "@/lib/stripe";
import { processRefund } from "@/lib/stripe-refund";
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
    paymentStatus: "paid",
    paymentRequired: true,
    financialOutcome: "unresolved",
    resolvedAt: null,
    resolutionReason: null,
    lastEventId: null,
    bookingUrl: null,
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
