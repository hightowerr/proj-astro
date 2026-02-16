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
const testLockId = String(800001 + Math.floor(Math.random() * 100000));
if (!hasPostgresUrl) {
  // Prevent module-import crash in db.ts; suite remains skipped below.
  process.env.POSTGRES_URL =
    "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

const [{ db }, { createShop }, schema, route] = await Promise.all([
  import("@/lib/db"),
  import("@/lib/queries/shops"),
  import("@/lib/schema"),
  import("./route"),
]);

const { appointments, customers, payments, shopPolicies, shops, user } = schema;
const { POST } = route;

const describeIf = hasPostgresUrl ? describe : describe.skip;

let userId: string;
let shopId: string;
let customerId: string;

type CreateAppointmentInput = {
  status?: "booked" | "cancelled";
  financialOutcome?: "unresolved" | "settled" | "voided" | "refunded";
  paymentRequired?: boolean;
  appointmentPaymentStatus?: "unpaid" | "pending" | "paid" | "failed";
  resolutionReason?: string | null;
  withPayment?: boolean;
  payment?: {
    status?:
      | "requires_payment_method"
      | "requires_action"
      | "processing"
      | "succeeded"
      | "failed"
      | "canceled";
    refundedAmountCents?: number;
    stripeRefundId?: string | null;
  };
};

const insertUser = async (id: string) => {
  const email = `user_${id}@example.com`;
  await db.insert(user).values({
    id,
    name: "Test User",
    email,
    emailVerified: true,
  });
};

const makeRequest = (cronSecret = "test-secret") =>
  new Request(`http://localhost:3000/api/jobs/resolve-outcomes?lockId=${testLockId}`, {
    method: "POST",
    headers: { "x-cron-secret": cronSecret },
  });

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const runResolveOutcomes = async (attempts = 10, delayMs = 100) => {
  let lastBody: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    lastBody = await response.json();

    const skipped =
      typeof lastBody === "object" &&
      lastBody !== null &&
      "skipped" in lastBody &&
      (lastBody as { skipped?: unknown }).skipped === true;

    if (!skipped) {
      return lastBody as {
        total: number;
        resolved: number;
        skipped: number;
        backfilled: number;
        errors: string[];
      };
    }

    await sleep(delayMs);
  }

  throw new Error(
    `resolve-outcomes remained locked after ${attempts} attempts. Last response: ${JSON.stringify(lastBody)}`
  );
};

const createAppointment = async (input: CreateAppointmentInput = {}) => {
  const now = new Date();
  const startsAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const endsAt = new Date(now.getTime() - 60 * 60 * 1000);
  const status = input.status ?? "booked";
  const financialOutcome = input.financialOutcome ?? "unresolved";
  const resolvedAt = financialOutcome === "unresolved" ? null : now;

  const [appointment] = await db
    .insert(appointments)
    .values({
      shopId,
      customerId,
      startsAt,
      endsAt,
      status,
      cancelledAt: status === "cancelled" ? now : null,
      cancellationSource: status === "cancelled" ? "customer" : null,
      paymentStatus: input.appointmentPaymentStatus ?? "paid",
      paymentRequired: input.paymentRequired ?? true,
      financialOutcome,
      resolvedAt,
      resolutionReason: input.resolutionReason ?? null,
    })
    .returning({ id: appointments.id });

  if (!appointment) {
    throw new Error("Failed to create appointment");
  }

  if (input.withPayment !== false) {
    await db.insert(payments).values({
      shopId,
      appointmentId: appointment.id,
      provider: "stripe",
      amountCents: 2000,
      currency: "USD",
      status: input.payment?.status ?? "succeeded",
      refundedAmountCents: input.payment?.refundedAmountCents ?? 0,
      stripeRefundId: input.payment?.stripeRefundId ?? null,
      attempts: 0,
    });
  }

  return appointment.id;
};

