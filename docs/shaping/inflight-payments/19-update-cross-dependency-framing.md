# Spec 19: Update Cross-Dependency Framing — Detection Guard is Primary

**Priority**: P2 (documentation accuracy)

## Summary
The original analysis assumed `transfer.failed` existed and that spec 03 (detection guard at `payment_intent.succeeded`) was a belt-and-suspenders addition. The relationship is inverted: spec 03 is the **PRIMARY** mechanism for catching transfer failures, not a secondary check. Transfer webhook events (`transfer.reversed`, `transfer.updated`) are supplementary signals for post-transfer failures only.

## What to update

### Spec 03 (`03-detection-guard.md`)
- Update summary: remove "belt-and-suspenders" framing
- Add: "This is the PRIMARY mechanism for detecting transfer failures. Stripe does not emit a failure event when a transfer is silently not created due to account suspension. Only the absence of `transfer.created` (undetectable by webhook) or a `charges_enabled` check (this spec) can catch it."
- Add cross-reference: "Supplemented by spec 15 (transfer.reversed) for post-transfer reversals"

### BUILD-ORDER.md
- Update dependency graph comment to reflect spec 03 as primary detection path
- Add specs 14-19 to the phased build order

### Shape documents
- Update `shape/inflight-payments-shape.md` if it references `transfer.failed` as a real event

## Why this matters
Without this update, a future developer reading spec 03 will underestimate its importance and may deprioritize it. The detection guard is the only reliable path for catching the "silent non-creation" failure — the most dangerous transfer failure mode.

## Scope
- **Files**:
  - `docs/shaping/inflight-payments/03-detection-guard.md`
  - `docs/shaping/inflight-payments/BUILD-ORDER.md`
  - `docs/shaping/inflight-payments/shape/inflight-payments-shape.md` (if applicable)

## Dependencies
- **Requires**: None — can be done at any time
- **Best done after**: Spec 14 (so the reasoning is clear: dead code removed, framing updated)
