# 04 — Tripwire Documentation

## Summary
Document two tripwires that must be reviewed when future features ship: multi-currency support and platform fee model changes. Inline code comments + architecture context update.

## Prerequisites
- Depends on: none (documentation-only, can run in parallel with spec 01)

## Changes

### 1. Inline code comment in `src/lib/tier-pricing.ts`

Add a tripwire comment above the constant:

```ts
/**
 * Platform-wide minimum deposit in pence.
 * TRIPWIRE: When multi-currency ships (roadmap.md), this must become
 * currency-aware. JPY has no subunit: ¥100 ≈ 50p. Also review if the
 * platform fee changes from flat 50p to percentage-based.
 */
export const PLATFORM_MINIMUM_DEPOSIT_CENTS = 100;
```

### 2. Architecture context update (documented, not applied yet)

Add to `docs/context/architecture-context.md` § Invariants:

> **Platform minimum deposit floor** — deposits between 1p and 99p are clamped to 100p (£1). Enforced at two points: `finalDepositCents` in `createAppointment()` (before policy snapshot) and `derivePaymentRequirement()` (belt-and-suspenders). Zero-amount deposits (from `topDepositWaived`) bypass the floor. Constant: `PLATFORM_MINIMUM_DEPOSIT_CENTS` in `tier-pricing.ts`.

### Design decisions

- **Inline comment, not a separate doc** — the tripwire is closest to the code it affects. Future developers see it when modifying the constant.
- **Two tripwires, not one** — currency and fee model are independent future events with different implications.

## Acceptance
- Tripwire comment exists above `PLATFORM_MINIMUM_DEPOSIT_CENTS`
- Architecture context update is documented in the build order (applied as part of loop contract, not this spec)
