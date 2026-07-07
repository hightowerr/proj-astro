import { describe, expect, it } from "vitest";
import { businessTypes } from "@/components/onboarding/business-type-step";
import {
  DEFAULT_MCC,
  MCC_BY_BUSINESS_TYPE,
  getMccForBusinessType,
} from "@/lib/mcc-mapping";

describe("MCC mapping", () => {
  it("every businessType has a corresponding MCC entry", () => {
    for (const { value } of businessTypes) {
      expect(
        Object.hasOwn(MCC_BY_BUSINESS_TYPE, value),
        `Missing MCC entry for businessType "${value}"`
      ).toBe(true);
    }
  });

  it("all MCCs are valid 4-digit codes", () => {
    for (const mcc of Object.values(MCC_BY_BUSINESS_TYPE)) {
      expect(mcc).toMatch(/^\d{4}$/);
    }
  });

  it("returns correct MCC for each known type", () => {
    expect(getMccForBusinessType("hair")).toBe("7241");
    expect(getMccForBusinessType("beauty")).toBe("7230");
    expect(getMccForBusinessType("spa-massage")).toBe("7297");
    expect(getMccForBusinessType("health-clinic")).toBe("8099");
    expect(getMccForBusinessType("personal-trainer")).toBe("7941");
    expect(getMccForBusinessType("general-services")).toBe("7299");
  });

  it("returns DEFAULT_MCC for null", () => {
    expect(getMccForBusinessType(null)).toBe(DEFAULT_MCC);
  });

  it("returns DEFAULT_MCC for undefined", () => {
    expect(getMccForBusinessType(undefined)).toBe(DEFAULT_MCC);
  });

  it("returns DEFAULT_MCC for unknown type", () => {
    expect(getMccForBusinessType("unknown-vertical")).toBe(DEFAULT_MCC);
  });
});
