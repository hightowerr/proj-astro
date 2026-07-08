# 03 — Floor Unit Tests

## Summary
Unit tests for the `derivePaymentRequirement()` floor behavior and the `PLATFORM_MINIMUM_DEPOSIT_CENTS` constant. Covers sub-floor, at-floor, above-floor, zero (waived), negative, null, and `paymentMode=none` cases.

## Prerequisites
- Depends on: 01 (tests the modified function + exported constant)

## Changes

**Modified file:** `src/lib/__tests__/tier-pricing.test.ts` (existing project test directory)

### Implementation

```ts
import { describe, it, expect } from "vitest";
import {
  derivePaymentRequirement,
  PLATFORM_MINIMUM_DEPOSIT_CENTS,
} from "@/lib/tier-pricing";

describe("PLATFORM_MINIMUM_DEPOSIT_CENTS", () => {
  it("equals 100 (£1)", () => {
    expect(PLATFORM_MINIMUM_DEPOSIT_CENTS).toBe(100);
  });
});

describe("derivePaymentRequirement floor enforcement", () => {
  it("clamps sub-minimum deposit to platform floor", () => {
    const result = derivePaymentRequirement({
      paymentMode: "deposit",
      depositAmountCents: 50,
    });
    expect(result).toEqual({ paymentRequired: true, amountCents: 100 });
  });

  it("clamps 1p deposit to platform floor", () => {
    const result = derivePaymentRequirement({
      paymentMode: "deposit",
      depositAmountCents: 1,
    });
    expect(result).toEqual({ paymentRequired: true, amountCents: 100 });
  });

  it("clamps 99p deposit to platform floor", () => {
    const result = derivePaymentRequirement({
      paymentMode: "deposit",
      depositAmountCents: 99,
    });
    expect(result).toEqual({ paymentRequired: true, amountCents: 100 });
  });

  it("does not clamp zero deposit (waived path)", () => {
    const result = derivePaymentRequirement({
      paymentMode: "deposit",
      depositAmountCents: 0,
    });
    expect(result).toEqual({ paymentRequired: false, amountCents: 0 });
  });

  it("does not clamp deposits at floor", () => {
    const result = derivePaymentRequirement({
      paymentMode: "deposit",
      depositAmountCents: 100,
    });
    expect(result).toEqual({ paymentRequired: true, amountCents: 100 });
  });

  it("does not clamp deposits above floor", () => {
    const result = derivePaymentRequirement({
      paymentMode: "deposit",
      depositAmountCents: 500,
    });
    expect(result).toEqual({ paymentRequired: true, amountCents: 500 });
  });

  it("returns no payment for paymentMode=none even with sub-floor amount", () => {
    const result = derivePaymentRequirement({
      paymentMode: "none",
      depositAmountCents: 50,
    });
    expect(result).toEqual({ paymentRequired: false, amountCents: 0 });
  });

  it("returns no payment for null deposit", () => {
    const result = derivePaymentRequirement({
      paymentMode: "deposit",
      depositAmountCents: null,
    });
    expect(result).toEqual({ paymentRequired: false, amountCents: 0 });
  });

  it("clamps sub-floor full_prepay amount", () => {
    const result = derivePaymentRequirement({
      paymentMode: "full_prepay",
      depositAmountCents: 75,
    });
    expect(result).toEqual({ paymentRequired: true, amountCents: 100 });
  });
});
```

### Design decisions

- **9 test cases** — covers the full boundary matrix: sub-floor (1p, 50p, 99p), at-floor (100p), above-floor (500p), zero, null, `paymentMode=none`, and `full_prepay` mode.
- **No mocks** — `derivePaymentRequirement` is pure, no I/O.
- **Constant assertion** — verifying the constant value catches accidental changes.

## Acceptance
- All 9 tests pass with `pnpm test`
- Tests fail if `PLATFORM_MINIMUM_DEPOSIT_CENTS` is changed without updating them (intentional — forces deliberate review)
