# Tier System Security Review

## Scope

This review covers Slice 7 (tier scoring, tier-based pricing, and slot-recovery prioritization).

## Authentication and Authorization

- Recompute endpoint (`/api/jobs/recompute-scores`) requires `x-cron-secret`.
- Offer-loop endpoint (`/api/jobs/offer-loop`) requires `x-internal-secret`.
- Customer dashboard and payment-policy settings require authenticated owner sessions.
- Shop-scoped reads/writes use `shopId` filters to avoid cross-shop access.

## Data Access and Privacy

- Customer scoring is stored per `(customerId, shopId)` with a unique index.
- Tier data is internal-only and not exposed to public booking copy.
- Missing score/tier defaults are handled safely (`neutral` / score `50` semantics).

## Query and Injection Safety

- Tier and offer queries are built through Drizzle query builders and parameterized SQL templates.
- No user-provided SQL fragments are interpolated directly.

## Operational Safety

- Recompute job uses PostgreSQL advisory locking to prevent concurrent runs.
- Score recomputation collects per-customer failures and continues processing remaining customers.
- Slot recovery prioritization remains deterministic and bounded (`limit 50` candidates).

## Risks and Mitigations

- Risk: invalid score values from logic regressions.
  Mitigation: `computeScoreAndTier` validates score range (`0..100`) and logs with shop/customer context.
- Risk: tier query drift causing unfair offer ordering.
  Mitigation: dedicated sorting tests (`slot-recovery-tier-sorting`) plus deterministic tie-breakers.
- Risk: cross-shop leakage.
  Mitigation: all tier-related joins include `shopId` constraints.

## Follow-ups

1. Add monitoring/alerts for recompute error rates over time.
2. Periodically audit tier distribution to catch unintended behavior shifts.
