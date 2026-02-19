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

const [{ db }, { createShop }, { findHighRiskAppointments }, { checkReminderAlreadySent }, schema] =
  await Promise.all([
    import("@/lib/db"),
    import("@/lib/queries/shops"),
    import("@/lib/queries/appointments"),
    import("@/lib/queries/messages"),
    import("@/lib/schema"),
  ]);

const { appointments, customerContactPrefs, customers, messageLog, shops, user } = schema;

let userId: string;

const makeAppointmentFixture = async (input?: {
  hoursFromNow?: number;
  noShowRisk?: "low" | "medium" | "high" | null;
  status?: "booked" | "cancelled";
  smsOptIn?: boolean;
}) => {
  const hoursFromNow = input?.hoursFromNow ?? 24;
  const noShowRisk = input?.noShowRisk ?? "high";
  const status = input?.status ?? "booked";
  const smsOptIn = input?.smsOptIn ?? true;

  const shop = await createShop({
    ownerUserId: userId,
    name: "Reminder Test Shop",
    slug: `reminder-${randomUUID().slice(0, 8)}`,
    status: "active",
  });

  const [customer] = await db
    .insert(customers)
    .values({
      shopId: shop.id,
      fullName: "Reminder Customer",
      phone: `+1202555${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
      email: `reminder-${randomUUID()}@example.com`,
    })
    .returning();

  if (!customer) {
    throw new Error("Failed to create customer");
  }

  await db.insert(customerContactPrefs).values({
    customerId: customer.id,
    smsOptIn,
  });

  const startsAt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const [appointment] = await db
    .insert(appointments)
    .values({
      shopId: shop.id,
      customerId: customer.id,
      startsAt,
      endsAt,
      status,
      noShowRisk,
      bookingUrl: `https://example.com/manage/${randomUUID()}`,
    })
    .returning();

  if (!appointment) {
    throw new Error("Failed to create appointment");
  }

  return { shop, customer, appointment };
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
  await db.insert(user).values({
    id: userId,
    name: "Reminder Test User",
    email: `reminder-user-${userId}@example.com`,
    emailVerified: true,
  });
});

afterEach(async () => {
  if (!hasPostgresUrl) {
    return;
  }

  await db.delete(shops).where(eq(shops.ownerUserId, userId));
  await db.delete(user).where(eq(user.id, userId));
});

const describeIf = hasPostgresUrl ? describe : describe.skip;

describeIf("reminder query and dedup", () => {
  it("returns high-risk booked appointments in 24h reminder window", async () => {
    const { appointment } = await makeAppointmentFixture({
      hoursFromNow: 24,
      noShowRisk: "high",
      status: "booked",
      smsOptIn: true,
    });

    const results = await findHighRiskAppointments();

    expect(results.some((row) => row.appointmentId === appointment.id)).toBe(true);
  });

  it("excludes appointments outside reminder window", async () => {
    const { appointment } = await makeAppointmentFixture({
      hoursFromNow: 48,
      noShowRisk: "high",
      status: "booked",
      smsOptIn: true,
    });

    const results = await findHighRiskAppointments();

    expect(results.some((row) => row.appointmentId === appointment.id)).toBe(false);
  });

  it("excludes low and medium risk appointments", async () => {
    const low = await makeAppointmentFixture({
      hoursFromNow: 24,
      noShowRisk: "low",
      status: "booked",
      smsOptIn: true,
    });
    const medium = await makeAppointmentFixture({
      hoursFromNow: 24,
      noShowRisk: "medium",
      status: "booked",
      smsOptIn: true,
    });

    const results = await findHighRiskAppointments();

    expect(results.some((row) => row.appointmentId === low.appointment.id)).toBe(false);
    expect(results.some((row) => row.appointmentId === medium.appointment.id)).toBe(false);
  });

  it("excludes appointments when customer has no SMS opt-in", async () => {
    const { appointment } = await makeAppointmentFixture({
      hoursFromNow: 24,
      noShowRisk: "high",
      status: "booked",
      smsOptIn: false,
    });

    const results = await findHighRiskAppointments();

    expect(results.some((row) => row.appointmentId === appointment.id)).toBe(false);
  });

  it("excludes cancelled appointments", async () => {
    const { appointment } = await makeAppointmentFixture({
      hoursFromNow: 24,
      noShowRisk: "high",
      status: "cancelled",
      smsOptIn: true,
    });

    const results = await findHighRiskAppointments();

    expect(results.some((row) => row.appointmentId === appointment.id)).toBe(false);
  });

  it("returns true when reminder has already been logged", async () => {
    const { shop, customer, appointment } = await makeAppointmentFixture();

    await db.insert(messageLog).values({
      shopId: shop.id,
      appointmentId: appointment.id,
      customerId: customer.id,
      channel: "sms",
      purpose: "appointment_reminder_24h",
      toPhone: customer.phone,
      provider: "twilio",
      status: "sent",
      bodyHash: "hash-reminder",
      templateKey: "appointment_reminder_24h",
      templateVersion: 1,
      renderedBody: "Reminder test body",
      providerMessageId: `mock_${randomUUID()}`,
      sentAt: new Date(),
    });

    await expect(checkReminderAlreadySent(appointment.id)).resolves.toBe(true);
  });

  it("returns false when no reminder has been logged", async () => {
    const { appointment } = await makeAppointmentFixture();

    await expect(checkReminderAlreadySent(appointment.id)).resolves.toBe(false);
  });

  it("returns false when only booking confirmation exists", async () => {
    const { shop, customer, appointment } = await makeAppointmentFixture();

    await db.insert(messageLog).values({
      shopId: shop.id,
      appointmentId: appointment.id,
      customerId: customer.id,
      channel: "sms",
      purpose: "booking_confirmation",
      toPhone: customer.phone,
      provider: "twilio",
      status: "sent",
      bodyHash: "hash-booking",
      templateKey: "booking_confirmation",
      templateVersion: 1,
      renderedBody: "Booking confirmation body",
      providerMessageId: `mock_${randomUUID()}`,
      sentAt: new Date(),
    });

    await expect(checkReminderAlreadySent(appointment.id)).resolves.toBe(false);
  });
});
