---
shaping: true
---

# Spike: policyVersions Schema Change (A6.1)

## Context

Shape B adds `eventTypeId` to appointments and an optional `depositAmountCents` override to event types. The concern is whether `policyVersions` also needs an `eventTypeId` column — and whether any schema change is required at all.

## Goal

Determine whether `policyVersions` needs to change to support event-type-specific deposits, and identify all sites that read from `policyVersions` to confirm nothing breaks.

---

## Questions

| # | Question |
|---|----------|
| **Q1** | What does `policyVersions` currently store, and is the snapshot post- or pre-tier-resolution? |
| **Q2** | Which sites read from `policyVersions`, and which fields do they use? |
| **Q3** | Does `policyVersions` need `eventTypeId` to satisfy R4 ("snapshots capture the event-type-specific deposit")? |
| **Q4** | Where should "which event type was booked" live — on the appointment or the policy snapshot? |

---

## Findings

### Q1 — What policyVersions stores

Current columns: `id`, `shopId`, `currency`, `paymentMode`, `depositAmountCents`, `cancelCutoffMinutes`, `refundBeforeCutoff`, `resolutionGraceMinutes`, `createdAt`.

The snapshot is created **after** `applyTierPricingOverride` runs:

```typescript
// appointments.ts:774
.insert(policyVersions).values({
  paymentMode: tierPricing.paymentMode,          // ← resolved (post-tier)
  depositAmountCents: tierPricing.depositAmountCents,  // ← resolved (post-tier)
  cancelCutoffMinutes: policy.cancelCutoffMinutes,
  refundBeforeCutoff: policy.refundBeforeCutoff,
  resolutionGraceMinutes: policy.resolutionGraceMinutes,
})
```

The snapshot is **post-resolution** — it records the actual amount charged, not the base. This is correct and intentional: the snapshot is the customer's payment terms at the moment of booking.

### Q2 — Read sites

| File | Fields read | Purpose |
|------|-------------|---------|
| `api/manage/[token]/cancel/route.ts` | `cancelCutoffMinutes`, `refundBeforeCutoff`, `depositAmountCents` | Determine refund eligibility on cancellation |
| `api/jobs/resolve-outcomes/route.ts` | `policyVersionId` (as a join column only) | Associate resolved outcome with the snapshot that governed it; no policy fields read in main query |
| `app/conflicts/actions.ts` | `policy: policyVersions` (full row) | Display policy context alongside conflict alerts |

In all cases, the fields consumed are the payment terms (`depositAmountCents`, `cancelCutoffMinutes`, `refundBeforeCutoff`). None of these sites need to know which event type produced those terms — they only need the terms themselves.

### Q3 — Does policyVersions need eventTypeId?

**No.** R4 states: "Policy snapshots capture the event-type-specific deposit at booking time." With Shape B, the resolved deposit is already in the snapshot:

1. Booking flow resolves: `eventBase = eventType.depositAmountCents ?? shopPolicy.depositAmountCents`
2. Tier pricing applied on top of `eventBase`
3. Result stored in `policyVersions.depositAmountCents`

The snapshot already satisfies R4 by construction — the event-type deposit is reflected in the stored amount. Adding `eventTypeId` to `policyVersions` would be redundant for this purpose.

### Q4 — Where should "which event type was booked" live?

On the **appointment**, not the policy snapshot. These are separate concerns:

| Record | Purpose | Contains |
|--------|---------|----------|
| `policyVersions` | What were the payment terms at booking time? | Frozen pricing parameters |
| `appointments` | What was booked, by whom, and when? | `eventTypeId`, `customerId`, `startsAt`, `endsAt` |

Any query that needs "what service was booked" joins to the appointment's `eventTypeId`. The policy snapshot remains a pure pricing document.

---

## Answers

| # | Answer |
|---|--------|
| Q1 | Post-tier-resolution snapshot. `depositAmountCents` is the actual amount charged, after all overrides. |
| Q2 | Three read sites. All consume payment terms, none need to know the originating event type. |
| Q3 | No schema change to `policyVersions`. The event-type deposit flows through resolution into the existing `depositAmountCents` column. |
| Q4 | `appointments.eventTypeId` is the right home. Policy snapshots are payment-term documents, not booking descriptors. |

---

## Impact on Shaping Doc

- **A6.1 flag resolved:** `policyVersions` requires **no schema change**. The existing `depositAmountCents` column captures the event-type deposit by construction. `eventTypeId` belongs on `appointments`, which Shape B already includes (A3.1).
- Simpler than expected — one fewer migration column.
