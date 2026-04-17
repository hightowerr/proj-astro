# Spike 6: Dashboard Monthly Retention

Source review:

- `docs/shaping/dashboard-ui/requirements-audit.md`
- proposed dashboard mock: `docs/shaping/dashboard-ui/screen.png`

## Goal

Decide what the proposed `Monthly Retention` percentage should actually measure, and whether the `recovered / refunded` breakdown can be backed truthfully by the current app.

This spike needs to answer:

- what `Monthly Retention` could mean in the current product
- whether `recovered` is a financial-outcome term or a slot-recovery term
- whether one percentage plus `recovered / refunded` breakdown is supportable now
- what smaller truthful KPI could ship in v1
- what implementation shape would be required later for a true combined metric

## Current State

Observed in the codebase:

- The current dashboard only exposes a monthly money summary:
  - `depositsRetained`
  - `refundsIssued`
- That query groups by `appointments.financialOutcome` and filters by `appointments.endsAt` inside the current month.
- The current summary card labels those buckets `Retained` and `Refunded`, not `Recovered`.
- The financial-outcome model is appointment-level:
  - `settled`
  - `voided`
  - `refunded`
- The slot-recovery model is a separate operational workflow:
  - `slot_openings`
  - `slot_offers`
  - replacement appointments linked by `appointments.sourceSlotOpeningId`
- In current app language, `recovered` already refers to a replacement booking for a cancelled slot, not to a retained payment outcome.
- Slot recovery status is not final at first acceptance:
  - a slot is marked `filled` when a recovery booking is created
  - but it can be reopened on payment failure
  - and it can also be reopened if a pending recovery booking is abandoned

Relevant code:

- `src/lib/queries/dashboard.ts:148-172`
- `src/components/dashboard/summary-cards.tsx:43-58`
- `src/lib/outcomes.ts:1-58`
- `src/app/api/jobs/resolve-outcomes/route.ts:106-182`
- `src/lib/schema.ts:528-585`
- `src/lib/schema.ts:759-836`
- `src/lib/slot-recovery.ts:522-560`
- `src/app/api/stripe/webhook/route.ts:65-135`
- `src/app/api/jobs/expire-pending-recoveries/route.ts:52-118`
- `src/lib/queries/appointments.ts:1390-1440`
- `src/app/app/slot-openings/[id]/page.tsx:128-160`

## Questions

| # | Question |
|---|----------|
| Q1 | What are the plausible meanings of `Monthly Retention` here? |
| Q2 | Which meaning best matches the proposed `recovered / refunded` breakdown? |
| Q3 | Can the current model support that meaning as one truthful KPI? |
| Q4 | What smaller truthful metrics are already supportable? |
| Q5 | What should ship in v1? |
| Q6 | If product wants the combined metric later, what must be added? |

## Findings

### Q1 — There are three realistic interpretations, and they are not the same metric

The proposed card could mean any of these:

#### Option A: monthly cash retention on appointment outcomes

Meaning:

- of the money tied to appointments in scope for this month
- how much was retained versus refunded

This maps naturally to:

- `financialOutcome = settled`
- `financialOutcome = refunded`
- summed `payments.amountCents`

#### Option B: slot recovery success rate

Meaning:

- of cancelled slots opened this month
- how many were successfully recovered through replacement bookings

This maps naturally to:

- `slot_openings`
- `appointments.sourceSlotOpeningId`

#### Option C: business preservation rate across both cash retention and slot recovery

Meaning:

- when bookings were at risk this month
- how much business was preserved
- through either keeping the original deposit or recovering the slot with a replacement booking

This is the broadest reading of `Monthly Retention`.

### Q2 — The proposed `recovered / refunded` breakdown most strongly implies Option C

The important clue is the word `recovered`.

In this codebase, `recovered` is already used for slot recovery:

- recovered appointment ids linked to slot openings
- `Recovered Bookings` in the slot-opening detail page

By contrast, the current financial-outcome card uses:

- `Retained`
- `Refunded`

That means the proposed card is not just a relabel of the existing money totals. It is implying a broader preservation metric where `recovered` refers to recovered business, not merely money that was not refunded.

**Decision:** the mock most likely mixes financial outcomes and slot-recovery outcomes in one card.

### Q3 — The current model cannot support that combined metric as one truthful percentage

The app has the ingredients for both domains, but not one canonical retention case that joins them.

Current financial outcomes are appointment-level:

