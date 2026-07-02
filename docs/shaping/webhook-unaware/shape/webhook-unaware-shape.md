# Webhook Transfer Awareness — Shape

## Problem

Money flow is two-step (charge → transfer) but the information flow only sees step one. If the transfer to the connected account fails (account suspended, insufficient balance, chargeback freeze, routing misconfiguration), the charge succeeds on the platform but the merchant never gets paid — and nobody is notified. The root assumption that broke: "if the payment succeeds, the merchant gets paid" (true pre-Connect, false post-Connect).

Resilience Engineering scores 0/12 adaptive capacity — system can't anticipate, monitor, respond to, or learn from transfer failures.

## Requirements

| ID | Requirement | Priority | Source |
|----|-------------|----------|--------|
| R0 | Resolve a Stripe transfer event to local appointment/shop/payment context | P1 | Spec 01 |
| R1 | Log successful transfer outcomes with context (transfer.created) | P1 | Spec 02 |
| R2 | Alert on transfer failures with full context for manual review (transfer.failed) | P1 | Spec 03 |
| R3 | Store `applicationFeeAmountCents` in payments.metadata at PI creation time | P2 | Spec 04 |
| R4 | Warn on unhandled event types in platform webhook | P3 | Spec 05 |
| R5 | Warn on unhandled event types in Connect webhook | P3 | Spec 06 |
| R6 | Register transfer events in Stripe Dashboard after deployment | P1 (ops) | Spec 07 |
| R7 | Test coverage for all new code paths | — | Specs 08-10 |

## Shapes

### Shape A — Console logging v1 (CHOSEN)

`console.info` / `console.error` / `console.warn` + Vercel log monitoring. No new DB tables, no merchant notifications, no automated remediation. Pure observability.

**Transfer context lookup**: New helper `resolveTransferContext()` in `src/lib/stripe-utils.ts`. Chain: `transfer.source_transaction` (charge ID) → `stripe.charges.retrieve()` → `charge.payment_intent` → DB lookup `payments.stripePaymentIntentId` → join appointment/shop.

**Transfer handlers**: Two new cases in `connect-webhook/route.ts` — `transfer.created` (console.info) and `transfer.failed` (console.error with `MANUAL_REVIEW_REQUIRED` action tag).

**Fee metadata**: Single field addition to existing `payments.metadata` JSON write at `appointments.ts:1186`.

**Unhandled event warnings**: One `default:` / `else` branch per webhook file.

**Why chosen**: Proportionate to current scale. Console logging is v1 observability — sufficient until volume justifies persistence tables or automated remediation.

### Shape B — `transferEvents` persistence table (REJECTED)

New table storing transfer outcomes with appointment FK. Enables reconciliation queries, reporting, dashboards.

**Why rejected**: Premature. Console logging provides v1 observability. The table is justified when reconciliation/reporting features are built — the console logs will tell us when that moment arrives (volume of manual reviews from console.error).

### Shape C — Split dedup tables (REJECTED)

Separate `processedStripeEvents` tables per webhook to prevent cross-endpoint event shadowing.

**Why rejected**: Shared idempotency is architecturally correct. Separate tables would allow double-processing of misconfigured events — a different but equally bad failure. The actual risk is config hygiene, addressed by R4/R5 (console.warn for unhandled types).

### Shape D — Merchant notification email on transfer failure (REJECTED)

Email or SMS to merchant when their transfer fails.

**Why rejected**: "Build when a second notification use case appears" — disputes now provide that second use case, but the notification infrastructure ships with the disputes issue, not this one. This feature establishes the detection signal that notifications will consume.

## Fit Check

| Req | Shape A | Shape B | Shape C | Shape D |
|-----|---------|---------|---------|---------|
| R0 | ✅ Lookup helper | ✅ Same | ✅ Same | ✅ Same |
| R1 | ✅ console.info | ✅ DB insert | ✅ Same | ✅ Same |
| R2 | ✅ console.error | ✅ DB + alert | ✅ Same | ✅ Email |
| R3 | ✅ metadata field | ✅ Same | ✅ Same | ✅ Same |
| R4/R5 | ✅ console.warn | ✅ Same | ⚠️ Redundant | ✅ Same |
| Complexity | ~80 LOC | ~200 LOC + migration | ~100 LOC + migration | ~200 LOC + email template |
| Reversibility | Full (delete code) | Medium (migration) | Medium (migration) | Full |
| Time | ~2 hours | ~5 hours | ~3 hours | ~4 hours |

Shape A wins on speed, simplicity, and reversibility. It provides the detection signals that Shapes B and D would consume — build the foundation first.

## Architecture mapping

- **Existing pattern**: Both webhooks use identical dedup-first, event-type-dispatch structure. New handlers slot into the existing `if/else` chain.
- **Stripe SDK**: Already initialized in both webhook files. `stripe.charges.retrieve()` is a standard API call.
- **payments.metadata**: JSON column already stores `connectedAccountId`. Adding `applicationFeeAmountCents` is a field addition, not a schema change.
- **No schema changes**: Zero migrations. Zero new tables. Zero new columns.

## Signals from prior runs

- **spike-before-shape**: Spikes pre-resolved via agent codebase analysis (code structure, line numbers, existing patterns all confirmed).
- **no-component-test-infra**: Test specs (08-10) should target logic, not rendering — no UI in this feature, so the friction signal doesn't apply here.
- **parallel-wave-implementation**: Applicable to Wave 1 (3 independent files). Waves 2-3 have connect-webhook contention — see slices doc for sequencing decision.

## Cross-dependencies (downstream)

| Downstream issue | Depends on | Why |
|---|---|---|
| In-flight payments during Connect suspension (P2, P3) | Specs 02, 03 | Transfer status signals enable detection guard and suspension sweep |
| Disputes (P2) | Spec 07 | Should bundle transfer + dispute event registration in same Stripe Dashboard session |
| Disputes (P3) | This feature's existence | Disputes email = second notification use case that justifies notification infrastructure |

## Analysis reference

Mental models report (12 models, all converge) at `mcp-go/Mental Models/WorkSpace/26-06-30_12-07-52_webhook_transfer_awareness/analysis-report.md`.
