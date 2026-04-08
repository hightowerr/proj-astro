import { describe, expect, it } from "vitest";
import { parseReminderInterval, shouldSkipReminder } from "@/lib/reminders";

describe("parseReminderInterval", () => {
  it.each([
    ["10m", 10],
    ["1h", 60],
    ["2h", 120],
    ["4h", 240],
    ["24h", 1440],
    ["48h", 2880],
    ["1w", 10080],
  ])("parses %s -> %d minutes", (interval, expected) => {
    expect(parseReminderInterval(interval)).toBe(expected);
  });

  it("returns null for unrecognised intervals", () => {
    expect(parseReminderInterval("15min")).toBeNull();
    expect(parseReminderInterval("")).toBeNull();
    expect(parseReminderInterval("3d")).toBeNull();
  });
});

describe("shouldSkipReminder", () => {
  const appointment = (minutesFromNow: number, createdMinutesAgo: number) => {
    const now = Date.now();

    return {
      startsAt: new Date(now + minutesFromNow * 60 * 1000),
      createdAt: new Date(now - createdMinutesAgo * 60 * 1000),
    };
  };

  it("does not skip when booked well before the reminder window", () => {
    const { startsAt, createdAt } = appointment(25 * 60, 24 * 60);
    expect(shouldSkipReminder(startsAt, createdAt, "24h")).toBe(false);
  });

  it("skips when booked within the reminder window", () => {
    const { startsAt, createdAt } = appointment(30, 30);
    expect(shouldSkipReminder(startsAt, createdAt, "24h")).toBe(true);
  });

  it("does not skip when lead time equals the interval exactly", () => {
    const { startsAt, createdAt } = appointment(24 * 60, 0);
    expect(shouldSkipReminder(startsAt, createdAt, "24h")).toBe(false);
  });

  it("skips short-lead appointments for a long interval but not a short one", () => {
    const { startsAt, createdAt } = appointment(15, 5);
    expect(shouldSkipReminder(startsAt, createdAt, "24h")).toBe(true);
    expect(shouldSkipReminder(startsAt, createdAt, "10m")).toBe(false);
  });

  it("skips for unknown interval", () => {
    const { startsAt, createdAt } = appointment(25 * 60, 24 * 60);
    expect(shouldSkipReminder(startsAt, createdAt, "15min")).toBe(true);
  });
});
