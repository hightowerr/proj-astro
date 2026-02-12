import { describe, it, expect } from "vitest";
import {
  formatDateInTimeZone,
  parseTimeToMinutes,
  getDayStartEndUtc,
  generateSlotsForDate,
  isValidSlotStart,
  computeEndsAt,
} from "../booking";

describe("formatDateInTimeZone", () => {
  it("formats UTC date correctly", () => {
    const date = new Date("2025-02-15T10:30:00Z");
    expect(formatDateInTimeZone(date, "UTC")).toBe("2025-02-15");
  });

  it("formats date in New York timezone", () => {
    const date = new Date("2025-02-15T05:00:00Z"); // Midnight EST
    expect(formatDateInTimeZone(date, "America/New_York")).toBe("2025-02-15");
  });

  it("formats date in Tokyo timezone", () => {
    const date = new Date("2025-02-14T15:00:00Z"); // Midnight JST next day
    expect(formatDateInTimeZone(date, "Asia/Tokyo")).toBe("2025-02-15");
  });

  it("handles date crossing timezone boundary", () => {
    const date = new Date("2025-02-15T23:00:00Z");
    // Los Angeles is UTC-8, so 23:00 UTC is 15:00 PST same day
    expect(formatDateInTimeZone(date, "America/Los_Angeles")).toBe(
      "2025-02-15"
    );
  });
});

describe("parseTimeToMinutes", () => {
  it("parses simple time strings", () => {
    expect(parseTimeToMinutes("09:00")).toBe(540); // 9 * 60
    expect(parseTimeToMinutes("17:30")).toBe(1050); // 17 * 60 + 30
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });

  it("handles single-digit hours and minutes", () => {
    expect(parseTimeToMinutes("9:0")).toBe(540);
    expect(parseTimeToMinutes("1:5")).toBe(65);
  });

  it("returns 0 for invalid time strings", () => {
    expect(parseTimeToMinutes("invalid")).toBe(0);
    expect(parseTimeToMinutes("")).toBe(0);
    expect(parseTimeToMinutes("25:00")).toBe(1500); // Doesn't validate range
    expect(parseTimeToMinutes("abc:def")).toBe(0);
  });

  it("handles edge cases", () => {
    expect(parseTimeToMinutes("12:00")).toBe(720); // Noon
    expect(parseTimeToMinutes("00:30")).toBe(30); // Half past midnight
  });
});

describe("getDayStartEndUtc", () => {
  it("returns start and end of day in UTC for UTC timezone", () => {
    const { start, end } = getDayStartEndUtc("2025-02-15", "UTC");
    expect(start.toISOString()).toBe("2025-02-15T00:00:00.000Z");
    expect(end.toISOString()).toBe("2025-02-15T23:59:59.999Z");
  });

  it("returns start and end of day in UTC for New York timezone", () => {
    const { start, end } = getDayStartEndUtc("2025-02-15", "America/New_York");
    // Feb 15 midnight EST is Feb 15 05:00 UTC (EST is UTC-5)
    expect(start.toISOString()).toBe("2025-02-15T05:00:00.000Z");
    expect(end.toISOString()).toBe("2025-02-16T04:59:59.999Z");
  });

  it("returns start and end of day in UTC for Tokyo timezone", () => {
    const { start, end } = getDayStartEndUtc("2025-02-15", "Asia/Tokyo");
    // Feb 15 midnight JST is Feb 14 15:00 UTC (JST is UTC+9)
    expect(start.toISOString()).toBe("2025-02-14T15:00:00.000Z");
    expect(end.toISOString()).toBe("2025-02-15T14:59:59.999Z");
  });

  it("handles leap year date", () => {
    const { start, end } = getDayStartEndUtc("2024-02-29", "UTC");
    expect(start.toISOString()).toBe("2024-02-29T00:00:00.000Z");
    expect(end.toISOString()).toBe("2024-02-29T23:59:59.999Z");
  });
});

