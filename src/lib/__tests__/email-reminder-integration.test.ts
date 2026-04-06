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

const sendEmailMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
}));

const hasPostgresUrl = Boolean(process.env.POSTGRES_URL);
if (!hasPostgresUrl) {
  process.env.POSTGRES_URL =
    "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

const [{ db }, { createAppointment }, { createShop }, routeModule, schema] =
  await Promise.all([
    import("@/lib/db"),
    import("@/lib/queries/appointments"),
    import("@/lib/queries/shops"),
    import("@/app/api/appointments/[id]/send-email-reminder/route"),
    import("@/lib/schema"),
  ]);

const { POST } = routeModule;
const { appointments, shops, user } = schema;

let userId: string;

const makeFixture = async (input?: {
  status?: "booked" | "cancelled";
  emailOptIn?: boolean;
}) => {
  const shop = await createShop({
    ownerUserId: userId,
    name: "Email Reminder Integration Shop",
    slug: `email-reminder-integration-${randomUUID().slice(0, 8)}`,
    status: "active",
    timezone: "America/Los_Angeles",
  });

  const result = await createAppointment({
    shopId: shop.id,
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    customer: {
      fullName: "Route Customer",
      phone: "+12025550177",
      email: `route-${randomUUID()}@example.com`,
      smsOptIn: false,
      emailOptIn: input?.emailOptIn ?? true,
    },
    paymentsEnabled: true,
  });

  if ((input?.status ?? "booked") !== "booked") {
    await db
      .update(appointments)
      .set({ status: input?.status ?? "cancelled" })
      .where(eq(appointments.id, result.appointment.id));
  }

  return result;
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

  vi.clearAllMocks();
  userId = randomUUID();
  await db.insert(user).values({
    id: userId,
    name: "Email Reminder Integration User",
    email: `email-reminder-integration-${userId}@example.com`,
    emailVerified: true,
  });

  getSessionMock.mockResolvedValue({
    user: {
      id: userId,
    },
  });
  sendEmailMock.mockResolvedValue({
    success: true,
    messageId: `email_${randomUUID()}`,
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

describeIf("email reminder integration", () => {
  it("sends an email reminder and records dedup plus message log", async () => {
    const { appointment, customer } = await makeFixture();

    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: appointment.id }),
    });
    const body = (await response.json()) as {
      success?: boolean;
      status?: string;
      recipient?: string;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.status).toBe("sent");
    expect(body.recipient).toBe(customer.email);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    const logs = await db.query.messageLog.findMany({
      where: (table, { eq }) => eq(table.appointmentId, appointment.id),
    });
    const dedup = await db.query.messageDedup.findMany({
      where: (table, { eq }) =>
        eq(table.dedupKey, `appointment_reminder_24h:email:${appointment.id}`),
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]?.channel).toBe("email");
    expect(logs[0]?.status).toBe("sent");
    expect(logs[0]?.provider).toBe("resend");
    expect(logs[0]?.toPhone).toBe(customer.email);
    expect(dedup).toHaveLength(1);
  });

  it("returns conflict for duplicate sends", async () => {
    const { appointment } = await makeFixture();

    const first = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: appointment.id }),
    });
    const second = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: appointment.id }),
    });
    const secondBody = (await second.json()) as { error?: string };

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(secondBody.error).toBe("Email reminder already sent for this appointment");
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("rejects customers who opted out of email reminders", async () => {
    const { appointment } = await makeFixture({ emailOptIn: false });

    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: appointment.id }),
    });
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Customer has not opted in to email reminders");
    expect(sendEmailMock).not.toHaveBeenCalled();

    const logs = await db.query.messageLog.findMany({
      where: (table, { eq }) => eq(table.appointmentId, appointment.id),
    });
    expect(logs).toHaveLength(0);
  });

  it("rejects non-booked appointments", async () => {
    const { appointment } = await makeFixture({ status: "cancelled" });

    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: appointment.id }),
    });
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Cannot send reminder for non-booked appointment");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("logs provider failures", async () => {
    const { appointment, customer } = await makeFixture();
    sendEmailMock.mockResolvedValueOnce({
      success: false,
      error: "provider unavailable",
    });

    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: appointment.id }),
    });
    const body = (await response.json()) as { error?: string; details?: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to send email");
    expect(body.details).toBe("provider unavailable");

    const logs = await db.query.messageLog.findMany({
      where: (table, { eq }) => eq(table.appointmentId, appointment.id),
    });
    const dedup = await db.query.messageDedup.findMany({
      where: (table, { eq }) =>
        eq(table.dedupKey, `appointment_reminder_24h:email:${appointment.id}`),
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]?.status).toBe("failed");
    expect(logs[0]?.toPhone).toBe(customer.email);
    expect(logs[0]?.errorMessage).toBe("provider unavailable");
    expect(dedup).toHaveLength(1);
  });
});
