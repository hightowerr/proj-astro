import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionMock,
  getShopByOwnerIdMock,
  searchCustomersMock,
  searchAppointmentsMock,
} =
  vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    getShopByOwnerIdMock: vi.fn(),
    searchCustomersMock: vi.fn(),
    searchAppointmentsMock: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/queries/shops", () => ({
  getShopByOwnerId: getShopByOwnerIdMock,
}));

vi.mock("@/lib/queries/search", () => ({
  searchCustomers: searchCustomersMock,
  searchAppointments: searchAppointmentsMock,
}));

const { GET } = await import("../route");

describe("GET /api/search", () => {
  const makeRequest = (q = "john") =>
    new Request(`http://localhost:3000/api/search?q=${encodeURIComponent(q)}`);

  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    getShopByOwnerIdMock.mockResolvedValue({ id: "shop-1", name: "Test Shop" });
    searchCustomersMock.mockResolvedValue([]);
    searchAppointmentsMock.mockResolvedValue([]);
  });

  describe("auth guard", () => {
    it("returns 401 when session is null", async () => {
      getSessionMock.mockResolvedValue(null);

      const response = await GET(makeRequest());

      expect(response.status).toBe(401);
    });

    it("returns 401 when session has no user id", async () => {
      getSessionMock.mockResolvedValue({ user: null });

      const response = await GET(makeRequest());

      expect(response.status).toBe(401);
    });

    it("returns 404 when shop not found", async () => {
      getShopByOwnerIdMock.mockResolvedValue(null);

      const response = await GET(makeRequest());

      expect(response.status).toBe(404);
    });
  });

  describe("input validation", () => {
    it("returns 200 empty results for 1-char query", async () => {
      const response = await GET(makeRequest("a"));
      const body = (await response.json()) as {
        customers: unknown[];
        appointments: unknown[];
      };

      expect(response.status).toBe(200);
      expect(body.customers).toHaveLength(0);
      expect(body.appointments).toHaveLength(0);
      expect(searchCustomersMock).not.toHaveBeenCalled();
      expect(searchAppointmentsMock).not.toHaveBeenCalled();
    });

    it("returns 200 empty results for blank query", async () => {
      const response = await GET(makeRequest(""));
      const body = (await response.json()) as {
        query: string;
        customers: unknown[];
        appointments: unknown[];
      };

      expect(response.status).toBe(200);
      expect(body.query).toBe("");
      expect(body.customers).toHaveLength(0);
      expect(body.appointments).toHaveLength(0);
      expect(searchCustomersMock).not.toHaveBeenCalled();
      expect(searchAppointmentsMock).not.toHaveBeenCalled();
    });

    it("returns 200 empty results for spaces-only query", async () => {
      const response = await GET(makeRequest("   "));
      const body = (await response.json()) as {
        query: string;
        customers: unknown[];
        appointments: unknown[];
      };

      expect(response.status).toBe(200);
      expect(body.query).toBe("");
      expect(body.customers).toHaveLength(0);
      expect(body.appointments).toHaveLength(0);
      expect(searchCustomersMock).not.toHaveBeenCalled();
      expect(searchAppointmentsMock).not.toHaveBeenCalled();
    });

    it("returns 400 for query exceeding 80 chars", async () => {
      const response = await GET(makeRequest("a".repeat(81)));

      expect(response.status).toBe(400);
    });

    it("calls searchCustomers for a valid 2+ char query", async () => {
      const response = await GET(makeRequest("jo"));

      expect(response.status).toBe(200);
      expect(searchCustomersMock).toHaveBeenCalledWith("shop-1", "jo");
      expect(searchAppointmentsMock).toHaveBeenCalledWith("shop-1", "jo");
    });
  });

  describe("response shape", () => {
    it("returns customers from searchCustomers with appointments: []", async () => {
      const mockCustomer = {
        id: "cust-1",
        fullName: "John Smith",
        email: "john@example.com",
        phone: "+12025550100",
        tier: "top" as const,
        href: "/app/customers/cust-1",
      };
      searchCustomersMock.mockResolvedValue([mockCustomer]);

      const response = await GET(makeRequest("john"));
      const body = (await response.json()) as {
        query: string;
        customers: typeof mockCustomer[];
        appointments: unknown[];
      };

      expect(response.status).toBe(200);
      expect(body.query).toBe("john");
      expect(body.customers).toHaveLength(1);
      expect(body.customers[0]?.fullName).toBe("John Smith");
      expect(body.customers[0]?.href).toBe("/app/customers/cust-1");
      expect(body.appointments).toHaveLength(0);
    });

    it("passes trimmed query to searchCustomers", async () => {
      await GET(makeRequest("  john  "));

      expect(searchCustomersMock).toHaveBeenCalledWith("shop-1", "john");
      expect(searchAppointmentsMock).toHaveBeenCalledWith("shop-1", "john");
    });
  });

  describe("appointment search (V2)", () => {
    it("calls searchAppointments with the same shopId and query", async () => {
      await GET(makeRequest("haircut"));

      expect(searchAppointmentsMock).toHaveBeenCalledWith("shop-1", "haircut");
    });

    it("runs searchCustomers and searchAppointments in parallel", async () => {
      await GET(makeRequest("john"));

      expect(searchCustomersMock).toHaveBeenCalledOnce();
      expect(searchAppointmentsMock).toHaveBeenCalledOnce();
    });

    it("returns appointments from searchAppointments in response", async () => {
      const mockAppointment = {
        id: "appt-1",
        startsAt: new Date("2026-05-01T10:00:00.000Z"),
        status: "booked" as const,
        customerName: "Alex Kim",
        eventTypeName: "Haircut",
        href: "/app/appointments/appt-1",
      };
      searchAppointmentsMock.mockResolvedValue([mockAppointment]);

      const response = await GET(makeRequest("haircut"));
      const body = (await response.json()) as {
        appointments: Array<{
          customerName: string;
          href: string;
        }>;
      };

      expect(response.status).toBe(200);
      expect(body.appointments).toHaveLength(1);
      expect(body.appointments[0]?.customerName).toBe("Alex Kim");
      expect(body.appointments[0]?.href).toBe("/app/appointments/appt-1");
    });

    it("short query still returns empty appointments without DB call", async () => {
      const response = await GET(makeRequest("a"));
      const body = (await response.json()) as { appointments: unknown[] };

      expect(searchAppointmentsMock).not.toHaveBeenCalled();
      expect(body.appointments).toHaveLength(0);
    });
  });
});
