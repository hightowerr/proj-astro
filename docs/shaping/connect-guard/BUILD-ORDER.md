# Connect Guard — Build Order

## Dependency Graph

```
T1 (tripwire) ──────────────────────────────── (independent)

P0 (query gap) ──► F1 (money routing) ──┐
                                         ├──► F3 (SMS cross-dep)
              F2 (SMS branching) ────────┘        │
                                                  ▼
                                    [external: "Free bookings SMS" fix]
```

| Spec | Depends on | Blocks |
|------|-----------|--------|
| P0 — Query gap | — | F1 |
| F1 — Money routing | P0 | F3 |
| F2 — SMS branching | — | F3 |
| F3 — SMS cross-dep | F1, F2, external "Free bookings SMS" | — |
| T1 — Tripwire comment | — | — |

---

## Phased Build Order

### Phase 1 — Foundation (all parallel, no deps)

| Spec | File | Change | Risk |
|------|------|--------|------|
| P0 — Query gap | `src/lib/slot-recovery.ts` | Add `stripeOnboardingStatus` to `findLatestOpenOffer` shop select | Low |
| F2 — SMS branching | `src/lib/slot-recovery.ts` | Branch SMS on `booking.paymentRequired` (paid vs free copy) | Low |
| T1 — Tripwire comment | `src/lib/queries/appointments.ts` | Add defensive comment above `paymentsEnabled ?? true` | None |

> P0 and F2 touch the same file but different functions — no merge conflict risk. T1 is a separate file.

### Phase 2 — Core fix (depends on Phase 1: P0)

| Spec | File | Change | Risk |
|------|------|--------|------|
| F1 — Money routing | `src/lib/slot-recovery.ts` | Replace `paymentsEnabled: true` with `shop.stripeOnboardingStatus === "complete"` | Medium |

> F1 is the critical financial fix. One-line change but it changes money routing behaviour. Needs careful verification.

### Phase 3 — Integration (depends on Phase 2 + external)

| Spec | File | Change | Risk |
|------|------|--------|------|
| F3 — SMS cross-dep | `src/lib/slot-recovery.ts` | Add `sendBookingConfirmationSMS()` call for free bookings | Low |

> **Blocked** until: F1 + F2 shipped AND "Free bookings get no confirmation SMS" (separate issue) shipped. Can be deferred to that issue's wave.

---

## Critical Path

```
P0 (query gap) → F1 (money routing) → F3 (SMS cross-dep)
```

**Length:** 3 specs, sequential. F3 also has an external dependency on the "Free bookings SMS" fix, making it the true bottleneck.

**Shortest path to financial safety:** P0 → F1 (2 specs). Once F1 ships, deposits are correctly routed. F2, F3, and T1 are UX/safety improvements that don't affect money flow.

---

## Design Needs

| Spec | What the designer needs to review | Pages/Surfaces impacted |
|------|----------------------------------|------------------------|
| F2 — SMS branching | **New SMS copy for free slot-recovery bookings.** Current: "Booking confirmed! Complete your deposit: {url}". New free path: "Booking confirmed for {date} with {shop}. No deposit required." Review: tone, length (160-char SMS segments), consistency with other booking confirmation SMS templates. | SMS (no UI page) |
| F1 — Money routing | **No UI change**, but designer should be aware: slot-recovery bookings for non-Connect shops will now be free (no payment page shown). The existing "booking confirmed" state in the customer flow applies. | `book/[slug]` payment page — no change needed, just awareness that slot-recovery may skip it |
| F3 — SMS cross-dep | No new design — uses the standard confirmation SMS template from the "Free bookings SMS" fix. | SMS (no UI page) |

**Mock-ups needed:** 1 item only — F2's free-path SMS copy for designer sign-off.

---

## Architecture Context Updates Needed

> Do NOT apply these now. Apply during Phase 5 (RETRO) of the feature loop, per the loop contract.

### `docs/context/architecture-context.md`

1. **Section 7 — Key Flows / Slot Recovery Loop:** Add step after "customer accepts offer": "Derive `paymentsEnabled` from `shop.stripeOnboardingStatus === 'complete'`. If Connect incomplete, booking is created as free (no PaymentIntent)."

2. **Add Invariant #16:** "`paymentsEnabled` must always be derived from `shop.stripeOnboardingStatus` at the call site — never hardcoded. The `createAppointment()` default of `true` is a safety net, not a correct value."

3. **Section 7 — Key Flows / Slot Recovery Loop:** Note SMS branching: "Recovery SMS branches on `paymentRequired`: paid bookings get payment link, free bookings get confirmation-only text."

### `docs/context/current-issues.md`

4. **Remove/mark resolved:** "Slot recovery bypasses Connect guard" once F1+F2 ship. F3 can remain as a noted dependency on the "Free bookings SMS" issue.

### `docs/context/product-rules.md` (if applicable)

5. **Add rule:** "Slot recovery bookings follow the same Connect guard as standard bookings. A non-Connect shop's slot recovery creates a free booking, not a paid one."

### `docs/context/progress-tracker.md`

6. **Update on ship:** Mark connect-guard specs as completed, note F3 deferred to "Free bookings SMS" wave.
