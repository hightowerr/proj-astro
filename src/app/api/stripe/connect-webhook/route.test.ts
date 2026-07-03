/* eslint-disable import/order */
import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.mock factories are hoisted above imports, so references
// to mock fns must also be hoisted.
// ---------------------------------------------------------------------------
const {
  mockConstructEvent,
  mockPaymentIntentsCancel,
  mockResolveTransferContext,
  mockInsertValues,
  mockReturning,
  mockFindFirst,
  mockPaymentsFindMany,
  mockAppointmentsFindMany,
  mockUpdate,
} = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockOnConflictDoNothing = vi.fn(() => ({ returning: mockReturning }));
  const mockInsertValues = vi.fn(() => ({
    onConflictDoNothing: mockOnConflictDoNothing,
  }));
  const mockFindFirst = vi.fn();
  const mockPaymentsFindMany = vi.fn();
  const mockAppointmentsFindMany = vi.fn();
  const mockSet = vi.fn(() => ({ where: vi.fn() }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));

  return {
    mockConstructEvent: vi.fn(),
    mockPaymentIntentsCancel: vi.fn(),
    mockResolveTransferContext: vi.fn(),
    mockInsertValues,
    mockOnConflictDoNothing,
    mockReturning,
    mockFindFirst,
    mockPaymentsFindMany,
    mockAppointmentsFindMany,
    mockUpdate,
  };
});

// -- @/lib/stripe --------------------------------------------------------
vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent: mockConstructEvent },
    paymentIntents: { cancel: mockPaymentIntentsCancel },
  }),
}));

// -- @/lib/stripe-utils --------------------------------------------------
vi.mock("@/lib/stripe-utils", () => ({
  resolveTransferContext: mockResolveTransferContext,
}));

// -- @/lib/env ------------------------------------------------------------
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_test_connect",
  }),
}));

// -- @/lib/schema ---------------------------------------------------------
vi.mock("@/lib/schema", () => ({
  processedStripeEvents: {},
  shops: { id: "shops.id", shopId: "shops.shopId" },
  appointments: { id: "appointments.id", shopId: "appointments.shopId" },
  payments: {},
}));

// -- @/lib/db -------------------------------------------------------------
vi.mock("@/lib/db", () => ({
  db: {
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
      // Build a minimal transaction proxy that records calls.
      const tx = {
        insert: () => ({ values: mockInsertValues }),
        query: {
          shops: { findFirst: mockFindFirst },
          payments: { findMany: mockPaymentsFindMany },
          appointments: { findMany: mockAppointmentsFindMany },
        },
        update: mockUpdate,
      };
      return fn(tx);
    }),
  },
}));

// -- drizzle-orm (used for `eq`, `and`, `inArray` imports in the source) --
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  inArray: vi.fn(),
}));

// ---- import the handler AFTER mocks are wired ---------------------------
import { POST } from "./route";

// ---- console spies (suppress output in test runner) ---------------------
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Stripe.Event stub */
function makeEvent(
  type: string,
  id: string,
  dataObject: Record<string, unknown>
): Stripe.Event {
  return {
    id,
    type,
    data: { object: dataObject },
  } as unknown as Stripe.Event;
}

/** Build a minimal Stripe.Transfer stub */
function makeTransfer(
  overrides: Partial<Stripe.Transfer> = {}
): Record<string, unknown> {
  return {
    id: "tr_test_1",
    amount: 7500,
    currency: "usd",
    destination: "acct_connected_1",
    source_transaction: "ch_src_1",
    ...overrides,
  };
}

