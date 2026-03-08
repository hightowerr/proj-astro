import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  cleanupOldAlertsMock,
  dbMock,
  executeMock,
  groupByMock,
  scanAndDetectConflictsMock,
} = vi.hoisted(() => {
  const executeMock = vi.fn();
  const groupByMock = vi.fn();
  const whereMock = vi.fn(() => ({
    groupBy: groupByMock,
  }));
  const fromMock = vi.fn(() => ({
    where: whereMock,
  }));

  return {
    executeMock,
    groupByMock,
    scanAndDetectConflictsMock: vi.fn(),
    cleanupOldAlertsMock: vi.fn(),
    dbMock: {
      execute: executeMock,
      select: vi.fn(() => ({
        from: fromMock,
      })),
    },
  };
});

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("@/lib/calendar-conflicts", () => ({
  scanAndDetectConflicts: scanAndDetectConflictsMock,
  cleanupOldAlerts: cleanupOldAlertsMock,
}));

const { POST } = await import("./route");

describe("POST /api/jobs/scan-calendar-conflicts", () => {
  const makeRequest = (secret = "test-cron-secret") =>
    new Request("http://localhost:3000/api/jobs/scan-calendar-conflicts?lockId=7654321", {
      method: "POST",
      headers: {
        "x-cron-secret": secret,
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    executeMock.mockResolvedValue([{ locked: true }]);
    groupByMock.mockResolvedValue([{ shopId: "shop-1" }]);
    scanAndDetectConflictsMock.mockResolvedValue({
      conflictsDetected: 2,
      alertsCreated: 1,
      alertsAutoResolved: 1,
    });
    cleanupOldAlertsMock.mockResolvedValue(3);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 when CRON_SECRET is invalid", async () => {
    const response = await POST(makeRequest("wrong-secret"));

    expect(response.status).toBe(401);
  });

  it("returns 500 when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await POST(makeRequest("whatever"));
    expect(response.status).toBe(500);
  });

  it("returns skipped when advisory lock is already held", async () => {
    executeMock.mockResolvedValueOnce([{ locked: false }]);

    const response = await POST(makeRequest());
    const body = (await response.json()) as { skipped: boolean; reason: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ skipped: true, reason: "locked" });
    expect(scanAndDetectConflictsMock).not.toHaveBeenCalled();
  });

  it("scans shops, aggregates totals, and runs cleanup", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    groupByMock.mockResolvedValue([{ shopId: "shop-1" }, { shopId: "shop-2" }]);
    scanAndDetectConflictsMock
      .mockResolvedValueOnce({
        conflictsDetected: 2,
        alertsCreated: 1,
        alertsAutoResolved: 1,
      })
      .mockResolvedValueOnce({
        conflictsDetected: 1,
        alertsCreated: 1,
        alertsAutoResolved: 0,
      });
    cleanupOldAlertsMock.mockResolvedValue(4);

    const response = await POST(makeRequest());
    const body = (await response.json()) as {
      success: boolean;
      shopsProcessed: number;
      shopsErrored: number;
      conflictsDetected: number;
      alertsCreated: number;
      alertsAutoResolved: number;
      alertsCleaned: number;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.shopsProcessed).toBe(2);
    expect(body.shopsErrored).toBe(0);
    expect(body.conflictsDetected).toBe(3);
    expect(body.alertsCreated).toBe(2);
    expect(body.alertsAutoResolved).toBe(1);
    expect(body.alertsCleaned).toBe(4);
    expect(scanAndDetectConflictsMock).toHaveBeenCalledWith("shop-1");
    expect(scanAndDetectConflictsMock).toHaveBeenCalledWith("shop-2");
    expect(cleanupOldAlertsMock).toHaveBeenCalledTimes(1);
  });

  it("continues processing when one shop scan fails", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    groupByMock.mockResolvedValue([{ shopId: "shop-1" }, { shopId: "shop-2" }]);
    scanAndDetectConflictsMock
      .mockRejectedValueOnce(new Error("calendar api down"))
      .mockResolvedValueOnce({
        conflictsDetected: 0,
        alertsCreated: 0,
        alertsAutoResolved: 0,
      });
    cleanupOldAlertsMock.mockResolvedValue(0);

    const response = await POST(makeRequest());
    const body = (await response.json()) as {
      success: boolean;
      shopsProcessed: number;
      shopsErrored: number;
    };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.shopsProcessed).toBe(1);
    expect(body.shopsErrored).toBe(1);
  });
});
