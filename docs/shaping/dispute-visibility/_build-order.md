# Dispute Visibility — Build Order

## Dependency Graph

```
01 (ConnectedView copy)        — independent
02 (dispute.created handler)   — independent
├── 03 (dispute.updated/closed handlers) — depends on 02
├── 04 (notification email)              — depends on 02
├── 05 (payment card disputed modifier)  — depends on 02
│   └── 07 (payment card tests)          — depends on 05
└── 06 (webhook tests)                   — depends on 02, 03
```

## Phased Build Order

### Wave 1 — Independent foundations (parallel)

| Spec | Title | Depends on | Files |
|------|-------|------------|-------|
| 01 | Expectation-setting copy in ConnectedView | none | `stripe-connect-card.tsx` |
| 02 | `charge.dispute.created` webhook handler (financialOutcome + event) | none | `connect-webhook/route.ts` |

### Wave 2 — Dependent on handler (parallel)

| Spec | Title | Depends on | Files |
|------|-------|------------|-------|
| 03 | `charge.dispute.updated` + `charge.dispute.closed` handlers | 02 | `connect-webhook/route.ts` |
| 04 | Merchant dispute notification email via Resend | 02 | `connect-webhook/route.ts`, `email.ts` (import only) |
| 05 | Payment card `disputed` modifier (gavel icon, "Disputed" text) | 02 | `payment-card.tsx` |

### Wave 3 — Tests (parallel)

| Spec | Title | Depends on | Files |
|------|-------|------------|-------|
| 06 | Webhook handler tests (created, updated, closed, dedup) | 02, 03 | `connect-webhook/route.test.ts` |
| 07 | Payment card disputed modifier tests | 05 | `payment-card.test.ts` |

## Critical Path

```
02 (dispute.created handler) → 03 (lifecycle handlers) → 06 (webhook tests)
```

Longest chain: **3 specs, 3 waves**.

Alternate path: `02 → 05 → 07` (also 3 waves, same length).

---

## Design Brief (for designer mockups)

### Pages impacted

| Page | Component | What changes |
|------|-----------|-------------|
| `/app/settings/stripe-connect` | `ConnectedView` in `StripeConnectCard` | New line of copy (spec 01) |
| `/app/appointments/[id]` | `PaymentCard` | Disputed modifier state (spec 05) |
| Email (no page) | Inline HTML email | Dispute notification template (spec 04) |

### Mockup 1: ConnectedView — expectation copy

One new line below the account details card:

> "Since deposits go directly to you, you'll handle any customer disputes through your Stripe Dashboard."

Styled as `text-xs`, `--al-on-surface-variant`, `opacity: 0.7` — same weight as the "50p platform fee" line in StartView. NOT alarming. Informational disclosure.

### Mockup 2: PaymentCard — disputed state

New modifier state on the appointment detail payment card. Side-by-side with the existing refunded state:

| Element | Refunded | Disputed |
|---------|----------|----------|
| Payout line | "Returned" italic `--al-error-soft` | "Disputed" italic `--al-error-soft` |
| Icon | `undo` | `gavel` |
| Helper text | "Payout reversed to customer." | "This deposit is under dispute. Respond via your Stripe Dashboard." |
| Platform fee | £0.00 | Shown as normal (may be won) |

The disputed state can co-occur with any of the 5 `FeeState` values (`connect`, `waived`, `legacy`, `skipped`, `policy`) but in practice will only appear on `connect` payments (disputes only happen on charged deposits).

### Mockup 3: Dispute notification email

Follow the `connect-reengagement` email pattern:

| Element | Value |
|---------|-------|
| Subject | "A customer has disputed a deposit" |
| Headline | "A deposit has been disputed" |
| Body | "{Name} has disputed their {amount} deposit for {date}. Respond through your Stripe Dashboard within the deadline shown there." |
| CTA | "Open Stripe Dashboard →" (links to Express Dashboard login) |
| Footer | "SHOWUP · Stop losing money to no-shows." |
| Tone | Factual. Not alarming. Context + action link. |

---

## Ops Required (post-deploy)

Register these event types on the Connect webhook endpoint in the Stripe Dashboard:
- `charge.dispute.created`
- `charge.dispute.updated`
- `charge.dispute.closed`

---

## Architecture Context Updates Needed

> Do NOT apply yet — apply during Phase 5 (RETRO) of the feature loop.

### `docs/context/architecture-context.md`

**§4 Non-Obvious Routes — Connect Webhook:**
Update the connect-webhook description to list handled event types:
```
| `/api/stripe/connect-webhook` | ... handles `account.updated`, `transfer.created`, `transfer.reversed`,
  `transfer.updated`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed` |
```

**§7 Key Flows — NEW: Dispute Handling:**
```
### Dispute Handling

1. Customer's card issuer opens dispute → Stripe fires `charge.dispute.created`
2. Connect webhook looks up payment via `stripePaymentIntentId`
3. Sets `financialOutcome: "disputed"`, inserts `"dispute_opened"` event
4. Sends notification email to shop owner (after DB commit) with Express Dashboard link
5. `charge.dispute.updated` → console.warn with status changes
6. `charge.dispute.closed` → if won, revert to `financialOutcome: "settled"`; if lost, remains `"disputed"`
```

**§10 Invariants — NEW:**
```
19. **Dispute email sent after DB commit** — `sendEmail()` for dispute notifications runs outside the
    DB transaction (same pattern as suspension sweep PI cancellation). Email failure does not roll back
    dispute state persistence. `src/app/api/stripe/connect-webhook/route.ts`.
```

### `docs/context/progress-tracker.md`

After loop completion, add to **Completed** section:
```
- **Dispute Visibility** — 7 specs, 3 waves. P1 (expectation copy in ConnectedView), P2 (webhook handlers
  for dispute.created/updated/closed + tests), P3 (notification email via Resend), P4 (payment card
  disputed modifier + tests). Schema already had "disputed" enum values — no migration needed.
  Modified files: `stripe-connect-card.tsx`, `connect-webhook/route.ts`, `connect-webhook/route.test.ts`,
  `payment-card.tsx`, `payment-card.test.ts`. Ops: register 3 dispute events on Connect webhook.
```

### `docs/context/current-issues.md`

Move "Disputes attributed to merchant with no visibility or notification" from **Open > High** to **Resolved** with implementation summary.
