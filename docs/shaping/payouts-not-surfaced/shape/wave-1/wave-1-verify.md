# Wave 1 Verification Report — Payouts Not Surfaced

**Verifier:** Independent agent (no access to implementing agent's reasoning)
**Date:** 2026-07-16
**Method:** Static code review + Playwright browser testing
**Build check:** `pnpm check` (lint + typecheck) — PASS

---

## Environment Notes

- Dev server running at `localhost:3000`
- No Stripe Connect accounts exist in the test database
- Stripe Connect is not enabled on the platform's Stripe account (`sk_test_...`), so connected accounts cannot be created via API
- **Connected-state visual tests are BLOCKED** — only the pre-connect state could be verified via Playwright. All connected-state criteria verified via code review.

---

## P1 — Pass payoutsEnabled prop from server page to component

**File:** `src/app/app/settings/stripe-connect/page.tsx`

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `StripeConnectCard` receives a `payoutsEnabled` boolean prop | PASS | `page.tsx:37` passes `payoutsEnabled={payoutsEnabled}`. `stripe-connect-card.tsx:13` declares `payoutsEnabled?: boolean` in `StripeConnectCardProps`. |
| 2 | When `payouts_enabled` is `false` on Stripe account, prop value is `false` | PASS | `page.tsx:19`: `payoutsEnabled = account.payouts_enabled ?? true` — when Stripe returns `false`, the `??` operator passes `false` through (only coalesces `null`/`undefined`). |
| 3 | When `payouts_enabled` is `true` (or no account exists), prop value is `true` | PASS | `page.tsx:15`: `let payoutsEnabled = true` (default). `page.tsx:16-19`: only overridden when `shop.stripeAccountId` exists. When Stripe returns `true`, `?? true` passes it through. |
| 4 | No regression to existing page behavior (redirect, auth, layout) | PASS | Playwright: navigated to `/app/settings/stripe-connect` without auth → redirected to `/login`. Navigated with auth but no shop → redirected to `/app`. Created shop, navigated → page renders StartView correctly. Screenshot: `verify-stripe-connect-preconnect.png`. Auth guard, shop guard, and layout all intact. |

---

## P2 — Data-driven payouts status row in ConnectedView

**File:** `src/components/settings/stripe-connect-card.tsx`

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `payoutsEnabled=true`: green dot (`--al-status-positive`) + "Payouts enabled" in `--al-on-surface` | PASS (code) | `stripe-connect-card.tsx:392-394`: `background: payoutsEnabled ? "var(--al-status-positive)" : ...`. `tsx:401-403`: `color: payoutsEnabled ? "var(--al-on-surface)" : ...`. `tsx:406`: `payoutsEnabled ? "Payouts enabled" : ...`. All tokens match spec exactly. |
| 2 | `payoutsEnabled=false`: neutral dot (`--al-outline-variant`) + "Payouts verifying" in `--al-on-surface-variant` | PASS (code) | `tsx:394`: `"var(--al-outline-variant)"`. `tsx:403`: `"var(--al-on-surface-variant)"`. `tsx:406`: `"Payouts verifying"`. All tokens match spec exactly. |
| 3 | Prop defaults to `true` — no visual regression if prop is omitted | PASS | `tsx:272`: `payoutsEnabled = true` default in `ConnectedView`. `tsx:582`: `payoutsEnabled = true` default in `StripeConnectCard`. Both levels default to `true`. |
| 4 | No changes to Charges enabled row or any other row | PASS (code) | `tsx:359-379`: Charges enabled row is identical to prior implementation — hardcoded green dot + "Active". Platform fee row (`tsx:411-424`) and Account row (`tsx:344-357`) also unchanged. |

---

## P3 — Payouts verifying info box in ConnectedView

**File:** `src/components/settings/stripe-connect-card.tsx`

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `payoutsEnabled=false`: info box appears below account details, above Dashboard button | PASS (code) | `tsx:427-460`: `{!payoutsEnabled && (...)}` renders conditionally. Position: after account details div (ends `tsx:425`), before Dashboard button (`tsx:462`). |
| 2 | `payoutsEnabled=true`: info box does not render | PASS (code) | `tsx:427`: `{!payoutsEnabled && (...)}` — when `true`, the block does not render. |
| 3 | Info box uses `var(--al-surface-container)` background, `var(--al-on-surface-variant)` icon and text | PASS (code) | `tsx:431`: `background: "var(--al-surface-container)"`. `tsx:442`: icon `color: "var(--al-on-surface-variant)"`. `tsx:452`: text `color: "var(--al-on-surface-variant)"`. |
| 4 | Copy matches spec exactly | PASS (code) | `tsx:456-457`: "Stripe is verifying your payout details — this usually takes a few minutes. You can still accept deposits in the meantime." — character-for-character match with spec (including em dash). |
| 5 | Box has `aria-live="polite"` | PASS (code) | `tsx:436`: `aria-live="polite"` present on container div. |
| 6 | Celebrate state ("You're all set!") is unchanged | PASS (code) | `tsx:323-337`: Celebrate conditional renders "You're all set! Deposits are now enabled on your booking page." — unchanged from prior implementation. |

### P3 — Additional design spec checks

| Detail | Spec | Actual | Match |
|--------|------|--------|-------|
| Container class | `rounded-xl` | `className="flex items-start rounded-xl"` | YES |
| Padding | `14px 16px` | `padding: "14px 16px"` | YES |
| Gap | `11px` | `gap: "11px"` | YES |
| Margin-top | `16px` | `marginTop: "16px"` | YES |
| Icon | `info` material symbol, 20px | `material-symbols-outlined`, `fontSize: "20px"`, children: `info` | YES |
| Text font-size | `13.5px` | `fontSize: "13.5px"` | YES |
| Text line-height | `1.55` | `lineHeight: "1.55"` | YES |

---

## Summary

| Slice | Total Criteria | PASS | FAIL | BLOCKED |
|-------|----------------|------|------|---------|
| P1 — Page prop | 4 | 4 | 0 | 0 |
| P2 — Component conditional | 4 | 4 | 0 | 0 |
| P3 — Info line | 6 | 6 | 0 | 0 |
| **Total** | **14** | **14** | **0** | **0** |

### Verification method breakdown

- **4 criteria** verified via Playwright browser testing (pre-connect state, auth/redirect guards)
- **10 criteria** verified via static code review (connected-state UI conditional logic)
- **0 criteria** verified via connected-state browser testing (BLOCKED — no Stripe Connect account available)

### Risk note

All connected-state criteria (P2 #1-2, P3 #1-6) were verified by code review only. The code is straightforward conditional rendering with no complex logic, so confidence is high. However, a full visual verification would require either:
1. A Stripe account with Connect enabled to create test connected accounts, or
2. A component-level test (Storybook/test harness) that renders `ConnectedView` with explicit `payoutsEnabled` prop values

### Build checks

- `pnpm check` (ESLint + TypeScript): **PASS** — zero errors, zero warnings
