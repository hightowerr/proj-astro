import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMock, setexMock, delMock, getRedisClientMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  setexMock: vi.fn(),
  delMock: vi.fn(),
  getRedisClientMock: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  getRedisClient: getRedisClientMock,
}));

const { getCached, invalidateCacheKey } = await import("@/lib/cache");

describe("cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRedisClientMock.mockReturnValue({
      get: getMock,
      setex: setexMock,
      del: delMock,
    });
  });

  it("returns cached values when Redis has the key", async () => {
    getMock.mockResolvedValueOnce(JSON.stringify({ value: 42 }));
    const fetchFn = vi.fn();

    const result = await getCached("cache:key", 300, fetchFn);

    expect(result).toEqual({ value: 42 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("falls back to the fetcher and writes the cache on misses", async () => {
    getMock.mockResolvedValueOnce(null);
    const fetchFn = vi.fn().mockResolvedValueOnce({ value: 24 });

    const result = await getCached("cache:key", 300, fetchFn);

    expect(result).toEqual({ value: 24 });
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(setexMock).toHaveBeenCalledWith("cache:key", 300, JSON.stringify({ value: 24 }));
  });

  it("invalidates an exact cache key", async () => {
    await invalidateCacheKey("cache:key");

    expect(delMock).toHaveBeenCalledWith("cache:key");
  });
});
