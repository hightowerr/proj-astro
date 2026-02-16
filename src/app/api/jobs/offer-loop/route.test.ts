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

const { sendTwilioSmsMock } = vi.hoisted(() => ({
  sendTwilioSmsMock: vi.fn(async () => ({ sid: "mock_sid" })),
}));

const { isInCooldownMock, resetRedisMocks } = vi.hoisted(() => {
  const cooldowns = new Set<string>();
  const isInCooldownMock = vi.fn();

  const resetRedisMocks = () => {
    cooldowns.clear();
    isInCooldownMock.mockReset();
    isInCooldownMock.mockImplementation(async (customerId: string) =>
      cooldowns.has(customerId)
    );
  };

  resetRedisMocks();

  return {
    isInCooldownMock,
    resetRedisMocks,
  };
});

vi.mock("@/lib/twilio", () => ({
  smsIsMocked: () => true,
  sendTwilioSms: sendTwilioSmsMock,
}));

vi.mock("@/lib/redis", () => ({
  isInCooldown: isInCooldownMock,
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
  setCooldown: vi.fn(),
}));

const [{ db }, { createShop }, schema, route] = await Promise.all([
  import("@/lib/db"),
  import("@/lib/queries/shops"),
  import("@/lib/schema"),
  import("./route"),
]);

const { appointments, customerContactPrefs, customers, shops, slotOpenings, user } =
  schema;
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

const makeRequest = (
  body: Record<string, unknown>,
  secret = "test-internal-secret"
) =>
  new Request("http://localhost:3000/api/jobs/offer-loop", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": secret,
    },
    body: JSON.stringify(body),
  });

const seedSlotOpening = async (input?: {
  slotStatus?: "open" | "filled" | "expired";
  sourceSmsOptIn?: boolean;
  withEligibleCustomer?: boolean;
  forceCooldownForEligible?: boolean;
}) => {
  const shop = await createShop({
    ownerUserId: userId,
    name: "Offer Loop Shop",
    slug: `offer-loop-${userId.slice(0, 8)}`,
  });

  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
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

  if (input?.sourceSmsOptIn) {
    await db.insert(customerContactPrefs).values({
      customerId: sourceCustomer.id,
      smsOptIn: true,
    });
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

  const [slotOpening] = await db
    .insert(slotOpenings)
    .values({
      shopId: shop.id,
      startsAt,
      endsAt,
      sourceAppointmentId: sourceAppointment.id,
      status: input?.slotStatus ?? "open",
    })
    .returning();

  if (!slotOpening) {
    throw new Error("Failed to create slot opening");
  }

  let eligibleCustomer: typeof customers.$inferSelect | null = null;

  if (input?.withEligibleCustomer) {
    const [inserted] = await db
      .insert(customers)
      .values({
        shopId: shop.id,
        fullName: "Eligible Customer",
        phone: randomPhone(),
        email: `eligible_${randomUUID()}@example.com`,
      })
      .returning();

    if (!inserted) {
      throw new Error("Failed to create eligible customer");
    }

    await db.insert(customerContactPrefs).values({
      customerId: inserted.id,
      smsOptIn: true,
    });

    if (input?.forceCooldownForEligible) {
      isInCooldownMock.mockImplementation(async (customerId: string) =>
        customerId === inserted.id
      );
    }

    eligibleCustomer = inserted;
  }

  return {
    shopId: shop.id,
    slotOpening,
    sourceCustomer,
    eligibleCustomer,
  };
};

describeIf("POST /api/jobs/offer-loop", () => {
  beforeAll(() => {
    vi.stubEnv("INTERNAL_SECRET", "test-internal-secret");
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

  it("returns 401 with wrong INTERNAL_SECRET", async () => {
    const response = await POST(
      makeRequest({ slotOpeningId: randomUUID() }, "wrong-secret")
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 without slotOpeningId", async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
  });

  it("returns 404 when slot opening is missing", async () => {
    const response = await POST(makeRequest({ slotOpeningId: randomUUID() }));

    expect(response.status).toBe(404);
  });

  it("sends offer to first eligible customer", async () => {
    const { slotOpening, eligibleCustomer } = await seedSlotOpening({
      slotStatus: "open",
      sourceSmsOptIn: false,
      withEligibleCustomer: true,
    });

    const response = await POST(makeRequest({ slotOpeningId: slotOpening.id }));
    const data = (await response.json()) as {
      success: boolean;
      customerId: string;
      customerPhone: string;
    };

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.customerId).toBe(eligibleCustomer?.id);
    expect(data.customerPhone).toBe(eligibleCustomer?.phone);
    expect(sendTwilioSmsMock).toHaveBeenCalledOnce();

    const sentOffer = await db.query.slotOffers.findFirst({
      where: (table, { and, eq: whereEq }) =>
        and(
          whereEq(table.slotOpeningId, slotOpening.id),
          whereEq(table.customerId, eligibleCustomer!.id)
        ),
    });

    expect(sentOffer).toBeDefined();
    expect(sentOffer?.status).toBe("sent");
  });

  it("marks slot as expired when no eligible customers are found", async () => {
    const { slotOpening } = await seedSlotOpening({
      slotStatus: "open",
      sourceSmsOptIn: false,
      withEligibleCustomer: false,
    });

    const response = await POST(makeRequest({ slotOpeningId: slotOpening.id }));
    const data = (await response.json()) as {
      success: boolean;
      completed: boolean;
      reason: string;
    };

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.completed).toBe(true);
    expect(data.reason).toBe("no_eligible_customers");
    expect(sendTwilioSmsMock).not.toHaveBeenCalled();

    const updatedSlot = await db.query.slotOpenings.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOpening.id),
    });

    expect(updatedSlot?.status).toBe("expired");
  });

  it("marks slot as expired when candidates are filtered by cooldown", async () => {
    const { slotOpening } = await seedSlotOpening({
      slotStatus: "open",
      sourceSmsOptIn: false,
      withEligibleCustomer: true,
      forceCooldownForEligible: true,
    });

    const response = await POST(makeRequest({ slotOpeningId: slotOpening.id }));
    const data = (await response.json()) as {
      success: boolean;
      completed: boolean;
      reason: string;
    };

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.completed).toBe(true);
    expect(data.reason).toBe("no_eligible_customers");
    expect(sendTwilioSmsMock).not.toHaveBeenCalled();
  });

  it("skips when slot status is not open", async () => {
    const { slotOpening } = await seedSlotOpening({
      slotStatus: "filled",
      sourceSmsOptIn: false,
      withEligibleCustomer: true,
    });

    const response = await POST(makeRequest({ slotOpeningId: slotOpening.id }));
    const data = (await response.json()) as {
      success: boolean;
      skipped: boolean;
      reason: string;
    };

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.skipped).toBe(true);
    expect(data.reason).toBe("slot_status_filled");
    expect(sendTwilioSmsMock).not.toHaveBeenCalled();

    const offersForSlot = await db.query.slotOffers.findMany({
      where: (table, { eq: whereEq }) => whereEq(table.slotOpeningId, slotOpening.id),
    });
    expect(offersForSlot).toHaveLength(0);
  });
});
