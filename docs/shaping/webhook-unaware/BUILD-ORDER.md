# Webhook Transfer Awareness — Build Order

## Dependency Graph

```
01-transfer-context-lookup ──────┬─→ 02-handle-transfer-created ──┬─→ 06-warn-unhandled-connect ─┐
                                 │                                 │                              │
                                 ├─→ 03-handle-transfer-failed ───┤─→ 07-register-events-stripe  │
                                 │                                 │                              │
                                 └─→ 08-test-lookup ──────────────┼─→ 09-test-transfer-handlers ─┘
                                                                   │
04-store-app-fee-metadata ────────────────────────────────────────→ 10-test-fee-metadata
                                                                   │
05-warn-unhandled-platform ────────────────────────────────────────┘
```

## Phased Build Order

### Phase 1 — Foundations (no dependencies, all parallel)

| Spec | Title | Deps | Priority | File |
|------|-------|------|----------|------|
| 01 | Transfer context lookup helper | None | P1 | `src/lib/stripe-utils.ts` (new) |
| 04 | Store `applicationFeeAmountCents` in metadata | None | P2 | `queries/appointments.ts:1186` |
| 05 | `console.warn` unhandled — platform webhook | None | P3 | `webhook/route.ts:~263` |

### Phase 2 — Core handlers + foundation tests (depends on Phase 1)

| Spec | Title | Deps | Priority | File |
|------|-------|------|----------|------|
| 02 | Handle `transfer.created` | 01 | P1 | `connect-webhook/route.ts:~86` |
| 03 | Handle `transfer.failed` | 01 | P1 | `connect-webhook/route.ts:~86` |
| 08 | Test transfer context lookup | 01 | P1 | test file |
| 10 | Test application fee metadata | 04 | P2 | test file |

### Phase 3 — Safety nets + handler tests + ops (depends on Phase 2)

| Spec | Title | Deps | Priority | File |
|------|-------|------|----------|------|
| 06 | `console.warn` unhandled — connect webhook | 02, 03 | P3 | `connect-webhook/route.ts` |
| 07 | Register transfer events in Stripe Dashboard | 02, 03 (deployed) | P1 | Stripe Dashboard (ops) |
| 09 | Test transfer event handlers | 02, 03, 08 | P1 | test file |

## Critical Path

```
01-transfer-context-lookup → 02-handle-transfer-created → 09-test-transfer-handlers
```

**Length**: 3 specs across 3 phases. All other work fans out in parallel around this spine.

## Cross-Dependencies (external)

- **Downstream**: "In-flight payments during Connect suspension" P2 + P3 depend on this issue's P1 (specs 02/03) — transfer status signals enable the detection guard and suspension sweep
- **Downstream**: "Disputes" P2 (subscribe to `charge.dispute.created`) should bundle with spec 07 — same Stripe Dashboard config session
- **Lateral**: Spec 05 is also tracked as a standalone current-issues item ("Webhook event type misconfiguration can silently drop events")
