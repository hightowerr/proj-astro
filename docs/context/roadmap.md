# Roadmap

Parked ideas and future considerations. Not committed — just recorded so they don't get lost.

---

## Parked

- **Multi-currency / international expansion** — Connect account creation hardcodes `country: "GB"` and `default_currency: "gbp"`. Shop policies default to GBP. Currency symbol maps support EUR/USD already, but the Connect account won't accept non-GBP charges without multi-currency config. If expanding beyond UK: make `country` and `default_currency` dynamic from shop config, add currency selection to onboarding, and handle Stripe's per-country capability requirements.
- **Partial refunds with Connect** — System currently does full refunds only (`payment.amountCents`). Stripe supports partial refunds with `reverse_transfer: true` (proportional reversal). If added: need to design fee reversal behaviour — proportional (Stripe default), full fee return on any refund, or no fee return on partials. Also need UI for merchant to specify refund amount and see the fee impact before confirming.
- **Multi-shop / multi-owner support** — Current model is 1:1:1 (one user → one shop → one Stripe Express account). `shops.ownerUserId` has a unique index; `shops.stripeAccountId` has a partial unique index. If multi-shop is ever needed: each shop needs its own Express account (different bank accounts, tax reporting), the owner unique index must be removed, and the Connect flow needs a shop selector. If multi-owner: need to decide which owner controls the Express account (Stripe KYC is identity-bound). If ownership transfer: Express account can't be swapped — would need a new one. Don't solve any of this until the market demands it.
