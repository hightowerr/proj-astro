# Spec 06: Dashboard Action Item for Held Transfers

**Priority**: P2 (HIGH) — UI

## Summary
Surface held transfers as action items on the shop dashboard so the merchant knows funds are stuck and what to do about it.

## Behaviour
- Query appointments where `transferHeld === true` AND `financialOutcome !== "refunded"` for the current shop
- If count > 0, render an action item card:
  - Icon: `warning` (filled triangle, amber)
  - Title: "1 payment with held transfer" (singular) / "{n} payments with held transfers" (plural)
  - Body: "Stripe is reviewing your account. Transfers will resume automatically once your account is restored. Contact Stripe support if this persists."
  - CTA: "View appointment →" (count === 1, links to appointment detail) / "View held payments →" (count > 1, links to filtered list)
- Card positioned below Connect status card, above stats row — independent of connect card state
- Action item disappears when all held transfers are resolved (transferHeld cleared or refunded) — no empty state

## Scope
- **File**: Dashboard page component (existing action items / alerts area)
- **File**: Server action or API route to query held transfer count
- Read-only — no mutations from the dashboard

## Dependencies
- **Requires**: Spec 02 (transferHeld column to query)

## Design
Prototype: `Dashboard Connect Card.html` → "Held transfers · preview state" toggle (None / 1 held / 3 held)

| Element | Style | Notes |
|---------|-------|-------|
| Card | Amber background, rounded corners | Sits below connect status card |
| Icon | `warning` filled triangle | Amber, left of title |
| Title | Bold | Pluralised: singular "transfer" / plural "transfers" |
| Body | Normal weight, secondary colour | Single paragraph, no line breaks |
| CTA | Text link + `arrow_forward` icon | "View appointment →" or "View held payments →" |
| Dismissal | Not dismissable | Disappears when count reaches 0 |

## Out of scope
- Email/push notification to merchant about held transfers (future)
- Platform admin view of all held transfers across shops (future)
