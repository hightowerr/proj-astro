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

const [{ db }, manageTokens, { createAppointment }, { createShop }, schema] =
  await Promise.all([
    import("@/lib/db"),
    import("@/lib/manage-tokens"),
    import("@/lib/queries/appointments"),
    import("@/lib/queries/shops"),
    import("@/lib/schema"),
  ]);

const { createManageToken, generateToken, hashToken, validateToken } = manageTokens;
const { shops, user } = schema;

let userId: string;
let shopId: string;

const insertUser = async (id: string) => {
  const email = `user_${id}@example.com`;
  await db.insert(user).values({
    id,
    name: "Test User",
    email,
    emailVerified: true,
  });
};

const createTestAppointment = async () => {
  const dateStr = (() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 1);
    for (let i = 0; i < 7; i += 1) {
      const day = date.getUTCDay();
      if (day >= 1 && day <= 5) {
        return date.toISOString().slice(0, 10);
      }
      date.setUTCDate(date.getUTCDate() + 1);
    }
    return date.toISOString().slice(0, 10);
  })();

  const startsAt = new Date(`${dateStr}T09:00:00.000Z`);
  return await createAppointment({
    shopId,
    startsAt,
    customer: {
      fullName: "Token Customer",
      phone: "+12025550193",
      email: "token@example.com",
    },
    paymentsEnabled: false,
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
  await insertUser(userId);
  const shop = await createShop({
    ownerUserId: userId,
    name: "Test Shop",
    slug: `test-shop-${userId.slice(0, 6)}-tokens`,
  });
  shopId = shop.id;
});

afterEach(async () => {
  if (!hasPostgresUrl) {
    return;
  }
  await db.delete(shops).where(eq(shops.id, shopId));
  await db.delete(user).where(eq(user.id, userId));
});

const describeIf = hasPostgresUrl ? describe : describe.skip;

describeIf("Manage Tokens", () => {
  it("generates unique 64-character tokens", () => {
    const token1 = generateToken();
    const token2 = generateToken();

    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it("hashes tokens consistently", () => {
    const token = "test-token-12345";
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(token);
  });

  it("creates and validates tokens", async () => {
    const result = await createTestAppointment();
    const rawToken = await createManageToken(result.appointment.id);

    expect(rawToken).toHaveLength(64);

    const appointmentId = await validateToken(rawToken);
    expect(appointmentId).toBe(result.appointment.id);

    const wrongToken = generateToken();
    const invalidResult = await validateToken(wrongToken);
    expect(invalidResult).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const result = await createTestAppointment();
    const rawToken = await createManageToken(result.appointment.id, -1);

    const expiredResult = await validateToken(rawToken);
    expect(expiredResult).toBeNull();
  });
});
