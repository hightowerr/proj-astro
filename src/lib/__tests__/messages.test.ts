import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
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

const hasPostgresUrl = Boolean(process.env.POSTGRES_URL);
if (!hasPostgresUrl) {
  process.env.POSTGRES_URL =
    "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

// Mock Twilio
vi.mock("@/lib/twilio", () => ({
  smsIsMocked: () => true,
  sendTwilioSms: vi.fn(async ({ to }: { to: string; body: string }) => {
    if (to.includes("fail")) {
      const error = new Error("Twilio API error");
      (error as { code?: string }).code = "21211";
      throw error;
    }
    return { sid: `mock_${randomUUID()}` };
  }),
}));

const [{ db }, { sendBookingConfirmationSMS }, { createAppointment }, { createShop }, schema] =
  await Promise.all([
    import("@/lib/db"),
    import("@/lib/messages"),
    import("@/lib/queries/appointments"),
    import("@/lib/queries/shops"),
    import("@/lib/schema"),
  ]);

const { customers, shops, user } = schema;

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
  if (!hasPostgresUrl) {
    return;
  }
  userId = randomUUID();
  await insertUser(userId);
});

afterEach(async () => {
  if (!hasPostgresUrl) {
    return;
  }
  await db.delete(shops).where(eq(shops.ownerUserId, userId));
  await db.delete(user).where(eq(user.id, userId));
});

const createTestAppointment = async (smsOptIn = true) => {
  const shop = await createShop({
    ownerUserId: userId,
    name: "Test Shop",
    slug: `test-shop-${userId.slice(0, 6)}-msg`,
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
      fullName: "Message Customer",
      phone: "+12025550192",
      email: "message@example.com",
      smsOptIn,
    },
    paymentsEnabled: true,
  });

  return result;
};

const describeIf = hasPostgresUrl ? describe : describe.skip;

describeIf("Message sending", () => {
  describe("sendBookingConfirmationSMS", () => {
    it("sends SMS when customer has opted in", async () => {
      const result = await createTestAppointment(true);

      await sendBookingConfirmationSMS(result.appointment.id);

      const messages = await db.query.messageLog.findMany({
        where: (table, { eq }) =>
          eq(table.appointmentId, result.appointment.id),
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]?.status).toBe("sent");
      expect(messages[0]?.providerMessageId).toMatch(/^mock_/);
      expect(messages[0]?.renderedBody).toContain("Test Shop");
      expect(messages[0]?.bodyHash).toBeTruthy();
      expect(messages[0]?.sentAt).toBeTruthy();
    });

    it("does not send SMS when customer has not opted in", async () => {
      const result = await createTestAppointment(false);

      await sendBookingConfirmationSMS(result.appointment.id);

      const messages = await db.query.messageLog.findMany({
        where: (table, { eq }) =>
          eq(table.appointmentId, result.appointment.id),
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]?.status).toBe("failed");
      expect(messages[0]?.errorCode).toBe("consent_missing");
      expect(messages[0]?.providerMessageId).toBeNull();
      expect(messages[0]?.sentAt).toBeNull();
    });

    it("logs failure when SMS send fails", async () => {
      const result = await createTestAppointment(true);

      // Update phone to trigger failure
      await db
        .update(customers)
        .set({ phone: "+12025550fail" })
        .where(eq(customers.id, result.customer.id));

      await sendBookingConfirmationSMS(result.appointment.id);

      const messages = await db.query.messageLog.findMany({
        where: (table, { eq }) =>
          eq(table.appointmentId, result.appointment.id),
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]?.status).toBe("failed");
      expect(messages[0]?.errorCode).toBe("21211");
      expect(messages[0]?.errorMessage).toContain("Twilio API error");
      expect(messages[0]?.retryCount).toBe(1);
    });

    it("is idempotent - does not send duplicate messages", async () => {
      const result = await createTestAppointment(true);

      // Send first time
      await sendBookingConfirmationSMS(result.appointment.id);

      // Send second time (simulating webhook retry)
      await sendBookingConfirmationSMS(result.appointment.id);

      const messages = await db.query.messageLog.findMany({
        where: (table, { eq }) =>
          eq(table.appointmentId, result.appointment.id),
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]?.status).toBe("sent");

      // Verify dedup key exists
      const dedupKeys = await db.query.messageDedup.findMany({
        where: (table, { eq }) =>
          eq(table.dedupKey, `booking_confirmation:${result.appointment.id}`),
      });

      expect(dedupKeys).toHaveLength(1);
    });

    it("stores rendered body and body hash", async () => {
      const result = await createTestAppointment(true);

      await sendBookingConfirmationSMS(result.appointment.id);

      const messages = await db.query.messageLog.findMany({
        where: (table, { eq }) =>
          eq(table.appointmentId, result.appointment.id),
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]?.renderedBody).toBeTruthy();
      expect(messages[0]?.renderedBody).toContain("Test Shop");
      expect(messages[0]?.bodyHash).toBeTruthy();
      expect(messages[0]?.bodyHash).toHaveLength(64); // SHA-256 hex length
      expect(messages[0]?.templateKey).toBe("booking_confirmation");
      expect(messages[0]?.templateVersion).toBe(1);
    });

    it("handles missing appointment gracefully", async () => {
      const fakeId = randomUUID();

      await sendBookingConfirmationSMS(fakeId);

      const messages = await db.query.messageLog.findMany({
        where: (table, { eq }) => eq(table.appointmentId, fakeId),
      });

      expect(messages).toHaveLength(0);
    });

    it("logs failure when payment is missing", async () => {
      const shop = await createShop({
        ownerUserId: userId,
        name: "Test Shop",
        slug: `test-shop-${userId.slice(0, 6)}-nopay`,
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

      // Create appointment without payment
      const result = await createAppointment({
        shopId: shop.id,
        startsAt,
        customer: {
          fullName: "No Payment Customer",
          phone: "+12025550193",
          email: "nopayment@example.com",
          smsOptIn: true,
        },
        paymentsEnabled: false,
      });

      await sendBookingConfirmationSMS(result.appointment.id);

      const messages = await db.query.messageLog.findMany({
        where: (table, { eq }) =>
          eq(table.appointmentId, result.appointment.id),
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]?.status).toBe("failed");
      expect(messages[0]?.errorCode).toBe("payment_missing");
    });
  });

  describe("Template rendering", () => {
    it("renders template with all variables", async () => {
      const result = await createTestAppointment(true);

      await sendBookingConfirmationSMS(result.appointment.id);

      const messages = await db.query.messageLog.findMany({
        where: (table, { eq }) =>
          eq(table.appointmentId, result.appointment.id),
      });

      const body = messages[0]?.renderedBody ?? "";

      expect(body).toContain("Test Shop");
      expect(body).toContain("$20.00"); // Default deposit
      expect(body).toContain("UTC"); // Timezone
      expect(body).toContain("Reply STOP to opt out");
    });
  });
});
