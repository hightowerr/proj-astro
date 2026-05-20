/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSession,
  mockGetShopByOwnerId,
  mockFindFirst,
  mockSendReminderSMS,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetShopByOwnerId: vi.fn(),
  mockFindFirst: vi.fn(),
  mockSendReminderSMS: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@/lib/queries/shops", () => ({
  getShopByOwnerId: mockGetShopByOwnerId,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      appointments: { findFirst: mockFindFirst },
    },
  },
}));

vi.mock("@/lib/confirmation", () => ({
  sendReminderSMS: mockSendReminderSMS,
}));

vi.mock("@/lib/schema", () => ({
  appointments: { id: "id", shopId: "shopId" },
}));

import { POST } from "./route";

const APPT_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const makeRequest = () =>
  new Request(`http://localhost:3000/api/appointments/${APPT_UUID}/remind`, {
    method: "POST",
  });

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/appointments/[id]/remind", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockGetShopByOwnerId.mockResolvedValue({ id: "shop-1" });
    mockFindFirst.mockResolvedValue({ id: APPT_UUID, shopId: "shop-1" });
    mockSendReminderSMS.mockResolvedValue("sent");
  });

  it("sends reminder and returns success", async () => {
    const response = await POST(makeRequest(), makeParams(APPT_UUID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.status).toBe("sent");
  });

  it("returns already_sent status", async () => {
    mockSendReminderSMS.mockResolvedValue("already_sent");

    const response = await POST(makeRequest(), makeParams(APPT_UUID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("already_sent");
  });

  it("returns 400 for consent_missing", async () => {
    mockSendReminderSMS.mockResolvedValue("consent_missing");

    const response = await POST(makeRequest(), makeParams(APPT_UUID));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe("consent_missing");
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
    mockFindFirst.mockResolvedValue(null);

    const response = await POST(makeRequest(), makeParams(APPT_UUID));

    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid UUID format", async () => {
    const response = await POST(makeRequest(), makeParams("not-a-uuid"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Invalid appointment ID");
  });

  it("returns 500 for unexpected errors", async () => {
    mockSendReminderSMS.mockRejectedValue(new Error("DB failure"));

    const response = await POST(makeRequest(), makeParams(APPT_UUID));

    expect(response.status).toBe(500);
  });
});
