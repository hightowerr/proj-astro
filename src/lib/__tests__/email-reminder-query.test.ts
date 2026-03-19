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
});