describeIf("resolve outcomes job", () => {
  beforeAll(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(async () => {
    userId = randomUUID();
    await insertUser(userId);

    const shop = await createShop({
      ownerUserId: userId,
      name: "Test Shop",
      slug: `test-shop-${userId.slice(0, 6)}-resolve`,
    });
    shopId = shop.id;

    await db
      .insert(shopPolicies)
      .values({
        shopId,
        currency: "USD",
        paymentMode: "deposit",
        depositAmountCents: 2000,
        resolutionGraceMinutes: 0,
      })
      .onConflictDoNothing();

    customerId = randomUUID();
    await db.insert(customers).values({
      id: customerId,
      shopId,
      fullName: "Resolver Customer",
      phone: `+1202${Math.floor(Math.random() * 1_000_0000)
        .toString()
        .padStart(7, "0")}`,
      email: `resolver_${randomUUID()}@example.com`,
    });
  });

  afterEach(async () => {
    if (shopId) {
      await db.delete(appointments).where(eq(appointments.shopId, shopId));
      await db.delete(customers).where(eq(customers.id, customerId));
      await db.delete(shopPolicies).where(eq(shopPolicies.shopId, shopId));
      await db.delete(shops).where(eq(shops.id, shopId));
    }
    if (userId) {
      await db.delete(user).where(eq(user.id, userId));
    }
  });

  it("returns 401 when cron secret is invalid", async () => {
    const response = await POST(makeRequest("wrong-secret"));
    expect(response.status).toBe(401);
  });

  it("resolves non-cancelled outcomes and remains idempotent", async () => {
    const appointmentId = await createAppointment();
    await runResolveOutcomes();

    const appointmentRow = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.id, appointmentId),
    });

    expect(appointmentRow?.financialOutcome).toBe("settled");
    expect(appointmentRow?.resolvedAt).toBeTruthy();
    expect(appointmentRow?.resolutionReason).toBe("payment_captured");
    expect(appointmentRow?.lastEventId).toBeTruthy();

    const events = await db.query.appointmentEvents.findMany({
      where: (table, { eq }) => eq(table.appointmentId, appointmentId),
    });

    const resolvedEvents = events.filter(
      (event) => event.type === "outcome_resolved"
    );
    expect(resolvedEvents.length).toBe(1);

    await runResolveOutcomes();

    const eventsAfter = await db.query.appointmentEvents.findMany({
      where: (table, { eq }) => eq(table.appointmentId, appointmentId),
    });
    const resolvedEventsAfter = eventsAfter.filter(
      (event) => event.type === "outcome_resolved"
    );
    expect(resolvedEventsAfter.length).toBe(1);
  });

  it("backfills cancelled unresolved appointments as refunded", async () => {
    const appointmentId = await createAppointment({
      status: "cancelled",
      financialOutcome: "unresolved",
      payment: {
        status: "succeeded",
        refundedAmountCents: 2000,
        stripeRefundId: "re_test_123",
      },
    });

    const body = await runResolveOutcomes();
    expect(body.backfilled).toBeGreaterThanOrEqual(1);

    const row = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.id, appointmentId),
    });
    expect(row?.status).toBe("cancelled");
    expect(row?.financialOutcome).toBe("refunded");
    expect(row?.resolutionReason).toBe("cancelled_refunded_before_cutoff");

    const events = await db.query.appointmentEvents.findMany({
      where: (table, { eq }) => eq(table.appointmentId, appointmentId),
    });
    const resolvedEvent = events.find((event) => event.type === "outcome_resolved");
    expect(resolvedEvent?.meta).toMatchObject({
      backfilled: true,
      financialOutcome: "refunded",
      resolutionReason: "cancelled_refunded_before_cutoff",
    });
  });

  it("backfills cancelled unresolved appointments as settled when capture has no refund", async () => {
    const appointmentId = await createAppointment({
      status: "cancelled",
      financialOutcome: "unresolved",
      payment: {
        status: "succeeded",
        refundedAmountCents: 0,
        stripeRefundId: null,
      },
    });

    const body = await runResolveOutcomes();
    expect(body.backfilled).toBeGreaterThanOrEqual(1);

    const row = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.id, appointmentId),
    });
    expect(row?.financialOutcome).toBe("settled");
    expect(row?.resolutionReason).toBe("cancelled_no_refund_after_cutoff");
  });

  it("backfills cancelled unresolved appointments as voided when payment is missing", async () => {
    const appointmentId = await createAppointment({
      status: "cancelled",
      financialOutcome: "unresolved",
      withPayment: false,
      appointmentPaymentStatus: "unpaid",
      paymentRequired: false,
    });

    const body = await runResolveOutcomes();
    expect(body.backfilled).toBeGreaterThanOrEqual(1);

    const row = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.id, appointmentId),
    });
    expect(row?.financialOutcome).toBe("voided");
    expect(row?.resolutionReason).toBe("cancelled_no_payment_captured");
  });

  it("does not overwrite resolved cancellation outcomes", async () => {
    const appointmentId = await createAppointment({
      status: "cancelled",
      financialOutcome: "refunded",
      resolutionReason: "cancelled_refunded_before_cutoff",
      payment: {
        status: "succeeded",
        refundedAmountCents: 2000,
        stripeRefundId: "re_test_999",
      },
    });

    const before = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.id, appointmentId),
    });

    await runResolveOutcomes();

    const after = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.id, appointmentId),
    });
    expect(after?.financialOutcome).toBe("refunded");
    expect(after?.resolutionReason).toBe("cancelled_refunded_before_cutoff");
    expect(after?.resolvedAt?.toISOString()).toBe(before?.resolvedAt?.toISOString());

    const events = await db.query.appointmentEvents.findMany({
      where: (table, { eq }) => eq(table.appointmentId, appointmentId),
    });
    const resolvedEvents = events.filter((event) => event.type === "outcome_resolved");
    expect(resolvedEvents.length).toBe(0);
  });
});
