import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appointments, payments } from "@/lib/schema";
import { createSlotOpeningFromCancellation } from "@/lib/slot-recovery";

const { returningMock, valuesMock, insertMock } = vi.hoisted(() => ({
  returningMock: vi.fn(),
  valuesMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: insertMock,
  },
}));

const makeAppointment = (
  startsAt: Date = new Date(Date.now() + 60 * 60 * 1000)
): typeof appointments.$inferSelect => {
  const now = new Date();

  return {
    id: "appt-123",
    shopId: "shop-123",
    customerId: "cust-123",
    startsAt,
    endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
    status: "cancelled",
    cancelledAt: now,
    cancellationSource: "customer",
    policyVersionId: "policy-123",
    paymentStatus: "paid",
    paymentRequired: true,
    financialOutcome: "settled",
    noShowScore: null,
    noShowRisk: null,
    noShowComputedAt: null,
    resolvedAt: now,
    resolutionReason: "cancelled_no_refund_after_cutoff",
    lastEventId: null,
    source: "web",
    sourceSlotOpeningId: null,
    bookingUrl: null,
    createdAt: now,
    updatedAt: now,
  };
};

const makePayment = (
  status: typeof payments.$inferSelect.status = "succeeded"
): typeof payments.$inferSelect => {
  const now = new Date();
  return {
    id: "pay-123",
    shopId: "shop-123",
    appointmentId: "appt-123",
    provider: "stripe",
    amountCents: 5000,
    currency: "usd",
    status,
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

describe("createSlotOpeningFromCancellation", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("INTERNAL_SECRET", "test-internal-secret");
    vi.stubGlobal("fetch", fetchMock);

    returningMock.mockResolvedValue([{ id: "slot-123" }]);
    valuesMock.mockReturnValue({ returning: returningMock });
    insertMock.mockReturnValue({ values: valuesMock });
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("creates a slot opening for paid future appointment", async () => {
    const appointment = makeAppointment();
    const payment = makePayment("succeeded");

    await createSlotOpeningFromCancellation(appointment, payment);

    expect(insertMock).toHaveBeenCalledOnce();
    expect(valuesMock).toHaveBeenCalledWith({
      shopId: appointment.shopId,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      sourceAppointmentId: appointment.id,
      status: "open",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/jobs/offer-loop",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ slotOpeningId: "slot-123" }),
      })
    );
  });

  it("skips when payment is missing or not succeeded", async () => {
    const appointment = makeAppointment();

    await createSlotOpeningFromCancellation(appointment, undefined);
    await createSlotOpeningFromCancellation(appointment, makePayment("failed"));

    expect(insertMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips when appointment starts in the past", async () => {
    const pastAppointment = makeAppointment(new Date(Date.now() - 60 * 60 * 1000));

    await createSlotOpeningFromCancellation(pastAppointment, makePayment("succeeded"));

    expect(insertMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles duplicate slot opening insert without throwing", async () => {
    const appointment = makeAppointment();
    const duplicateError = {
      code: "23505",
      constraint: "slot_openings_unique_slot",
    };

    returningMock.mockRejectedValue(duplicateError);

    await expect(
      createSlotOpeningFromCancellation(appointment, makePayment("succeeded"))
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not trigger offer loop when APP_URL is missing", async () => {
    vi.stubEnv("APP_URL", "");

    await createSlotOpeningFromCancellation(makeAppointment(), makePayment("succeeded"));

    expect(insertMock).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not throw when offer-loop trigger fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await expect(
      createSlotOpeningFromCancellation(makeAppointment(), makePayment("succeeded"))
    ).resolves.toBeUndefined();

    expect(insertMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("continues when offer-loop trigger returns non-2xx", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(
      createSlotOpeningFromCancellation(makeAppointment(), makePayment("succeeded"))
    ).resolves.toBeUndefined();

    expect(insertMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
