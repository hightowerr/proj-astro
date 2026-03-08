import { describe, expect, it } from "vitest";
import { normalizePhoneNumber } from "../phone";

describe("normalizePhoneNumber", () => {
  it("accepts possible test/demo numbers like +15551234567", () => {
    expect(normalizePhoneNumber("+15551234567")).toBe("+15551234567");
  });

  it("normalizes formatted valid numbers to E.164", () => {
    expect(normalizePhoneNumber(" +1 (202) 555-0123 ")).toBe("+12025550123");
  });

  it("rejects impossible phone numbers", () => {
    expect(() => normalizePhoneNumber("+769170100")).toThrow(
      "Invalid phone number format."
    );
  });
});
