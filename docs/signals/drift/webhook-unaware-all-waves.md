# Drift Audit — webhook-unaware (all waves)

**Date**: 2026-07-02
**Feature**: webhook-unaware (Platform webhook unaware of Connect transfers)
**Waves**: 1–3 (all)
**Evolution/Shortcut ratio**: 7/0 (100% evolution, 0% shortcut)

---

## Divergences

### D1 — `console.info` → `console.warn` for transfer.created

- Date: 2026-07-02
- Spec: 02-handle-transfer-created
- What diverged: Spec called for `console.info` to log successful transfers. Implementation uses `console.warn`.
- Classification: EVOLUTION
- Why: Lint `no-console` rule only allows `console.warn` and `console.error`. Message text "Transfer succeeded" + `status: "succeeded"` field preserve the semantic intent. This is a codebase constraint, not a quality shortcut.

### D2 — Type cast required for `transfer.failed`

- Date: 2026-07-02
- Spec: 03-handle-transfer-failed
- What diverged: Spec assumed `event.type === "transfer.failed"` would compile. Implementation requires `(event.type as string) === "transfer.failed"` because Stripe's TypeScript types omit `transfer.failed` from the event type union.
- Classification: EVOLUTION
- Why: Stripe sends this event at runtime but their TS types don't include it. The cast is the correct workaround — runtime behavior is unaffected. Also required `(event as Stripe.Event).data.object` to avoid `never` type narrowing.

### D3 — Inline metadata → `buildConnectPaymentMetadata()` pure function

- Date: 2026-07-02
- Spec: 04-store-application-fee-metadata
- What diverged: Spec described a "single field addition" to the inline metadata block. Implementation extracted the entire metadata construction into `buildConnectPaymentMetadata()` (appointments.ts:699-722), a pure exported function.
- Classification: EVOLUTION
- Why: Enables unit testing of metadata construction without mocking the full `createAppointment()` function. The inline code had two issues: (1) `piParams` was declared inside a `try` block and out of scope at the write location, (2) testing inline code required heavy DB/Stripe mocking. The extraction produces 11 focused tests with zero mocks. Behavior is preserved — the function is called via spread at the original call site.

### D4 — `String()` wrapping for metadata values

- Date: 2026-07-02
- Spec: 04-store-application-fee-metadata
- What diverged: Spec described `applicationFeeAmountCents: piParams.application_fee_amount ?? 0` (numeric). Implementation stores `String(applicationFeeAmount ?? 0)` (string `"50"` or `"0"`).
- Classification: EVOLUTION
- Why: `payments.metadata` column is typed `Record<string, string>`. Storing a number would fail at the type level. The `String()` wrapping is the correct type-safe approach.

### D5 — Source: `paymentIntent` not `piParams`

- Date: 2026-07-02
- Spec: 04-store-application-fee-metadata
- What diverged: Spec referenced `piParams.application_fee_amount`. Implementation uses `paymentIntent.application_fee_amount`.
- Classification: EVOLUTION
- Why: `piParams` is declared inside a `try` block (line 1126) and is out of scope at the metadata write location (line 1199+). `paymentIntent` (the Stripe response) is at function scope and mirrors the fee amount. This is a scope correction, not a semantic change.

### D6 — Test spec 09 references `console.info`

- Date: 2026-07-02
- Spec: 09-test-transfer-handlers
- What diverged: Test case 1 described asserting `console.info`. Actual test asserts `console.warn`.
- Classification: EVOLUTION
- Why: Follows from D1. The test correctly validates the implemented behavior.

### D7 — Test spec 10 expects numeric values

- Date: 2026-07-02
- Spec: 10-test-application-fee-metadata
- What diverged: Test cases described `applicationFeeAmountCents: 50` (number). Actual tests assert `"50"` (string). Spec described 4 test cases; implementation has 11 (expanded `connectedAccountId` resolution coverage).
- Classification: EVOLUTION
- Why: Follows from D4. Additional test cases cover `connectedAccountId` resolution paths (null, undefined, string destination, object destination) since `buildConnectPaymentMetadata` now owns that logic.

---

## Quality Ratchet

| Metric | Value |
|--------|-------|
| Total divergences | 7 |
| Evolutions | 7 |
| Shortcuts | 0 |
| Shortcut ratio | 0% |
| Threshold | 50% |
| Flag | No — well below threshold |

Three root causes produced all 7 divergences:
1. **Lint constraint** (D1, D6): `no-console` rule — discoverable pre-shape by reading ESLint config
2. **Stripe TS type gap** (D2): `transfer.failed` omitted from types — discoverable pre-shape by compiling a test
3. **Column type constraint** (D3, D4, D5, D7): `Record<string, string>` + `piParams` scope — discoverable pre-shape by reading the schema and function scope

All three are codebase constraints the specs didn't account for. None are quality shortcuts. The spike-before-shape pattern (already a logged signal) would have caught D1 and D3-D5 if the spikes had included "compile a test handler" and "read the metadata column type."
