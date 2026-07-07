# Confirmation SMS — Build Order

## Dependency Graph

```
Spec 01 (template)
   │
   ▼
Spec 02 (function logic)  ← depends on Spec 01
   │
   ├──────────┐
   ▼          ▼
Spec 03    Spec 04         ← both depend on Spec 02, independent of each other
(primary)  (legacy)
```

## Phased Build

### Phase 1 — Template + function logic (atomic deploy)

| Spec | File | Change | Depends on |
|------|------|--------|------------|
| 01 | `messages.ts:15-17` | `{{paid_line}}` replaces `Paid {{amount}}`, version bump to 2 | — |
| 02 | `messages.ts:290-329` | Remove `!payment` bail-out, build `paidLine` conditional, pass `paid_line` to template | Spec 01 |

Specs 01 + 02 **must deploy as a single commit** — deploying either alone breaks SMS for paid bookings.

### Phase 2 — Call sites (parallel)

| Spec | File | Change | Depends on |
|------|------|--------|------------|
| 03 | `api/bookings/create/route.ts` | Add `sendBookingConfirmationSMS()` for `!paymentRequired` | Spec 02 |
| 04 | `api/appointments/route.ts` | Same pattern as Spec 03 | Spec 02 |

Specs 03 + 04 are independent — can be implemented in parallel or as a single commit.

## Critical Path

```
Spec 01 → Spec 02 → Spec 03 (or 04)
```

**Length: 3 steps.** Spec 04 is on a parallel branch, not on the critical path.

## Cross-dependency (not in scope)

The "Slot recovery bypasses Connect guard" issue has the same bug — `slot-recovery.ts:579-592` sends a raw SMS via `sendTwilioSms()` bypassing templates, dedup, and message logging. When that issue is addressed, add the same `sendBookingConfirmationSMS()` call in the `acceptOffer()` flow for the `!paymentRequired` branch. **Do not include in this feature loop** — slot recovery has its own Connect guard dependency (F1) that must ship first.

## Architecture doc updates needed

See `architecture-updates.md` in this directory. Changes to record in `docs/context/` after implementation — do NOT update context docs until the feature loop closes.
