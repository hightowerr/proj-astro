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
| Payouts status dot | ConnectedView, "Payouts enabled" row | Always green dot + "Active" | Conditional: green/"Active" when true, neutral dot (`--al-outline-variant`) + "Verifying" when false | Existing row pattern, same structure |
| Info box | ConnectedView, below account details card | None | Info box when `payoutsEnabled=false` | Exact clone of VerifyingView info box (lines 243-261) |

### Pages / Components Impacted

| Page/Component | Route | Change type |
|----------------|-------|-------------|
| `StripeConnectCard` (ConnectedView) | `/app/settings/stripe-connect` | Conditional rendering (status row + info box) |
| `StripeConnectPage` (server component) | `/app/settings/stripe-connect` | New Stripe API call, new prop |

### What the Designer Needs to Review

1. **Neutral dot color for "Verifying" state** — spec proposes `var(--al-outline-variant)` for the dot and `var(--al-on-surface-variant)` for the text. Confirm this reads as "in progress" not "broken" or "missing."
2. **Info box placement** — sits between the account details card and the "Open Stripe Dashboard" button. Confirm spacing and visual weight are appropriate.
3. **No mockup needed for the green/Active state** — it's identical to the current hardcoded display.
4. **No new icons, colors, or typography** — everything uses existing design tokens and the VerifyingView info box pattern.

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

1. **ConnectedView info box pattern**: Document that `ConnectedView` now supports a conditional info box (same pattern as `VerifyingView`). This establishes a reusable pattern: when a connected account has a non-error process state to communicate, use the `rounded-xl p-4` info box with `--al-surface-container-low` background, `info` icon in `--al-primary`, text in `--al-on-surface-variant`.

### `docs/context/progress-tracker.md`

1. Update to reflect the payouts-not-surfaced fix is complete (after implementation).

### No changes needed to

- `docs/context/code-standards.md` — no new conventions introduced
- `docs/context/project-overview.md` — no scope or feature changes
- `docs/context/ai-workflow-rules.md` — no workflow changes
