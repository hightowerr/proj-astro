import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const hasPostgresUrl = Boolean(process.env.POSTGRES_URL);
if (!hasPostgresUrl) {
  process.env.POSTGRES_URL = "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

const LOCK_ID = 482174;

const [{ db }, { createShop }, schema, route] = await Promise.all([
  import("@/lib/db"),
  import("@/lib/queries/shops"),
  import("@/lib/schema"),
  import("./route"),
]);

const { appointments, customers, shops, slotOffers, slotOpenings, user } = schema;
const { POST } = route;

const describeIf = hasPostgresUrl ? describe : describe.skip;

let userId: string;

const randomPhone = () =>
  `+1202${Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, "0")}`;

const insertUser = async (id: string) => {
  await db.insert(user).values({
    id,
    name: "Expire Offers User",
    email: `expire_offers_${id}@example.com`,
    emailVerified: true,
  });
};

const makeRequest = (secret = "test-cron-secret") =>
  new Request("http://localhost:3000/api/jobs/expire-offers", {
    method: "POST",
    headers: {
      "x-cron-secret": secret,
    },
  });

const seedOffer = async (input?: {
  slotStatus?: "open" | "filled" | "expired";
  offerStatus?: "sent" | "accepted" | "expired" | "declined";
  expiresAt?: Date;
}) => {
  const shop = await createShop({
    ownerUserId: userId,
    name: "Expire Offers Shop",
    slug: `expire-offers-${userId.slice(0, 8)}`,
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
      paymentStatus: "paid",
      paymentRequired: true,
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
      status: input?.slotStatus ?? "open",
    })
    .returning();

  if (!slotOpening) {
    throw new Error("Failed to create slot opening");
  }

  const [slotOffer] = await db
    .insert(slotOffers)
    .values({
      slotOpeningId: slotOpening.id,
      customerId: offeredCustomer.id,
      channel: "sms",
      status: input?.offerStatus ?? "sent",
      expiresAt: input?.expiresAt ?? new Date(Date.now() - 60 * 1000),
    })
    .returning();

  if (!slotOffer) {
    throw new Error("Failed to create slot offer");
  }

  return {
    slotOpening,
    slotOffer,
  };
};

describeIf("POST /api/jobs/expire-offers", () => {
  const fetchMock = vi.fn();

  beforeAll(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("INTERNAL_SECRET", "test-internal-secret");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    userId = randomUUID();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    await insertUser(userId);
  });

  afterEach(async () => {
    await db.delete(shops).where(eq(shops.ownerUserId, userId));
    await db.delete(user).where(eq(user.id, userId));
  });

  it("returns 401 when CRON_SECRET is invalid", async () => {
    const response = await POST(makeRequest("wrong-secret"));

    expect(response.status).toBe(401);
  });

  it("expires sent offers and triggers offer-loop", async () => {
    const { slotOpening, slotOffer } = await seedOffer();

    const response = await POST(makeRequest());
    const body = (await response.json()) as {
      total: number;
      expired: number;
      triggered: number;
      errors: string[];
    };

    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.expired).toBe(1);
    expect(body.triggered).toBe(1);
    expect(body.errors).toEqual([]);

    const updatedOffer = await db.query.slotOffers.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOffer.id),
    });

    expect(updatedOffer?.status).toBe("expired");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/jobs/offer-loop",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ slotOpeningId: slotOpening.id }),
      })
    );
  });

  it("skips offers for non-open slots", async () => {
    const { slotOffer } = await seedOffer({ slotStatus: "filled" });

    const response = await POST(makeRequest());
    const body = (await response.json()) as {
      total: number;
      expired: number;
      triggered: number;
    };

    expect(response.status).toBe(200);
    expect(body.total).toBe(0);
    expect(body.expired).toBe(0);
    expect(body.triggered).toBe(0);

    const unchangedOffer = await db.query.slotOffers.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOffer.id),
    });

    expect(unchangedOffer?.status).toBe("sent");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns skipped when advisory lock is already held", async () => {
    await db.execute(sql`select pg_advisory_lock(${LOCK_ID})`);

    try {
      const response = await POST(makeRequest());
      const body = (await response.json()) as {
        skipped: boolean;
        reason: string;
      };

      expect(response.status).toBe(200);
      expect(body.skipped).toBe(true);
      expect(body.reason).toBe("locked");
    } finally {
      await db.execute(sql`select pg_advisory_unlock(${LOCK_ID})`);
    }
  });

  it("records an error when APP_URL or INTERNAL_SECRET is missing", async () => {
    const { slotOffer } = await seedOffer();
    vi.stubEnv("APP_URL", "");

    const response = await POST(makeRequest());
    const body = (await response.json()) as {
      expired: number;
      triggered: number;
      errors: string[];
    };

    expect(response.status).toBe(200);
    expect(body.expired).toBe(1);
    expect(body.triggered).toBe(0);
    expect(body.errors.length).toBe(1);

    const updatedOffer = await db.query.slotOffers.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOffer.id),
    });

    expect(updatedOffer?.status).toBe("expired");
    expect(fetchMock).not.toHaveBeenCalled();

    vi.stubEnv("APP_URL", "http://localhost:3000");
  });
});
