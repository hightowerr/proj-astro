# Spike 5: Deposits At Risk Expiry And Currency

Source review:

- `docs/shaping/dashboard-ui/requirements-audit.md`
- proposed dashboard mock: `docs/shaping/dashboard-ui/screen.png`

## Goal

Decide what the proposed expiry text under `Deposits at Risk` should mean, and which currency source the dashboard should use for money KPIs.

This spike needs to answer:

- what `Expires in 48h` could mean on this card
- whether the current `Deposits at Risk` metric has one truthful expiry clock
- whether the money should be policy-led or payment-led
- whether mixed currencies are possible in the current model
- what the v1 dashboard should ship

## Current State

Observed in the codebase:

- The current dashboard computes `depositsAtRisk` by summing `payments.amountCents` for high-risk booked appointments inside the selected attention window.
- The summary card renders that number with a hardcoded `USD` formatter.
- The dashboard query does not return:
  - a currency code
  - a next-expiry timestamp
  - any distinction between cancellation-cutoff exposure and confirmation-expiry exposure
- Shop payment policy currency is editable.
- Each booking snapshots policy currency and cutoff rules into `policy_versions`.
- Each payment row also stores its own `currency`.
- Cancellation refund eligibility is driven by policy cutoff time, payment status, and booking status.
- Confirmation expiry is a separate automation path with its own `confirmationDeadline`, and it only applies after a confirmation request has actually been sent.

Relevant code:

- `src/components/dashboard/summary-cards.tsx:1-58`
- `src/lib/queries/dashboard.ts:120-172`
- `src/lib/queries/dashboard.ts:205-259`
- `src/lib/schema.ts:340-399`
- `src/lib/schema.ts:719-742`
- `src/app/app/settings/payment-policy/page.tsx:12-109`
- `src/lib/queries/appointments.ts:799-909`
- `src/lib/cancellation.ts:17-52`
- `src/lib/confirmation.ts:143-240`
- `src/lib/confirmation.ts:326-466`
- `src/app/api/stripe/webhook/route.ts:209-216`
- `src/app/manage/[token]/page.tsx:47-126`

## Questions

| # | Question |
|---|----------|
| Q1 | What are the plausible meanings of `Expires in 48h` on this card? |
| Q2 | Does the current `Deposits at Risk` metric have one truthful expiry clock? |
| Q3 | Should the money source come from policy snapshots or payment rows? |
| Q4 | Can the current app produce mixed currencies in one dashboard window? |
| Q5 | What should ship in v1? |
| Q6 | If product wants expiry later, what implementation shape is required? |

## Findings

### Q1 — There are at least three plausible expiry clocks, and they mean different things

The proposed `Expires in 48h` line could refer to any of these:

#### Option A: cancellation-cutoff expiry

Meaning:

- the next time a currently refundable booking crosses its policy cutoff
- after that point, the customer can no longer receive a refund on cancellation

This clock is derived from:

- `startsAt`
- `policyVersions.cancelCutoffMinutes`
- `policyVersions.refundBeforeCutoff`
- payment success state

#### Option B: confirmation-deadline expiry

Meaning:

- the next time a pending high-risk confirmation request auto-expires
- which can trigger cancellation and refund for a booked appointment

This clock is derived from:

- `appointments.confirmationDeadline`
- `appointments.confirmationStatus = pending`
- payment success state

#### Option C: appointment-start or resolution expiry

Meaning:

- the next time a deposit stops being “at risk” because the appointment starts or later resolves

This is a looser operational interpretation, but it is not how the current product makes refund or confirmation decisions.

### Q2 — The current card does not have one truthful expiry clock

The current metric is:

- sum of deposit amounts on high-risk booked appointments
- inside the selected attention window

That amount is not tied to a single lifecycle boundary.

Why cancellation cutoff is not a universal fit:

- cutoff is only relevant when refund-before-cutoff is enabled
- it only matters for succeeded payments
- some counted bookings may already be past cutoff
- the current dashboard query does not filter to “still refundable” deposits

Why confirmation deadline is not a universal fit:

- only some high-risk bookings receive confirmation requests
- the confirmation finder is limited to appointments 24 to 48 hours away, with SMS opt-in, `confirmationStatus = none`, and no prior confirmation send
- a booking outside that slice has no confirmation deadline at all

