import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeMock,
  findHighRiskAppointmentsMock,
  sendAppointmentReminderSMSMock,
} = vi.hoisted(() => ({
  executeMock: vi.fn(),
  findHighRiskAppointmentsMock: vi.fn(),
  sendAppointmentReminderSMSMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    execute: executeMock,
  },
}));

vi.mock("@/lib/queries/appointments", () => ({
  findHighRiskAppointments: findHighRiskAppointmentsMock,
}));

vi.mock("@/lib/messages", () => ({
  sendAppointmentReminderSMS: sendAppointmentReminderSMSMock,
}));

const { POST } = await import("@/app/api/jobs/send-reminders/route");

describe("POST /api/jobs/send-reminders", () => {
  const makeRequest = (secret = "test-cron-secret") =>
    new Request("http://localhost:3000/api/jobs/send-reminders", {
      method: "POST",
      headers: {
        "x-cron-secret": secret,
      },
    });

  const candidate = (id: string, interval = "24h") => ({
    appointmentId: id,
    shopId: "shop-1",
    customerId: `customer-${id}`,
    customerName: `Customer ${id}`,
    customerPhone: "+12025551234",
    startsAt: new Date("2026-03-18T10:00:00.000Z"),
    endsAt: new Date("2026-03-18T11:00:00.000Z"),
    bookingUrl: `https://example.com/manage/${id}`,
    shopName: "Test Shop",
    shopTimezone: "UTC",
    reminderInterval: interval,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    executeMock.mockResolvedValue([{ locked: true }]);
    findHighRiskAppointmentsMock.mockResolvedValue([]);
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
    expect(findHighRiskAppointmentsMock).not.toHaveBeenCalled();
  });

  it("processes candidates and reports sent, skipped, errors", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    findHighRiskAppointmentsMock.mockResolvedValue([
      candidate("appt-1", "24h"),
      candidate("appt-2", "2h"),
      candidate("appt-3", "24h"),
    ]);
    sendAppointmentReminderSMSMock
      .mockResolvedValueOnce("sent")
      .mockResolvedValueOnce("already_sent")
      .mockRejectedValueOnce(new Error("twilio error"));

    const response = await POST(makeRequest());
    const body = (await response.json()) as {
      total: number;
      sent: number;
      skipped: number;
      errors: number;
      errorDetails: Array<{ appointmentId: string; error: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.total).toBe(3);
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(1);
    expect(body.errors).toBe(1);
    expect(body.errorDetails).toEqual([
      { appointmentId: "appt-3", error: "twilio error" },
    ]);
  });

  it("forwards reminderInterval to sendAppointmentReminderSMS", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    findHighRiskAppointmentsMock.mockResolvedValue([candidate("appt-1", "2h")]);
    sendAppointmentReminderSMSMock.mockResolvedValue("sent");

    await POST(makeRequest());

    expect(sendAppointmentReminderSMSMock).toHaveBeenCalledWith(
      expect.objectContaining({ reminderInterval: "2h" })
    );
  });

  it("always releases the advisory lock even if processing throws", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    findHighRiskAppointmentsMock.mockRejectedValue(new Error("query failed"));

    await expect(POST(makeRequest())).rejects.toThrow("query failed");
    expect(executeMock).toHaveBeenCalledTimes(2);
  });

  it("returns zero-count summary when there is no work", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);

    const response = await POST(makeRequest());
    const body = (await response.json()) as {
      total: number;
      sent: number;
      skipped: number;
      errors: number;
    };

    expect(response.status).toBe(200);
    expect(body.total).toBe(0);
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(0);
    expect(body.errors).toBe(0);
    expect(sendAppointmentReminderSMSMock).not.toHaveBeenCalled();
  });
});
