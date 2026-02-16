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

if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}

const { sendTwilioSmsMock } = vi.hoisted(() => ({
  sendTwilioSmsMock: vi.fn(async () => ({ sid: "mock_sid" })),
}));

const {
  acquireLockMock,
  isInCooldownMock,
  releaseLockMock,
  resetRedisMocks,
  setCooldownMock,
} = vi.hoisted(() => {
  const locks = new Map<string, string>();
  const cooldowns = new Set<string>();

  const acquireLockMock = vi.fn();
  const releaseLockMock = vi.fn();
  const setCooldownMock = vi.fn();
  const isInCooldownMock = vi.fn();

  const resetRedisMocks = () => {
    locks.clear();
    cooldowns.clear();

    acquireLockMock.mockReset();
    releaseLockMock.mockReset();
    setCooldownMock.mockReset();
    isInCooldownMock.mockReset();

    acquireLockMock.mockImplementation(async (key: string) => {
      if (locks.has(key)) {
        return { acquired: false, lockId: null };
      }

      const lockId = `lock-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      locks.set(key, lockId);
      return { acquired: true, lockId };
    });

    releaseLockMock.mockImplementation(async (key: string, lockId: string) => {
      if (locks.get(key) !== lockId) {
        return false;
      }

      locks.delete(key);
      return true;
    });

    setCooldownMock.mockImplementation(async (customerId: string) => {
      cooldowns.add(customerId);
    });

    isInCooldownMock.mockImplementation(async (customerId: string) =>
      cooldowns.has(customerId)
    );
  };

  resetRedisMocks();

  return {
    acquireLockMock,
    isInCooldownMock,
    releaseLockMock,
    resetRedisMocks,
    setCooldownMock,
  };
});

vi.mock("@/lib/twilio", () => ({
  smsIsMocked: () => true,
  sendTwilioSms: sendTwilioSmsMock,
}));

vi.mock("@/lib/redis", () => ({
  acquireLock: acquireLockMock,
  releaseLock: releaseLockMock,
  setCooldown: setCooldownMock,
  isInCooldown: isInCooldownMock,
}));

const [{ db }, { createShop }, schema, route] = await Promise.all([
  import("@/lib/db"),
  import("@/lib/queries/shops"),
  import("@/lib/schema"),
  import("./route"),
]);

const {
  appointments,
  customers,
  shops,
  slotOffers,
  slotOpenings,
  user,
} = schema;
const { POST } = route;

const describeIf = hasPostgresUrl ? describe : describe.skip;

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

const randomPhone = () =>
  `+1202${Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, "0")}`;

const makeInboundRequest = (from: string, body: string) =>
  new Request("http://localhost:3000/api/twilio/inbound", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: from,
      Body: body,
    }).toString(),
  });

const tomorrowAt = (hourUtc: number, minuteUtc = 0) => {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 1);
  value.setUTCHours(hourUtc, minuteUtc, 0, 0);
  return value;
};

const seedOpenOffer = async () => {
  const shop = await createShop({
    ownerUserId: userId,
    name: "Inbound Shop",
    slug: `inbound-${userId.slice(0, 8)}`,
  });

  const startsAt = tomorrowAt(10);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const [sourceCustomer] = await db
    .insert(customers)
    .values({
      shopId: shop.id,
      fullName: "Source Customer",
      phone: randomPhone(),
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
      startsAt,
      endsAt,
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationSource: "customer",
    })
    .returning();

  if (!sourceAppointment) {
    throw new Error("Failed to create source appointment");
  }

  const [offeredCustomer] = await db
    .insert(customers)
    .values({
      shopId: shop.id,
      fullName: "Offered Customer",
      phone: randomPhone(),
      email: `offered_${randomUUID()}@example.com`,
    })
    .returning();

  if (!offeredCustomer) {
    throw new Error("Failed to create offered customer");
  }

  const [slotOpening] = await db
    .insert(slotOpenings)
    .values({
      shopId: shop.id,
      startsAt,
      endsAt,
      sourceAppointmentId: sourceAppointment.id,
      status: "open",
    })
    .returning();

  if (!slotOpening) {
    throw new Error("Failed to create slot opening");
  }

  await db
    .insert(slotOffers)
    .values({
      slotOpeningId: slotOpening.id,
      customerId: offeredCustomer.id,
      channel: "sms",
      status: "sent",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    })
    .returning();

  return {
    shop,
    slotOpening,
    offeredCustomer,
  };
};

const seedTwoOpenOffers = async () => {
  const seeded = await seedOpenOffer();

  const [secondCustomer] = await db
    .insert(customers)
    .values({
      shopId: seeded.shop.id,
      fullName: "Second Offered Customer",
      phone: randomPhone(),
      email: `offered_${randomUUID()}@example.com`,
    })
    .returning();

  if (!secondCustomer) {
    throw new Error("Failed to create second offered customer");
  }

  await db.insert(slotOffers).values({
    slotOpeningId: seeded.slotOpening.id,
    customerId: secondCustomer.id,
    channel: "sms",
    status: "sent",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  return {
    ...seeded,
    secondCustomer,
  };
};

describeIf("POST /api/twilio/inbound", () => {
  beforeAll(() => {
    vi.stubEnv("NODE_ENV", "test");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    userId = randomUUID();
    sendTwilioSmsMock.mockClear();
    resetRedisMocks();
    await insertUser(userId);
  });

  afterEach(async () => {
    await db.delete(shops).where(eq(shops.ownerUserId, userId));
    await db.delete(user).where(eq(user.id, userId));
  });

  it("accepts YES for an open offer and creates a slot recovery booking", async () => {
    const { shop, slotOpening, offeredCustomer } = await seedOpenOffer();

    const response = await POST(makeInboundRequest(offeredCustomer.phone, " yes "));
    const twiml = await response.text();

    expect(response.status).toBe(200);
    expect(twiml).toContain("<Response />");

    const recoveredAppointment = await db.query.appointments.findFirst({
      where: (table, { eq: whereEq }) =>
        whereEq(table.sourceSlotOpeningId, slotOpening.id),
    });

    expect(recoveredAppointment).toBeDefined();
    expect(recoveredAppointment?.source).toBe("slot_recovery");

    const recoveredPayment = await db.query.payments.findFirst({
      where: (table, { eq: whereEq }) =>
        whereEq(table.appointmentId, recoveredAppointment!.id),
    });

    expect(recoveredPayment).toBeDefined();

    const updatedSlot = await db.query.slotOpenings.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOpening.id),
    });

    expect(updatedSlot?.status).toBe("filled");

    const updatedOffer = await db.query.slotOffers.findFirst({
      where: (table, { eq: whereEq }) =>
        whereEq(table.slotOpeningId, slotOpening.id),
    });

    expect(updatedOffer?.status).toBe("accepted");
    expect(updatedOffer?.acceptedAt).toBeTruthy();

    expect(sendTwilioSmsMock).toHaveBeenCalledOnce();
    expect(sendTwilioSmsMock).toHaveBeenCalledWith({
      to: offeredCustomer.phone,
      body: expect.stringContaining(
        `/book/${shop.slug}?appointment=${recoveredAppointment!.id}`
      ),
    });
    expect(setCooldownMock).toHaveBeenCalledWith(offeredCustomer.id, 24 * 60 * 60);
  });

  it("returns a helpful message for YES with no active offer", async () => {
    const response = await POST(makeInboundRequest(randomPhone(), "YES"));
    const twiml = await response.text();

    expect(response.status).toBe(200);
    expect(twiml).toContain("No active offers found");
    expect(sendTwilioSmsMock).not.toHaveBeenCalled();

    const recoveryAppointments = await db.query.appointments.findMany({
      where: (table, { eq: whereEq }) => whereEq(table.source, "slot_recovery"),
    });

    expect(recoveryAppointments).toHaveLength(0);
  });

  it("returns slot taken message when lock acquisition fails", async () => {
    const { slotOpening, offeredCustomer } = await seedOpenOffer();
    acquireLockMock.mockResolvedValueOnce({ acquired: false, lockId: null });

    const response = await POST(makeInboundRequest(offeredCustomer.phone, "YES"));
    const twiml = await response.text();

    expect(response.status).toBe(200);
    expect(twiml).toContain("just been taken by another customer");
    expect(sendTwilioSmsMock).not.toHaveBeenCalled();

    const recoveryAppointments = await db.query.appointments.findMany({
      where: (table, { eq: whereEq }) =>
        whereEq(table.sourceSlotOpeningId, slotOpening.id),
    });
    expect(recoveryAppointments).toHaveLength(0);
  });

  it("handles concurrent YES replies by creating exactly one booking", async () => {
    const { slotOpening, offeredCustomer, secondCustomer } = await seedTwoOpenOffers();

    acquireLockMock
      .mockResolvedValueOnce({ acquired: true, lockId: "lock-winner" })
      .mockResolvedValueOnce({ acquired: false, lockId: null });
    releaseLockMock.mockResolvedValue(true);

    const [response1, response2] = await Promise.all([
      POST(makeInboundRequest(offeredCustomer.phone, "YES")),
      POST(makeInboundRequest(secondCustomer.phone, "YES")),
    ]);

    const [twiml1, twiml2] = await Promise.all([response1.text(), response2.text()]);
    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);

    const slotRecoveryAppointments = await db.query.appointments.findMany({
      where: (table, { eq: whereEq }) =>
        whereEq(table.sourceSlotOpeningId, slotOpening.id),
    });
    expect(slotRecoveryAppointments).toHaveLength(1);

    const updatedSlot = await db.query.slotOpenings.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOpening.id),
    });
    expect(updatedSlot?.status).toBe("filled");

    const offers = await db.query.slotOffers.findMany({
      where: (table, { eq: whereEq }) => whereEq(table.slotOpeningId, slotOpening.id),
    });
    expect(offers.filter((offer) => offer.status === "accepted")).toHaveLength(1);
    expect(offers.filter((offer) => offer.status === "sent")).toHaveLength(1);

    expect(setCooldownMock).toHaveBeenCalledTimes(1);
    expect(setCooldownMock).toHaveBeenCalledWith(
      slotRecoveryAppointments[0]?.customerId,
      24 * 60 * 60
    );

    const allTwiml = [twiml1, twiml2];
    expect(
      allTwiml.filter((response) =>
        response.includes("just been taken by another customer")
      )
    ).toHaveLength(1);
  });
});
