# Slice 5b: Update Cross-Dependency Framing

**Spec**: 19
**File(s)**: `docs/shaping/inflight-payments/03-detection-guard.md`, `docs/shaping/inflight-payments/shape/inflight-payments-shape.md`
**Dependencies**: None

## What to do

### 1. Update spec 03 summary
Replace the current summary text to emphasize that the detection guard is the PRIMARY mechanism:
- Remove any implication that transfer webhook events are the primary detection path
- Add: "This is the PRIMARY mechanism for detecting transfer failures. Stripe does not emit a failure event when a transfer is silently not created due to account suspension."
- Add cross-reference: "Supplemented by spec 15 (transfer.reversed) for post-transfer reversals"

### 2. Update shape document
In `inflight-payments-shape.md`, update the architecture mapping table to include specs 14-19.
Add a new section "## Transfer Event Rethink" that summarizes:
- `transfer.failed` is not a real Stripe event (removed in spec 14)
- `transfer.reversed` and `transfer.updated` are real events (added in specs 15, 17)
- The detection guard (spec 03) is the PRIMARY detection mechanism for silent failures
- Transfer events are supplementary observability for post-transfer failures

### 3. No code changes
This is documentation only.

## Acceptance criteria
- [ ] Spec 03 summary updated to reflect PRIMARY status
- [ ] Shape document updated with transfer event rethink section
- [ ] No references to `transfer.failed` as a real event remain in docs
- [ ] Cross-references to specs 15, 17 added
