import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeMock,
  findAppointmentsNeedingConfirmationMock,
  sendConfirmationRequestMock,
} = vi.hoisted(() => ({
  executeMock: vi.fn(),
  findAppointmentsNeedingConfirmationMock: vi.fn(),
  sendConfirmationRequestMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    execute: executeMock,
  },
}));

vi.mock("@/lib/confirmation", () => ({
  findAppointmentsNeedingConfirmation: findAppointmentsNeedingConfirmationMock,
  sendConfirmationRequest: sendConfirmationRequestMock,
}));

const { POST } = await import("./route");

describe("POST /api/jobs/send-confirmations", () => {
  const makeRequest = (secret = "test-cron-secret") =>
    new Request("http://localhost:3000/api/jobs/send-confirmations", {
      method: "POST",
      headers: {
        "x-cron-secret": secret,
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    executeMock.mockResolvedValue([{ locked: true }]);
    findAppointmentsNeedingConfirmationMock.mockResolvedValue([]);
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
    expect(findAppointmentsNeedingConfirmationMock).not.toHaveBeenCalled();
  });

  it("sends confirmations and reports failures", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    findAppointmentsNeedingConfirmationMock.mockResolvedValue([
      { appointmentId: "appt-1" },
      { appointmentId: "appt-2" },
    ]);
    sendConfirmationRequestMock.mockResolvedValueOnce({ success: true, status: "pending" });
    sendConfirmationRequestMock.mockRejectedValueOnce(new Error("SMS failed"));

    const response = await POST(makeRequest());
    const body = (await response.json()) as {
      total: number;
      sent: number;
      failed: number;
      errorDetails: Array<{ appointmentId: string; error: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.total).toBe(2);
    expect(body.sent).toBe(1);
    expect(body.failed).toBe(1);
    expect(body.errorDetails).toEqual([
      { appointmentId: "appt-2", error: "SMS failed" },
    ]);
    expect(findAppointmentsNeedingConfirmationMock).toHaveBeenCalledWith(25);
    expect(sendConfirmationRequestMock).toHaveBeenCalledWith("appt-1");
    expect(sendConfirmationRequestMock).toHaveBeenCalledWith("appt-2");
  });
});
