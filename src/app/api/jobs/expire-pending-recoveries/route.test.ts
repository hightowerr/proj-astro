import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { requirePostgresUrl } from "@/test/db-test-guard";

const hasPostgresUrl = Boolean(
  requirePostgresUrl("src/app/api/jobs/expire-pending-recoveries/route.test.ts"),
);

const LOCK_ID = 482176;

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
    name: "Expire Pending Recoveries User",
    email: `expire_pending_${id}@example.com`,
    emailVerified: true,
  });
};

const makeRequest = (input?: { ttlHours?: number; secret?: string }) => {
  const secret = input?.secret ?? "test-cron-secret";
  const url = new URL("http://localhost:3000/api/jobs/expire-pending-recoveries");
  if (input?.ttlHours !== undefined) {
    url.searchParams.set("ttlHours", String(input.ttlHours));
  }
  return new Request(url.toString(), {
    method: "POST",
    headers: {
      "x-cron-secret": secret,
    },
  });
};

const seedRecovery = async (input?: {
  appointmentStatus?: "pending" | "booked" | "cancelled" | "ended";
  slotStatus?: "open" | "filled" | "expired";
  offerStatus?: "sent" | "accepted" | "expired" | "declined";
}) => {
  const shop = await createShop({
    ownerUserId: userId,
    name: "Expire Pending Recoveries Shop",
    slug: `expire-pending-${userId.slice(0, 8)}`,
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

  const [slotOpening] = await db
    .insert(slotOpenings)
    .values({
      shopId: shop.id,
      startsAt,
      endsAt,
      sourceAppointmentId: sourceAppointment.id,
      status: input?.slotStatus ?? "filled",
    })
    .returning();

  if (!slotOpening) {
    throw new Error("Failed to create slot opening");
  }

  const [recoveryCustomer] = await db
    .insert(customers)
    .values({
      shopId: shop.id,
      fullName: "Recovery Customer",
      phone: randomPhone(),
      email: `recovery_${randomUUID()}@example.com`,
    })
    .returning();

  if (!recoveryCustomer) {
    throw new Error("Failed to create recovery customer");
  }

  const [recoveryAppointment] = await db
    .insert(appointments)
    .values({
      shopId: shop.id,
      customerId: recoveryCustomer.id,
      startsAt,
      endsAt,
      status: input?.appointmentStatus ?? "pending",
      source: "slot_recovery",
      sourceSlotOpeningId: slotOpening.id,
      paymentStatus: "unpaid",
      paymentRequired: true,
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    })
    .returning();

  if (!recoveryAppointment) {
    throw new Error("Failed to create recovery appointment");
  }

  const [slotOffer] = await db
    .insert(slotOffers)
    .values({
      slotOpeningId: slotOpening.id,
      customerId: recoveryCustomer.id,
      channel: "sms",
      status: input?.offerStatus ?? "accepted",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    .returning();

  if (!slotOffer) {
    throw new Error("Failed to create slot offer");
  }

  return {
    shop,
    slotOpening,
    slotOffer,
    recoveryAppointment,
    recoveryCustomer,
  };
};

describeIf("POST /api/jobs/expire-pending-recoveries", () => {
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
    const response = await POST(makeRequest({ secret: "wrong-secret" }));

    expect(response.status).toBe(401);
  });

  it("expires abandoned recovery appointments and triggers offer-loop", async () => {
    const { slotOpening, slotOffer, recoveryAppointment } = await seedRecovery();

    const response = await POST(makeRequest({ ttlHours: 0 }));
    const body = (await response.json()) as {
      expired: number;
      reopened: number;
      triggered: number;
      errors: string[];
    };

    expect(response.status).toBe(200);
    expect(body.expired).toBe(1);
    expect(body.reopened).toBe(1);
    expect(body.triggered).toBe(1);
    expect(body.errors).toEqual([]);

    const updatedAppointment = await db.query.appointments.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, recoveryAppointment.id),
    });

    expect(updatedAppointment?.status).toBe("cancelled");

    const updatedSlot = await db.query.slotOpenings.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOpening.id),
    });

    expect(updatedSlot?.status).toBe("open");

    const updatedOffer = await db.query.slotOffers.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOffer.id),
    });

    expect(updatedOffer?.status).toBe("declined");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/jobs/offer-loop",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ slotOpeningId: slotOpening.id }),
      })
    );
  });

  it("does not expire appointments within the TTL window", async () => {
    const { recoveryAppointment, slotOpening, slotOffer } = await seedRecovery();

    const response = await POST(makeRequest({ ttlHours: 1 }));
    const body = (await response.json()) as {
      expired: number;
      reopened: number;
      triggered: number;
      errors: string[];
    };

    expect(response.status).toBe(200);
    expect(body.expired).toBe(0);
    expect(body.reopened).toBe(0);
    expect(body.triggered).toBe(0);
    expect(body.errors).toEqual([]);

    const unchangedAppointment = await db.query.appointments.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, recoveryAppointment.id),
    });

    expect(unchangedAppointment?.status).toBe("pending");

    const unchangedSlot = await db.query.slotOpenings.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOpening.id),
    });

    expect(unchangedSlot?.status).toBe("filled");

    const unchangedOffer = await db.query.slotOffers.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOffer.id),
    });

    expect(unchangedOffer?.status).toBe("accepted");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is idempotent when appointment is already cancelled", async () => {
    const { slotOffer } = await seedRecovery({ appointmentStatus: "cancelled" });

    const response = await POST(makeRequest({ ttlHours: 0 }));
    const body = (await response.json()) as {
      expired: number;
      reopened: number;
      triggered: number;
      errors: string[];
    };

    expect(response.status).toBe(200);
    expect(body.expired).toBe(0);
    expect(body.reopened).toBe(0);
    expect(body.triggered).toBe(0);
    expect(body.errors).toEqual([]);

    const unchangedOffer = await db.query.slotOffers.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOffer.id),
    });

    expect(unchangedOffer?.status).toBe("accepted");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still cancels appointment when slot is already open", async () => {
    const { recoveryAppointment, slotOffer } = await seedRecovery({ slotStatus: "open" });

    const response = await POST(makeRequest({ ttlHours: 0 }));
    const body = (await response.json()) as {
      expired: number;
      reopened: number;
      triggered: number;
      errors: string[];
    };

    expect(response.status).toBe(200);
    expect(body.expired).toBe(1);
    expect(body.reopened).toBe(0);
    expect(body.triggered).toBe(0);
    expect(body.errors).toEqual([]);

    const updatedAppointment = await db.query.appointments.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, recoveryAppointment.id),
    });

    expect(updatedAppointment?.status).toBe("cancelled");

    const updatedOffer = await db.query.slotOffers.findFirst({
      where: (table, { eq: whereEq }) => whereEq(table.id, slotOffer.id),
    });

    expect(updatedOffer?.status).toBe("declined");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records an error when APP_URL or INTERNAL_SECRET is missing", async () => {
    await seedRecovery();
    vi.stubEnv("APP_URL", "");

    const response = await POST(makeRequest({ ttlHours: 0 }));
    const body = (await response.json()) as {
      expired: number;
      reopened: number;
      triggered: number;
      errors: string[];
    };

    expect(response.status).toBe(200);
    expect(body.expired).toBe(1);
    expect(body.triggered).toBe(0);
    expect(body.errors.length).toBe(1);

    expect(fetchMock).not.toHaveBeenCalled();

    vi.stubEnv("APP_URL", "http://localhost:3000");
  });

  it("returns skipped when advisory lock is already held", async () => {
    const connectionString = process.env.POSTGRES_URL!;
    const client = postgres(connectionString);

    // Hold lock in a separate connection to ensure isolation
    await client`select pg_advisory_lock(${LOCK_ID})`;

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
      await client`select pg_advisory_unlock(${LOCK_ID})`;
      await client.end();
    }
  });
});