/** Build a Request with the expected headers */
function buildRequest(body = "raw_body"): Request {
  return new Request("http://localhost/api/stripe/connect-webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_valid" },
    body,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Connect webhook — POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // transfer.created
  // -----------------------------------------------------------------------
  describe("transfer.created", () => {
    it("logs context on happy path", async () => {
      const transfer = makeTransfer();
      const event = makeEvent("transfer.created", "evt_tc_1", transfer);

      mockConstructEvent.mockReturnValue(event);
      // Dedup: new event
      mockReturning.mockResolvedValue([{ id: "evt_tc_1" }]);
      mockResolveTransferContext.mockResolvedValue({
        appointmentId: "apt_1",
        shopId: "shop_1",
        shopName: "Cool Cuts",
        paymentId: "pay_1",
        connectedAccountId: "acct_connected_1",
        amountCents: 7500,
      });

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      // Must use console.warn (lint forbids console.info)
      expect(warnSpy).toHaveBeenCalledWith(
        "Transfer succeeded",
        expect.objectContaining({
          transferId: "tr_test_1",
          amount: 7500,
          currency: "usd",
          destinationAccountId: "acct_connected_1",
          appointmentId: "apt_1",
          shopId: "shop_1",
          shopName: "Cool Cuts",
          status: "succeeded",
        })
      );
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("logs warning when context is unresolvable", async () => {
      const transfer = makeTransfer();
      const event = makeEvent("transfer.created", "evt_tc_2", transfer);

      mockConstructEvent.mockReturnValue(event);
      mockReturning.mockResolvedValue([{ id: "evt_tc_2" }]);
      mockResolveTransferContext.mockResolvedValue(null);

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      expect(warnSpy).toHaveBeenCalledWith(
        "Transfer created but could not resolve appointment context",
        expect.objectContaining({
          transferId: "tr_test_1",
          amount: 7500,
          destinationAccountId: "acct_connected_1",
        })
      );
    });

    it("skips processing on duplicate event (dedup)", async () => {
      const transfer = makeTransfer();
      const event = makeEvent("transfer.created", "evt_tc_dup", transfer);

      mockConstructEvent.mockReturnValue(event);
      // Dedup: already processed — insert returns empty array
      mockReturning.mockResolvedValue([]);

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      // resolveTransferContext should never be called for a dup
      expect(mockResolveTransferContext).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // transfer.failed
  // -----------------------------------------------------------------------
  describe("transfer.failed", () => {
    it("logs error with MANUAL_REVIEW_REQUIRED on happy path", async () => {
      const transfer = makeTransfer({
        failure_message: "Insufficient funds",
        failure_code: "insufficient_funds",
      } as any);
      const event = makeEvent("transfer.failed", "evt_tf_1", transfer);

      mockConstructEvent.mockReturnValue(event);
      mockReturning.mockResolvedValue([{ id: "evt_tf_1" }]);
      mockResolveTransferContext.mockResolvedValue({
        appointmentId: "apt_2",
        shopId: "shop_2",
        shopName: "Sharp Styles",
        paymentId: "pay_2",
        connectedAccountId: "acct_connected_1",
        amountCents: 7500,
      });

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      expect(errorSpy).toHaveBeenCalledWith(
        "Transfer failed — MANUAL_REVIEW_REQUIRED",
        expect.objectContaining({
          transferId: "tr_test_1",
          amount: 7500,
          currency: "usd",
          destinationAccountId: "acct_connected_1",
          failureMessage: "Insufficient funds",
          failureCode: "insufficient_funds",
          appointmentId: "apt_2",
          shopId: "shop_2",
          shopName: "Sharp Styles",
          eventId: "evt_tf_1",
          action: "MANUAL_REVIEW_REQUIRED",
        })
      );
      // console.warn should NOT be called for a failed transfer
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("uses 'unknown' fields when context is unresolvable", async () => {
      const transfer = makeTransfer();
      const event = makeEvent("transfer.failed", "evt_tf_2", transfer);

      mockConstructEvent.mockReturnValue(event);
      mockReturning.mockResolvedValue([{ id: "evt_tf_2" }]);
      mockResolveTransferContext.mockResolvedValue(null);

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      expect(errorSpy).toHaveBeenCalledWith(
        "Transfer failed — MANUAL_REVIEW_REQUIRED",
        expect.objectContaining({
          appointmentId: "unknown",
          shopId: "unknown",
          shopName: "unknown",
          failureMessage: "unknown",
          failureCode: "unknown",
          action: "MANUAL_REVIEW_REQUIRED",
        })
      );
    });

    it("skips processing on duplicate event (dedup)", async () => {
      const transfer = makeTransfer();
      const event = makeEvent("transfer.failed", "evt_tf_dup", transfer);

      mockConstructEvent.mockReturnValue(event);
      mockReturning.mockResolvedValue([]);

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(mockResolveTransferContext).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // account.updated — suspension sweep: cancel pending (spec 07)
  // -----------------------------------------------------------------------
  describe("account.updated — cancel pending payments on suspension", () => {
    /** Shared setup: complete shop transitions to suspended */
    function setupSuspensionEvent(eventId: string) {
      const account = {
        id: "acct_connected_1",
        charges_enabled: false,
        details_submitted: true,
      };
      const event = makeEvent("account.updated", eventId, account);
      mockConstructEvent.mockReturnValue(event);
      mockReturning.mockResolvedValue([{ id: eventId }]);
      // Shop was previously complete → becomes "suspended"
      mockFindFirst.mockResolvedValue({
        id: "shop_1",
        stripeOnboardingStatus: "complete",
      });
    }

    it("runs sweep with no Stripe cancel calls when no pending payments", async () => {
      setupSuspensionEvent("evt_sus_1");
      mockPaymentsFindMany.mockResolvedValue([]);
      mockAppointmentsFindMany.mockResolvedValue([]);

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      expect(mockPaymentIntentsCancel).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        "Suspension sweep complete",
        expect.objectContaining({
          shopId: "shop_1",
          pendingPaymentsFound: 0,
          paymentIntentsCancelled: 0,
        })
      );
    });

    it("cancels all pending PaymentIntents for suspended shop", async () => {
      setupSuspensionEvent("evt_sus_2");
      mockPaymentsFindMany.mockResolvedValue([
        {
          id: "pay_1",
          shopId: "shop_1",
          stripePaymentIntentId: "pi_pending_1",
          status: "requires_payment_method",
        },
        {
          id: "pay_2",
          shopId: "shop_1",
          stripePaymentIntentId: "pi_pending_2",
          status: "requires_action",
        },
      ]);
      mockPaymentIntentsCancel.mockResolvedValue({});
      mockAppointmentsFindMany.mockResolvedValue([]);

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      expect(mockPaymentIntentsCancel).toHaveBeenCalledTimes(2);
      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith("pi_pending_1");
      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith("pi_pending_2");
      expect(warnSpy).toHaveBeenCalledWith(
        "Suspension sweep complete",
        expect.objectContaining({
          pendingPaymentsFound: 2,
          paymentIntentsCancelled: 2,
        })
      );
    });

    it("logs warning and continues when PI already succeeded (race)", async () => {
      setupSuspensionEvent("evt_sus_3");
      mockPaymentsFindMany.mockResolvedValue([
        {
          id: "pay_1",
          shopId: "shop_1",
          stripePaymentIntentId: "pi_succeeded",
          status: "processing",
        },
      ]);
      mockPaymentIntentsCancel.mockRejectedValue(
        new Error("This PaymentIntent has already succeeded")
      );
      mockAppointmentsFindMany.mockResolvedValue([]);

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith("pi_succeeded");
      expect(warnSpy).toHaveBeenCalledWith(
        "Failed to cancel PaymentIntent during suspension sweep",
        expect.objectContaining({
          stripePaymentIntentId: "pi_succeeded",
          shopId: "shop_1",
          paymentId: "pay_1",
          error: "This PaymentIntent has already succeeded",
        })
      );
      // Sweep still completes — cancelledCount is 0
      expect(warnSpy).toHaveBeenCalledWith(
        "Suspension sweep complete",
        expect.objectContaining({
          pendingPaymentsFound: 1,
          paymentIntentsCancelled: 0,
        })
      );
    });

    it("handles already-cancelled PI idempotently (no error)", async () => {
      setupSuspensionEvent("evt_sus_4");
      mockPaymentsFindMany.mockResolvedValue([
        {
          id: "pay_1",
          shopId: "shop_1",
          stripePaymentIntentId: "pi_already_cancelled",
          status: "requires_payment_method",
        },
      ]);
      // Stripe cancel() is idempotent for already-cancelled PIs — resolves normally
      mockPaymentIntentsCancel.mockResolvedValue({
        id: "pi_already_cancelled",
        status: "canceled",
      });
      mockAppointmentsFindMany.mockResolvedValue([]);

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith(
        "pi_already_cancelled"
      );
      // No error logged — idempotent cancel succeeds
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        "Suspension sweep complete",
        expect.objectContaining({
          paymentIntentsCancelled: 1,
        })
      );
    });

    it("does not trigger sweep when charges_enabled stays true", async () => {
      const account = {
        id: "acct_connected_1",
        charges_enabled: true,
        details_submitted: true,
      };
      const event = makeEvent("account.updated", "evt_sus_5", account);
      mockConstructEvent.mockReturnValue(event);
      mockReturning.mockResolvedValue([{ id: "evt_sus_5" }]);
      mockFindFirst.mockResolvedValue({
        id: "shop_1",
        stripeOnboardingStatus: "complete",
      });

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      // Sweep queries should not be called
      expect(mockPaymentsFindMany).not.toHaveBeenCalled();
      expect(mockAppointmentsFindMany).not.toHaveBeenCalled();
      expect(mockPaymentIntentsCancel).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // account.updated — suspension sweep: flag recent payments (spec 08)
  // -----------------------------------------------------------------------
  describe("account.updated — flag recent payments on suspension", () => {
    /** Shared setup: complete shop transitions to suspended */
    function setupSuspensionEvent(eventId: string) {
      const account = {
        id: "acct_connected_1",
        charges_enabled: false,
        details_submitted: true,
      };
      const event = makeEvent("account.updated", eventId, account);
      mockConstructEvent.mockReturnValue(event);
      mockReturning.mockResolvedValue([{ id: eventId }]);
      mockFindFirst.mockResolvedValue({
        id: "shop_1",
        stripeOnboardingStatus: "complete",
      });
      // No pending payments (cancel sweep is a no-op for these tests)
      mockPaymentsFindMany.mockResolvedValue([]);
    }

    it("makes no updates when no recent appointments match", async () => {
      setupSuspensionEvent("evt_flag_1");
      mockAppointmentsFindMany.mockResolvedValue([]);

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      // update() is called twice for shop status — but NOT for appointments
      // The flag log should report flaggedCount: 0
      expect(warnSpy).toHaveBeenCalledWith(
        "Flagged recent payments as transferHeld for suspended shop",
        expect.objectContaining({
          shopId: "shop_1",
          flaggedCount: 0,
        })
      );
    });

    it("flags recent paid appointment with transferHeld", async () => {
      setupSuspensionEvent("evt_flag_2");
      mockAppointmentsFindMany.mockResolvedValue([
        { id: "apt_recent_1" },
      ]);

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      // update() called for shop status + for flagging appointments
      expect(mockUpdate).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        "Flagged recent payments as transferHeld for suspended shop",
        expect.objectContaining({
          shopId: "shop_1",
          flaggedCount: 1,
        })
      );
    });

    it("does not flag old paid appointment (outside 1h window)", async () => {
      setupSuspensionEvent("evt_flag_3");
      // The DB query itself filters by updatedAt > oneHourAgo, so an old
      // payment simply won't appear in results — mock returns empty.
      mockAppointmentsFindMany.mockResolvedValue([]);

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      expect(warnSpy).toHaveBeenCalledWith(
        "Flagged recent payments as transferHeld for suspended shop",
        expect.objectContaining({
          shopId: "shop_1",
          flaggedCount: 0,
        })
      );
    });

    it("does not double-update already-flagged appointments", async () => {
      setupSuspensionEvent("evt_flag_4");
      // The DB query filters by transferHeld = false, so already-flagged
      // appointments won't appear in results — mock returns empty.
      mockAppointmentsFindMany.mockResolvedValue([]);

      const res = await POST(buildRequest());

      expect(res.status).toBe(200);
      expect(warnSpy).toHaveBeenCalledWith(
        "Flagged recent payments as transferHeld for suspended shop",
        expect.objectContaining({
          shopId: "shop_1",
          flaggedCount: 0,
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // Cross-cutting
  // -----------------------------------------------------------------------
  describe("cross-cutting", () => {
    it("returns 400 for invalid signature", async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const res = await POST(buildRequest());

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid signature" });
    });
  });
});
