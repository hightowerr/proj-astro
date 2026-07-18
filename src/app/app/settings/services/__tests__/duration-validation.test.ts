import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  MAX_SERVICE_DURATION_MINUTES,
  MIN_SERVICE_DURATION_MINUTES,
} from "../constants";

/**
 * Mirrors the production Zod schema from actions.ts for durationMinutes.
 * We cannot import the schema directly because actions.ts uses "use server"
 * which makes all exports server actions (not importable as objects).
 */
const durationSchema = z.number().int().positive().max(
  MAX_SERVICE_DURATION_MINUTES,
  `Duration must be ${MAX_SERVICE_DURATION_MINUTES} minutes or less`
);

/**
 * Mirrors the production floor check from validateDuration() in actions.ts.
 */
function isDurationFloorValid(durationMinutes: number): boolean {
  return durationMinutes >= MIN_SERVICE_DURATION_MINUTES;
}

describe("duration validation", () => {
  it("accepts duration 75 (non-multiple of typical 60-min grid)", () => {
    expect(durationSchema.safeParse(75).success).toBe(true);
    expect(isDurationFloorValid(75)).toBe(true);
  });

  it("accepts duration 50 (non-multiple of typical 60-min grid)", () => {
    expect(durationSchema.safeParse(50).success).toBe(true);
    expect(isDurationFloorValid(50)).toBe(true);
  });

  it("accepts duration 5 (minimum)", () => {
    expect(durationSchema.safeParse(5).success).toBe(true);
    expect(isDurationFloorValid(5)).toBe(true);
  });

  it("rejects duration 4 (below minimum)", () => {
    expect(isDurationFloorValid(4)).toBe(false);
  });

  it("accepts duration 480 (maximum)", () => {
    expect(durationSchema.safeParse(480).success).toBe(true);
  });

  it("rejects duration 481 (above maximum)", () => {
    const result = durationSchema.safeParse(481);
    expect(result.success).toBe(false);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      expect(firstIssue).toBeDefined();
      expect(firstIssue!.message).toContain("480");
    }
  });

  it("rejects duration 0 (not positive)", () => {
    expect(durationSchema.safeParse(0).success).toBe(false);
  });

  it("rejects duration -1 (negative)", () => {
    expect(durationSchema.safeParse(-1).success).toBe(false);
  });

  it("accepts duration 17 (non-step-aligned — step=5 is browser-only)", () => {
    expect(durationSchema.safeParse(17).success).toBe(true);
    expect(isDurationFloorValid(17)).toBe(true);
  });

  it("accepts all grid-aligned durations (30, 60, 90, 120, 180, 240)", () => {
    for (const duration of [30, 60, 90, 120, 180, 240]) {
      expect(durationSchema.safeParse(duration).success).toBe(true);
      expect(isDurationFloorValid(duration)).toBe(true);
    }
  });
});
