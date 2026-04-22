# Product & Business Rules

## The Booking Lifecycle
* **Booked:** Customer secures a slot, payment is captured, manage link generated, SMS sent.
* **Cancelled (Before Cutoff):** Full or partial refund issued.
* **Cancelled (After Cutoff):** Deposit retained by the business.
* **Completed:** After appointment time passes, the resolver auto-determines the final outcome (settled, voided, refunded, or unresolved).

## Customer Tiers & Scoring
Customer behavior determines their priority for slot recovery and pricing.
* **Top:** Score ≥ 80 AND 0 voided appointments in the last 90 days.
* **Risk:** Score < 40 OR ≥ 2 voided appointments in the last 90 days.
* **Neutral:** Default tier for everyone else.

## Slot Recovery System
Automatically tries to fill slots when a future paid appointment is cancelled.
* **Priority Order:** Top Tier → Neutral/Default → Risk Tier.
* **Status Flow:** * `pending` (customer receives SMS)
  * `accepted` (customer books it)
  * `expired` (offer TTL ran out)
  * `superseded` (slot filled by someone else).

## Payments, Pricing & Refunds
* **Policy Snapshots:** Always use `policyVersions` (frozen snapshot at time of booking). Never join to current `shopPolicies`.
* **Idempotent Refunds:** Always verify `payment.stripeRefundId` exists before issuing a refund to prevent double-paying. Refund amount is strictly capped at the original payment amount.
* **No-Show Prediction:** Based on historical voided vs. settled ratio. Influences dashboard warnings and UI risk indicators.