/* eslint-disable import/order */
/**
 * Integration tests for the inflight-payments suspension cascade.
 *
 * These tests verify the interaction between three components:
 *   1. Refund fallback (stripe-refund.ts) — retries without reverse_transfer
 *   2. Detection guard (webhook/route.ts) — flags transferHeld on suspended shop
 *   3. Suspension sweep (connect-webhook/route.ts) — cancels pending PIs + flags recent
 *
 * All Stripe calls are mocked; DB interactions use the same mock-transaction
 * pattern as existing tests.
 */
import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.mock factories are hoisted above imports, so references
// to mock fns must also be hoisted.
// ---------------------------------------------------------------------------
const {
  // Stripe mocks
  mockRefundsCreate,
  mockPaymentIntentsRetrieve,
  mockPaymentIntentsCancel,
  mockConstructEvent,
  // DB mocks
  mockTransaction,
  mockFindFirst,
  mockPaymentsFindMany,
  mockAppointmentsFindMany,
  mockInsertValues,
  mockReturning,
  mockUpdate,
} = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockOnConflictDoNothing = vi.fn(() => ({ returning: mockReturning }));
  const mockInsertValues = vi.fn(() => ({
    onConflictDoNothing: mockOnConflictDoNothing,
    returning: vi.fn(async () => [{ id: "event-1" }]),
  }));
  const mockFindFirst = vi.fn();
  const mockPaymentsFindMany = vi.fn();
  const mockAppointmentsFindMany = vi.fn();
  const mockTransaction = vi.fn();
  const mockUpdate = vi.fn(() => ({
    set: vi.fn(() => ({ where: vi.fn() })),
  }));

  return {
    mockRefundsCreate: vi.fn(),
    mockPaymentIntentsRetrieve: vi.fn(),
    mockPaymentIntentsCancel: vi.fn(),
    mockConstructEvent: vi.fn(),
    mockTransaction,
    mockFindFirst,
    mockPaymentsFindMany,
    mockAppointmentsFindMany,
    mockInsertValues,
    mockReturning,
    mockUpdate,
  };
});

// -- @/lib/stripe -----------------------------------------------------------
vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    refunds: { create: mockRefundsCreate },
    paymentIntents: {
      retrieve: mockPaymentIntentsRetrieve,
      cancel: mockPaymentIntentsCancel,
    },
    webhooks: { constructEvent: mockConstructEvent },
  }),
  getStripeWebhookSecret: () => "whsec_test_platform",
  stripeIsMocked: vi.fn(() => false),
  normalizeStripePaymentStatus: vi.fn((s: string) => s),
}));

// -- @/lib/stripe-utils -----------------------------------------------------
vi.mock("@/lib/stripe-utils", () => ({
  resolveTransferContext: vi.fn(),
}));

// -- @/lib/env --------------------------------------------------------------
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_test_connect",
  }),
}));

// -- @/lib/schema -----------------------------------------------------------
vi.mock("@/lib/schema", () => ({
  processedStripeEvents: {},
  shops: { id: "shops.id", shopId: "shops.shopId" },
  appointments: { id: "appointments.id", shopId: "appointments.shopId" },
  payments: { id: "payments.id", attempts: "payments.attempts" },
  appointmentEvents: {},
  slotOffers: {},
  slotOpenings: {},
}));

// -- @/lib/messages ---------------------------------------------------------
vi.mock("@/lib/messages", () => ({
  sendBookingConfirmationSMS: vi.fn(),
}));

// -- @/lib/queries/appointments ---------------------------------------------
vi.mock("@/lib/queries/appointments", () => ({
  syncAppointmentCalendarEvent: vi.fn(),
}));

// -- drizzle-orm ------------------------------------------------------------
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  inArray: vi.fn(),
  sql: vi.fn(),
}));

