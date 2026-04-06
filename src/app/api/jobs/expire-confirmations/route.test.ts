import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeMock,
  expirePendingConfirmationMock,
  findExpiredConfirmationAppointmentsMock,
} = vi.hoisted(() => ({
  executeMock: vi.fn(),
  expirePendingConfirmationMock: vi.fn(),
  findExpiredConfirmationAppointmentsMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    execute: executeMock,
  },
}));

vi.mock("@/lib/confirmation", () => ({
  expirePendingConfirmation: expirePendingConfirmationMock,
  findExpiredConfirmationAppointments: findExpiredConfirmationAppointmentsMock,
}));

const { POST } = await import("./route");

describe("POST /api/jobs/expire-confirmations", () => {
  const makeRequest = (secret = "test-cron-secret") =>
    new Request("http://localhost:3000/api/jobs/expire-confirmations", {
      method: "POST",
      headers: {
        "x-cron-secret": secret,
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    executeMock.mockResolvedValue([{ locked: true }]);
    findExpiredConfirmationAppointmentsMock.mockResolvedValue([]);
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

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
  });

  it("returns skipped when advisory lock is already held", async () => {
    executeMock.mockResolvedValueOnce([{ locked: false }]);

    const response = await POST(makeRequest());
    const body = (await response.json()) as { skipped: boolean; reason: string };

    expect(response.status).toBe(200);
    expect(body).toEqual({ skipped: true, reason: "locked" });
    expect(findExpiredConfirmationAppointmentsMock).not.toHaveBeenCalled();
  });

  it("expires confirmations and tracks refunded, skipped, and failed items", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    findExpiredConfirmationAppointmentsMock.mockResolvedValue([
      { appointmentId: "appt-1" },
      { appointmentId: "appt-2" },
      { appointmentId: "appt-3" },
    ]);
    expirePendingConfirmationMock.mockResolvedValueOnce({
      cancelled: true,
      appointmentId: "appt-1",
      refunded: true,
    });
    expirePendingConfirmationMock.mockResolvedValueOnce({
      cancelled: false,
      reason: "already_processed",
    });
    expirePendingConfirmationMock.mockRejectedValueOnce(new Error("Refund failed"));

    const response = await POST(makeRequest());
    const body = (await response.json()) as {
      total: number;
      cancelled: number;
      refunded: number;
      skipped: number;
      failed: number;
      errorDetails: Array<{ appointmentId: string; error: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.total).toBe(3);
    expect(body.cancelled).toBe(1);
    expect(body.refunded).toBe(1);
    expect(body.skipped).toBe(1);
    expect(body.failed).toBe(1);
    expect(body.errorDetails).toEqual([
      { appointmentId: "appt-3", error: "Refund failed" },
    ]);
    expect(findExpiredConfirmationAppointmentsMock).toHaveBeenCalledWith(25);
    expect(expirePendingConfirmationMock).toHaveBeenCalledWith("appt-1");
    expect(expirePendingConfirmationMock).toHaveBeenCalledWith("appt-2");
    expect(expirePendingConfirmationMock).toHaveBeenCalledWith("appt-3");
  });
});
