# Payouts Not Surfaced — Build Order

## Dependency Graph

```
P1 (Page prop)
 ├──► P2 (Component conditional)
 │     └──► P3 (Info line)
 └──────────► P3 (Info line)
```

P1 is the foundation — it completes the data path from Stripe API to the component.
P2 and P3 both consume the prop. P3 also depends on P2 because the info box sits below the status row that P2 modifies, and P3 assumes the `payoutsEnabled` prop threading that P2 introduces to `ConnectedView`.

---

## Phased Build Order

### Phase 1 — Data path

| Spec | File(s) | What | Deps |
|------|---------|------|------|
| P1 — Page prop | `stripe-connect/page.tsx` | Server-side `stripe.accounts.retrieve()`, pass `payoutsEnabled` prop | None |

### Phase 2 — UI conditional + info line

| Spec | File(s) | What | Deps |
|------|---------|------|------|
| P2 — Component conditional | `stripe-connect-card.tsx` | Add `payoutsEnabled` prop, conditional status row | P1 |
| P3 — Info line | `stripe-connect-card.tsx` | Info box when `payoutsEnabled=false` | P1, P2 |

> P2 and P3 are in the same phase because they both touch `ConnectedView` in `stripe-connect-card.tsx`. In practice, implement P2 first (prop + status row), then P3 (info box) sequentially within Phase 2. They cannot truly run in parallel since they modify the same component.

---

## Critical Path

```
P1 (Page prop) → P2 (Component conditional) → P3 (Info line)
```

**Length: 3 specs, 2 phases.** This is a tight, linear chain — every spec depends on its predecessor. No parallelism opportunity exists because all three specs form a single data-path completion.

---

## Design Brief

### Overview

This is a **data-driven status correction**, not a new UI pattern. The visual change is minimal — one status row becomes conditional, one info box appears conditionally. All patterns already exist in the component.

### Design Changes Required

| Change | Location | Current | Proposed | Pattern source |
|--------|----------|---------|----------|----------------|
| Payouts status row | ConnectedView, "Payouts enabled" row | Always green dot + "Payouts enabled" | Conditional: green dot + "Payouts enabled" (`--al-on-surface`) when true, neutral dot (`--al-outline-variant`) + "Payouts verifying" (`--al-on-surface-variant`) when false | Existing row pattern, same structure |
| Info box | ConnectedView, below account details card | None | Info box when `payoutsEnabled=false` | Design prototype style (differs from VerifyingView): `--al-surface-container` bg, `--al-on-surface-variant` icon (20px), `14px 16px` padding, `11px` gap |

### Pages / Components Impacted

| Page/Component | Route | Change type |
|----------------|-------|-------------|
| `StripeConnectCard` (ConnectedView) | `/app/settings/stripe-connect` | Conditional rendering (status row + info box) |
| `StripeConnectPage` (server component) | `/app/settings/stripe-connect` | New Stripe API call, new prop |

### What the Designer Needs to Review

1. **Design prototype reviewed** — `Payments Stripe Connect.html` provides the exact connected-state payouts UI with interactive state toggling ("Payouts verifying" tab). All tokens and copy confirmed from prototype.
2. **Info box placement** — sits between the account details card and the "Open Stripe Dashboard" button, with `margin-top: 16px`.
3. **No mockup needed for the green/Active state** — it's identical to the current hardcoded display.
4. **Info box differs from VerifyingView** — intentionally uses `--al-surface-container` (not `-low`) and `--al-on-surface-variant` icon (not `--al-primary`). The connected-state info box is subtler.

### What Does NOT Change

- Celebrate copy ("You're all set!")
- StartView promises ("deposits go straight to your bank account")
- Charges enabled row (always green/Active in connected state)
- Payment card footer copy
- Any other page or component

---

## Architecture Context Updates Needed

These updates should be applied to `docs/context/` files **during Phase 5 (RETRO)** of the feature loop, not before implementation.

### `docs/context/architecture-context.md`

1. **Stripe data-fetching pattern on settings page**: Document that `stripe-connect/page.tsx` now makes a server-side `stripe.accounts.retrieve()` call on every load. This is a new pattern — previously the page only read from the DB (`getShopByOwnerId`). Future settings page features that need live Stripe data should follow this pattern rather than adding DB columns for ephemeral Stripe state.

2. **Invariant: No DB persistence for volatile Stripe account flags**: `payouts_enabled` is not stored in the `shops` table. Document the principle: Stripe account flags that change without merchant action (e.g., `payouts_enabled`, `capabilities`) should be fetched live, not persisted. Only `stripeOnboardingStatus` (which represents a lifecycle stage) is persisted.

### `docs/context/ui-context.md`

1. **ConnectedView info box pattern**: Document that `ConnectedView` now supports a conditional info box. Style differs from VerifyingView: `--al-surface-container` background, `--al-on-surface-variant` icon, `14px 16px` padding. This subtler variant is appropriate for non-error process states in an otherwise-connected context.

### `docs/context/progress-tracker.md`

1. Update to reflect the payouts-not-surfaced fix is complete (after implementation).

### No changes needed to

- `docs/context/code-standards.md` — no new conventions introduced
- `docs/context/project-overview.md` — no scope or feature changes
- `docs/context/ai-workflow-rules.md` — no workflow changes
