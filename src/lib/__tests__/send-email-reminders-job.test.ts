import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeMock,
  findAppointmentsForEmailReminderMock,
  sendAppointmentReminderEmailMock,
} = vi.hoisted(() => ({
  executeMock: vi.fn(),
  findAppointmentsForEmailReminderMock: vi.fn(),
  sendAppointmentReminderEmailMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    execute: executeMock,
  },
}));

vi.mock("@/lib/queries/appointments", () => ({
  findAppointmentsForEmailReminder: findAppointmentsForEmailReminderMock,
}));

vi.mock("@/lib/messages", () => ({
  sendAppointmentReminderEmail: sendAppointmentReminderEmailMock,
}));

const { POST } = await import("@/app/api/jobs/send-email-reminders/route");

describe("POST /api/jobs/send-email-reminders", () => {
  const makeRequest = (secret = "test-cron-secret") =>
    new Request("http://localhost:3000/api/jobs/send-email-reminders", {
      method: "POST",
      headers: {
        "x-cron-secret": secret,
      },
    });

  const candidate = (id: string) => ({
    appointmentId: id,
    shopId: "shop-1",
    customerId: `customer-${id}`,
    customerName: `Customer ${id}`,
    customerEmail: `${id}@example.com`,
    startsAt: new Date("2026-03-18T10:00:00.000Z"),
    endsAt: new Date("2026-03-18T11:00:00.000Z"),
    bookingUrl: `https://example.com/manage/${id}`,
    shopName: "Test Shop",
    shopTimezone: "UTC",
    reminderInterval: "24h",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    executeMock.mockResolvedValue([{ locked: true }]);
    findAppointmentsForEmailReminderMock.mockResolvedValue([]);
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
    expect(findAppointmentsForEmailReminderMock).not.toHaveBeenCalled();
  });

  it("processes appointments and reports sent, skipped, and errors", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    findAppointmentsForEmailReminderMock.mockResolvedValue([
      candidate("appt-1"),
      candidate("appt-2"),
      candidate("appt-3"),
    ]);
    sendAppointmentReminderEmailMock
      .mockResolvedValueOnce("sent")
      .mockResolvedValueOnce("already_sent")
      .mockRejectedValueOnce(new Error("provider unavailable"));

    const response = await POST(makeRequest());
    const body = (await response.json()) as {
      total: number;
      sent: number;
      skipped: number;
      errors: number;
      errorDetails: Array<{ appointmentId: string; error: string }>;
      durationMs: number;
    };

    expect(response.status).toBe(200);
    expect(body.total).toBe(3);
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(1);
    expect(body.errors).toBe(1);
    expect(body.errorDetails).toEqual([
      { appointmentId: "appt-3", error: "provider unavailable" },
    ]);
    expect(body.durationMs).toEqual(expect.any(Number));
    expect(sendAppointmentReminderEmailMock).toHaveBeenCalledTimes(3);
    expect(sendAppointmentReminderEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ reminderInterval: "24h" })
    );
  });

  it("returns a zero-count summary when there is no work", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    findAppointmentsForEmailReminderMock.mockResolvedValue([]);

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
    expect(sendAppointmentReminderEmailMock).not.toHaveBeenCalled();
  });

  it("always releases the advisory lock", async () => {
    executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ unlocked: true }]);
    findAppointmentsForEmailReminderMock.mockRejectedValue(
      new Error("query failed")
    );

    await expect(POST(makeRequest())).rejects.toThrow("query failed");
    expect(executeMock).toHaveBeenCalledTimes(2);
  });
});
