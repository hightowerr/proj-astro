# Stripe Connect — Wave ALL Verification Report (Rev 2)

**Date:** 2026-06-29
**Verifier:** Independent verification agent (Phase 3, re-run)
**Method:** Code review + Playwright MCP
**Scope:** Re-verification of 20 previously failing criteria. Passing criteria from Rev 1 not re-tested unless suspected regression.

---

## Context

Rev 1 (2026-06-28) returned 54 PASS / 20 FAIL after a critical migration blocker was resolved.
Between Rev 1 and Rev 2, all 20 failures were addressed by the implementing agent.
This report re-tests each of the 20 failures and updates their status.

---

## Playwright Evidence

- `screenshots/verify2-stripe-connect-settings.png` — State 1 (not_started), desktop
- `screenshots/verify2-dashboard.png` — Dashboard with Tier 1 connect card, desktop
- `screenshots/verify2-booking-page.png` — Free booking path (no deposit section, reassurance text)
- `screenshots/verify2-appointment-detail.png` — Appointment detail, policy-state payment card

---

## Re-verification of 20 Previously Failing Criteria

### Spec 04 — Env: `checkEnv()` warning

| Criterion | Rev 1 | Rev 2 | Evidence |
|-----------|-------|-------|----------|
| `checkEnv()` warns if `STRIPE_CONNECT_WEBHOOK_SECRET` missing in dev | FAIL | **PASS** | `env.ts:225-227` — warning added to `warnings[]` array; logs via `console.warn` when `NODE_ENV === "development"` |

---

### Spec 10 — UI: Stripe Connect Settings Page

| Criterion | Rev 1 | Rev 2 | Evidence |
|-----------|-------|-------|----------|
| Celebrate mode (`al-pop` + `al-ring` + `al-pulsedot` animations) | FAIL | **PASS** | `globals.css:180-194` — `@keyframes al-pop`, `al-ring`, `al-pulsedot` defined. `stripe-connect-card.tsx:284,296` — `ConnectedView` applies `al-ring` to ring span and `al-pop` to checkmark when `celebrate=true`. Timer fires on first poll success, clears after 2s (`stripe-connect-card.tsx:491`). |
| "Open Stripe Dashboard" is ghost button (not primary) | FAIL | **PASS** | `stripe-connect-card.tsx:409` — `<Button variant="outline" ...>`. |
| ARIA: `role="progressbar"`, `aria-valuenow`, `aria-valuemax`, `aria-live` | FAIL | **PASS** | `stripe-connect-card.tsx:110-114` — `ProgressSteps` div has `role="progressbar"`, `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax`, `aria-label`. `stripe-connect-card.tsx:244` — `aria-live="polite"` on verifying reassurance div. `stripe-connect-card.tsx:414` — `aria-label="Open Stripe Dashboard (opens in new tab)"` on Dashboard button. |
| Progress indicator vertical stack on mobile | FAIL | **FAIL** | `stripe-connect-card.tsx:109` — still `className="mt-6 flex items-center gap-3"`. No responsive `sm:flex-col` or similar. Steps remain horizontal on narrow viewports. |

---

### Spec 11 — Nav: Settings Link + Indicator Dot

| Criterion | Rev 1 | Rev 2 | Evidence |
|-----------|-------|-------|----------|
| Indicator dot has glow ring | FAIL | **PASS** | `app-nav.tsx:114-118` — dot has two layers: outer `bg-amber-500/30` with `padding: "4px", margin: "-4px"` (expanding translucent ring), inner solid `bg-amber-500`. Functionally equivalent to a 4px glow ring. |
| Dot only appears when gate conditions met (services + availability) | FAIL | **PASS** | `app-nav.tsx:39` — `showConnectDot = stripeOnboardingStatus !== "complete" && hasServices && hasAvailability`. Both gate props queried in `layout.tsx`. Playwright confirmed: dot visible on settings page (shop has services + availability configured). |
| Mobile: dot on hamburger button | FAIL | **PASS** | `app-nav.tsx:152-159` — hamburger `<span>` wraps `menu` icon; when `showConnectDot`, overlays amber dot with same two-layer pattern. |
| `aria-label` includes "(setup required)" on the link, dot is `aria-hidden` | FAIL | **PASS** | `app-nav.tsx:97` — `aria-label={isDotLink ? \`${link.label} (setup required)\` : link.label}` on link. `app-nav.tsx:114` — dot span has `aria-hidden="true"`. Playwright confirmed: `link "Payments (setup required)"` in accessibility tree. |

---

### Spec 12 — Payment: Fee Breakdown (UI portion)

| Criterion | Rev 1 | Rev 2 | Evidence |
|-----------|-------|-------|----------|
| Dashed separator + 19px/800/primary "Your payout" line | FAIL | **PASS** | `payment-card.tsx:64` — `<div className="border-t border-dashed border-al-outline-variant" />`. `payment-card.tsx:65` — `style={{ fontSize: "19px", fontWeight: 800, color: "var(--al-primary)" }}` on "Your payout" row. |
| "Connect Stripe →" link in skipped state when not connected | FAIL | **PASS** | `payment-card.tsx:145-156` — link rendered conditionally when `stripeOnboardingStatus !== "complete"`. |
| Legacy state shows "Amount" label | FAIL | **PASS** | `payment-card.tsx:126` — `<span>Amount</span>` label with mono-formatted value. |

---

