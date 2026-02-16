/* eslint-disable import/order */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { db } from "@/lib/db";
import { createAppointment } from "@/lib/queries/appointments";
import { createShop } from "@/lib/queries/shops";
import {
  appointments,
  customers,
  payments,
  processedStripeEvents,
  shops,
  slotOffers,
  slotOpenings,
  user,
} from "@/lib/schema";

let mockEvent: Stripe.Event | null = null;
const fetchMock = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripeIsMocked: () => true,
  getStripeClient: () => ({
    webhooks: {
      constructEvent: () => {
        if (!mockEvent) {
          throw new Error("Missing mock event");
        }
        return mockEvent;
      },
    },
  }),
  getStripeWebhookSecret: () => "whsec_test",
  normalizeStripePaymentStatus: (status: Stripe.PaymentIntent.Status) => {
    switch (status) {
      case "requires_payment_method":
      case "requires_action":
      case "processing":
      case "succeeded":
      case "canceled":
        return status;
      case "requires_capture":
      case "requires_confirmation":
        return "processing";
      default:
        return "processing";
    }
  },
}));

import { POST } from "./route";

let userId: string;

const insertUser = async (id: string) => {
  const email = `user_${id}@example.com`;
  await db.insert(user).values({
    id,
    name: "Test User",
    email,
    emailVerified: true,
  });
};

beforeAll(() => {
  vi.stubEnv("NODE_ENV", "test");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  userId = randomUUID();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await insertUser(userId);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await db.delete(shops).where(eq(shops.ownerUserId, userId));
  await db.delete(user).where(eq(user.id, userId));
  mockEvent = null;
});

const createPaymentAppointment = async () => {
  const shop = await createShop({
    ownerUserId: userId,
    name: "Test Shop",
    slug: `test-shop-${userId.slice(0, 6)}-webhook`,
  });

  const dateStr = (() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 1);
    for (let i = 0; i < 7; i += 1) {
      const day = date.getUTCDay();
      if (day >= 1 && day <= 5) {
        return date.toISOString().slice(0, 10);
      }
      date.setUTCDate(date.getUTCDate() + 1);
    }
    return date.toISOString().slice(0, 10);
  })();
  const startsAt = new Date(`${dateStr}T09:00:00.000Z`);
  const result = await createAppointment({
    shopId: shop.id,
    startsAt,
    customer: {
      fullName: "Webhook Customer",
      phone: "+12025550191",
      email: "webhook@example.com",
    },
    paymentsEnabled: true,
  });

  if (!result.payment?.stripePaymentIntentId) {
    throw new Error("Missing payment intent id");
  }

  return {
    paymentId: result.payment.id,
    paymentIntentId: result.payment.stripePaymentIntentId,
    appointmentId: result.appointment.id,
  };
};

const createSlotRecoveryPaymentFixture = async () => {
  const shop = await createShop({
    ownerUserId: userId,
    name: "Recovery Shop",
    slug: `recovery-shop-${userId.slice(0, 6)}-webhook`,
  });

  const sourceStartsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const sourceEndsAt = new Date(sourceStartsAt.getTime() + 60 * 60 * 1000);
  const recoveredStartsAt = new Date(sourceStartsAt.getTime() + 3 * 60 * 60 * 1000);
  const recoveredEndsAt = new Date(recoveredStartsAt.getTime() + 60 * 60 * 1000);

  const [sourceCustomer] = await db
    .insert(customers)
    .values({
      shopId: shop.id,
      fullName: "Cancelled Customer",
      phone: `+1202${Math.floor(Math.random() * 10_000_000)
        .toString()
        .padStart(7, "0")}`,
      email: `source_${randomUUID()}@example.com`,
    })
    .returning();

  if (!sourceCustomer) {
    throw new Error("Failed to create source customer");
  }

  const [sourceAppointment] = await db
    .insert(appointments)
    .values({
      shopId: shop.id,
      customerId: sourceCustomer.id,
      startsAt: sourceStartsAt,
      endsAt: sourceEndsAt,
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationSource: "customer",
    })
    .returning();

  if (!sourceAppointment) {
    throw new Error("Failed to create source appointment");
  }

  const [recoveryCustomer] = await db
    .insert(customers)
    .values({
      shopId: shop.id,
      fullName: "Recovery Customer",
      phone: `+1202${Math.floor(Math.random() * 10_000_000)
        .toString()
        .padStart(7, "0")}`,
      email: `recovery_${randomUUID()}@example.com`,
    })
    .returning();

  if (!recoveryCustomer) {
    throw new Error("Failed to create recovery customer");
  }

  const [slotOpening] = await db
    .insert(slotOpenings)
    .values({
      shopId: shop.id,
      startsAt: recoveredStartsAt,
      endsAt: recoveredEndsAt,
      sourceAppointmentId: sourceAppointment.id,
      status: "filled",
    })
    .returning();

  if (!slotOpening) {
    throw new Error("Failed to create slot opening");
  }

  const [recoveredAppointment] = await db
    .insert(appointments)
    .values({
      shopId: shop.id,
      customerId: recoveryCustomer.id,
      startsAt: recoveredStartsAt,
      endsAt: recoveredEndsAt,
      status: "pending",
      paymentStatus: "pending",
      paymentRequired: true,
      source: "slot_recovery",
      sourceSlotOpeningId: slotOpening.id,
    })
    .returning();

  if (!recoveredAppointment) {
    throw new Error("Failed to create recovered appointment");
  }

  const paymentIntentId = `pi_test_${randomUUID().replace(/-/g, "")}`;
  const [payment] = await db
    .insert(payments)
    .values({
      shopId: shop.id,
      appointmentId: recoveredAppointment.id,
      provider: "stripe",
      amountCents: 2000,
      currency: "USD",
      status: "requires_payment_method",
      stripePaymentIntentId: paymentIntentId,
    })
    .returning();

  if (!payment) {
    throw new Error("Failed to create payment");
  }

  await db.insert(slotOffers).values({
    slotOpeningId: slotOpening.id,
    customerId: recoveryCustomer.id,
    channel: "sms",
    status: "accepted",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    acceptedAt: new Date(),
  });

  return {
    slotOpeningId: slotOpening.id,
    appointmentId: recoveredAppointment.id,
    paymentIntentId,
    customerId: recoveryCustomer.id,
  };
};

