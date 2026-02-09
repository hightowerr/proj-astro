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
  payments,
  processedStripeEvents,
  shops,
  user,
} from "@/lib/schema";

let mockEvent: Stripe.Event | null = null;

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
const originalNodeEnv = process.env.NODE_ENV;

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
  process.env.NODE_ENV = "test";
});

afterAll(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

beforeEach(async () => {
  userId = randomUUID();
  await insertUser(userId);
});

afterEach(async () => {
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
});
