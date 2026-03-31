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

const [
  { db },
  { createShop },
  { findHighRiskAppointments },
  { checkReminderAlreadySent },
  { sendAppointmentReminderSMS },
  schema,
] =
  await Promise.all([
    import("@/lib/db"),
    import("@/lib/queries/shops"),
    import("@/lib/queries/appointments"),
    import("@/lib/queries/messages"),
    import("@/lib/messages"),
    import("@/lib/schema"),
  ]);

const { appointments, customerContactPrefs, customers, messageLog, shops, user } = schema;

let userId: string;

const makeAppointmentFixture = async (input?: {
  hoursFromNow?: number;
  noShowRisk?: "low" | "medium" | "high" | null;
  status?: "booked" | "cancelled";
  smsOptIn?: boolean;
  reminderTimingsSnapshot?: string[];
  createdAt?: Date;
}) => {
  const hoursFromNow = input?.hoursFromNow ?? 24;
  const noShowRisk = input?.noShowRisk ?? "high";
  const status = input?.status ?? "booked";
  const smsOptIn = input?.smsOptIn ?? true;
  const reminderTimingsSnapshot = input?.reminderTimingsSnapshot ?? ["24h"];

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
      phone: `+1202555${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`,
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
      reminderTimingsSnapshot,
      createdAt: input?.createdAt,
    })
    .returning();

  if (!appointment) {
    throw new Error("Failed to create appointment");
  }

  return { shop, customer, appointment };
};

