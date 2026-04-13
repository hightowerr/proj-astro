---
title: "Services Page: UX Opportunities via Mental Models"
type: analysis
related: shaping.md
---

# Services Page — UX Opportunities

Mental model analysis applied to Shape A (Client editor shell with single active draft) to surface gaps and improvement opportunities not covered by the shaping doc.

---

## 1. Curse of Knowledge — "Restore", "isHidden", "isActive" are developer terms

The spec assumes the shop owner shares the developer's mental model of service states. They don't.

- **"Restore"** — to what? From when? A non-technical owner reads this as "undo everything" or "reset to factory."
- **"isHidden=true, isActive=true"** = "publicly hidden but link-bookable" — a nuanced distinction the spec acknowledges (R3.2) but doesn't detail how to communicate.
- **"isActive=false"** — the word "inactive" implies the service itself is broken, not that the owner chose to disable it.

**Opportunity:** Replace technical toggle labels with plain-language, positively framed controls:
- `isHidden` → "Visible on booking page" (default: on)
- `isActive` → "Available for booking" (default: on)

Add one-line contextual help beneath each toggle. For example: *"Hidden services won't appear on your booking page, but customers with a direct link can still book."* The "Default" badge (R2.1) also has no explanation — a tooltip stating *"Pre-selected on your booking page"* closes this gap.

---

## 2. Information Overload — 7 fields shown simultaneously on create

R3.1 requires all 7 fields to be editable in one form: name, description, durationMinutes, bufferMinutes, depositAmountCents, isHidden, isActive. For a shop owner creating their first service, this is a full form with no clear hierarchy of importance.

**Opportunity:** Progressive disclosure — split into two tiers:

| Tier | Fields | Shown |
|---|---|---|
| **Core** | name, description, duration, deposit | Always |
| **Advanced** | buffer, visible toggle, bookable toggle | Collapsed, "More options ›" |

Create mode opens with only the core fields visible. Advanced fields expand on demand. This halves the visible complexity at the most critical moment (first impression), while keeping full control accessible.

---

## 3. Anchoring Bias — Create-mode defaults anchor all future services

R4.1 specifies "first valid duration" as the create-mode default. If `slotMinutes=60`, every new service anchors at 60 minutes. Owners adjust insufficiently from anchors — they'll accept 60 minutes even when 45 or 30 is more accurate for their actual services.

**Opportunity:** Set the default duration to the **modal (most common) duration** across the shop's existing services, not the first valid slot. If no services exist, fall back to the first valid slot. This makes the anchor descriptive of the shop's real offering, reducing the effort needed to correct it.

---

## 4. Framing Effect — Confirmation dialog buries the safe action

R5.4 specifies the discard confirmation: title *"Discard unsaved changes?"*, actions *"Keep editing" / "Discard changes"*. The title and the destructive action both use the word "discard" — the dangerous choice is named, repeated, and prominent.

**Opportunity:** Reframe so the safe action leads:

- Title: *"You have unsaved changes"*
- Primary button: **"Keep editing"** (prominent, filled)
- Secondary action: *"Discard changes"* (muted, text-only)

The current framing asks the owner to confirm a loss. The reframe presents it as a recovery. This matters especially on mobile (R1.4) where the Back gesture is already familiar as a "go back without saving" pattern — the gate needs to clearly communicate that staying is the safe choice.

---

## 5. And Not Or Thinking — Empty pane is dead space

Shape A defines the right pane as having three modes: `empty | edit | create`. The `empty` mode is described as just that — empty. This is OR thinking: either a service is selected, OR nothing is shown.

**Opportunity:** The empty pane can be **empty AND useful**. Two scenarios:

- **No services exist yet:** Show a "Get started" prompt with a primary Add New button and a brief explanation of what services are. This is the critical empty state the spec never addresses.
- **Services exist, none selected:** Show a lightweight catalog summary — e.g., *"5 services · 3 active · 1 hidden · 1 inactive"* — with a nudge to select a service or add a new one. This turns dead space into orientation real estate and helps the owner understand their catalog at a glance before diving into edits.

---

## 6. Second-Order Thinking — Post-create leaves the owner's real job unfinished

R4.3 defines the success path after create: new row selected, pane stays in edit mode. First-order: the service exists in the system. But second-order: **the owner created a service to get bookings.** The system says "done" while the actual job — sharing the booking link — hasn't happened yet.

**Opportunity:** On first successful creation, surface a contextual nudge in the pane's success state: *"Service created — share your booking link"* with the Copy link inline. This bridges the gap between "created in the system" and "available to customers," connecting the action to its business outcome.

---

## 7. Status Quo Bias — No orientation cue for the new layout

The split-pane is a significant departure from the old inline row-expansion pattern. Owners who have learned the old UI carry inertia: they expect to click a row and see the form expand in place, not in a separate pane.

**Opportunity:** The empty pane state (when the page first loads with services already present) is the orientation moment. A single line of helper text — *"Select a service to edit, or click Add New"* — costs nothing and removes the friction of figuring out the new interaction model. This is especially important on mobile (R1.4) where the stacked layout has no visual split-pane affordance to orient from.

---

## 8. Aesthetic-Usability Effect — List rows are visually dense

Each list row (A2) can show: name, duration, deposit, Default badge, up to 2 state badges (Hidden, Inactive), Restore action, Copy link. On a compact row, all of these compete equally for attention. The spec doesn't define visual hierarchy or interaction states for row actions.

**Opportunity:** Apply a three-tier hierarchy:
- **Primary:** Service name (full weight)
- **Secondary:** Duration + deposit, muted/smaller
- **Tertiary (on hover):** Restore and Copy link revealed via hover or a `⋮` overflow menu — not always visible

State badges (Hidden, Inactive) should use color or icon to distinguish from the Default badge at a glance, so the owner's eye immediately separates "this service has a problem" from "this service is the default." Always-visible row actions add noise for the 80% of rows that are normal; hover-reveal respects the Von Restorff principle by keeping anomalies prominent without cluttering the baseline.

---

## Summary

| # | Opportunity | Mental Model | Shape A Gap |
|---|---|---|---|
| 1 | Plain-language toggle labels + contextual help | Curse of Knowledge | "isHidden", "isActive", "Restore" are developer terms |
| 2 | Progressive disclosure (core vs. advanced fields) | Information Overload | 7 fields shown simultaneously on create |
| 3 | Modal-duration default on create | Anchoring Bias | "First valid duration" anchors incorrectly |
| 4 | Reframe confirmation dialog (safe action leads) | Framing Effect | "Discard" repeated in title and action |
| 5 | Useful empty pane (empty state + catalog summary) | And Not Or Thinking | `empty` mode is genuinely empty |
| 6 | Post-create booking link nudge | Second-Order Thinking | Create success doesn't connect to getting bookings |
| 7 | Orientation cue on first load | Status Quo Bias | New layout has no onboarding affordance |
| 8 | Hover-reveal row actions + visual hierarchy | Aesthetic-Usability Effect | List rows visually dense; no defined hierarchy |
