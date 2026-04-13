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
  requirePostgresUrl("src/lib/__tests__/confirmation.test.ts"),
);

const {
  sendTwilioSmsMock,
  sendAppointmentReminderSMSMock,
} = vi.hoisted(() => ({
  sendTwilioSmsMock: vi.fn(async () => ({ sid: "mock_confirmation_sid" })),
  sendAppointmentReminderSMSMock: vi.fn(async () => "sent" as const),
}));

vi.mock("@/lib/twilio", () => ({
  smsIsMocked: () => true,
  sendTwilioSms: sendTwilioSmsMock,
}));

vi.mock("@/lib/messages", () => ({
  sendAppointmentReminderSMS: sendAppointmentReminderSMSMock,
}));

const [{ db }, { createShop }, schema, confirmation] = await Promise.all([
  import("@/lib/db"),
  import("@/lib/queries/shops"),
  import("@/lib/schema"),
  import("@/lib/confirmation"),
]);

const {
  appointments,
  customerContactPrefs,
  customers,
  shops,
  user,
} = schema;
const { processConfirmationReply, sendConfirmationRequest, sendReminderSMS } =
  confirmation;

const describeIf = hasPostgresUrl ? describe : describe.skip;

let userId: string;

const insertUser = async (id: string) => {
  await db.insert(user).values({
    id,
    name: "Confirmation Tester",
    email: `confirmation_${id}@example.com`,
    emailVerified: true,
  });
};

const seedBookedAppointment = async () => {
  const shop = await createShop({
    ownerUserId: userId,
    name: "Confirmation Shop",
    slug: `confirmation-${userId.slice(0, 8)}`,
    timezone: "America/New_York",
  });

  const [customer] = await db
    .insert(customers)
    .values({
      shopId: shop.id,
      fullName: "Taylor Customer",
      phone: "+12025550177",
      email: `customer_${randomUUID()}@example.com`,
    })
    .returning();

  if (!customer) {
    throw new Error("Failed to create customer");
  }

  await db.insert(customerContactPrefs).values({
    customerId: customer.id,
    smsOptIn: true,
  });

  const startsAt = new Date("2026-04-20T14:00:00.000Z");
  const endsAt = new Date("2026-04-20T15:00:00.000Z");

  const [appointment] = await db
    .insert(appointments)
    .values({
      shopId: shop.id,
      customerId: customer.id,
      startsAt,
      endsAt,
      status: "booked",
      bookingUrl: `https://example.com/manage/${randomUUID()}`,
    })
    .returning();

  if (!appointment) {
    throw new Error("Failed to create appointment");
  }

  return { appointment, customer, shop };
};

describeIf("confirmation", () => {
  beforeAll(() => {
    vi.stubEnv("NODE_ENV", "test");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    userId = randomUUID();
    sendTwilioSmsMock.mockClear();
    sendAppointmentReminderSMSMock.mockClear();
    await insertUser(userId);
  });

  afterEach(async () => {
    await db.delete(shops).where(eq(shops.ownerUserId, userId));
    await db.delete(user).where(eq(user.id, userId));
  });

  it("sends a confirmation request and marks the appointment pending", async () => {
    const { appointment } = await seedBookedAppointment();

    const result = await sendConfirmationRequest(appointment.id);

    expect(result).toEqual({ success: true, status: "pending" });
    expect(sendTwilioSmsMock).toHaveBeenCalledOnce();

    const updatedAppointment = await db.query.appointments.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, appointment.id),
    });
    expect(updatedAppointment?.confirmationStatus).toBe("pending");
    expect(updatedAppointment?.confirmationSentAt).toBeTruthy();
    expect(updatedAppointment?.confirmationDeadline).toBeTruthy();

    const logs = await db.query.messageLog.findMany({
      where: (table, { eq: whereEq }) => whereEq(table.appointmentId, appointment.id),
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.purpose).toBe("appointment_confirmation_request");
    expect(logs[0]?.status).toBe("sent");
  });

  it("prevents duplicate confirmation sends once an appointment is pending", async () => {
    const { appointment } = await seedBookedAppointment();

    await sendConfirmationRequest(appointment.id);

    await expect(sendConfirmationRequest(appointment.id)).rejects.toThrow(
      "Confirmation request already pending"
    );
    expect(sendTwilioSmsMock).toHaveBeenCalledTimes(1);
  });

  it("confirms the nearest pending appointment when the customer replies YES", async () => {
    const { appointment, customer } = await seedBookedAppointment();
    await sendConfirmationRequest(appointment.id);

    const result = await processConfirmationReply(customer.phone, " yes ");

    expect(result).toMatchObject({
      matched: true,
      appointmentId: appointment.id,
    });

    const updatedAppointment = await db.query.appointments.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, appointment.id),
    });
    expect(updatedAppointment?.confirmationStatus).toBe("confirmed");
    expect(updatedAppointment?.confirmationDeadline).toBeNull();
  });

  it("uses the existing reminder sender for manual reminder actions", async () => {
    const { appointment, customer, shop } = await seedBookedAppointment();

    const result = await sendReminderSMS(appointment.id);

    expect(result).toBe("sent");
    expect(sendAppointmentReminderSMSMock).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: appointment.id,
        customerId: customer.id,
        customerPhone: customer.phone,
        shopId: shop.id,
        shopName: shop.name,
      })
    );
  });
});
