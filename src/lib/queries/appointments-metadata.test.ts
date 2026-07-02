import { describe, expect, it } from "vitest";
import { buildConnectPaymentMetadata } from "./appointments";

describe("buildConnectPaymentMetadata", () => {
  describe("connectedAccountId resolution", () => {
    it("returns empty object when transfer_data is null", () => {
      const result = buildConnectPaymentMetadata(null, 50, null);
      expect(result).toEqual({});
    });

    it("returns empty object when transfer_data is undefined", () => {
      const result = buildConnectPaymentMetadata(undefined, 50, null);
      expect(result).toEqual({});
    });

    it("returns empty object when destination is null", () => {
      const result = buildConnectPaymentMetadata({ destination: null }, 50, null);
      expect(result).toEqual({});
    });

    it("resolves destination from string", () => {
      const result = buildConnectPaymentMetadata(
        { destination: "acct_123" },
        50,
        null,
      );
      expect(result).toEqual({
        metadata: {
          connectedAccountId: "acct_123",
          applicationFeeAmountCents: "50",
        },
      });
    });

    it("resolves destination from object with id", () => {
      const result = buildConnectPaymentMetadata(
        { destination: { id: "acct_456" } },
        50,
        null,
      );
      expect(result).toEqual({
        metadata: {
          connectedAccountId: "acct_456",
          applicationFeeAmountCents: "50",
        },
      });
    });
  });

  describe("applicationFeeAmountCents", () => {
    it("stores fee as string for standard Connect payments", () => {
      const result = buildConnectPaymentMetadata(
        { destination: "acct_123" },
        50,
        null,
      );
      expect(result).toEqual({
        metadata: expect.objectContaining({
          applicationFeeAmountCents: "50",
        }),
      });
    });

    it("stores '0' when fee is null (waived for small amounts)", () => {
      const result = buildConnectPaymentMetadata(
        { destination: "acct_123" },
        null,
        null,
      );
      expect(result).toEqual({
        metadata: expect.objectContaining({
          applicationFeeAmountCents: "0",
        }),
      });
    });

    it("stores '0' when fee is undefined (no Connect fee set)", () => {
      const result = buildConnectPaymentMetadata(
        { destination: "acct_123" },
        undefined,
        null,
      );
      expect(result).toEqual({
        metadata: expect.objectContaining({
          applicationFeeAmountCents: "0",
        }),
      });
    });
  });

  describe("existing metadata preservation", () => {
    it("merges with existing metadata", () => {
      const result = buildConnectPaymentMetadata(
        { destination: "acct_123" },
        50,
        { existingKey: "existingValue" } as Record<string, string>,
      );
      expect(result).toEqual({
        metadata: {
          existingKey: "existingValue",
          connectedAccountId: "acct_123",
          applicationFeeAmountCents: "50",
        },
      });
    });

    it("handles null existing metadata", () => {
      const result = buildConnectPaymentMetadata(
        { destination: "acct_123" },
        50,
        null,
      );
      expect(result).toEqual({
        metadata: {
          connectedAccountId: "acct_123",
          applicationFeeAmountCents: "50",
        },
      });
    });

    it("handles undefined existing metadata", () => {
      const result = buildConnectPaymentMetadata(
        { destination: "acct_123" },
        50,
        undefined,
      );
      expect(result).toEqual({
        metadata: {
          connectedAccountId: "acct_123",
          applicationFeeAmountCents: "50",
        },
      });
    });
  });
});
