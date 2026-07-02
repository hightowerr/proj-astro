import { describe, expect, it, vi, beforeEach } from "vitest";
import type Stripe from "stripe";
import { resolveTransferContext } from "./stripe-utils";

// Hoist mock fns so vi.mock factories (which are hoisted) can reference them
const {
  mockChargesRetrieve,
  mockLimit,
  mockSelect,
} = vi.hoisted(() => {
  const mockChargesRetrieve = vi.fn();
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockInnerJoin2 = vi.fn(() => ({ where: mockWhere }));
  const mockInnerJoin1 = vi.fn(() => ({ innerJoin: mockInnerJoin2 }));
  const mockFrom = vi.fn(() => ({ innerJoin: mockInnerJoin1 }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return {
    mockChargesRetrieve,
    mockLimit,
    mockWhere,
    mockInnerJoin2,
    mockInnerJoin1,
    mockFrom,
    mockSelect,
  };
});

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({ charges: { retrieve: mockChargesRetrieve } }),
}));

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect },
}));

vi.mock("@/lib/schema", () => ({
  appointments: {},
  payments: {},
  shops: {},
}));

const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

/** Helper to build a minimal Stripe.Transfer stub */
function makeTransfer(
  overrides: Partial<Stripe.Transfer> = {}
): Stripe.Transfer {
  return {
    id: "tr_123",
    amount: 5000,
    destination: "acct_connected_1",
    source_transaction: "ch_src_456",
    ...overrides,
  } as Stripe.Transfer;
}

describe("resolveTransferContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns full TransferContext on happy path", async () => {
    const transfer = makeTransfer();

    mockChargesRetrieve.mockResolvedValue({
      id: "ch_src_456",
      payment_intent: "pi_789",
    });

    mockLimit.mockResolvedValue([
      {
        payment: { id: "pay_1" },
        appointment: { id: "apt_1" },
        shop: { id: "shop_1", name: "Test Shop" },
      },
    ]);

    const result = await resolveTransferContext(transfer);

    expect(result).toEqual({
      appointmentId: "apt_1",
      shopId: "shop_1",
      shopName: "Test Shop",
      paymentId: "pay_1",
      connectedAccountId: "acct_connected_1",
      amountCents: 5000,
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns null when source_transaction is undefined", async () => {
    const transfer = makeTransfer({ source_transaction: undefined as any });

    const result = await resolveTransferContext(transfer);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "[resolveTransferContext] Transfer missing source_transaction",
      expect.objectContaining({ transferId: "tr_123" })
    );
  });

  it("returns null when charge retrieval fails", async () => {
    const transfer = makeTransfer();
    mockChargesRetrieve.mockRejectedValue(new Error("Stripe API error"));

    const result = await resolveTransferContext(transfer);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "[resolveTransferContext] Failed to retrieve charge",
      expect.objectContaining({ transferId: "tr_123" })
    );
  });

  it("returns null when charge has no payment_intent", async () => {
    const transfer = makeTransfer();
    mockChargesRetrieve.mockResolvedValue({
      id: "ch_src_456",
      payment_intent: null,
    });

    const result = await resolveTransferContext(transfer);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "[resolveTransferContext] Charge has no payment_intent",
      expect.objectContaining({ transferId: "tr_123", chargeId: "ch_src_456" })
    );
  });

  it("returns null when no matching payment in DB", async () => {
    const transfer = makeTransfer();
    mockChargesRetrieve.mockResolvedValue({
      id: "ch_src_456",
      payment_intent: "pi_789",
    });

    mockLimit.mockResolvedValue([]);

    const result = await resolveTransferContext(transfer);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "[resolveTransferContext] No payment found for PaymentIntent",
      expect.objectContaining({
        transferId: "tr_123",
        paymentIntentId: "pi_789",
      })
    );
  });
});
