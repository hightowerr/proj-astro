import { describe, expect, it } from "vitest";
import { assignTier, calculateScore, flattenRecencyData, type RecencyData } from "@/lib/scoring";

describe("calculateScore", () => {
  it("returns base score for a customer with no history", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
    };

    expect(calculateScore(recencyData)).toBe(50);
  });

  it("increases score for settled appointments", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 3, voided: 0, refunded: 0, lateCancels: 0 },
      days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
    };

    expect(calculateScore(recencyData)).toBe(100);
  });

  it("decreases score for voided appointments", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 0, voided: 2, refunded: 0, lateCancels: 0 },
      days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
    };

    expect(calculateScore(recencyData)).toBe(0);
  });

  it("applies recency multipliers correctly", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 1, voided: 0, refunded: 0, lateCancels: 0 },
      days31To90: { settled: 1, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 1, voided: 0, refunded: 0, lateCancels: 0 },
    };

    expect(calculateScore(recencyData)).toBe(85);
  });

  it("caps settled bonus at 50 points", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 10, voided: 0, refunded: 0, lateCancels: 0 },
      days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
    };

    expect(calculateScore(recencyData)).toBe(100);
  });

  it("handles mixed outcomes correctly", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 2, voided: 1, refunded: 1, lateCancels: 1 },
      days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
    };

    expect(calculateScore(recencyData)).toBe(20);
  });
});

describe("assignTier", () => {
  it("assigns top tier for high score with no recent voids", () => {
    expect(assignTier(85, 0)).toBe("top");
    expect(assignTier(80, 0)).toBe("top");
  });

  it("does not assign top tier if a recent void exists", () => {
    expect(assignTier(85, 1)).toBe("neutral");
  });

  it("assigns risk tier for low score", () => {
    expect(assignTier(39, 0)).toBe("risk");
    expect(assignTier(20, 0)).toBe("risk");
  });

  it("assigns risk tier for multiple recent voids regardless of score", () => {
    expect(assignTier(80, 2)).toBe("risk");
    expect(assignTier(50, 3)).toBe("risk");
  });

  it("assigns neutral tier for mid-range score", () => {
    expect(assignTier(50, 0)).toBe("neutral");
    expect(assignTier(60, 1)).toBe("neutral");
    expect(assignTier(79, 0)).toBe("neutral");
  });
});

describe("flattenRecencyData", () => {
  it("sums counts across all recency buckets", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 2, voided: 1, refunded: 1, lateCancels: 0 },
      days31To90: { settled: 3, voided: 0, refunded: 0, lateCancels: 1 },
      over90Days: { settled: 1, voided: 1, refunded: 0, lateCancels: 0 },
    };

    expect(flattenRecencyData(recencyData)).toEqual({
      settled: 6,
      voided: 2,
      refunded: 1,
      lateCancels: 1,
    });
  });
});
