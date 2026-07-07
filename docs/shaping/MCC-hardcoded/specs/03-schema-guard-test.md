# 03 — Schema Guard Test

## Summary
Build-time test asserting every value in `businessTypeSchema` has a corresponding MCC entry. Prevents recurrence when new verticals are added.

## Prerequisites
- Depends on: 01 (mcc-mapping-module)

## Changes

**New file:** `src/lib/mcc-mapping.test.ts`

### Tests

```ts
import { describe, expect, it } from "vitest";
import { businessTypes } from "@/components/onboarding/business-type-step";
import { getMccForBusinessType, DEFAULT_MCC } from "@/lib/mcc-mapping";

describe("MCC mapping", () => {
  it("every businessType has a corresponding MCC entry", () => {
    for (const { value } of businessTypes) {
      const mcc = getMccForBusinessType(value);
      expect(mcc).not.toBe(DEFAULT_MCC);
      expect(mcc).toMatch(/^\d{4}$/);
    }
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

  it("returns correct MCC for each known type", () => {
    expect(getMccForBusinessType("hair")).toBe("7241");
    expect(getMccForBusinessType("beauty")).toBe("7230");
    expect(getMccForBusinessType("spa-massage")).toBe("7297");
    expect(getMccForBusinessType("health-clinic")).toBe("8099");
    expect(getMccForBusinessType("personal-trainer")).toBe("7941");
    expect(getMccForBusinessType("general-services")).toBe("7299");
  });
});
```

### Why this prevents recurrence

The first test (`every businessType has a corresponding MCC entry`) iterates the `businessTypes` array from `business-type-step.tsx` — the same array the onboarding UI renders. When a developer adds a 7th vertical to `businessTypes`, this test fails until they also add the MCC mapping. The failure message is explicit: `expected "7299" not to be "7299"` for the new value.

### Note on `general-services`
`general-services` maps to `7299`, which is also `DEFAULT_MCC`. The exhaustiveness test uses `not.toBe(DEFAULT_MCC)` — this catches missing entries but `general-services` would be a false positive. Two options:
1. Exclude `general-services` from the exhaustiveness check (special-case).
2. Change the test to check that the MCC is explicitly defined in the record (not just that it differs from default).

Option 2 is cleaner — export the `MCC_BY_BUSINESS_TYPE` record and assert `value in MCC_BY_BUSINESS_TYPE` directly.

## Acceptance
- `pnpm vitest mcc-mapping` passes
- Adding a new value to `businessTypes` without a corresponding MCC entry causes a test failure
- All edge cases (null, undefined, unknown string) covered
