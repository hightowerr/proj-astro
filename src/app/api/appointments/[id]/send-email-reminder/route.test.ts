/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSession,
  mockGetShopByOwnerId,
  mockSelectLimit,
  mockDbSelect,
  mockSendAppointmentReminderEmail,
} = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockLeftJoin2 = vi.fn().mockReturnValue({ where: mockSelectWhere });
  const mockLeftJoin = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin2 });
  const mockInnerJoin2 = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
  const mockInnerJoin = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin2 });
  const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
  const mockDbSelect = vi.fn().mockReturnValue({ from: mockFrom });

  return {
    mockGetSession: vi.fn(),
    mockGetShopByOwnerId: vi.fn(),
    mockSelectLimit,
    mockDbSelect,
    mockSendAppointmentReminderEmail: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/queries/shops", () => ({
  getShopByOwnerId: mockGetShopByOwnerId,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mockDbSelect,
  },
}));

vi.mock("@/lib/messages", () => ({
  sendAppointmentReminderEmail: mockSendAppointmentReminderEmail,
}));

vi.mock("@/lib/schema", () => ({
  appointments: { id: "id", shopId: "shopId", customerId: "customerId" },
  customers: { id: "id" },
  shops: { id: "id" },
  customerContactPrefs: { customerId: "customerId" },
  bookingSettings: { shopId: "shopId" },
}));

import { POST } from "./route";

const APPT_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const makeRequest = () =>
  new Request(`http://localhost:3000/api/appointments/${APPT_UUID}/send-email-reminder`, {
    method: "POST",
  });

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const baseRow = {
  appointmentId: APPT_UUID,
  shopId: "shop-1",
  customerId: "cust-1",
  customerName: "Jane Doe",
  customerEmail: "jane@example.com",
  startsAt: new Date("2026-06-01T10:00:00Z"),
  endsAt: new Date("2026-06-01T11:00:00Z"),
  bookingUrl: "http://localhost:3000/book/test?booking=abc",
  shopName: "Test Shop",
  shopTimezone: "America/New_York",
  appointmentStatus: "booked",
  emailOptIn: true,
};

describe("POST /api/appointments/[id]/send-email-reminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockGetShopByOwnerId.mockResolvedValue({ id: "shop-1" });
    mockSelectLimit.mockResolvedValue([{ ...baseRow }]);
    mockSendAppointmentReminderEmail.mockResolvedValue("sent");
  });

  it("sends email reminder and returns success", async () => {
    const response = await POST(makeRequest(), makeParams(APPT_UUID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.status).toBe("sent");
    expect(body.recipient).toBe("jane@example.com");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await POST(makeRequest(), makeParams(APPT_UUID));

    expect(response.status).toBe(401);
  });

  it("returns 404 when shop not found", async () => {
    mockGetShopByOwnerId.mockResolvedValue(null);

    const response = await POST(makeRequest(), makeParams(APPT_UUID));

    expect(response.status).toBe(404);
  });

  it("returns 404 when appointment not found", async () => {
    mockSelectLimit.mockResolvedValue([]);

    const response = await POST(makeRequest(), makeParams(APPT_UUID));

    expect(response.status).toBe(404);
  });

  it("returns 400 when appointment is not booked", async () => {
    mockSelectLimit.mockResolvedValue([
      { ...baseRow, appointmentStatus: "cancelled" },
    ]);

    const response = await POST(makeRequest(), makeParams(APPT_UUID));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("non-booked");
  });

  it("returns 400 when customer has no email", async () => {
    mockSelectLimit.mockResolvedValue([
      { ...baseRow, customerEmail: null },
    ]);

    const response = await POST(makeRequest(), makeParams(APPT_UUID));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("email address");
  });

  it("returns 400 when customer opted out of email", async () => {
    mockSelectLimit.mockResolvedValue([
      { ...baseRow, emailOptIn: false },
    ]);

    const response = await POST(makeRequest(), makeParams(APPT_UUID));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("opted in");
  });

  it("returns 409 when email already sent", async () => {
    mockSendAppointmentReminderEmail.mockResolvedValue("already_sent");

    const response = await POST(makeRequest(), makeParams(APPT_UUID));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("already sent");
  });

  it("returns 400 for invalid UUID format", async () => {
    const response = await POST(makeRequest(), makeParams("not-a-uuid"));

    expect(response.status).toBe(400);
  });

  it("returns 500 for unexpected errors", async () => {
    mockSendAppointmentReminderEmail.mockRejectedValue(
      new Error("SMTP failure")
    );

    const response = await POST(makeRequest(), makeParams(APPT_UUID));

    expect(response.status).toBe(500);
  });
});
