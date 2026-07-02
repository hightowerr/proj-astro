- Date: 2026-07-01
- Feature: refund-state (all waves)

## Divergences

### 1. Added `north_east` icon to non-refunded helper text
- Spec: 04-refunded-helper-text says "Swap icon from `north_east` → `undo`" — implies icon already existed
- What diverged: Original code had no icon on the helper text (`<p>Payout routed to your connected bank account.</p>`). Implementation added `north_east` icon to non-refunded state AND `undo` icon to refunded state.
- Classification: EVOLUTION
- Why: Design prototype shows the icon in both states. Implementation matches the design, which is the source of truth for visual output. The spec assumed the icon pre-existed.

### 2. Exported `determineFeeState` + `FeeState` type
- Spec: No spec mentions exports
- What diverged: `determineFeeState` and `FeeState` changed from internal to exported for testability
- Classification: EVOLUTION
- Why: Enables unit tests without rendering infrastructure. No downstream consumers affected (only imported by test file).

### 3. Rendering tests not implemented (Specs 08, 09, 10)
- Spec: 21 rendering test cases across 3 specs
- What diverged: 0 rendering tests implemented. 11 logic tests substituted (7 determineFeeState + 4 refunded derivation).
- Classification: SHORTCUT
- Why: Project has no component test infrastructure (@testing-library/react, jsdom). Implementer logged friction signal. Visual verification deferred to Phase 3 Playwright (blocked by empty DB).

### 4. Spec 09 test cases 7-8 removed (impossible states)
- Spec: "skipped+refunded" and "policy+refunded" test cases
- What diverged: Verifier identified these as domain-impossible states — skipped/policy only occur when no payment exists. Removed from spec.
- Classification: EVOLUTION
- Why: The spec assumed refund could co-occur with any fee state. In reality, `determineFeeState` returns skipped/policy only when `amountCents` is null, which means no payment and therefore no refund.

### 5. Spec 10 test case 5 describes impossible state
- Spec: "`financialOutcome: undefined` → original display"
- What diverged: `financialOutcome` type is `string` (not optional), schema column is `notNull` with default `"unresolved"`. `undefined` cannot flow in.
- Classification: EVOLUTION
- Why: Spec was overly defensive about a state the type system prevents.

## Quality ratchet

| Type | Count |
|------|-------|
| EVOLUTION | 4 |
| SHORTCUT | 1 |
| **Ratio** | **80% evolution / 20% shortcut** |

Shortcut rate (20%) is below the 50% threshold. The single shortcut (missing rendering tests) is an infrastructure gap, not a code quality issue.
