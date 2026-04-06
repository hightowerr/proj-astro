# Spike: Industry Standard Buffer Time Implementation

**Feature:** Buffer Time Between Appointments
**Date:** 2026-04-01
**Status:** Complete

---

## Context

Before finalising the implementation shape, we want to verify our approach against how established scheduling systems (Calendly, Cal.com, Microsoft Bookings) implement buffer time. The goal is to identify any gaps between our planned shape (C1 + C2 + C3-B + C4-B + C5-A) and the industry standard pattern — particularly around edge cases that established systems have already learned from.

---

## Goal

Identify the canonical algorithm, where our shape matches it, and where it diverges in ways that matter.

---

## Questions

| # | Question |
|---|----------|
| **I1-Q1** | What is the canonical algorithm for injecting buffer into slot availability? |
| **I1-Q2** | Is buffer stored on the event type or on the appointment itself? |
| **I1-Q3** | Do established systems lock in buffer settings at booking time? |
| **I1-Q4** | Does buffer apply to the start/end of the working day? |
| **I1-Q5** | What edge cases have established systems encountered? |

---

## Findings

### I1-Q1: The canonical algorithm — "expanded busy window"

All three major systems (Calendly, Cal.com, Microsoft Bookings) use the same pattern:

> **Treat a booked appointment as occupying `(startsAt − bufferBefore)` to `(endsAt + bufferAfter)` when testing whether a candidate slot is available.**

From Calendly's documentation:
> "If you have a 30-minute event with 15-minute buffers before and after, the total time needed is 60 minutes. The event duration and calendar event will say 30 mins, but 60 minutes of free time is required in order for a time slot to display on the booking page."

From Cal.com:
> "Buffers cannot overlap Cal events — a Cal event with buffer time can only be booked respecting the buffer time."

**This is exactly what our C1 mechanism does.** Our planned approach is correct.

Key nuance: **buffer is not added to the event duration** — the appointment itself stays `startsAt`/`endsAt` unchanged. The expansion is only in the overlap test, not in the stored record.

---

### I1-Q2: Buffer is stored per event type, not per appointment

All systems store buffer on the event type configuration, not on individual appointments. The buffer value is resolved from the event type at query time when checking availability.

**Our shape matches this.** `bufferMinutes` lives on `eventTypes`; `defaultBufferMinutes` lives on `bookingSettings` as fallback.

---

### I1-Q3: Buffer is locked at booking time — this is a gap in our shape

Calendly explicitly documents this:
> "All settings that are in place when an event is booked are 'locked in' for those bookings. Buffer settings at the time of booking are preserved and don't change retroactively if you later modify settings."

**Our current shape does not do this.** C1 reads `bufferMinutes` from the current `eventTypes` record at availability query time. If a shop owner changes the buffer from 10 min to 0 after appointments are already booked, the availability filter would immediately start showing slots adjacent to those existing appointments as free — potentially allowing new bookings to land inside what was originally a protected window.

Our R5 says "changing buffer does not affect already-booked appointments." Technically the appointment itself (its `startsAt`/`endsAt`) doesn't change — but our filter's treatment of its surrounding window does change, which violates the spirit of R5.

**To fully match the industry standard**, the effective buffer at booking time needs to be captured on the appointment itself:

```
appointments.effectiveBufferAfterMinutes  (integer, nullable)
```

Set at `createAppointment()` time: `eventType.bufferMinutes ?? bookingSettings.defaultBufferMinutes ?? 0`.

The availability filter then reads this column from the booked appointment row directly, rather than joining to the current `eventTypes` value.

---

### I1-Q4: Buffer does not consume the working day boundary

Cal.com documents this explicitly:
> "The buffer is applied around busy times and not to the start or end of the working day."

A before-buffer does not eat into the shop's opening hour. If a shop opens at 9:00 and has a 15-min before-buffer configured, a 9:00 appointment is still bookable — the before-buffer only protects time that falls within the working day relative to other booked appointments, not the open/close boundary.

**Our current shape has a potential edge case here.** The expanded overlap test `blockedStart = startsAt − bufferBefore` could block the slot immediately before the first appointment of the day, which might fall before the shop's open time — but since we don't generate slots outside working hours, this would be harmless for C3-B (deferred bufferBefore). For `bufferAfter`: a slot immediately after the last appointment might extend past closing time. Again, no slots are generated past closing, so this edge case is naturally handled.

