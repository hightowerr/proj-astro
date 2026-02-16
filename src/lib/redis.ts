import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set"
      );
    }

    redis = new Redis({ url, token });
  }

  return redis;
}

export interface LockResult {
  acquired: boolean;
  lockId: string | null;
}

/**
 * Acquire a distributed lock using Redis SET NX EX.
 */
export async function acquireLock(
  key: string,
  ttlSeconds = 30
): Promise<LockResult> {
  const client = getRedisClient();
  const lockId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const result = await client.set(key, lockId, {
    nx: true,
    ex: ttlSeconds,
  });

  return {
    acquired: result === "OK",
    lockId: result === "OK" ? lockId : null,
  };
}

/**
 * Release a distributed lock only if we still own it.
 */
export async function releaseLock(key: string, lockId: string): Promise<boolean> {
  const client = getRedisClient();
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  const result = (await client.eval(script, [key], [lockId])) as number;
  return result === 1;
}

/**
 * Set cooldown key for a customer (default: 24h).
 */
export async function setCooldown(
  customerId: string,
  durationSeconds = 24 * 60 * 60
): Promise<void> {
  const client = getRedisClient();
  await client.setex(`offer_cooldown:${customerId}`, durationSeconds, "1");
}

export async function isInCooldown(customerId: string): Promise<boolean> {
  const client = getRedisClient();
  const value = await client.get(`offer_cooldown:${customerId}`);
  return value !== null;
}

export async function getCooldownTTL(customerId: string): Promise<number> {
  const client = getRedisClient();
  const ttl = await client.ttl(`offer_cooldown:${customerId}`);
  return ttl > 0 ? ttl : 0;
}

