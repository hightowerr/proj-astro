import { describe, expect, it } from "vitest";
import { assignTier, calculateScore, type RecencyData } from "@/lib/scoring";

describe("scoring edge cases", () => {
  it("clamps extreme negative score computations to 0", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 0, voided: 10, refunded: 5, lateCancels: 5 },
      days31To90: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 0, voided: 0, refunded: 0, lateCancels: 0 },
    };

    expect(calculateScore(recencyData)).toBe(0);
  });

  it("clamps extreme positive score computations to 100", () => {
    const recencyData: RecencyData = {
      last30Days: { settled: 20, voided: 0, refunded: 0, lateCancels: 0 },
      days31To90: { settled: 20, voided: 0, refunded: 0, lateCancels: 0 },
      over90Days: { settled: 20, voided: 0, refunded: 0, lateCancels: 0 },
    };

    expect(calculateScore(recencyData)).toBe(100);
  });

  it("respects tier boundaries around 80 and 40", () => {
    expect(assignTier(79, 0)).toBe("neutral");
    expect(assignTier(80, 0)).toBe("top");
    expect(assignTier(40, 0)).toBe("neutral");
    expect(assignTier(39, 0)).toBe("risk");
  });

  it("forces risk tier when voidedLast90Days reaches 2", () => {
    expect(assignTier(100, 2)).toBe("risk");
    expect(assignTier(75, 3)).toBe("risk");
  });

  it("handles out-of-range scores defensively", () => {
    expect(assignTier(-10, 0)).toBe("risk");
    expect(assignTier(150, 0)).toBe("top");
  });
});