describe("generateSlotsForDate", () => {
  it("generates slots for a full day with 30-minute intervals", () => {
    const slots = generateSlotsForDate({
      dateStr: "2025-02-15",
      timeZone: "UTC",
      slotMinutes: 30,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(slots.length).toBe(16); // 8 hours * 2 slots per hour
    expect(slots[0]!.startsAt.toISOString()).toBe("2025-02-15T09:00:00.000Z");
    expect(slots[0]!.endsAt.toISOString()).toBe("2025-02-15T09:30:00.000Z");
    expect(slots[15]!.startsAt.toISOString()).toBe("2025-02-15T16:30:00.000Z");
    expect(slots[15]!.endsAt.toISOString()).toBe("2025-02-15T17:00:00.000Z");
  });

  it("generates slots for 60-minute intervals", () => {
    const slots = generateSlotsForDate({
      dateStr: "2025-02-15",
      timeZone: "UTC",
      slotMinutes: 60,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(slots.length).toBe(8); // 8 hours
    expect(slots[0]!.startsAt.toISOString()).toBe("2025-02-15T09:00:00.000Z");
    expect(slots[0]!.endsAt.toISOString()).toBe("2025-02-15T10:00:00.000Z");
    expect(slots[7]!.startsAt.toISOString()).toBe("2025-02-15T16:00:00.000Z");
    expect(slots[7]!.endsAt.toISOString()).toBe("2025-02-15T17:00:00.000Z");
  });

  it("generates slots for 15-minute intervals", () => {
    const slots = generateSlotsForDate({
      dateStr: "2025-02-15",
      timeZone: "UTC",
      slotMinutes: 15,
      openTime: "09:00",
      closeTime: "10:00",
    });

    expect(slots.length).toBe(4); // 1 hour * 4 slots per hour
  });

  it("generates slots for 90-minute intervals", () => {
    const slots = generateSlotsForDate({
      dateStr: "2025-02-15",
      timeZone: "UTC",
      slotMinutes: 90,
      openTime: "09:00",
      closeTime: "12:00",
    });

    expect(slots.length).toBe(2); // 09:00-10:30, 10:30-12:00
    expect(slots[0]!.startsAt.toISOString()).toBe("2025-02-15T09:00:00.000Z");
    expect(slots[0]!.endsAt.toISOString()).toBe("2025-02-15T10:30:00.000Z");
    expect(slots[1]!.startsAt.toISOString()).toBe("2025-02-15T10:30:00.000Z");
    expect(slots[1]!.endsAt.toISOString()).toBe("2025-02-15T12:00:00.000Z");
  });

  it("generates slots correctly in New York timezone", () => {
    const slots = generateSlotsForDate({
      dateStr: "2025-02-15",
      timeZone: "America/New_York",
      slotMinutes: 60,
      openTime: "09:00",
      closeTime: "12:00",
    });

    expect(slots.length).toBe(3);
    // 09:00 EST = 14:00 UTC (EST is UTC-5)
    expect(slots[0]!.startsAt.toISOString()).toBe("2025-02-15T14:00:00.000Z");
    expect(slots[0]!.endsAt.toISOString()).toBe("2025-02-15T15:00:00.000Z");
  });

  it("returns empty array when openTime >= closeTime", () => {
    const slots = generateSlotsForDate({
      dateStr: "2025-02-15",
      timeZone: "UTC",
      slotMinutes: 30,
      openTime: "17:00",
      closeTime: "09:00",
    });

    expect(slots).toEqual([]);
  });

  it("returns empty array when openTime == closeTime", () => {
    const slots = generateSlotsForDate({
      dateStr: "2025-02-15",
      timeZone: "UTC",
      slotMinutes: 30,
      openTime: "09:00",
      closeTime: "09:00",
    });

    expect(slots).toEqual([]);
  });

  it("returns empty array when slotMinutes is 0", () => {
    const slots = generateSlotsForDate({
      dateStr: "2025-02-15",
      timeZone: "UTC",
      slotMinutes: 0,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(slots).toEqual([]);
  });

  it("returns empty array when slotMinutes is negative", () => {
    const slots = generateSlotsForDate({
      dateStr: "2025-02-15",
      timeZone: "UTC",
      slotMinutes: -30,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(slots).toEqual([]);
  });

  it("handles case where last slot doesn't fit", () => {
    const slots = generateSlotsForDate({
      dateStr: "2025-02-15",
      timeZone: "UTC",
      slotMinutes: 60,
      openTime: "09:00",
      closeTime: "09:30",
    });

    // 60-minute slot doesn't fit in 30-minute window
    expect(slots).toEqual([]);
  });

  it("includes partial last slot if it fits exactly", () => {
    const slots = generateSlotsForDate({
      dateStr: "2025-02-15",
      timeZone: "UTC",
      slotMinutes: 45,
      openTime: "09:00",
      closeTime: "11:00",
    });

    // 09:00-09:45, 09:45-10:30, 10:30-11:15 (doesn't fit)
    expect(slots.length).toBe(2);
    expect(slots[1]!.endsAt.toISOString()).toBe("2025-02-15T10:30:00.000Z");
  });

  it("generates slots for 120-minute (2-hour) intervals", () => {
    const slots = generateSlotsForDate({
      dateStr: "2025-02-15",
      timeZone: "UTC",
      slotMinutes: 120,
      openTime: "08:00",
      closeTime: "16:00",
    });

    expect(slots.length).toBe(4); // 8 hours / 2 = 4 slots
    expect(slots[0]!.startsAt.toISOString()).toBe("2025-02-15T08:00:00.000Z");
    expect(slots[3]!.endsAt.toISOString()).toBe("2025-02-15T16:00:00.000Z");
  });
});

describe("isValidSlotStart", () => {
  it("validates slot at opening time", () => {
    const startsAt = new Date("2025-02-15T09:00:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: 30,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(true);
  });

  it("validates slot in middle of day on grid", () => {
    const startsAt = new Date("2025-02-15T14:30:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: 30,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(true);
  });

  it("rejects slot before opening time", () => {
    const startsAt = new Date("2025-02-15T08:30:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: 30,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(false);
  });

  it("rejects slot that would end after closing time", () => {
    const startsAt = new Date("2025-02-15T16:45:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: 30,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(false);
  });

  it("accepts last slot that ends exactly at closing time", () => {
    const startsAt = new Date("2025-02-15T16:30:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: 30,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(true);
  });

  it("rejects slot off the grid", () => {
    const startsAt = new Date("2025-02-15T09:15:00Z"); // Not aligned to 30-min grid
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: 30,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(false);
  });

  it("rejects slot at 09:45 for 60-minute slots starting at 09:00", () => {
    const startsAt = new Date("2025-02-15T09:45:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: 60,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(false); // Should be 09:00, 10:00, 11:00, etc.
  });

  it("validates slot with 60-minute intervals", () => {
    const startsAt = new Date("2025-02-15T10:00:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: 60,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(true);
  });

  it("validates slot in New York timezone", () => {
    // 09:00 EST = 14:00 UTC
    const startsAt = new Date("2025-02-15T14:00:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "America/New_York",
      slotMinutes: 30,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(true);
  });

  it("rejects slot for negative slotMinutes", () => {
    const startsAt = new Date("2025-02-15T09:00:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: -30,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(false);
  });

  it("rejects slot for zero slotMinutes", () => {
    const startsAt = new Date("2025-02-15T09:00:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: 0,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(false);
  });

  it("validates 15-minute slot on grid", () => {
    const startsAt = new Date("2025-02-15T09:15:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: 15,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(true);
  });

  it("rejects 15-minute slot off grid", () => {
    const startsAt = new Date("2025-02-15T09:07:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: 15,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(false);
  });

  it("validates 90-minute slot on grid", () => {
    const startsAt = new Date("2025-02-15T10:30:00Z");
    const valid = isValidSlotStart({
      startsAt,
      timeZone: "UTC",
      slotMinutes: 90,
      openTime: "09:00",
      closeTime: "17:00",
    });

    expect(valid).toBe(true); // 09:00, 10:30, 12:00, ...
  });
});

describe("computeEndsAt", () => {
  it("computes end time for 30-minute slot", () => {
    const startsAt = new Date("2025-02-15T09:00:00Z");
    const endsAt = computeEndsAt({ startsAt, slotMinutes: 30, timeZone: "UTC" });

    expect(endsAt.toISOString()).toBe("2025-02-15T09:30:00.000Z");
  });

  it("computes end time for 60-minute slot", () => {
    const startsAt = new Date("2025-02-15T14:00:00Z");
    const endsAt = computeEndsAt({ startsAt, slotMinutes: 60, timeZone: "UTC" });

    expect(endsAt.toISOString()).toBe("2025-02-15T15:00:00.000Z");
  });

  it("computes end time for 15-minute slot", () => {
    const startsAt = new Date("2025-02-15T09:00:00Z");
    const endsAt = computeEndsAt({ startsAt, slotMinutes: 15, timeZone: "UTC" });

    expect(endsAt.toISOString()).toBe("2025-02-15T09:15:00.000Z");
  });

  it("computes end time for 90-minute slot", () => {
    const startsAt = new Date("2025-02-15T09:00:00Z");
    const endsAt = computeEndsAt({ startsAt, slotMinutes: 90, timeZone: "UTC" });

    expect(endsAt.toISOString()).toBe("2025-02-15T10:30:00.000Z");
  });

  it("computes end time for 120-minute slot", () => {
    const startsAt = new Date("2025-02-15T09:00:00Z");
    const endsAt = computeEndsAt({
      startsAt,
      slotMinutes: 120,
      timeZone: "UTC",
    });

    expect(endsAt.toISOString()).toBe("2025-02-15T11:00:00.000Z");
  });

  it("handles timezone correctly", () => {
    const startsAt = new Date("2025-02-15T14:00:00Z"); // 09:00 EST
    const endsAt = computeEndsAt({
      startsAt,
      slotMinutes: 30,
      timeZone: "America/New_York",
    });

    expect(endsAt.toISOString()).toBe("2025-02-15T14:30:00.000Z");
  });
});