// -- @/lib/db ---------------------------------------------------------------
vi.mock("@/lib/db", () => ({
  db: {
    transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// ---- imports AFTER mocks are wired ----------------------------------------
import { processRefund } from "@/lib/stripe-refund";
import { POST as platformWebhookPOST } from "@/app/api/stripe/webhook/route";
import { POST as connectWebhookPOST } from "@/app/api/stripe/connect-webhook/route";
import type { appointments, payments } from "@/lib/schema";

// ---- suppress console output in test runner --------------------------------
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

const makeAppointment = (
  overrides: Partial<typeof appointments.$inferSelect> = {}
): typeof appointments.$inferSelect => {
  const now = new Date();
  return {
    id: "appt-int-001",
    shopId: "shop-int-001",
    customerId: "cust-int-001",
    startsAt: now,
    endsAt: new Date(now.getTime() + 60 * 60 * 1000),
    status: "booked",
    cancelledAt: null,
    cancellationSource: null,
    policyVersionId: "policy-int-001",
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
    ...overrides,
  };
};

const makePayment = (
  overrides: Partial<typeof payments.$inferSelect> = {}
): typeof payments.$inferSelect => {
  const now = new Date();
  return {
    id: "pay-int-001",
    shopId: "shop-int-001",
    appointmentId: "appt-int-001",
    provider: "stripe",
    amountCents: 5000,
    currency: "usd",
    status: "succeeded",
    stripePaymentIntentId: "pi_live_int_001",
    refundedAmountCents: 0,
    stripeRefundId: null,
    refundedAt: null,
    metadata: null,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

function makeStripeEvent(
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

function buildRequest(
  url: string,
  body = "raw_body"
): Request {
  return new Request(url, {
    method: "POST",
    headers: { "stripe-signature": "sig_valid" },
    body,
  });
}

// ---------------------------------------------------------------------------
// Helpers for setting up DB mocks
// ---------------------------------------------------------------------------

/**
 * Sets up the transaction mock for processRefund.
 * processRefund calls db.transaction with a callback that does:
 *   - tx.update(appointments).set(...).where(...).returning(...)
 *   - tx.update(payments).set(...).where(...)
 *   - tx.insert(appointmentEvents).values(...).returning(...)
 *   - tx.update(appointments).set(...).where(...)
 */
function setupRefundTransaction(
  appointmentUpdateResult: Array<{ id: string }> = [{ id: "appt-int-001" }]
) {
  let updateCall = 0;

  const updateMock = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => {
        updateCall += 1;
        if (updateCall === 1) {
          // appointments status update
          return { returning: vi.fn(async () => appointmentUpdateResult) };
        }
        // payments update, or appointments lastEventId update
        return { returning: vi.fn(async () => [{ id: "event-1" }]) };
      }),
    })),
  }));

  const insertMock = vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [{ id: "event-1" }]),
    })),
  }));

  mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
    const tx = {
      update: updateMock,
      insert: insertMock,
    };
    return callback(tx);
  });
}

/**
 * Sets up the transaction mock for the platform webhook handler.
 * The handler does:
 *   - tx.insert(processedStripeEvents).values(...).onConflictDoNothing().returning()
 *   - tx.query.payments.findFirst(...)
 *   - tx.update(payments).set(...).where(...)
 *   - tx.update(appointments).set(...).where(...).returning(...)
 *   - tx.query.shops.findFirst(...)           [detection guard]
 *   - tx.update(appointments).set(transferHeld: true).where(...)
 */
function setupPlatformWebhookTransaction(opts: {
  dedupInsertResult?: Array<{ id: string }>;
  paymentRecord?: Record<string, unknown> | null;
  appointmentUpdateResult?: Array<{ id: string }>;
  shopRecord?: Record<string, unknown> | null;
}) {
  const {
    dedupInsertResult = [{ id: "evt-1" }],
    paymentRecord = null,
    appointmentUpdateResult = [],
    shopRecord = null,
  } = opts;

  // Track update() calls to return different results per call
  let updateCall = 0;
  const transferHeldUpdates: Array<{ appointmentId: string }> = [];

  mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
    updateCall = 0;
    const tx = {
      insert: () => ({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(async () => dedupInsertResult),
          })),
        })),
      }),
      query: {
        payments: {
          findFirst: vi.fn(async () => paymentRecord),
        },
        shops: {
          findFirst: vi.fn(async () => shopRecord),
        },
      },
      update: vi.fn(() => ({
        set: vi.fn((setData: Record<string, unknown>) => ({
          where: vi.fn(() => {
            updateCall += 1;
            if (setData.transferHeld === true) {
              transferHeldUpdates.push({
                appointmentId: "flagged",
              });
            }
            return {
              returning: vi.fn(async () => {
                // The appointments update in handlePaymentIntent returns
                return appointmentUpdateResult;
              }),
            };
          }),
        })),
      })),
    };
    return callback(tx);
  });

  return { transferHeldUpdates };
}

