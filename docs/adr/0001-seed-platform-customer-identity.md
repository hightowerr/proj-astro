# Seed Platform-Level Customer Identity from Day One

End-customers in ShowUp are currently scoped to a single shop (`customers` table, unique on `phone, email, shopId`). We will add a `platformCustomers` table keyed on phone number from launch, silently matching customers across shops on every booking. The table will exist but not be surfaced — no cross-shop scoring, no customer-facing portal, no "my bookings" page. The purpose is to accumulate cross-business attendance data from day one so the data network effect compounds from the moment the first shops onboard.

## Considered Options

1. **Seed now, activate later** (chosen). Add `platformCustomers` and a `platformCustomerId` FK on the shop-level `customers` table. Silently create or match a platform identity on every booking. Don't expose it. Flip the switch to surface cross-vertical reliability scores when data density justifies it.

2. **Build when needed**. Keep shop-scoped identity until cross-vertical scoring is ready (post-PMF, post-multi-vertical). Simpler, but every shop that onboards before the switch is data you can't retroactively cross-reference without phone-number matching — which you'd have to do anyway, and may be lossy if numbers change.

3. **Build and expose now**. Add platform identity AND a customer-facing experience (verification code, cross-shop booking view, score opt-in). Full implementation. Premature — there are no multi-vertical businesses yet, and the UX adds friction to a booking flow that currently has none.

## Consequences

- A `platformCustomers` table will exist that nothing visibly uses until scoring is activated. This ADR explains why.
- GDPR basis for Phase 1 is legitimate interest (fraud prevention, service quality). Phase 2 (cross-shop score sharing) requires explicit customer consent via opt-in.
- The privacy policy must mention platform-level identity from day one, even though scoring isn't active.
- Cross-shop score display must be privacy-preserving: merchants see the score and tier but never the underlying data from other shops.
