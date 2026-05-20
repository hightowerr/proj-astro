/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetSession,
  mockGetShopByOwnerId,
  mockFindFirst,
  mockSendConfirmationRequest,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetShopByOwnerId: vi.fn(),
  mockFindFirst: vi.fn(),
  mockSendConfirmationRequest: vi.fn(),
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
  sendConfirmationRequest: mockSendConfirmationRequest,
}));

vi.mock("@/lib/schema", () => ({
  appointments: { id: "id", shopId: "shopId" },
}));

import { POST } from "./route";

const makeRequest = () =>
  new Request("http://localhost:3000/api/appointments/appt-1/confirm", {
    method: "POST",
  });

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/appointments/[id]/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
    mockGetShopByOwnerId.mockResolvedValue({ id: "shop-1" });
    mockFindFirst.mockResolvedValue({ id: "appt-1", shopId: "shop-1" });
    mockSendConfirmationRequest.mockResolvedValue({ sent: true });
  });

  it("sends confirmation and returns result", async () => {
    const response = await POST(makeRequest(), makeParams("appt-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sent).toBe(true);
    expect(mockSendConfirmationRequest).toHaveBeenCalledWith("appt-1");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await POST(makeRequest(), makeParams("appt-1"));

    expect(response.status).toBe(401);
  });

  it("returns 404 when shop not found", async () => {
    mockGetShopByOwnerId.mockResolvedValue(null);

    const response = await POST(makeRequest(), makeParams("appt-1"));

    expect(response.status).toBe(404);
  });

  it("returns 404 when appointment not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    const response = await POST(makeRequest(), makeParams("appt-1"));

    expect(response.status).toBe(404);
  });

  it("returns 400 when appointment is already confirmed", async () => {
    mockSendConfirmationRequest.mockRejectedValue(
      new Error("Appointment is already confirmed")
    );

    const response = await POST(makeRequest(), makeParams("appt-1"));

    expect(response.status).toBe(400);
  });

  it("returns 400 when SMS opt-in not found", async () => {
    mockSendConfirmationRequest.mockRejectedValue(
      new Error("SMS opt-in not found")
    );

    const response = await POST(makeRequest(), makeParams("appt-1"));

    expect(response.status).toBe(400);
  });

  it("returns 500 for unexpected errors", async () => {
    mockSendConfirmationRequest.mockRejectedValue(new Error("DB failure"));

    const response = await POST(makeRequest(), makeParams("appt-1"));

    expect(response.status).toBe(500);
  });
});
