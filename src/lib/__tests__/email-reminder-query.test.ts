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
import { requirePostgresUrl } from "@/test/db-test-guard";

const hasPostgresUrl = Boolean(
  requirePostgresUrl("src/lib/__tests__/email-reminder-query.test.ts"),
);

const [{ db }, { createShop }, { findAppointmentsForEmailReminder }, schema] =
  await Promise.all([
    import("@/lib/db"),
    import("@/lib/queries/shops"),
    import("@/lib/queries/appointments"),
    import("@/lib/schema"),
  ]);

const { appointments, customerContactPrefs, customers, shops, user } = schema;

let userId: string;

const makeFixture = async (input?: {
  hoursFromNow?: number;
  status?: "booked" | "cancelled";
  emailOptIn?: boolean | null;
  createdAt?: Date;
  reminderTimingsSnapshot?: string[];
}) => {
  const shop = await createShop({
    ownerUserId: userId,
    name: "Email Reminder Query Shop",
    slug: `email-reminder-query-${randomUUID().slice(0, 8)}`,
    status: "active",
    timezone: "America/New_York",
  });

  const [customer] = await db
    .insert(customers)
    .values({
      shopId: shop.id,
      fullName: "Email Reminder Customer",
      phone: `+1202555${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`,
      email: `email-reminder-${randomUUID()}@example.com`,
    })
    .returning();

  if (!customer) {
    throw new Error("Failed to create customer");
  }

  if (input?.emailOptIn !== null) {
    await db.insert(customerContactPrefs).values({
      customerId: customer.id,
      emailOptIn: input?.emailOptIn ?? true,
      smsOptIn: false,
    });
  }

  const hoursFromNow = input?.hoursFromNow ?? 24;
  const startsAt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const [appointment] = await db
    .insert(appointments)
    .values({
      shopId: shop.id,
      customerId: customer.id,
      startsAt,
      endsAt,
      status: input?.status ?? "booked",
      bookingUrl: `https://example.com/manage/${randomUUID()}`,
      createdAt: input?.createdAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      reminderTimingsSnapshot: input?.reminderTimingsSnapshot ?? ["24h"],
    })
    .returning();

  if (!appointment) {
    throw new Error("Failed to create appointment");
  }

  return { appointment };
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
    name: "Email Reminder Query User",
    email: `email-reminder-query-${userId}@example.com`,
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

describeIf("findAppointmentsForEmailReminder", () => {
  it("returns booked appointments in the 23-25 hour window for opted-in customers", async () => {
    const { appointment } = await makeFixture({ emailOptIn: true });

    const results = await findAppointmentsForEmailReminder();

    expect(results.some((row) => row.appointmentId === appointment.id)).toBe(true);
  });

  it("excludes appointments when customer opted out of email reminders", async () => {
    const { appointment } = await makeFixture({ emailOptIn: false });

    const results = await findAppointmentsForEmailReminder();

    expect(results.some((row) => row.appointmentId === appointment.id)).toBe(false);
  });

  it("includes appointments when no preference record exists", async () => {
    const { appointment } = await makeFixture({ emailOptIn: null });

    const results = await findAppointmentsForEmailReminder();

    expect(results.some((row) => row.appointmentId === appointment.id)).toBe(true);
  });

  it("excludes cancelled appointments", async () => {
    const { appointment } = await makeFixture({
      status: "cancelled",
      emailOptIn: true,
    });

    const results = await findAppointmentsForEmailReminder();

    expect(results.some((row) => row.appointmentId === appointment.id)).toBe(false);
  });

  it("excludes appointments outside the reminder window", async () => {
    const { appointment } = await makeFixture({
      hoursFromNow: 48,
      emailOptIn: true,
    });

    const results = await findAppointmentsForEmailReminder();

    expect(results.some((row) => row.appointmentId === appointment.id)).toBe(false);
  });

  it("only returns appointments for intervals present in the snapshot", async () => {
    const { appointment: twentyFourHourAppointment } = await makeFixture({
      hoursFromNow: 24,
      emailOptIn: true,
      reminderTimingsSnapshot: ["10m", "2h"],
    });
    const { appointment: twoHourAppointment } = await makeFixture({
      hoursFromNow: 2,
      emailOptIn: true,
      reminderTimingsSnapshot: ["10m", "2h"],
    });

    const results = await findAppointmentsForEmailReminder();

    expect(
      results.some(
        (row) =>
          row.appointmentId === twentyFourHourAppointment.id &&
          row.reminderInterval === "24h"
      )
    ).toBe(false);
    expect(
      results.some(
        (row) =>
          row.appointmentId === twoHourAppointment.id &&
          row.reminderInterval === "2h"
      )
    ).toBe(true);
  });

  it("returns the appointment once per matching interval window", async () => {
    const { appointment } = await makeFixture({
      hoursFromNow: 24,
      emailOptIn: true,
      reminderTimingsSnapshot: ["2h", "24h"],
    });

    const results = await findAppointmentsForEmailReminder();
    const matches = results.filter((row) => row.appointmentId === appointment.id);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.reminderInterval).toBe("24h");
  });

  it("skips appointments booked within the reminder window", async () => {
    const { appointment } = await makeFixture({
      hoursFromNow: 0.08,
      emailOptIn: true,
      createdAt: new Date(),
      reminderTimingsSnapshot: ["10m"],
    });

    const results = await findAppointmentsForEmailReminder();

    expect(results.some((row) => row.appointmentId === appointment.id)).toBe(false);
  });

});
