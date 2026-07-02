/* eslint-disable import/order */
import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — vi.mock factories are hoisted above imports, so references
// to mock fns must also be hoisted.
// ---------------------------------------------------------------------------
const {
  mockConstructEvent,
  mockResolveTransferContext,
  mockInsertValues,
  mockReturning,
  mockFindFirst,
  mockUpdate,
} = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockOnConflictDoNothing = vi.fn(() => ({ returning: mockReturning }));
  const mockInsertValues = vi.fn(() => ({
    onConflictDoNothing: mockOnConflictDoNothing,
  }));
  const mockFindFirst = vi.fn();
  const mockSet = vi.fn(() => ({ where: vi.fn() }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));

  return {
    mockConstructEvent: vi.fn(),
    mockResolveTransferContext: vi.fn(),
    mockInsertValues,
    mockOnConflictDoNothing,
    mockReturning,
    mockFindFirst,
    mockUpdate,
  };
});

// -- @/lib/stripe --------------------------------------------------------
vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent: mockConstructEvent },
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
  shops: {},
}));

// -- @/lib/db -------------------------------------------------------------
vi.mock("@/lib/db", () => ({
  db: {
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
      // Build a minimal transaction proxy that records calls.
      const tx = {
        insert: () => ({ values: mockInsertValues }),
        query: { shops: { findFirst: mockFindFirst } },
        update: mockUpdate,
      };
      return fn(tx);
    }),
  },
}));

// -- drizzle-orm (used only for `eq` import in the source) ----------------
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
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