- `settled`
- `refunded`
- `voided`

Current slot recovery is a separate lifecycle:

- a cancelled appointment can open a slot
- a replacement booking can be created for that slot
- that replacement booking may later succeed, fail, or be abandoned

The missing link is a single durable object that answers:

- what was the original at-risk unit
- what was its baseline value
- was the original deposit retained or refunded
- was the lost slot later recovered
- if recovered, should that be counted in addition to retained cash or instead of it

Without that, one percentage becomes ambiguous immediately.

Example ambiguities:

#### 1. Late cancellation plus recovered slot

- original appointment may resolve to `settled` because the deposit was kept
- the same slot may also later be recovered through a replacement booking

If the KPI mixes both, the same business event can be double-counted unless product defines a strict precedence rule.

#### 2. On-time refund plus later recovered replacement booking

- original appointment resolves to `refunded`
- slot opening later becomes a new recovered booking

Is that:

- refunded
- recovered
- both
- partially retained depending on money basis

The current model does not encode that decision.

#### 3. Recovery acceptance before payment success

Slot recovery is not final at first acceptance:

- `acceptOffer()` marks the slot opening `filled` when the replacement booking is created
- Stripe payment failure can reopen the slot
- the pending-recovery expiry job can also reopen the slot if payment is abandoned

So even the meaning of “recovered” requires stabilization rules before it can be used in a monthly KPI.

**Decision:** a single `Monthly Retention %` with `recovered / refunded` breakdown is not supportable now without inventing product logic that does not exist yet.

### Q4 — Two smaller truthful metrics already exist, but they must stay separate

#### Metric 1: monthly money outcomes

This is already implemented.

Current behavior:

- sums money by `financialOutcome`
- for appointments whose `endsAt` falls in the current month

This supports:

- retained money
- refunded money

It can also support a derived percentage:

- `cashRetentionRate = retained / (retained + refunded)`

when the denominator is greater than zero.

Important constraint:

- this is an appointment-month outcome metric, not a cash-posted-this-month ledger metric, because the query keys off `appointments.endsAt`

#### Metric 2: slot recovery operations

The app can separately surface recovery activity such as:

- slot openings created
- slot openings filled
- slot openings expired
- recovered replacement bookings

But this is an operational recovery metric, not the same thing as retained/refunded money.

Important constraint:

- recovery status needs a clear stabilization rule because `filled` can be reversed on payment failure or abandoned pending payment

### Q5 — V1 should not ship the proposed `Monthly Retention` card as shown

Recommended v1 boundary:

- keep the current monthly money card
- keep its labels money-specific

Recommended v1 card:

- title: `This Month` or `Deposit Outcomes`
- rows:
  - `Retained`
  - `Refunded`

If the product insists on a percentage in v1, the only truthful option is a narrower cash metric:

- title: `Deposit Retention Rate`
- formula: `retained / (retained + refunded)`
- breakdown labels:
  - `Retained`
  - `Refunded`

What should not ship:

- `Monthly Retention`
- with `Recovered / Refunded` breakdown
- backed by the current monthly stats query

That would silently merge two different systems into one number.

### Q6 — A true combined retention KPI later needs an explicit retention-case model

If product later wants a real preservation KPI, it needs a source of truth that spans both cancellation outcomes and slot recovery.

Recommended future model:

- one retention-case per at-risk source booking or cancellation
- durable links to:
  - source appointment id
  - source payment amount and currency
  - source cancellation / resolution outcome
  - slot opening id
  - recovered appointment id, if any
  - recovered payment outcome and amount, if any
- one final category such as:
  - `retained`
  - `recovered`
  - `refunded`
  - `lost`

The product must also define:

- whether the denominator is money or count
- whether the month anchor is appointment month, cancellation month, or recovery month
- whether late-cancel-plus-recovered counts once or twice
- how to handle zero-payment appointments
- how to handle mixed currencies

Only after those rules exist does a single percentage become trustworthy.

## Recommendation

The sixth spike resolves to this v1 rule:

- do not ship `Monthly Retention %` with `Recovered / Refunded` breakdown
- keep the current monthly money totals as the truthful v1 surface

If a percentage is required now, simplify it to a money-only KPI:

- `Deposit Retention Rate`
- derived from `Retained` and `Refunded` money only

If the team wants `recovered` on the dashboard, that should be a separate slot-recovery KPI, not a relabel of the current financial summary.