const sendSmsReminderForFixture = async (fixture: Awaited<ReturnType<typeof makeAppointmentFixture>>) => {
  const { appointment, customer, shop } = fixture;

  return await sendAppointmentReminderSMS({
    appointmentId: appointment.id,
    shopId: shop.id,
    customerId: customer.id,
    customerName: customer.fullName,
    customerPhone: customer.phone,
    startsAt: appointment.startsAt,
    bookingUrl: appointment.bookingUrl,
    shopName: shop.name,
    shopTimezone: "UTC",
    reminderInterval: "24h",
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

  it("returns only appointments for intervals in their snapshot", async () => {
    const twoHourOnly = await makeAppointmentFixture({
      hoursFromNow: 24,
      reminderTimingsSnapshot: ["2h"],
    });
    const twentyFourHour = await makeAppointmentFixture({
      hoursFromNow: 24,
      reminderTimingsSnapshot: ["24h"],
    });

    const results = await findHighRiskAppointments();

    expect(
      results.some((row) => row.appointmentId === twoHourOnly.appointment.id)
    ).toBe(false);

    expect(
      results.some(
        (row) =>
          row.appointmentId === twentyFourHour.appointment.id &&
          row.reminderInterval === "24h"
      )
    ).toBe(true);
  });

  it("returns reminderInterval on each result", async () => {
    const { appointment } = await makeAppointmentFixture({
      hoursFromNow: 24,
      reminderTimingsSnapshot: ["24h"],
    });

    const results = await findHighRiskAppointments();
    const found = results.find((row) => row.appointmentId === appointment.id);

    expect(found?.reminderInterval).toBe("24h");
  });

  it("skips appointments booked within the reminder window", async () => {
    const { appointment } = await makeAppointmentFixture({
      hoursFromNow: 0.5,
      reminderTimingsSnapshot: ["1h"],
      createdAt: new Date(),
    });

    const results = await findHighRiskAppointments();

    expect(results.some((row) => row.appointmentId === appointment.id)).toBe(false);
  });

  it("excludes appointments outside reminder window", async () => {
    const { appointment } = await makeAppointmentFixture({
      hoursFromNow: 48,
      noShowRisk: "high",
      status: "booked",
      smsOptIn: true,
      reminderTimingsSnapshot: ["24h"],
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

    await expect(
      checkReminderAlreadySent(appointment.id, "24h", "sms")
    ).resolves.toBe(true);
  });

  it("returns false when no reminder has been logged", async () => {
    const { appointment } = await makeAppointmentFixture();

    await expect(
      checkReminderAlreadySent(appointment.id, "24h", "sms")
    ).resolves.toBe(false);
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

    await expect(
      checkReminderAlreadySent(appointment.id, "24h", "sms")
    ).resolves.toBe(false);
  });

  it("returns false for a different interval even if one interval was already sent", async () => {
    const { shop, customer, appointment } = await makeAppointmentFixture({
      reminderTimingsSnapshot: ["24h", "2h"],
    });

    await db.insert(messageLog).values({
      shopId: shop.id,
      appointmentId: appointment.id,
      customerId: customer.id,
      channel: "sms",
      purpose: "appointment_reminder_24h",
      toPhone: customer.phone,
      provider: "twilio",
      status: "sent",
      bodyHash: "hash-reminder-24h",
      templateKey: "appointment_reminder_24h",
      templateVersion: 1,
      renderedBody: "24h reminder body",
      providerMessageId: `mock_${randomUUID()}`,
      sentAt: new Date(),
    });

    await expect(
      checkReminderAlreadySent(appointment.id, "24h", "sms")
    ).resolves.toBe(true);
    await expect(
      checkReminderAlreadySent(appointment.id, "2h", "sms")
    ).resolves.toBe(false);
  });

  it("does not treat an email reminder as an SMS send", async () => {
    const fixture = await makeAppointmentFixture();
    const { appointment, customer, shop } = fixture;

    await db.insert(messageLog).values({
      shopId: shop.id,
      appointmentId: appointment.id,
      customerId: customer.id,
      channel: "email",
      purpose: "appointment_reminder_24h",
      toPhone: customer.email,
      provider: "resend",
      status: "sent",
      bodyHash: "hash-email-reminder",
      templateKey: "appointment_reminder_24h",
      templateVersion: 1,
      renderedBody: "Email reminder body",
      providerMessageId: `email_${randomUUID()}`,
      sentAt: new Date(),
    });

    await expect(
      checkReminderAlreadySent(appointment.id, "24h", "sms")
    ).resolves.toBe(false);

    const result = await sendSmsReminderForFixture(fixture);
    expect(result).toBe("sent");
  });

  it("does not let failed SMS logs block reminder retries", async () => {
    const fixture = await makeAppointmentFixture();
    const { appointment, customer, shop } = fixture;

    await db.insert(messageLog).values({
      shopId: shop.id,
      appointmentId: appointment.id,
      customerId: customer.id,
      channel: "sms",
      purpose: "appointment_reminder_24h",
      toPhone: customer.phone,
      provider: "twilio",
      status: "failed",
      bodyHash: "hash-sms-reminder-failed",
      templateKey: "appointment_reminder_24h",
      templateVersion: 1,
      renderedBody: "Failed reminder body",
      retryCount: 1,
      errorCode: "twilio_error",
      errorMessage: "Twilio send failed",
    });

    await expect(
      checkReminderAlreadySent(appointment.id, "24h", "sms")
    ).resolves.toBe(false);

    const result = await sendSmsReminderForFixture(fixture);
    expect(result).toBe("sent");

    const smsLogs = await db.query.messageLog.findMany({
      where: (table, { and, eq }) =>
        and(eq(table.appointmentId, appointment.id), eq(table.channel, "sms")),
    });
    expect(smsLogs.some((log) => log.status === "sent")).toBe(true);
  });

  it("consent-missing attempts do not dedup and allow a later successful retry", async () => {
    const fixture = await makeAppointmentFixture({ smsOptIn: false });
    const { appointment, customer } = fixture;

    await expect(sendSmsReminderForFixture(fixture)).resolves.toBe(
      "consent_missing"
    );
    await expect(
      checkReminderAlreadySent(appointment.id, "24h", "sms")
    ).resolves.toBe(false);

    await db
      .update(customerContactPrefs)
      .set({ smsOptIn: true })
      .where(eq(customerContactPrefs.customerId, customer.id));

    await expect(sendSmsReminderForFixture(fixture)).resolves.toBe("sent");
  });
});
