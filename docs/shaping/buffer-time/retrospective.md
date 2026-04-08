# Buffer Time Retrospective

Date: 2026-04-08
Scope audited against: `docs/shaping/buffer-time/buffer-time-shaping.md`

## 1. Did we deliver the shaped solution or creep beyond?

Short answer: we delivered the shaped solution, with one small but meaningful expansion.

### What shipped as shaped

- C1 availability wire-up shipped. Availability now reads `appointments.effectiveBufferAfterMinutes` and expands both booked and candidate windows during overlap checks in [`src/lib/queries/appointments.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/queries/appointments.ts#L147). This satisfies the core "slots disappear inside buffer windows" outcome.
- C2 booking creation guard shipped. `createAppointment()` resolves the effective buffer, uses it in the overlap guard, and persists it on the appointment row in [`src/lib/queries/appointments.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/queries/appointments.ts#L741) and [`src/lib/queries/appointments.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/queries/appointments.ts#L887). This closes the direct-POST bypass called out in the shape.
- Option X shipped. `appointments.effectiveBufferAfterMinutes` exists in schema in [`src/lib/schema.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/schema.ts#L541) and migration `0032`, so booked appointments snapshot their resolved buffer.
- C5-A shipped. `bookingSettings.defaultBufferMinutes` exists in schema in [`src/lib/schema.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/schema.ts#L272), is validated server-side in [`src/app/app/settings/availability/actions.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/app/settings/availability/actions.ts#L12), and is exposed in the availability settings UI in [`src/components/settings/availability-settings-form.tsx`](/home/yunix/learning-agentic/ideas/proj-astro/src/components/settings/availability-settings-form.tsx#L26).
- Deferred items remained deferred. No `bufferBefore` was added, and option values still remain `0/5/10`.

### Where we went beyond the original shape

- The shape originally said the per-service UI could ship unchanged and that no `eventTypes.bufferMinutes` migration was needed. We did more than that:
  - `eventTypes.bufferMinutes` was made nullable in [`src/lib/schema.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/schema.ts#L310) and migration `0031`.
  - The services form now exposes a `Shop default` option in [`src/components/services/event-type-form.tsx`](/home/yunix/learning-agentic/ideas/proj-astro/src/components/services/event-type-form.tsx#L27).
  - Service actions accept `null` for inheritance in [`src/app/app/settings/services/actions.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/app/settings/services/actions.ts#L14).

This is scope expansion, but it is disciplined expansion, not bet-breaking creep. Without a nullable "inherit" state, `eventType.bufferMinutes ?? defaultBufferMinutes ?? 0` would almost never reach the shop default for existing services because `0` means explicit none, not "unset". The extra work made C5-A materially real instead of nominal.

### Net assessment

- Delivered: yes
- Meaningful creep: small, intentional, and justified
- Unshaped extras that would count as real creep: no evidence found

## 2. Remaining technical debt

Explicit debt remaining:

1. DB-backed tests for the core buffer logic are not reliably enforced.
The buffer and availability integration tests in [`src/lib/__tests__/buffer-time.test.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/__tests__/buffer-time.test.ts) and [`src/lib/__tests__/availability-calendar.test.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/__tests__/availability-calendar.test.ts) are skipped unless `POSTGRES_URL` is present. In this audit run they did not execute, so CI confidence depends on external environment setup rather than the test suite alone.

2. Grandfathering is implemented but not directly proven by a focused regression test.
The code snapshots `effectiveBufferAfterMinutes` onto appointments, but there is no explicit test covering: book with buffer 10, later change service/shop default to 0, confirm availability still respects the original 10-minute snapshot for the existing appointment.

3. Prior-day spillover logic is hardcoded to the current max buffer.
`getAvailabilityForDate()` uses `MAX_BUFFER_MS = 10 * 60_000` in [`src/lib/queries/appointments.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/queries/appointments.ts#L212). That is correct for today's schema, but it becomes a hidden bug the moment the option range expands beyond 10 minutes.

4. No end-to-end test proves the full vertical slice.
There is no single automated test that goes through settings UI -> booking page availability -> booking POST rejection. The logic is covered in pieces, but the shaped promise was user-visible trustworthiness, and that still lacks one top-level proof.

5. Buffer snapshotting is now another ad hoc policy snapshot on `appointments`.
This is the right move for this feature, but it continues a pattern where immutable booking-time policy is spreading field-by-field (`policyVersionId`, reminder snapshot, effective buffer). The model works, but the codebase still lacks a consistent "snapshot what matters at booking time" abstraction.

6. The semantics of `null` vs `0` are now critical and easy to regress.
`null` means inherit shop default; `0` means explicit no buffer. That is correct, but it increases cognitive load across schema, forms, actions, and future migrations. The distinction is implemented, not yet strongly documented in developer-facing docs.

## 3. What did we learn for the next bet?

### About shaping

- The atomic-slice call was correct. Treating availability filtering and booking creation guard as one indivisible unit prevented a false-finished state.
- Existing schema semantics matter more than existing fields. We started with "the column already exists", but the real constraint was that the column's meaning did not support inheritance. That should be surfaced during shaping, not discovered during build.
- Option X was the right shaping decision. Snapshotting the resolved buffer onto the appointment row simplified read-time logic and aligned with the broader product rule that booked appointments should be grandfathered.

### About the stack

- Drizzle/Postgres handled this feature well when the rule was expressed as persisted state plus a SQL overlap guard. The stack is strong when we can turn policy into stored booking-time facts.
- Next.js server actions were a good fit for the settings part of the bet. The shop-default control stayed small because validation, persistence, and revalidation all lived in one place.
- Reusing `createAppointment()` as the booking choke point paid off. Slot recovery and web booking both inherit the new guard because the invariant lives in one creation path.

### About testing

- The current testing model is too dependent on environment-conditioned integration tests. For scheduling rules, skipped tests are close to missing tests.
- We should separate pure slot-overlap math from DB plumbing more aggressively. The overlap and buffer-window rules could be exhaustively unit tested without Postgres if extracted into pure helpers.
- Every scheduling bet should include one vertical-slice test. For this feature, that means proving that a shop owner changes a buffer setting and a customer immediately sees the correct slot behavior on the booking page.

## Recommendation for the next bet

- Keep shaping atomic invariants explicitly.
- Force semantic review of "existing" fields before assuming they reduce scope.
- Budget one vertical-slice test and one grandfathering regression test as part of the bet, not as cleanup.
