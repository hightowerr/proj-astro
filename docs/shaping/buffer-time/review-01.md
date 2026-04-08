# [REQUEST CHANGES] Buffer Time Review 01

Date: 2026-04-08
Reviewer role: Implementation Reviewer
Inputs reviewed:
- `docs/shaping/buffer-time/buffer-time-slices.md`
- `docs/shaping/buffer-time/buffer-time-shaping.md`
- `docs/shaping/buffer-time/bug-report-01.md`
- current codebase

Note: no `pitch.md` exists in this repo for the buffer-time bet. Boundary checks below are therefore anchored to `buffer-time-shaping.md`, which is the closest source of truth.

## Findings

### 1. High: Calendar sync still exports raw appointment end time and ignores the booked buffer

**Status: Shaped — see `docs/shaping/buffer-time/calendar-sync-buffer-fix.md`**

Gemini finding #1 is a true positive.

- Initial calendar sync during booking passes raw `appointmentWithBookingUrl.endsAt` to `createCalendarEvent` in [`src/lib/queries/appointments.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/queries/appointments.ts#L943).
- Manual sync also passes raw `appointment.endsAt` in [`src/lib/queries/appointments.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/queries/appointments.ts#L1270).
- Both paths ignore `effectiveBufferAfterMinutes`, even though the feature now treats that buffer as part of the provider’s blocked time.

Why this matters:
- The app says the provider is blocked through the buffer window.
- Google Calendar says they are free at raw `endsAt`.
- That inconsistency creates manual double-booking risk and breaks the mental model of “buffer is real.”

Fix instruction:
- In both calendar sync paths, send `endsAt + effectiveBufferAfterMinutes` to `createCalendarEvent`.
- Add a test proving an appointment with `effectiveBufferAfterMinutes = 10` creates a calendar event ending 10 minutes later than raw `endsAt`.

### 2. Medium: Background conflict scanner uses a weaker overlap rule than the real-time validator

Gemini finding #2 is a true positive.

- Real-time booking validation uses `overlapsWithCalendarConflictBuffer` from [`src/lib/calendar-conflict-rules.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/calendar-conflict-rules.ts#L1).
- The background scanner in [`src/lib/calendar-conflicts.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/calendar-conflicts.ts#L552) does not use that rule. It falls back to raw overlap:
  - `eventStart < appointment.endsAt`
  - `eventEnd > appointment.startsAt`
- It also does not account for `effectiveBufferAfterMinutes`.

Why this matters:
- The product will reject a booking in real time because of conflict padding, but the scanner may later report no conflict for the same practical situation.
- If buffer is part of blocked scheduling time, the scanner should not silently ignore it.

Fix instruction:
- Replace the scanner’s manual overlap check with shared logic.
- At minimum, compute the appointment’s blocked end as `appointment.endsAt + appointment.effectiveBufferAfterMinutes`.
- Prefer reusing one helper so real-time validation and background scanning cannot drift again.
- Add a scanner test for “event overlaps only with post-appointment buffer” and a second one for the existing +/- 5 minute calendar conflict padding.

### 3. Medium: Slot recovery eligibility still ignores appointment buffers

Gemini finding #3 is a true positive.

- `getEligibleCustomers()` checks overlap using raw appointment windows in [`src/lib/slot-recovery.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/slot-recovery.ts#L224).
- It does not expand existing appointments by `effectiveBufferAfterMinutes`.
- It also does not consider the recovered slot’s own buffer implications.

Why this matters:
- Customers can receive offers for slots they cannot actually accept.
- The final booking attempt is then rejected by the stricter `createAppointment()` guard, wasting offer inventory and producing a bad customer experience.

Fix instruction:
- Mirror the same overlap semantics used by booking creation.
- Existing appointments should block through `endsAt + effectiveBufferAfterMinutes`.
- The candidate slot should also use the effective buffered end for the service being offered, not just raw `slotOpening.endsAt`.
- Add a slot-recovery test where a customer has an existing appointment whose buffer overlaps the offered slot and confirm they are excluded from eligibility.

## Exactness vs Slice

### What matches the slice

- V1 shipped:
  - `appointments.effectiveBufferAfterMinutes` exists in [`src/lib/schema.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/schema.ts#L541)
  - availability reads it in [`src/lib/queries/appointments.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/queries/appointments.ts#L215)
  - booking creation writes and enforces it in [`src/lib/queries/appointments.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/queries/appointments.ts#L742) and [`src/lib/queries/appointments.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/queries/appointments.ts#L870)
- V2 shipped:
  - `bookingSettings.defaultBufferMinutes` exists in [`src/lib/schema.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/schema.ts#L272)
  - server-side validation exists in [`src/app/app/settings/availability/actions.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/app/settings/availability/actions.ts#L13)
  - availability settings UI exists in [`src/components/settings/availability-settings-form.tsx`](/home/yunix/learning-agentic/ideas/proj-astro/src/components/settings/availability-settings-form.tsx#L26)

### Where the implementation went beyond the written slice

- `eventTypes.bufferMinutes` was changed from required-with-default to nullable in [`src/lib/schema.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/schema.ts#L310) plus migration `0031`.
- The service form added a `Shop default` option in [`src/components/services/event-type-form.tsx`](/home/yunix/learning-agentic/ideas/proj-astro/src/components/services/event-type-form.tsx#L27).
- Service actions were expanded to accept `null` in [`src/app/app/settings/services/actions.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/app/settings/services/actions.ts#L14).

Assessment:
- This is beyond the exact wording of `buffer-time-slices.md`, which said per-service UI was already there and framed the default as applying when event type buffer is `0`.
- It also exceeds the strict wording of `buffer-time-shaping.md`, which said `eventTypes.bufferMinutes` keeps its existing constraint and “no migration needed.”
- However, this is not gratuitous gold-plating. It is a coherence fix: without a distinct inherit state, `0` means explicit no buffer, so the shop default cannot work cleanly.

Required follow-up:
- Do not revert this behavior unless product explicitly wants `0` to mean “inherit.”
- Instead, update the shaping/slice docs after code is fixed so the implemented inheritance model is explicit: `null = inherit shop default`, `0 = explicit no buffer`.

## Boundary Check Against Shaping

No evidence of these boundary violations:
- no `bufferBefore`
- no expansion beyond `0/5/10`
- no customer-facing buffer messaging
- no per-service buffer moved into availability settings

One controlled deviation exists:
- nullable per-service buffer plus explicit “Shop default” state, as described above

This deviation is acceptable if documented, but it means the implementation was not “exactly the slice” as written.

## Gemini Report Triage

### True positives

1. Calendar sync ignores buffer time
2. Background conflict scanner ignores buffer/padding
3. Slot recovery overlap check ignores buffers

### Noise

- None of the three reported items were noise. All three are real inconsistencies in current code.

## Testing Assessment

What is covered:
- availability settings action tests pass
- calendar conflict tests pass, but they do not cover buffer-snapshot interaction

What is missing:
- no test proves calendar sync uses buffered end time
- no test proves conflict scanning honors buffered appointment windows
- no test proves slot-recovery eligibility excludes customers blocked by buffer
- several DB-backed scheduling tests remain environment-conditional and can skip without `POSTGRES_URL`

Commands run during this review:

```bash
pnpm test src/lib/__tests__/calendar-conflicts.test.ts
pnpm test src/lib/__tests__/slot-recovery-tier-sorting.test.ts
pnpm test src/lib/__tests__/booking-tier-pricing.test.ts
```

Observed result:
- `calendar-conflicts.test.ts` passed
- `slot-recovery-tier-sorting.test.ts` partially ran, with DB-backed cases skipped in this environment
- `booking-tier-pricing.test.ts` skipped in this environment

## Appetite Check

Are we still on track for the 2-week appetite?

Yes, with conditions.

Reasoning:
- The core bet is still contained.
- The three defects are localized consistency fixes, not evidence the feature needs reshaping.
- The implementation did not explode into `bufferBefore`, wider ranges, or a broader scheduling rewrite.

My estimate:
- Fixes plus focused tests should fit comfortably inside the current bet if addressed now.
- Leaving them unresolved would make the feature look “done” in the booking path while still being inconsistent in adjacent scheduling systems.

## Required change list before approval

1. Update both calendar sync paths to export buffered end times, and add regression coverage.
2. Unify background conflict scanning with the same overlap semantics used by real-time conflict validation, including buffered appointment ends.
3. Update slot-recovery eligibility overlap checks to honor existing appointment buffers and candidate-slot buffer semantics.
4. Add tests for all three fixes.
5. Update the buffer-time docs to reflect the implemented inheritance semantics (`null`/`Shop default`) so the slice and code no longer disagree.
