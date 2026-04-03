---
shaping: true
---

# Buffer Time Between Appointments — Shaping

**Source:** `docs/shaping/gap-analysis/competitive-table-stakes-p0-p1.md` (P0 Feature #4)
**Date:** 2026-03-31
**Status:** Shape selected — ready to detail

---

## Frame

### Source

> **Buffer Time Between Appointments**
>
> What it is: Automatic padding before/after appointments. Prevents back-to-back burnout.
> Accounts for cleanup, prep, travel time.
>
> Current state: ❌ Missing (functionally — schema and UI exist but are not wired in)
>
> Priority justification: Without buffers, system books appointments back-to-back,
> which is unrealistic for service businesses.

### Problem

The booking system generates time slots with no gap between appointments. For service businesses — hairstylists, therapists, coaches, personal trainers — back-to-back scheduling is unrealistic. Providers need time after each appointment for cleanup, room reset, notes, or travel.

A `bufferMinutes` field (after-only, options: 0/5/10) already exists on `eventTypes` and is configurable in the Services UI — but it is never read by the availability query or booking creation logic. From a customer's perspective, buffer does nothing. Shop owners who set it are silently misled.

### Outcome

The existing `bufferMinutes` field is wired into slot generation so that configured buffer time actually blocks slots. The feature becomes trustworthy: a shop owner sets 10 min buffer and appointments genuinely cannot be booked back-to-back.

Scope of expansion (bufferBefore, wider options) is a separate decision — the wire-up is the primary deliverable.

---

## What Already Exists

| Layer | Status | Detail |
|-------|--------|--------|
| `eventTypes.bufferMinutes` schema column | ✅ Done | `integer`, default 0, check constraint: `IN (0, 5, 10)` |
| Services UI (`/app/settings/services`) | ✅ Done | Radio group: None / 5 min / 10 min, per event type |
| Availability filtering (`getAvailabilityForDate`) | ❌ Not wired | Buffer not read; overlap test uses raw `startsAt`/`endsAt` |
| Booking creation validation (`createAppointment`) | ❌ Not wired | Overlap check ignores buffer — race condition gap |
| `bufferBefore` column | ❌ Does not exist | After-buffer only today |
| Shop-level default buffer | ❌ Does not exist | No fallback for services without a value |

---

## Where the Feature Lives in the UI

**Per-service buffer → `/app/settings/services`** (already there)

This is the right home. Buffer is a property of a service (a 90-min colour treatment needs different cleanup time than a 30-min cut). It lives alongside duration and deposit on each event type.

**Shop-level default buffer → `/app/settings/availability`** (if we add it)

The availability page owns shop-wide booking behaviour: timezone, slot duration, working hours. A global buffer default belongs here — it reads as "for any service that hasn't set its own buffer, use this." The page description already says "Configure working hours and slot duration used on your booking page."

**`/app/settings/availability` is not the right home for per-service buffer.** Moving it there would break the model — you'd be configuring a service property away from the service.

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Configured `bufferMinutes` on an event type is enforced — customers cannot book a slot that falls within the after-buffer of a preceding appointment | Core goal |
| R1 | Buffer enforcement applies at availability query time (slots hidden) and at booking creation time (race condition guard) | Must-have |
| R2 | `bufferBefore` (padding before an appointment starts) is also configurable per event type | Undecided |
| R3 | A shop-level default buffer applies when an event type has no buffer set | Undecided |
| R4 | Buffer option values are expanded beyond 0/5/10 min to cover realistic service business needs (up to 60 min) | Undecided |
| R5 | Changing buffer settings does not affect already-booked appointments — only future availability is affected | Must-have |
| R6 | Buffer windows are invisible to customers — slots simply do not appear; no buffer-specific messaging | Must-have |

---

## Open Questions

| # | Question | Status |
|---|----------|--------|
| Q2 | Add `bufferBefore` now or defer? | **Deferred** — after-only wire-up ships first |
| Q3 | Add shop-level default buffer now or defer? | **Now** — C5-A |
| Q4 | Expand options beyond 0/5/10 now? | **Deferred** — keep 0/5/10 for now |

---

## Selected Shape: C — Wire Up + Controlled Expansion

Complete the half-built feature. Wire `bufferMinutes` into availability and booking creation. Decide on controlled scope expansion as a separate question.

### C: Wire Up Existing Buffer + Shop Default

**Final composition: C1 + C2 + C3-B + C4-B + C5-A**

| Part | Mechanism |
|------|-----------|
| **C1** | **Wire availability filter** |
| C1 | In `getAvailabilityForDate()`, fetch `bufferMinutes` for each booked appointment's event type. Resolve effective buffer: `eventType.bufferMinutes ?? bookingSettings.defaultBufferMinutes ?? 0`. Expand blocked window: `blockedEnd = endsAt + effectiveBuffer`. Overlap test uses `blockedEnd` instead of raw `endsAt`. |
| **C2** | **Wire booking creation guard** |
| C2 | In `createAppointment()`, mirror the same buffer-resolved, buffer-expanded overlap check to close the race condition gap between availability query and booking write. **C1 and C2 must ship together — C1 alone creates a bypass where a customer can POST directly to `/api/bookings/create` with a `startsAt` in a buffer window, skipping the availability filter entirely.** |
| **C3-B** | **bufferBefore deferred** |
| C3-B | After-only buffer ships now. `bufferBefore` added in a future iteration. |
| **C4-B** | **Option range unchanged** |
| C4-B | `eventTypes.bufferMinutes` keeps existing check constraint: `IN (0, 5, 10)`. No migration needed. |
| **C5-A** | **Shop-level default buffer** |
| C5-A | Add `defaultBufferMinutes` (integer, default 0, check: `IN (0, 5, 10)`) to `bookingSettings`. Surface as a new control in `/app/settings/availability` alongside slot duration. Availability and creation logic resolve effective buffer via: `eventType.bufferMinutes ?? defaultBufferMinutes ?? 0`. |

---

## Fit Check

| Req | Requirement | Status | C |
|-----|-------------|--------|---|
| R0 | Configured `bufferMinutes` on an event type is enforced — customers cannot book into the after-buffer of a preceding appointment | Core goal | ✅ |
| R1 | Buffer enforcement applies at availability query time and at booking creation time | Must-have | ✅ |
| R2 | `bufferBefore` is configurable per event type | Undecided | ❌ |
| R3 | A shop-level default buffer applies when an event type has no buffer set | Undecided | ✅ |
| R4 | Buffer options expanded beyond 0/5/10 min | Undecided | ❌ |
| R5 | Changing buffer settings does not affect already-booked appointments | Must-have | ✅ |
| R6 | Buffer windows are invisible to customers — slots simply do not appear | Must-have | ✅ |

**Notes:**
- R2 fails: `bufferBefore` is deferred — accepted, Undecided status, not a blocker
- R4 fails: option expansion deferred — accepted, Undecided status, not a blocker

**Shape C passes on all Must-have and Core goal requirements. Selected.**

---

## Security Constraints

| Constraint | Detail |
|------------|--------|
| **C1 + C2 are atomic** | C1 (availability filter) and C2 (creation guard) must ship in the same deployment. C1 alone is a false sense of security — customers can POST directly to the booking API and land in a buffer window. |
| **Server-side input validation on C5-A** | `defaultBufferMinutes` must be validated with `z.union([z.literal(0), z.literal(5), z.literal(10)])` in `updateAvailabilitySettings` before the DB write. DB check constraint alone throws a raw error, not a clean failure. |
| **LEFT JOIN on eventTypeId in C1/C2** | Appointments with `eventTypeId = null` must fall back to `defaultBufferMinutes`, not be silently dropped. Use LEFT JOIN when resolving buffer for booked appointments — an INNER JOIN would treat null-type appointments as 0-buffer incorrectly. |
