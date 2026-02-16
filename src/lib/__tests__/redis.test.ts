import { beforeEach, describe, expect, it, vi } from "vitest";

type Entry = {
  value: string;
  expiresAtMs: number | null;
};

const { MockRedis, store } = vi.hoisted(() => {
  const store = new Map<string, Entry>();
  const now = () => Date.now();

  const pruneExpired = () => {
    const time = now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAtMs !== null && entry.expiresAtMs <= time) {
        store.delete(key);
      }
    }
  };

  class MockRedis {
    async set(
      key: string,
      value: string,
      options?: { nx?: boolean; ex?: number }
    ): Promise<"OK" | null> {
      pruneExpired();

      if (options?.nx && store.has(key)) {
        return null;
      }

      const expiresAtMs =
        options?.ex && options.ex > 0 ? now() + options.ex * 1000 : null;
      store.set(key, { value, expiresAtMs });
      return "OK";
    }

    async eval(_script: string, keys: string[], args: string[]): Promise<number> {
      pruneExpired();

      const key = keys[0];
      const expected = args[0];
      if (!key || !expected) {
        return 0;
      }

      const current = store.get(key);
      if (!current || current.value !== expected) {
        return 0;
      }

      store.delete(key);
      return 1;
    }

    async setex(key: string, seconds: number, value: string): Promise<"OK"> {
      const expiresAtMs = now() + seconds * 1000;
      store.set(key, { value, expiresAtMs });
      return "OK";
    }

    async get(key: string): Promise<string | null> {
      pruneExpired();
      return store.get(key)?.value ?? null;
    }

    async ttl(key: string): Promise<number> {
      pruneExpired();

      const value = store.get(key);
      if (!value) {
        return -2;
      }

      if (value.expiresAtMs === null) {
        return -1;
      }

      const remainingMs = value.expiresAtMs - now();
      if (remainingMs <= 0) {
        return -2;
      }

      return Math.ceil(remainingMs / 1000);
    }
  }

  return {
    MockRedis,
    store,
  };
});

vi.mock("@upstash/redis", () => ({
  Redis: MockRedis,
}));
const {
  acquireLock,
  getCooldownTTL,
  isInCooldown,
  releaseLock,
  setCooldown,
} = await import("@/lib/redis");

describe("Redis locks", () => {
  beforeEach(() => {
    store.clear();
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  it("acquires lock successfully", async () => {
    const key = `test-lock-${Date.now()}`;
    const lock = await acquireLock(key, 5);

    expect(lock.acquired).toBe(true);
    expect(lock.lockId).toBeTruthy();

    await releaseLock(key, lock.lockId!);
  });

  it("fails to acquire a held lock", async () => {
    const key = `test-lock-${Date.now()}`;

    const lock1 = await acquireLock(key, 5);
    expect(lock1.acquired).toBe(true);

    const lock2 = await acquireLock(key, 5);
    expect(lock2.acquired).toBe(false);
    expect(lock2.lockId).toBeNull();

    await releaseLock(key, lock1.lockId!);
  });

  it("releases lock when owned", async () => {
    const key = `test-lock-${Date.now()}`;
    const lock = await acquireLock(key, 5);

    const released = await releaseLock(key, lock.lockId!);
    expect(released).toBe(true);

    const lock2 = await acquireLock(key, 5);
    expect(lock2.acquired).toBe(true);
  });

  it("does not release lock when not owned", async () => {
    const key = `test-lock-${Date.now()}`;
    const lock = await acquireLock(key, 5);

    const released = await releaseLock(key, "wrong-lock-id");
    expect(released).toBe(false);

    await releaseLock(key, lock.lockId!);
  });
});

describe("Redis cooldowns", () => {
  beforeEach(() => {
    store.clear();
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  it("sets and checks cooldown", async () => {
    const customerId = `test-customer-${Date.now()}`;

    await setCooldown(customerId, 5);

    const inCooldown = await isInCooldown(customerId);
    expect(inCooldown).toBe(true);

    const ttl = await getCooldownTTL(customerId);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(5);
  });

  it("returns false and ttl 0 when cooldown is missing", async () => {
    const customerId = `test-customer-${Date.now()}-none`;

    const inCooldown = await isInCooldown(customerId);
    expect(inCooldown).toBe(false);

    const ttl = await getCooldownTTL(customerId);
    expect(ttl).toBe(0);
  });
});
