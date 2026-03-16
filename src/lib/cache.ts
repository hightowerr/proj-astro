import { getRedisClient } from "@/lib/redis";

function getOptionalRedisClient() {
  try {
    return getRedisClient();
  } catch {
    return null;
  }
}

export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const redis = getOptionalRedisClient();

  if (redis) {
    try {
      const cached = await redis.get<string>(key);
      if (typeof cached === "string") {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Fall back to the source of truth when Redis is unavailable.
    }
  }

  const fresh = await fetchFn();

  if (redis) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(fresh));
    } catch {
      // Avoid failing user requests on cache write issues.
    }
  }

  return fresh;
}

export async function invalidateCacheKey(key: string): Promise<void> {
  const redis = getOptionalRedisClient();

  if (!redis) {
    return;
  }

  try {
    await redis.del(key);
  } catch {
    // Cache invalidation is best-effort.
  }
}
