# Polar Subscription — Slices

## Wave Structure

5 waves, 14 implementation specs (spike 00 resolved in SHAPE). Critical path: 5 sequential steps.

### Wave 1 — Foundation (3 specs)

All dependencies for subsequent waves. Specs 01 and 02 are parallel. Spec 03 depends on 02.

| Slice | Spec | Summary | Parallel? |
|-------|------|---------|-----------|
| 1a | 01 — Schema migration | Enum, 4 columns on shops, dedup table | Yes (with 1b) |
| 1b | 02 — Polar env vars | `POLAR_ACCESS_TOKEN` + `POLAR_WEBHOOK_SECRET` in env.ts | Yes (with 1a) |
| 1c | 03 — Polar server plugin | Better Auth plugin + Polar SDK client singleton | After 1b |

### Wave 2 — Webhook + Trial + Client (3 specs)

Client plugin, webhook handler logic, and trial initialization. All three can start once their deps from Wave 1 are met.

| Slice | Spec | Summary | Parallel? |
|-------|------|---------|-----------|
| 2a | 04 — Polar client plugin | Client-side checkout/portal wiring | Yes |
| 2b | 05 — Webhook handler | 6 callbacks with dedup + timestamp guard | Yes |
| 2c | 06 — Trial initialization | Set `trialing` + `trialEndsAt` at shop creation | Yes |

### Wave 3 — Gating (4 specs)

Auth gating, booking lock, paywall page, and onboarding drip. Specs 07 and 08 can start together. Spec 09 needs 07 + 04. Spec 12 needs 06.

| Slice | Spec | Summary | Parallel? |
|-------|------|---------|-----------|
| 3a | 07 — requireShopAuth() | New auth function + dashboard route replacement | Yes (with 3b) |
| 3b | 08 — Booking page soft lock | Block bookings when canceled | Yes (with 3a) |
| 3c | 09 — Paywall page | Subscribe CTA with two variants | After 3a |
| 3d | 12 — Onboarding drip | 8-email sequence on resolve-outcomes cron | Yes (with 3a, 3b) |

### Wave 4 — UX Polish (3 specs)

Checkout interstitial, past-due banner, and reconciliation. All three are independent of each other.

| Slice | Spec | Summary | Parallel? |
|-------|------|---------|-----------|
| 4a | 10 — Checkout interstitial | Polling "Processing..." page | Yes |
| 4b | 11 — Past-due banner | Dashboard layout banner | Yes |
| 4c | 13 — Reconciliation | Polar API check before paywall renders | Yes |

### Wave 5 — Emails (1 spec)

Grace period transactional emails. Depends on webhook handler (Wave 2) and drip infrastructure (Wave 3).

| Slice | Spec | Summary | Parallel? |
|-------|------|---------|-----------|
| 5a | 14 — Grace period emails | 3 transactional email templates | Sequential |

## Critical Path

```
02-env → 03-server → 04-client → 09-paywall → 10-interstitial
  (also: 01-schema → 06-trial → 07-auth → 09-paywall)
```

Both chains converge at 09-paywall. Minimum 5 sequential steps.

## Architecture Context Updates (apply in RETRO)

| File | Update | Triggered by |
|------|--------|-------------|
| architecture-context.md | Add Polar as billing engine component. Add `requireShopAuth()` auth pattern. Add Polar webhook route. Add `POLAR_ACCESS_TOKEN` + `POLAR_WEBHOOK_SECRET` env vars. | 02, 03, 07 |
| code-standards.md | Document webhook handler pattern (dedup + timestamp guard). Document `requireShopAuth()` vs `requireAuth()` convention. | 05, 07 |
| progress-tracker.md | Add polar-subscription feature entry. Track wave completion. | All |