Why appointment start is too weak:

- the product does not use appointment start as the refund boundary
- the dashboard would imply a rule that the backend does not actually enforce

**Decision:** the current `Deposits at Risk` card should not ship with a generic expiry line. There is no single truthful timestamp behind the current aggregate.

### Q3 — The money source should be payment-led, not policy-led

For this card, the correct source of truth is captured payment data:

- `payments.amountCents`
- `payments.currency`

Reasoning:

- the dashboard is summarizing money already at stake, not theoretical policy settings
- policy versions store what the booking intended to charge
- payments store what was actually created and captured for that appointment
- the rest of the product treats payment rows as the money authority for receipts, refunds, and manage flows

This also matches the current dashboard query, which already sums payment amounts rather than policy deposit snapshots.

Policy version data still matters, but for different questions:

- cancellation cutoff timing
- refund-before-cutoff rules
- fallback currency when viewing an appointment with no payment row

**Decision:** `Deposits at Risk` should remain payment-led.

### Q4 — Mixed currencies are operationally possible now

The current app allows shop policy currency updates. New bookings snapshot the current policy currency into both:

- `policy_versions.currency`
- `payments.currency`

That means a shop can realistically have upcoming bookings created before and after a currency change.

So this scenario is possible:

- older future bookings in `USD`
- newer future bookings in `GBP`
- both still inside the same dashboard window

The current dashboard implementation is not safe for that case:

- it sums raw `amountCents`
- it does not group by currency
- it formats the result as `USD`

That would be mathematically and operationally misleading.

**Decision:** the dashboard money layer needs a currency-aware aggregate contract. A single formatted total is only truthful when one currency is present.

### Q5 — V1 should keep the money KPI, remove expiry text, and guard for currency

Recommended v1 card meaning:

- captured deposit exposure
- for booked high-risk appointments
- in the selected attention window

Recommended v1 card treatment:

- primary value: money total
- secondary line: neutral scope text only

Recommended secondary line options:

- `Captured deposits in selected window`
- `Booked high-risk deposits`
- `In selected attention window`

Recommended currency rule:

- if all contributing rows share one currency, show a single formatted total
- if multiple currencies are present, do not collapse them into one number

Recommended mixed-currency fallback:

- show a small per-currency breakdown
- or simplify the card to a neutral state such as `Multiple currencies`

What should not ship:

- `Expires in 48h` on the current aggregate card
- a hardcoded `USD` formatter for dashboard money
- one summed total across mixed currencies

### Q6 — If product wants expiry later, it must choose one explicit exposure model

If the team insists on an expiry line later, the product first needs to choose which business question the card answers.

#### Future path A: refundable-deposit exposure

Meaning:

- “How much captured deposit is still refundable before policy cutoff?”

Required query shape:

- booked appointments only
- succeeded payments only
- high-risk filter
- join `policy_versions`
- compute `cutoffTime = startsAt - cancelCutoffMinutes`
- filter to `refundBeforeCutoff = true` and `cutoffTime > now()`
- group totals by currency
- surface the earliest upcoming cutoff per currency

This would support a truthful sublabel such as:

- `Next refundable cutoff in 18h`

#### Future path B: pending-confirmation refund exposure

Meaning:

- “How much captured deposit will auto-refund if customers fail to confirm in time?”

Required query shape:

- booked appointments only
- succeeded payments only
- `confirmationStatus = pending`
- non-null `confirmationDeadline`
- high-risk filter
- group totals by currency
- surface the earliest upcoming confirmation deadline per currency

This would support a truthful sublabel such as:

- `Next confirmation expiry in 6h`

These are both valid metrics, but they are not the same metric. They should not share one ambiguous label.

## Recommendation

The fifth spike resolves to a narrow v1 boundary:

- keep `Deposits at Risk` as a money KPI
- define it as payment-led captured exposure on booked high-risk appointments in the selected window
- remove the generic expiry line from v1
- make dashboard money currency-aware, with a mixed-currency guard instead of a hardcoded `USD`

If product later wants an expiry message, split it into an explicit cutoff-based or confirmation-based exposure metric rather than attaching one countdown to the current aggregate card.
