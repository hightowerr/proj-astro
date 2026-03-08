import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  dbMock,
  decryptTokenMock,
  deserializeEncryptedTokenMock,
  getGoogleCalendarOAuthEnvMock,
  selectLimitMock,
  updateReturningMock,
} = vi.hoisted(() => {
  const selectLimitMock = vi.fn();
  const selectBuilder = {
    from: vi.fn(),
    where: vi.fn(),
    limit: selectLimitMock,
  };
  selectBuilder.from.mockReturnValue(selectBuilder);
  selectBuilder.where.mockReturnValue(selectBuilder);

  const updateReturningMock = vi.fn();
  const updateWhereMock = vi.fn(() => ({
    returning: updateReturningMock,
  }));
  const updateSetMock = vi.fn(() => ({
    where: updateWhereMock,
  }));

  return {
    dbMock: {
      select: vi.fn(() => selectBuilder),
      update: vi.fn(() => ({
        set: updateSetMock,
      })),
    },
    selectLimitMock,
    updateReturningMock,
    decryptTokenMock: vi.fn(() => "token"),
    deserializeEncryptedTokenMock: vi.fn(() => ({
      encrypted: "e",
      iv: "i",
      authTag: "a",
      salt: "s",
    })),
    getGoogleCalendarOAuthEnvMock: vi.fn(() => ({
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      GOOGLE_REDIRECT_URI: "http://localhost:3000/callback",
    })),
  };
});

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("@/lib/env", () => ({
  getGoogleCalendarOAuthEnv: getGoogleCalendarOAuthEnvMock,
}));

vi.mock("@/lib/google-calendar-encryption", () => ({
  decryptToken: decryptTokenMock,
  deserializeEncryptedToken: deserializeEncryptedTokenMock,
  encryptToken: vi.fn(),
  serializeEncryptedToken: vi.fn(),
}));

const calendarModule = await import("@/lib/google-calendar");

describe("google-calendar delete flow", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    updateReturningMock.mockResolvedValue([]);
    selectLimitMock.mockResolvedValue([
      {
        id: "conn-1",
        shopId: "shop-1",
        calendarId: "primary",
        calendarName: "Primary",
        accessTokenEncrypted: "encrypted-access",
        refreshTokenEncrypted: "encrypted-refresh",
        tokenExpiresAt: new Date(Date.now() + 10 * 60_000),
        encryptionKeyId: "default",
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("deletes calendar event successfully", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await calendarModule.deleteCalendarEvent({
      shopId: "shop-1",
      calendarEventId: "event-1",
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/calendars/primary/events/event-1"),
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
        }),
      })
    );
  });

  it("treats 404 as successful deletion", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      calendarModule.deleteCalendarEvent({
        shopId: "shop-1",
        calendarEventId: "event-missing",
      })
    ).resolves.toBe(true);
  });

  it("returns false when API deletion fails", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      calendarModule.deleteCalendarEvent({
        shopId: "shop-1",
        calendarEventId: "event-1",
      })
    ).resolves.toBe(false);
  });

  it("returns false when no calendar connection exists", async () => {
    selectLimitMock.mockResolvedValue([]);

    await expect(
      calendarModule.deleteCalendarEvent({
        shopId: "shop-1",
        calendarEventId: "event-1",
      })
    ).resolves.toBe(false);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns false when delete request times out", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          });
        })
    );

    const deletionPromise = calendarModule.deleteCalendarEvent({
      shopId: "shop-1",
      calendarEventId: "event-timeout",
    });
    await vi.advanceTimersByTimeAsync(3100);
    await vi.runAllTimersAsync();

    await expect(deletionPromise).resolves.toBe(false);
  }, 10000);

  it("autoResolveAlert marks pending alerts as auto_resolved_cancelled", async () => {
    updateReturningMock.mockResolvedValue([{ id: "alert-1" }]);

    await expect(
      calendarModule.autoResolveAlert("shop-1", "event-1")
    ).resolves.toBeUndefined();

    expect(dbMock.update).toHaveBeenCalledTimes(1);
  });

  it("autoResolveAlert degrades gracefully when db update fails", async () => {
    dbMock.update.mockImplementationOnce(() => {
      throw new Error("db unavailable");
    });

    await expect(
      calendarModule.autoResolveAlert("shop-1", "event-1")
    ).resolves.toBeUndefined();
  });
});
