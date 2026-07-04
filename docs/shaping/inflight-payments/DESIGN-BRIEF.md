# In-Flight Payments — Design Brief

## Status: Designed

Design files:
- `Appointment Fee Breakdown.html` — interactive prototype with tab switcher (includes "Held" tab)
- `Dashboard Connect Card.html` — interactive prototype with held transfers card (toggle: None / 1 held / 3 held)

## Context

Race condition: if a merchant's Stripe Connect account is suspended while a customer has a live checkout, the platform charge succeeds but the automatic transfer to the merchant fails. The customer's money is stuck on the platform. Three UI surfaces need design work to make this state visible and actionable.

---

## Design 1: Transfer Held Card State (Specs 04 + 05)

### Page
`/app/appointments/[id]` — Appointment detail page

### Component
`PaymentCard` → `FeeBreakdown` (internal child)
File: `src/components/appointments/payment-card.tsx`

### What to design
Two variants of the fee breakdown area showing the "transfer held" modifier. Same card structure as existing payment card — this is a modifier on top of `FeeState`, not a new card type. Follows the same pattern as the refund state modifier (see `docs/shaping/refund-state/DESIGN-BRIEF.md`).

---

#### Variant 1: Connect + Transfer Held

**Current state (normal connect payment):**
```
Deposit          £10.00
Platform fee     −£0.50
Your payout      £9.50
↗ Payout routed to your connected bank account.
```

**Transfer held state:**
```
Deposit          £10.00
Platform fee     −£0.50
Your payout      Held
⏸ Payment received but transfer paused — Stripe is reviewing your account.
```

- Deposit line unchanged (customer was charged, that succeeded)
- Platform fee unchanged (fee was calculated, just not collected yet)
- Payout: amount replaced with "Held" label (amber/warning colour, same position as amount)
- Helper text: `pause_circle` icon (amber) + "Payment received but transfer paused — Stripe is reviewing your account."
- Helper text REPLACES the normal "Payout routed to your connected bank account." text (swap, not append)
- "Stripe Connect" badge stays in header
- Payment status shows "Succeeded" (green badge) — unchanged, the payment DID succeed from the customer's perspective
- Outcome: "Settled" — unchanged
- Resolved: date — unchanged

---

#### Variant 2: Waived + Transfer Held

**Current state (waived fee payment):**
```
Deposit          £10.00
Platform fee     Waived
Your payout      £10.00
↗ Payout routed to your connected bank account.
```

**Transfer held state:**
```
Deposit          £10.00
Platform fee     Waived
Your payout      Held
⏸ Payment received but transfer paused — Stripe is reviewing your account.
```

- Same as Variant 1 except fee line stays "Waived" (italic)
- Payout: "Held" replaces the £10.00 amount
- Same helper text and icon

---

#### Variant 3: Transfer Held + Refunded (precedence)

If `transferHeld === true` AND `refunded === true`, the **refunded state takes precedence**. The hold is moot — the customer got their money back. Render exactly as the existing refund variants (Variant 1/2 from refund-state design brief). No amber, no held label.

**No new design needed** — this is a logic rule, not a visual state.

---

### Design details

| Element | Style | Notes |
|---------|-------|-------|
| "Held" label | Amber/warning colour, same weight as normal amount | Right-aligned in the payout value column |
| Helper text icon | Material `pause_circle` | Amber colour, replaces `north_east` icon |
| Helper text | Muted/secondary colour, same as existing helper row | Two-part: factual statement + explanation |
| Card header | Unchanged | "Stripe Connect" badge persists |
| Payment status | "Succeeded" (green badge) | Unchanged — customer DID pay |
| Outcome | "Settled" | Unchanged |
| Resolved | Date value | Unchanged |

### Tone
Merchant-facing. Needs to be clear but not alarming — this is a temporary state that resolves when Stripe reinstates the account. Amber/warning, not red/error.

---

## Design 2: Dashboard Action Item (Spec 06)

### Page
`/app/dashboard` (or equivalent shop home)

### Component
New action item card in existing alerts/action items area

### What to design
A warning-style action item card that surfaces when the merchant has payments with held transfers. Should use the existing card or alert system if one exists on the dashboard.

---

#### State: 1 held transfer

```
⚠ 1 payment with held transfer

Stripe is reviewing your account. Transfers will resume automatically once your
account is restored. Contact Stripe support if this persists.

View appointment →
```

#### State: 3+ held transfers

```
⚠ 3 payments with held transfers

Stripe is reviewing your account. Transfers will resume automatically once your
account is restored. Contact Stripe support if this persists.

View held payments →
```

Pluralisation: "1 payment with held transfer" (singular) → "{n} payments with held transfers" (plural).
CTA: "View appointment →" (singular, links to appointment detail) → "View held payments →" (plural, links to filtered list).

#### State: No held transfers

Card does not render. No empty state needed.

#### Layout

Card sits below the Stripe Connect status card (Deposits at Risk / "Stripe connected" banner) and above the stats row. It is independent of connect card state — a merchant can be "Connected" and still have held transfers (suspension happened after initial connection).

---

### Design details

| Element | Style | Notes |
|---------|-------|-------|
| Card | Warning variant (amber border or background) | Should feel like a system alert, not a marketing banner |
| Icon | `warning` (Material Symbols, filled triangle) | Amber, left of title |
| Title | Bold, includes dynamic count | "1 payment with held transfer" / "{n} payments with held transfers" |
| Body text | Normal weight, secondary colour | Explains what's happening and what to expect |
| CTA link | Text link, not a button | Low-key — the merchant can't actually fix this, Stripe has to |
| Placement | Below connect status card, above stats row | Independent of connect card state |
| Dismissal | Not dismissable — disappears when resolved | Auto-resolves when transfers clear or payments are refunded |

### Tone
Informative, not urgent. The merchant can't do anything except wait or contact Stripe. Avoid language that sounds like the platform is blaming the merchant.

---

## Pages impacted (summary)

| Page | Component | What changes |
|------|-----------|--------------|
| Appointment detail (`/app/appointments/[id]`) | PaymentCard → FeeBreakdown | New "Held" payout state + helper text (2 variants) |
| Dashboard (`/app/dashboard`) | New action item card | Warning card for held transfers |

## No design needed

| Spec | Why |
|------|-----|
| 01 — Refund fallback | Backend catch clause, no UI |
| 02 — Schema migration | Database column, no UI |
| 03 — Detection guard | Webhook handler logic, no UI |
| 07 — Sweep cancel pending | Webhook handler logic, no UI |
| 08 — Sweep flag recent | Webhook handler logic, no UI |
| 09–13 — All tests | Test files, no UI |