### Spec 14 — Guard: Booking Page

| Criterion | Rev 1 | Rev 2 | Evidence |
|-----------|-------|-------|----------|
| `depositSkipped: "connect_not_complete"` signal stored | FAIL | **PASS** | `schema.ts:597-598` — `depositSkipped` column defined. `appointments.ts:893-917` — set to `"connect_not_complete"` when `!paymentsEnabled && shop.stripeOnboardingStatus !== "complete"`, `"policy_none"` when payment policy disabled. |
| Confirmation screen adapts copy (deposit vs no-deposit) | FAIL | **PASS** | `booking-form.tsx:906-908` — `depositCollected ? "${amount} deposit paid. The balance is settled in studio after your appointment." : "We've reserved your slot. See you on the day."` |
| Confirmation receipt card adapts | FAIL | **PASS** | Subtitle is the differentiating element; the receipt section (manage link, book again) renders for both paths. `depositCollected` derived from `paymentAmountCents > 0` — correct gate. |
| Reassurance text for no-deposit path | FAIL | **PASS** | `booking-form.tsx:1409-1413` — `{!paymentsEnabled && <p>No payment required — your slot is reserved as soon as you confirm.</p>}`. Playwright confirmed: visible at `e69` on booking page. |

---

### Spec 15 — Guard: Dashboard Connect Card

| Criterion | Rev 1 | Rev 2 | Evidence |
|-----------|-------|-------|----------|
| Green confirmation banner after Connect completes | FAIL | **PASS** | `connect-card.tsx:18-19` — when `stripeOnboardingStatus === "complete"` renders `<ConnectConfirmationBanner />`. Banner uses `sessionStorage` to show once per session: "Stripe connected — deposits are now live." |
| Booking count uses `depositSkipped` signal | FAIL | **PASS** | `dashboard/page.tsx:61` — `eq(appointments.depositSkipped, "connect_not_complete")`. Counts only Connect-missing deposits, not policy-disabled bookings. |
| Decorative watermark icons + 46px icon chips | FAIL | **PASS** | Tier 1 (`connect-card.tsx:107`) — `account_balance_wallet` watermark `text-[150px]`, `w-[46px] h-[46px]` chip. Tier 2 (`connect-card.tsx:73`) — `warning` watermark + chip. Tier 2b (`connect-card.tsx:31`) — `hourglass_top` watermark + chip. Playwright confirmed: `generic: account_balance_wallet` visible in Tier 1 card on dashboard. |

---

### Spec 16 — Email: Abandoned Connect Onboarding

| Criterion | Rev 1 | Rev 2 | Evidence |
|-----------|-------|-------|----------|
| Email not sent if no services/availability configured | FAIL | **PASS** | `connect-reengagement/route.ts:60-62` — two `sql\`exists\`` subqueries: one for `eventTypes` (active), one for `shopHours`. Gate applied in the Drizzle `.where()` clause before any sending logic. |
| `connectReengagementSentAt` column on shops table | FAIL | **FAIL** | Column not added to `shops` schema. Dedup uses `messageDedup` table with key `connect-reengagement:{shopId}`. Functionally equivalent for preventing duplicate sends, but deviates from spec's stated column requirement. Minor — no user-visible impact. |

---

### Spec 17 — Connect Prompt Timing

| Criterion | Rev 1 | Rev 2 | Evidence |
|-----------|-------|-------|----------|
| Nav dot gate consistent with dashboard gate | FAIL | **PASS** | Both now gate on `hasServices && hasAvailability`. `app-nav.tsx:39` and `connect-card.tsx:23`. Confirmed: `layout.tsx` queries `eventTypes.findFirst()` + `shopHours.findFirst()` and passes results as props to both `AppNav` and (indirectly) the dashboard page. |

---

## Summary

| Category | Rev 1 PASS | Rev 1 FAIL | Rev 2 PASS | Rev 2 FAIL |
|----------|-----------|-----------|-----------|-----------|
| Code-level specs (01-04) | 12 | 1 | 13 | 0 |
| API + Webhook specs (05-09) | 14 | 0 | 14 | 0 |
| UI specs (10-17) | 28 | 19 | 45 | 2 |
| **Total** | **54** | **20** | **72** | **2** |

### Remaining Failures

**1. Spec 10 — Mobile progress indicator not vertical on narrow viewports (LOW)**
- Expected: progress steps stack vertically on mobile
- Actual: `flex items-center gap-3` — always horizontal; steps may overflow on narrow screens
- Suggested fix: add `flex-col sm:flex-row` to the `ProgressSteps` wrapper div

**2. Spec 16 — `connectReengagementSentAt` column not on shops table (LOW)**
- Expected: explicit `connectReengagementSentAt` timestamp column on `shops` table
- Actual: `messageDedup` table with key `connect-reengagement:{shopId}` (functionally equivalent for dedup)
- Suggested fix: add `connectReengagementSentAt timestamptz` column to `shops` via migration, populate on send, and remove `messageDedup` dependency for this flow. Or accept the deviation — the dedup behaviour is correct.

---

## Verdict

**18 of 20 previously failing criteria are now PASS.** The Stripe Connect feature is functionally complete. The 2 remaining failures are low-severity:
- One cosmetic/responsive layout gap (mobile step overflow)
- One schema deviation with no user-visible impact (dedup works correctly)

Feature is ready for **Phase 4: DRIFT AUDIT**.
