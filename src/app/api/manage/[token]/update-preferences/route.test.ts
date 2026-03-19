/* eslint-disable import/order */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { validateTokenMock, dbMock } = vi.hoisted(() => ({
  validateTokenMock: vi.fn(),
  dbMock: {
    query: {
      appointments: {
        findFirst: vi.fn(),
      },
      customerContactPrefs: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  },
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

vi.mock("@/lib/manage-tokens", () => ({
  validateToken: validateTokenMock,
}));

import { POST } from "./route";

describe("POST /api/manage/[token]/update-preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateTokenMock.mockResolvedValue("appt-1");
    dbMock.query.appointments.findFirst.mockResolvedValue({
      id: "appt-1",
      customerId: "cust-1",
    });
    dbMock.query.customerContactPrefs.findFirst.mockResolvedValue({
      customerId: "cust-1",
      emailOptIn: true,
    });
  });

  it("returns 404 for invalid tokens", async () => {
    validateTokenMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ emailOptIn: false }),
      }),
      { params: Promise.resolve({ token: "bad-token" }) }
    );

    expect(response.status).toBe(404);
  });

  it("updates an existing preference record", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ emailOptIn: false }),
      }),
      { params: Promise.resolve({ token: "token-1" }) }
    );
    const body = (await response.json()) as { success?: boolean; emailOptIn?: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.emailOptIn).toBe(false);
    expect(dbMock.update).toHaveBeenCalled();
  });

  it("creates a preference record when one does not exist", async () => {
    dbMock.query.customerContactPrefs.findFirst.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ emailOptIn: true }),
      }),
      { params: Promise.resolve({ token: "token-1" }) }
    );

    expect(response.status).toBe(200);
    expect(dbMock.insert).toHaveBeenCalled();
  });

  it("returns 400 for invalid payloads", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ emailOptIn: "nope" }),
      }),
      { params: Promise.resolve({ token: "token-1" }) }
    );

    expect(response.status).toBe(400);
  });
});