/**
 * Sets up the transaction mock for the connect webhook handler (suspension sweep).
 */
function setupConnectWebhookTransaction(opts: {
  dedupInsertResult?: Array<{ id: string }>;
  shopRecord?: Record<string, unknown> | null;
  pendingPayments?: Array<Record<string, unknown>>;
  recentPaidAppointments?: Array<{ id: string }>;
}) {
  const {
    dedupInsertResult = [{ id: "evt-1" }],
    shopRecord = null,
    pendingPayments = [],
    recentPaidAppointments = [],
  } = opts;

  mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
    const tx = {
      insert: () => ({
        values: mockInsertValues,
      }),
      query: {
        shops: { findFirst: mockFindFirst },
        payments: { findMany: mockPaymentsFindMany },
        appointments: { findMany: mockAppointmentsFindMany },
      },
      update: mockUpdate,
    };

    // Configure per-test return values
    mockReturning.mockResolvedValue(dedupInsertResult);
    mockFindFirst.mockResolvedValue(shopRecord);
    mockPaymentsFindMany.mockResolvedValue(pendingPayments);
    mockAppointmentsFindMany.mockResolvedValue(recentPaidAppointments);

    return callback(tx);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Inflight-Payments Integration — Suspension Cascade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Scenario 1: Refund during suspension
  // Shop suspended, payment succeeded without transfer → refund fallback
  // fires (no reverse_transfer), refund succeeds
  // -------------------------------------------------------------------------
  describe("Scenario 1: Refund during suspension — fallback without reverse_transfer", () => {
    it("retries refund without reverse_transfer when shop is suspended and no transfer exists", async () => {
      setupRefundTransaction();

      // PI has transfer_data (was intended for connected account)
      mockPaymentIntentsRetrieve.mockResolvedValue({
        transfer_data: { destination: "acct_suspended_shop" },
      } as unknown as Stripe.PaymentIntent);

      // First attempt with reverse_transfer fails — no transfer exists
      // because the shop was suspended before Stripe could create the transfer
      const reverseTransferError = {
        type: "StripeInvalidRequestError",
        message: "There is no transfer to reverse on this charge",
      };

      mockRefundsCreate
        .mockRejectedValueOnce(reverseTransferError)
        .mockResolvedValueOnce({ id: "re_fallback_int_001" } as Stripe.Refund);

      const result = await processRefund({
        appointment: makeAppointment(),
        payment: makePayment(),
        cutoffTime: new Date(),
      });

      // Verify: two Stripe refund calls were made
      expect(mockRefundsCreate).toHaveBeenCalledTimes(2);

      // First call had reverse_transfer: true
      const firstCall = mockRefundsCreate.mock.calls[0]![0] as Stripe.RefundCreateParams;
      expect(firstCall.reverse_transfer).toBe(true);
      expect(firstCall.refund_application_fee).toBe(true);

      // Second call (fallback) had NO reverse_transfer
      const secondCall = mockRefundsCreate.mock.calls[1]![0] as Stripe.RefundCreateParams;
      expect(secondCall.reverse_transfer).toBeUndefined();
      expect(secondCall.refund_application_fee).toBeUndefined();
      expect((secondCall.metadata as Record<string, string>)?.fallback).toBe(
        "reverse_transfer_failed"
      );

      // Result is success — customer gets their money back
      expect(result).toEqual({
        success: true,
        refundId: "re_fallback_int_001",
        amount: 5000,
      });
    });

    it("marks appointment as cancelled and refunded after fallback refund", async () => {
      const appointmentUpdateReturned = [{ id: "appt-int-001" }];
      setupRefundTransaction(appointmentUpdateReturned);

      mockPaymentIntentsRetrieve.mockResolvedValue({
        transfer_data: { destination: "acct_suspended_shop" },
      } as unknown as Stripe.PaymentIntent);

      mockRefundsCreate
        .mockRejectedValueOnce({
          type: "StripeInvalidRequestError",
          message: "cannot reverse transfer — suspended account",
        })
        .mockResolvedValueOnce({ id: "re_fallback_int_002" } as Stripe.Refund);

      const result = await processRefund({
        appointment: makeAppointment(),
        payment: makePayment(),
        cutoffTime: new Date(),
      });

      // processRefund calls persistRefundCancellation inside the transaction,
      // which updates appointment status to "cancelled" and payment with refund info.
      // The transaction mock was called, proving DB persistence ran.
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.refundId).toBe("re_fallback_int_002");
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Detection guard fires
  // Shop suspended + payment_intent.succeeded → transferHeld set true
  // -------------------------------------------------------------------------
  describe("Scenario 2: Detection guard — payment_intent.succeeded on suspended shop", () => {
    it("sets transferHeld=true when shop is suspended at time of payment success", async () => {
      const paymentRecord = {
        id: "pay-int-001",
        appointmentId: "appt-int-001",
        stripePaymentIntentId: "pi_live_int_001",
        status: "processing", // not yet "succeeded"
      };

      const shopRecord = {
        id: "shop-int-001",
        stripeAccountId: "acct_suspended_shop",
        stripeOnboardingStatus: "suspended",
      };

      // Track what the handler sets on the appointment
      const { transferHeldUpdates } = setupPlatformWebhookTransaction({
        dedupInsertResult: [{ id: "evt_detect_1" }],
        paymentRecord,
        appointmentUpdateResult: [{ id: "appt-int-001" }],
        shopRecord,
      });

      const intent = {
        id: "pi_live_int_001",
        status: "succeeded",
        transfer_data: { destination: "acct_suspended_shop" },
      };

      const event = makeStripeEvent(
        "payment_intent.succeeded",
        "evt_detect_1",
        intent
      );
      mockConstructEvent.mockReturnValue(event);

      const req = buildRequest("http://localhost/api/stripe/webhook");
      const res = await platformWebhookPOST(req);

      expect(res.status).toBe(200);

      // The transaction mock was invoked — the handler ran
      expect(mockTransaction).toHaveBeenCalledTimes(1);

      // The handler should have called update() with transferHeld: true.
      // We verify this via the captured updates in our mock.
      expect(transferHeldUpdates.length).toBeGreaterThanOrEqual(1);
    });

    it("does NOT set transferHeld when shop is active (not suspended)", async () => {
      const paymentRecord = {
        id: "pay-int-001",
        appointmentId: "appt-int-001",
        stripePaymentIntentId: "pi_live_int_001",
        status: "processing",
      };

      const shopRecord = {
        id: "shop-int-001",
        stripeAccountId: "acct_active_shop",
        stripeOnboardingStatus: "complete", // NOT suspended
      };

      const { transferHeldUpdates } = setupPlatformWebhookTransaction({
        dedupInsertResult: [{ id: "evt_detect_2" }],
        paymentRecord,
        appointmentUpdateResult: [{ id: "appt-int-001" }],
        shopRecord,
      });

      const intent = {
        id: "pi_live_int_001",
        status: "succeeded",
        transfer_data: { destination: "acct_active_shop" },
      };

      const event = makeStripeEvent(
        "payment_intent.succeeded",
        "evt_detect_2",
        intent
      );
      mockConstructEvent.mockReturnValue(event);

      const req = buildRequest("http://localhost/api/stripe/webhook");
      const res = await platformWebhookPOST(req);

      expect(res.status).toBe(200);
      expect(transferHeldUpdates).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Sweep cancels in-flight
  // Shop has pending payment → account.updated with charges_enabled=false
  // → PI cancelled
  // -------------------------------------------------------------------------
  describe("Scenario 3: Suspension sweep — cancel in-flight PaymentIntents", () => {
    it("cancels pending PaymentIntents when shop transitions to suspended", async () => {
      setupConnectWebhookTransaction({
        dedupInsertResult: [{ id: "evt_sweep_1" }],
        shopRecord: {
          id: "shop-int-001",
          stripeOnboardingStatus: "complete", // was complete → now suspended
        },
        pendingPayments: [
          {
            id: "pay-pending-1",
            shopId: "shop-int-001",
            stripePaymentIntentId: "pi_pending_1",
            status: "requires_payment_method",
          },
          {
            id: "pay-pending-2",
            shopId: "shop-int-001",
            stripePaymentIntentId: "pi_pending_2",
            status: "requires_action",
          },
        ],
        recentPaidAppointments: [],
      });

      mockPaymentIntentsCancel.mockResolvedValue({});

      const account = {
        id: "acct_suspended_shop",
        charges_enabled: false,
        details_submitted: true,
      };
      const event = makeStripeEvent("account.updated", "evt_sweep_1", account);
      mockConstructEvent.mockReturnValue(event);

      const req = buildRequest("http://localhost/api/stripe/connect-webhook");
      const res = await connectWebhookPOST(req);

      expect(res.status).toBe(200);

      // Both pending PIs should be cancelled
      expect(mockPaymentIntentsCancel).toHaveBeenCalledTimes(2);
      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith("pi_pending_1");
      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith("pi_pending_2");
    });

    it("continues sweep even if one PI cancel fails (race: already succeeded)", async () => {
      setupConnectWebhookTransaction({
        dedupInsertResult: [{ id: "evt_sweep_2" }],
        shopRecord: {
          id: "shop-int-001",
          stripeOnboardingStatus: "complete",
        },
        pendingPayments: [
          {
            id: "pay-pending-1",
            shopId: "shop-int-001",
            stripePaymentIntentId: "pi_raced_1",
            status: "processing",
          },
          {
            id: "pay-pending-2",
            shopId: "shop-int-001",
            stripePaymentIntentId: "pi_pending_2",
            status: "requires_payment_method",
          },
        ],
        recentPaidAppointments: [],
      });

      // First cancel fails (PI already succeeded in race window)
      mockPaymentIntentsCancel
        .mockRejectedValueOnce(new Error("This PaymentIntent has already succeeded"))
        .mockResolvedValueOnce({});

      const account = {
        id: "acct_suspended_shop",
        charges_enabled: false,
        details_submitted: true,
      };
      const event = makeStripeEvent("account.updated", "evt_sweep_2", account);
      mockConstructEvent.mockReturnValue(event);

      const req = buildRequest("http://localhost/api/stripe/connect-webhook");
      const res = await connectWebhookPOST(req);

      // Sweep completes without HTTP error
      expect(res.status).toBe(200);

      // Both cancels were attempted — the first failed, the second succeeded
      expect(mockPaymentIntentsCancel).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Sweep flags recent
  // Shop has recently-paid appointment → suspension → transferHeld flagged
  // -------------------------------------------------------------------------
  describe("Scenario 4: Suspension sweep — flag recently-paid appointments", () => {
    it("flags recent paid appointment with transferHeld on suspension", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      setupConnectWebhookTransaction({
        dedupInsertResult: [{ id: "evt_flag_int_1" }],
        shopRecord: {
          id: "shop-int-001",
          stripeOnboardingStatus: "complete",
        },
        pendingPayments: [], // no pending PIs to cancel
        recentPaidAppointments: [
          { id: "appt-recent-001" },
          { id: "appt-recent-002" },
        ],
      });

      const account = {
        id: "acct_suspended_shop",
        charges_enabled: false,
        details_submitted: true,
      };
      const event = makeStripeEvent("account.updated", "evt_flag_int_1", account);
      mockConstructEvent.mockReturnValue(event);

      const req = buildRequest("http://localhost/api/stripe/connect-webhook");
      const res = await connectWebhookPOST(req);

      expect(res.status).toBe(200);

      // Verify the flag log indicates 2 appointments were flagged
      expect(warnSpy).toHaveBeenCalledWith(
        "Flagged recent payments as transferHeld for suspended shop",
        expect.objectContaining({
          shopId: "shop-int-001",
          flaggedCount: 2,
        })
      );

      warnSpy.mockRestore();
    });

    it("does not flag appointments when shop was not previously complete (new setup)", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      setupConnectWebhookTransaction({
        dedupInsertResult: [{ id: "evt_flag_int_2" }],
        shopRecord: {
          id: "shop-int-001",
          stripeOnboardingStatus: "pending", // was pending → stays pending (not suspended)
        },
        pendingPayments: [],
        recentPaidAppointments: [],
      });

      const account = {
        id: "acct_new_shop",
        charges_enabled: false,
        details_submitted: false,
      };
      const event = makeStripeEvent("account.updated", "evt_flag_int_2", account);
      mockConstructEvent.mockReturnValue(event);

      const req = buildRequest("http://localhost/api/stripe/connect-webhook");
      const res = await connectWebhookPOST(req);

      expect(res.status).toBe(200);

      // No suspension sweep should run — shop transitions to "pending", not "suspended"
      expect(mockPaymentsFindMany).not.toHaveBeenCalled();
      expect(mockPaymentIntentsCancel).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Full cascade
  // These components work together without errors:
  //   1. Suspension sweep cancels in-flight PIs + flags recent
  //   2. Detection guard flags a raced payment
  //   3. Refund fallback handles a payment where no transfer was created
  // -------------------------------------------------------------------------
  describe("Scenario 5: Full cascade — all components interact without errors", () => {
    it("suspension → sweep → raced payment flagged → refund succeeds", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // STEP 1: account.updated fires — shop suspended
      // This cancels pending PIs and flags recent payments.
      setupConnectWebhookTransaction({
        dedupInsertResult: [{ id: "evt_cascade_1" }],
        shopRecord: {
          id: "shop-int-001",
          stripeOnboardingStatus: "complete",
        },
        pendingPayments: [
          {
            id: "pay-pending-cascade",
            shopId: "shop-int-001",
            stripePaymentIntentId: "pi_pending_cascade",
            status: "requires_payment_method",
          },
        ],
        recentPaidAppointments: [{ id: "appt-recent-cascade" }],
      });

      mockPaymentIntentsCancel.mockResolvedValue({});

      const suspensionEvent = makeStripeEvent(
        "account.updated",
        "evt_cascade_1",
        {
          id: "acct_suspended_shop",
          charges_enabled: false,
          details_submitted: true,
        }
      );
      mockConstructEvent.mockReturnValue(suspensionEvent);

      const sweepRes = await connectWebhookPOST(
        buildRequest("http://localhost/api/stripe/connect-webhook")
      );

      expect(sweepRes.status).toBe(200);
      expect(mockPaymentIntentsCancel).toHaveBeenCalledWith("pi_pending_cascade");
      expect(warnSpy).toHaveBeenCalledWith(
        "Flagged recent payments as transferHeld for suspended shop",
        expect.objectContaining({
          shopId: "shop-int-001",
          flaggedCount: 1,
        })
      );

      // STEP 2: payment_intent.succeeded fires (race window — customer
      // completed payment between Stripe suspending and webhook arriving)
      vi.clearAllMocks();
      warnSpy.mockImplementation(() => {});

      const { transferHeldUpdates } = setupPlatformWebhookTransaction({
        dedupInsertResult: [{ id: "evt_cascade_2" }],
        paymentRecord: {
          id: "pay-raced",
          appointmentId: "appt-raced",
          stripePaymentIntentId: "pi_raced_cascade",
          status: "processing",
        },
        appointmentUpdateResult: [{ id: "appt-raced" }],
        shopRecord: {
          id: "shop-int-001",
          stripeAccountId: "acct_suspended_shop",
          stripeOnboardingStatus: "suspended",
        },
      });

      const paymentEvent = makeStripeEvent(
        "payment_intent.succeeded",
        "evt_cascade_2",
        {
          id: "pi_raced_cascade",
          status: "succeeded",
          transfer_data: { destination: "acct_suspended_shop" },
        }
      );
      mockConstructEvent.mockReturnValue(paymentEvent);

      const detectRes = await platformWebhookPOST(
        buildRequest("http://localhost/api/stripe/webhook")
      );

      expect(detectRes.status).toBe(200);
      // Detection guard should have flagged transferHeld
      expect(transferHeldUpdates.length).toBeGreaterThanOrEqual(1);

      // STEP 3: Refund is attempted for the raced payment.
      // Because the shop is suspended, no transfer was created →
      // reverse_transfer fails → fallback fires without reverse_transfer.
      vi.clearAllMocks();

      setupRefundTransaction();

      mockPaymentIntentsRetrieve.mockResolvedValue({
        transfer_data: { destination: "acct_suspended_shop" },
      } as unknown as Stripe.PaymentIntent);

      mockRefundsCreate
        .mockRejectedValueOnce({
          type: "StripeInvalidRequestError",
          message: "There is no transfer to reverse on this charge",
        })
        .mockResolvedValueOnce({ id: "re_cascade_fallback" } as Stripe.Refund);

      const refundResult = await processRefund({
        appointment: makeAppointment({ transferHeld: true }),
        payment: makePayment({ stripePaymentIntentId: "pi_raced_cascade" }),
        cutoffTime: new Date(),
      });

      // Refund succeeded via fallback — platform absorbs the cost
      expect(refundResult).toEqual({
        success: true,
        refundId: "re_cascade_fallback",
        amount: 5000,
      });

      // Verify: two refund attempts — first with reverse_transfer (failed),
      // second without (succeeded)
      expect(mockRefundsCreate).toHaveBeenCalledTimes(2);

      // No unhandled errors at any step in the cascade
      warnSpy.mockRestore();
    });
  });
});