**No action needed for the current scope (C3-B deferred).** Worth noting when bufferBefore is added in a future iteration.

---

### I1-Q5: Known edge cases from Cal.com's bug history

Cal.com's GitHub issue tracker reveals recurring failure modes:

| Issue | Description | Relevance to us |
|-------|-------------|-----------------|
| Buffer + custom slot intervals | When slot interval doesn't divide cleanly into buffer, buffers don't work correctly | Low — our slot intervals are fixed multiples; buffer is applied in overlap test, not slot generation |
| Buffer on seats/group events | Before/after buffers break for multi-person events | Not applicable — single-provider model |
| Buffer on dynamically scheduled events | Buffer limits ignored when event type is overridden at booking URL level | Relevant — our `durationMinutes` can be passed as a URL param; ensure buffer is resolved from event type, not the URL-overridden duration |
| Buffer not reflected in troubleshooter | Buffer blocks not visible in admin debug views | Nice-to-have — mirrors our R7 (deferred) |

The URL param issue is worth noting: if your system allows `?duration=X` overrides on the booking URL, buffer must still be sourced from the event type, not inferred from duration.

---

## Summary: Where Our Shape Matches vs Diverges

| Aspect | Industry Standard | Our Shape (C) | Status |
|--------|------------------|---------------|--------|
| Algorithm | Expand busy window by buffer in overlap test | C1 does this | ✅ Match |
| Buffer stored on | Event type | `eventTypes.bufferMinutes` + `bookingSettings.defaultBufferMinutes` | ✅ Match |
| Buffer locked at booking time | Yes — snapshot on appointment | Not captured — reads live event type value | ⚠️ Gap |
| Buffer at working day boundary | Doesn't apply to open/close | Naturally safe (no slots outside hours) | ✅ Safe |
| Creation-time guard | Yes | C2 | ✅ Match |

---

## The Gap: Should We Snapshot Buffer on the Appointment?

The gap is real but the impact is limited to a specific scenario: **shop owner changes buffer setting after appointments are already booked.**

Impact if we don't snapshot:
- Existing booked appointments' surrounding windows silently change
- A slot that was protected (e.g., 10 min after appointment A) could become bookable
- No customer or shop owner is explicitly notified

Impact is bounded: it only occurs on buffer setting changes, not on every booking. Most shop owners set their buffer once and leave it. The risk is low-frequency.

**Two options to decide:**

**Option X — Snapshot buffer on appointment (full industry standard)**
Add `effectiveBufferAfterMinutes` to `appointments`. Set at creation. Availability filter reads from appointment row.

- Pro: Matches industry standard exactly. R5 is fully honoured.
- Con: Requires a schema migration to `appointments` (a high-traffic table). Slightly more complex join in availability query.

**Option Y — Accept live read (our current shape)**
Read `bufferMinutes` from current `eventTypes` at query time. Document the known divergence.

- Pro: No schema change to `appointments`. Simpler.
- Con: Buffer changes retroactively affect surrounding windows of existing appointments. Rare but real edge case.

---

## Recommendation

For the initial wire-up, **Option Y is acceptable**. The failure mode is low-frequency (only on settings changes), the blast radius is small (adjacent slots open up, not existing appointments disrupted), and the shop owner is the actor making the change — they have context.

Add Option X (snapshot) to the backlog as a known improvement, and update R5 to reflect the known limitation.

If the team wants to match the standard exactly on day one, Option X adds one column and one write — low effort, high correctness.

---

## Sources

- [How to use buffers – Calendly Help](https://help.calendly.com/hc/en-us/articles/14048208107287-How-to-use-buffers)
- [What is Buffer Time – Cal.com Blog](https://cal.com/blog/what-is-buffer-time-learn-how-to-use-buffer-times-in-scheduling)
- [Event buffer – Cal.com Help](https://cal.com/help/event-types/event-buffer)
- [Bug: buffer not working / time slot intervals issues · calcom/cal.com #24253](https://github.com/calcom/cal.com/issues/24253)
- [Apply buffer-time limits to dynamically scheduled events · calcom/cal.com #14996](https://github.com/calcom/cal.com/issues/14996)
- [Buffer times not working correctly for events with seats · calcom/cal.com #13605](https://github.com/calcom/cal.com/issues/13605)
- [Buffer in calendar | Calendly Community](https://community.calendly.com/how-do-i-40/buffer-in-calendar-191)
