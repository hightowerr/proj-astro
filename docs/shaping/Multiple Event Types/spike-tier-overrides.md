---
shaping: true
---

# Spike: Tier Override × Event Type Deposit

## Context

Shape B gives each event type its own `depositAmountCents`. Tier overrides (`riskDepositAmountCents`, `topDepositAmountCents`) currently live in `shopPolicies` and were designed against a single shop-level base deposit. We need to understand whether the existing `applyTierPricingOverride` function composes cleanly with event-type deposits, or whether it needs to change.

## Goal

Determine the exact resolution order for computing a booking's payment amount when both an event-type deposit and tier overrides are present, and identify any changes required to `applyTierPricingOverride`.

---

## Questions

| # | Question |
|---|----------|
| **Q1** | What are the replacement semantics of `applyTierPricingOverride`? Does it add to the base, or fully replace it? |
| **Q2** | Where is `applyTierPricingOverride` called in the booking flow, and what feeds in as `basePolicy`? |
| **Q3** | What does `policyVersions` store — the base deposit or the post-tier-resolution deposit? |
| **Q4** | What change, if any, is needed to make event-type deposits work as the base? |
| **Q5** | What breaks if a tier override amount is less than the event-type base deposit? |

---

## Findings

### Q1 — Replacement semantics

`applyTierPricingOverride` (`src/lib/tier-pricing.ts`) uses **complete replacement**:

```
risk tier, riskDepositAmountCents = 5000  →  depositAmountCents = 5000  (replaces base entirely)
top tier,  topDepositWaived = true        →  depositAmountCents = 0
top tier,  topDepositAmountCents = 2000   →  depositAmountCents = 2000  (replaces base entirely)
neutral / no override                     →  depositAmountCents = basePolicy.depositAmountCents (unchanged)
```

There is no additive logic. Tier overrides are absolute amounts. If the override field is `null`, the base passes through unchanged.

### Q2 — Call site

Single call site in the booking flow (`src/lib/queries/appointments.ts:751`):

```typescript
const tierPricing = applyTierPricingOverride(
  customerScore?.tier ?? null,
  {
    paymentMode: policy.paymentMode,
    depositAmountCents: policy.depositAmountCents,   // ← shop-level base today
  },
  {
    riskPaymentMode: policy.riskPaymentMode,
    riskDepositAmountCents: policy.riskDepositAmountCents,
    topDepositWaived: policy.topDepositWaived,
    topDepositAmountCents: policy.topDepositAmountCents,
  }
);
```

`policy` comes from `ensureShopPolicy(tx, shopId)` — a read of `shopPolicies`. The event type is not involved at all today.

### Q3 — What policyVersions stores

The snapshot stores the **post-tier-resolution** amount, not the base:

```typescript
.insert(policyVersions).values({
  paymentMode: tierPricing.paymentMode,
  depositAmountCents: tierPricing.depositAmountCents,  // ← resolved, after tier applied
  ...
})
```

The snapshot is already the final computed amount. This means the snapshot is correct by construction — whatever we resolve before calling `.insert()` is what gets frozen.

### Q4 — Change required to compose event-type deposits

**No change to `applyTierPricingOverride` itself.** The function signature accepts a `basePolicy` argument. The only change needed is in the call site — swap out what feeds in as `basePolicy.depositAmountCents`:

```typescript
// Today
depositAmountCents: policy.depositAmountCents

// With event types (Shape B)
const eventBase = eventType.depositAmountCents ?? policy.depositAmountCents;
depositAmountCents: eventBase
```

The rest of the call — tier overrides, payment mode — stays identical. The function is already parameterised correctly.

**Steps required at the call site (`createAppointment`):**

1. Receive `eventTypeId` as a new input field
2. Load the event type from the DB to get `durationMinutes` and `depositAmountCents`
3. Compute `eventBase = eventType.depositAmountCents ?? policy.depositAmountCents`
4. Pass `eventBase` into `applyTierPricingOverride` as `basePolicy.depositAmountCents`
5. Use `eventType.durationMinutes` in `computeEndsAt` instead of `settings.slotMinutes`
6. Add `eventTypeId` to the policyVersions insert (the `eventTypeId` column to be added per the shaping doc)

### Q5 — What breaks if tier override < event-type base

This is a real design risk. Example:

| | Amount |
|---|---|
| Event type deposit (e.g. colour session) | £100 |
| `riskDepositAmountCents` (shop-wide) | £50 |

A risk customer booking the colour session would be charged £50 — **less than a neutral customer booking the same service.** The current function has no floor logic.

**Two options:**

| Option | Mechanism | Trade-off |
|--------|-----------|-----------|
| **Option 1: Document as known limitation** | Keep replacement semantics. Shop owners are responsible for keeping tier overrides ≥ any event-type base they configure. | Zero code change. Risk of accidental under-charge if owner doesn't understand the interaction. |
| **Option 2: Apply event-type base as a floor for risk tier only** | After `applyTierPricingOverride`, if `tier === "risk"` and `eventBase != null`, clamp: `Math.max(riskResult, eventBase)`. Top-tier waivers (`topDepositWaived → 0`) and reductions (`topDepositAmountCents`) are explicitly excluded — they are intentional downward adjustments and must not be clamped. | Minimal code change. Makes the system less surprising without breaking top-tier rewards. |

Option 2 requires adding a conditional clamp after the existing call — scoped to the risk tier only:

```typescript
if (
  customerScore?.tier === "risk" &&
  eventType?.depositAmountCents != null &&
  (tierPricing.depositAmountCents ?? 0) < eventType.depositAmountCents
) {
  tierPricing.depositAmountCents = eventType.depositAmountCents;
}
```

This is addable at the call site — no change to the `applyTierPricingOverride` function. Top-tier customers retain their waiver or reduced deposit regardless of the event-type base.

---

## Answers

| # | Answer |
|---|--------|
| Q1 | Complete replacement — tier override amounts fully replace the base; no addition logic |
| Q2 | Single call site in `createAppointment`; `basePolicy.depositAmountCents` comes from `shopPolicies` today |
| Q3 | `policyVersions` stores the post-resolution amount — snapshot is correct by construction |
| Q4 | No change to `applyTierPricingOverride`. Change only the call site: feed `eventType.depositAmountCents ?? shopPolicy.depositAmountCents` as `basePolicy.depositAmountCents` |
| Q5 | A risk tier override below the event-type base silently under-charges risk customers. Option 2 (risk-tier-only floor clamp after resolution) is the safer default. Top-tier waivers and reductions are intentional and must not be clamped. |

---

## Decision Required

Before implementation: **choose Option 1 or Option 2** for the floor behaviour.

- Option 1 is simpler and preserves current semantics exactly. Acceptable if shop owners configure tier overrides knowingly.
- Option 2 adds one line and prevents accidental under-charges. Recommended given that shop owners may not think through cross-event-type interactions when setting tier override amounts.

---

## Impact on Shaping Doc

- **B4.1 flag resolved:** Tier overrides are absolute replacement amounts. With event types, `applyTierPricingOverride` receives the event-type base as `basePolicy.depositAmountCents`. Tier override fields remain shop-level. Add a risk-tier-only floor clamp (Option 2) to prevent the risk override from under-cutting event-type pricing. Top-tier waivers and reductions are excluded from the clamp — they apply freely.
- No new parts required; this is a call-site change within the existing `createAppointment` flow.