describe("Stripe webhook handler", () => {
  it("rejects requests without signature", async () => {
    const req = new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("Missing signature");
  });

  it("is idempotent - ignores duplicate events", async () => {
    const { paymentIntentId } = await createPaymentAppointment();
    const eventId = `evt_test_${randomUUID()}`;

    await db.insert(processedStripeEvents).values({ id: eventId });

    const intent = { id: paymentIntentId, status: "succeeded" } as Stripe.PaymentIntent;
    mockEvent = {
      id: eventId,
      type: "payment_intent.succeeded",
      data: { object: intent },
    } as Stripe.Event;

    const req = new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "test" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const paymentRow = await db.query.payments.findFirst({
      where: (table, { eq }) => eq(table.stripePaymentIntentId, paymentIntentId),
    });

    expect(paymentRow?.status).not.toBe("succeeded");
  });

  it("updates payment and appointment on success", async () => {
    const { paymentIntentId, appointmentId } = await createPaymentAppointment();
    const eventId = `evt_test_${randomUUID()}`;

    const intent = { id: paymentIntentId, status: "succeeded" } as Stripe.PaymentIntent;
    mockEvent = {
      id: eventId,
      type: "payment_intent.succeeded",
      data: { object: intent },
    } as Stripe.Event;

    const req = new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "test" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const paymentRow = await db.query.payments.findFirst({
      where: (table, { eq }) => eq(table.stripePaymentIntentId, paymentIntentId),
    });
    const appointmentRow = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.id, appointmentId),
    });

    expect(paymentRow?.status).toBe("succeeded");
    expect(paymentRow?.attempts).toBe(1);
    expect(appointmentRow?.paymentStatus).toBe("paid");
    expect(appointmentRow?.status).toBe("booked");
  });

  it("marks payment failed on payment_intent.payment_failed", async () => {
    const { paymentIntentId, appointmentId } = await createPaymentAppointment();
    const eventId = `evt_test_${randomUUID()}`;

    const intent = {
      id: paymentIntentId,
      status: "requires_payment_method",
    } as Stripe.PaymentIntent;
    mockEvent = {
      id: eventId,
      type: "payment_intent.payment_failed",
      data: { object: intent },
    } as Stripe.Event;

    const req = new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "test" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const paymentRow = await db.query.payments.findFirst({
      where: (table, { eq }) => eq(table.stripePaymentIntentId, paymentIntentId),
    });
    const appointmentRow = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.id, appointmentId),
    });

    expect(paymentRow?.status).toBe("failed");
    expect(appointmentRow?.paymentStatus).toBe("failed");
    expect(appointmentRow?.status).toBe("pending");
  });

  it("reopens slot recovery flow and triggers next offer on payment failure", async () => {
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("INTERNAL_SECRET", "test-internal-secret");

    const fixture = await createSlotRecoveryPaymentFixture();
    const eventId = `evt_test_${randomUUID()}`;

    const intent = {
      id: fixture.paymentIntentId,
      status: "requires_payment_method",
    } as Stripe.PaymentIntent;
    mockEvent = {
      id: eventId,
      type: "payment_intent.payment_failed",
      data: { object: intent },
    } as Stripe.Event;

    const req = new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "test" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const slotRow = await db.query.slotOpenings.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, fixture.slotOpeningId),
    });
    const offerRow = await db.query.slotOffers.findFirst({
      where: (table, { and: whereAnd, eq: whereEq }) =>
        whereAnd(
          whereEq(table.slotOpeningId, fixture.slotOpeningId),
          whereEq(table.customerId, fixture.customerId)
        ),
    });
    const paymentRow = await db.query.payments.findFirst({
      where: (table, { eq: whereEq }) =>
        whereEq(table.stripePaymentIntentId, fixture.paymentIntentId),
    });
    const appointmentRow = await db.query.appointments.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, fixture.appointmentId),
    });

    expect(slotRow?.status).toBe("open");
    expect(offerRow?.status).toBe("declined");
    expect(paymentRow?.status).toBe("failed");
    expect(appointmentRow?.paymentStatus).toBe("failed");
    expect(appointmentRow?.status).toBe("pending");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/jobs/offer-loop",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ slotOpeningId: fixture.slotOpeningId }),
      })
    );
  });
});
