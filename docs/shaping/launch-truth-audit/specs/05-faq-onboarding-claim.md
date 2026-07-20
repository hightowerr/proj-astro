# Spec 05 — FAQ: Reframe Onboarding Time Claim

## Priority

P2 — MEDIUM. Independent. Ship standalone.

## Summary

Reframe the FAQ onboarding answer from a measured outcome claim ("Most beauty professionals are live within 20 minutes") to a capability statement. No usage data exists to support the "most" qualifier or the "20 minutes" metric. The ADR principle applies: no unmeasured outcomes presented as facts.

## Changes

- **File:** `src/components/landing/faq-section.tsx`
- **Location:** Line 18 — the answer for "How long does it take to get started?"

**Current:**
```typescript
a: "Most beauty professionals are live and taking bookings within 20 minutes. Set your availability, cancellation policy, and deposit amount, then share your booking link.",
```

**Replace with:**
```typescript
a: "Set your availability, cancellation policy, and deposit amount — you can be live and taking bookings in minutes.",
```

## Design Notes

- The second sentence of the original answer ("Set your availability...") was mechanically true — it describes the actual setup steps. This is promoted to the full answer.
- "in minutes" replaces "within 20 minutes" — directional rather than specific
- "Most beauty professionals" removed — implies a measured sample that doesn't exist
- FAQ layout and styling unchanged

### Pages impacted

- `/` — landing page FAQ section

## Acceptance Criteria

- [ ] FAQ answer for "How long does it take to get started?" uses capability framing
- [ ] No specific time claim ("20 minutes") in the answer
- [ ] No "most beauty professionals" qualifier
- [ ] `pnpm check` passes

## Prerequisites

None.

## Dependencies

None — fully independent.
