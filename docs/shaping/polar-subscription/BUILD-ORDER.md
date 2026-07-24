# Polar Subscription — Build Order

## Dependency Graph

```
00-spike ──────────────────────────────────┐
                                           ▼
01-schema ─┬─► 05-webhook ◄── 03-server    03-server ◄── 02-env
           │        │                          │
           ├─► 06-trial                    04-client ◄───┘
           │        │                          │
           ├─► 08-booking-lock             09-paywall ◄── 04-client
           │                                   │         ◄── 07-auth
           └─► 07-auth ◄── 06-trial            │
                   │                       10-interstitial ◄── 05-webhook
                   │                                        ◄── 09-paywall
                   ├─► 11-banner
                   │
                   └─► 12-drip ◄── 06-trial

13-reconciliation ◄── 03-server, 09-paywall
14-grace-emails ◄── 05-webhook, 12-drip
```

---

## Phased Build

### Phase 0 — Spike (do first, unblocks Phase 1 decisions)

| # | Spec | Summary | Depends on |
|---|------|---------|------------|
| 00 | Spike: Polar checkout customer | Verify auto-creation behavior | Nothing |

---

### Phase 1 — Foundation (3 specs, all parallel)

| # | Spec | Summary | Depends on |
|---|------|---------|------------|
| 01 | Schema migration | Enum, 4 columns, dedup table | Nothing |
| 02 | Polar env vars | `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET` in env.ts | Nothing |
| 03 | Polar server plugin | Better Auth plugin wired in auth.ts, Polar SDK client | 02 |

> 01 and 02 are fully parallel. 03 starts as soon as 02 lands. Net: 2 sequential steps.

---

### Phase 2 — Webhook + Trial (3 specs, partially parallel)

| # | Spec | Summary | Depends on |
|---|------|---------|------------|
| 04 | Polar client plugin | Client-side checkout/portal wiring | 03 |
| 05 | Webhook handler | 6 callbacks, dedup, timestamp guard | 01, 03 |
| 06 | Trial initialization | Set `trialing` + `trialEndsAt` at shop creation | 01 |

> 05 and 06 are parallel (both need 01, but 05 also needs 03). 04 needs only 03.

---

### Phase 3 — Gating (4 specs, partially parallel)

| # | Spec | Summary | Depends on |
|---|------|---------|------------|
| 07 | requireShopAuth() | New auth function, replaces `requireAuth()` on dashboard | 01, 06 |
| 08 | Booking page soft lock | Block bookings when `canceled` | 01 |
| 09 | Paywall page | Subscribe CTA, Polar checkout trigger | 04, 07 |
| 12 | Onboarding drip | 7-email sequence on `resolve-outcomes` cron | 01, 06 |

> 08 and 12 can start as soon as Phase 2 lands. 07 needs 06. 09 needs both 04 and 07.

---

### Phase 4 — UX Polish (3 specs, all parallel)

| # | Spec | Summary | Depends on |
|---|------|---------|------------|
| 10 | Checkout interstitial | Polling "Processing..." page | 05, 09 |
| 11 | Past-due banner | Dashboard layout banner | 07 |
| 13 | Reconciliation | Polar API check on paywall page | 03, 09 |

> All three are independent of each other. All deps satisfied by Phase 3.

---

### Phase 5 — Emails (1 spec)

| # | Spec | Summary | Depends on |
|---|------|---------|------------|
| 14 | Grace period emails | Payment failed, recovered, ended emails | 05, 12 |

> Needs webhook handler (triggers) and drip infrastructure (Resend + messageLog patterns).

---

## Critical Path

The longest sequential chain that determines minimum build time:

```
02-env → 03-server → 04-client → 09-paywall → 10-interstitial
  (also: 01-schema → 06-trial → 07-auth → 09-paywall)
```

**Critical path: 5 sequential steps.**

Both chains converge at 09-paywall. The schema chain (01→06→07→09) and the plugin chain (02→03→04→09) must both complete before the paywall can ship.

```
Phase 0:  [00-spike]
Phase 1:  [01-schema] [02-env → 03-server]
Phase 2:  [04-client] [05-webhook] [06-trial]
Phase 3:  [07-auth] [08-lock] [09-paywall] [12-drip]
Phase 4:  [10-interstitial] [11-banner] [13-reconciliation]
Phase 5:  [14-emails]
```

**Minimum wall-clock phases: 6 (including spike)**

---

## Design Briefs

| Spec | What needs design | Pages impacted | Priority |
|------|-------------------|----------------|----------|
| 08 | Booking page "unavailable" state | `/book/[slug]` | High — public-facing |
| 09 | Paywall page (2 variants: trial-expired, resubscribe) | `/app/billing/subscribe` (new) | High — conversion page |
| 10 | Checkout processing interstitial + fallback state | `/app/billing/processing` (new) | Medium — brief, transient |
| 11 | Past-due warning banner | All `/app/*` routes (layout) | Medium — component only |
| 12 | 7 drip email templates (priority: welcome, day 12, day 14) | Email only | Medium — can iterate |
| 14 | 3 transactional email templates | Email only | Low — Phase 5 |

**Designer should start with specs 08 and 09** — they're on the critical path and customer-facing.

---

## Document Updates Needed (do not apply yet)

| File | Update | Triggered by |
|------|--------|-------------|
| `docs/context/roadmap.md` | Rewrite Polar integration section to match resolved decisions. Remove `expired` state, `graceEndsAt`, middleware references, `onOrderPaid` mapping. Replace with 4-state enum, `requireShopAuth()`, Polar-managed retry, and revised phasing. | All specs |
| `docs/context/architecture-context.md` | Add Polar as a component (billing engine). Add `requireShopAuth()` as auth pattern. Note: no middleware.ts. | 03, 07 |
| `docs/context/progress-tracker.md` | Add Polar subscription lifecycle as active work. Track phase completion. | All specs |
| `docs/context/project-overview.md` | Update features list to include subscription management, paywall, soft lock, onboarding drip. | All specs |
| `docs/context/code-standards.md` | Document webhook handler pattern (dedup + timestamp guard + deferred calls). Document `requireShopAuth()` vs `requireAuth()` convention. | 05, 07 |
