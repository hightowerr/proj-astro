# Spec 02 — Features Carousel: Replace Marketing Tools with Slot Recovery

## Priority

P1 — HIGH. Independent. Ship standalone.

## Summary

Replace the entire "Marketing Tools" carousel slide (Slide 2) with Slot Recovery. The current slide advertises a re-engagement SMS campaign feature that is explicitly excluded from scope (§4 exclusion #8: "aspirational — not implemented"). Slot Recovery is ShowUp's most differentiating shipped feature — automated SMS offers to fill cancelled slots with tier-based priority.

## Changes

- **File:** `src/components/landing/features-carousel.tsx`

### 1. Replace SLIDES[1] data

**Current (lines 32-42):**
```typescript
{
  label: "Marketing Tools",
  title: "Win back clients on autopilot",
  description: "Send targeted re-engagement SMS to clients who haven't booked in 60+ days...",
  bullets: [
    "Segment by last booking date automatically",
    "One-click SMS campaign to lapsed clients",
    "Replies routed back to your inbox",
  ],
  phoneScreen: "MarketingScreen",
},
```

**Replace with:**
```typescript
{
  label: "Slot Recovery",
  title: "Fill cancelled slots in minutes",
  description: "Cancelled bookings trigger automatic SMS offers to fill the gap — top-tier clients get first dibs.",
  bullets: [
    "SMS offers sent automatically on cancellation",
    "Top-tier clients offered first, then neutral, then risk",
    "Cooldowns prevent re-offering to the same client",
  ],
  phoneScreen: "SlotRecoveryScreen",
},
```

### 2. Replace MarketingScreen phone mockup (lines 182-243)

Delete the entire `MarketingScreen` JSX and its supporting constants (`CAMPAIGN_AUDIENCES` line 71, `CAMPAIGN_METRICS` lines 73-77).

Replace with a `SlotRecoveryScreen` mockup showing:
- Header: `RefreshCw` icon + "Slot recovery" label + "Active" green badge
- SMS preview bubble: "Hi Sarah, a slot just opened tomorrow at 2pm for a Cut & Finish. Reply YES to book. Reply STOP to opt out."
- Offer status panel: "Offered to: 1 of 3 eligible" + "Status: Awaiting reply" + "Expires: 30 min"
- Bottom badge: "Top-tier clients get priority"

### 3. Update SlideScreen type (line 9)

**Current:** `"NoShowScreen" | "MarketingScreen" | "CalendarScreen"`
**Replace:** `"NoShowScreen" | "SlotRecoveryScreen" | "CalendarScreen"`

### 4. Update getPhoneScreen function (lines 320-327)

Replace `MarketingScreen` reference with `SlotRecoveryScreen`.

### 5. Update icon import (line 5)

Replace `Megaphone` with `RefreshCw` (from lucide-react). Remove `Megaphone` if unused elsewhere.

## Design Prototype

**[Slot Recovery Phone Mockup (standalone).html](../design/Slot%20Recovery%20Phone%20Mockup%20(standalone).html)**

### Left-side slide copy

| Element | Value |
|---------|-------|
| Label | `SLOT RECOVERY` (uppercase, primary/teal color) |
| Heading | `Fill cancelled slots in minutes` |
| Description | `Cancelled bookings trigger automatic SMS offers to fill the gap — top-tier clients get first dibs.` |
| Bullet 1 | `✓ SMS offers sent automatically on cancellation` |
| Bullet 2 | `✓ Top-tier clients offered first, then neutral, then risk` |
| Bullet 3 | `✓ Cooldowns prevent re-offering to the same client` |

### Phone mockup — exact sections

**Header bar:**
- `RefreshCw` icon + "SLOT RECOVERY" label (uppercase) + green "Active" badge (top-right)

**Outgoing SMS** (section label: `OUTGOING SMS`, uppercase):
- SMS bubble (rounded, light background, left-aligned):
  `Hi Sarah, a slot just opened tomorrow at 2pm for a Cut & Finish. Reply YES to book. Reply STOP to opt out.`
- "YES" and "STOP" are bold within the message

**Offer Status** (section label: `OFFER STATUS`, uppercase):
| Field | Value |
|-------|-------|
| Offered to | `1 of 3 eligible` |
| Status | `● Awaiting reply` (amber/orange dot) |
| Expires | `30 min` |

**Offer Queue** (section label: `OFFER QUEUE`, uppercase):
| Client | Tier | State |
|--------|------|-------|
| Sarah M. | Top | offered (highlighted, teal text) |
| Nadia R. | Neutral | next (muted) |
| Daniel P. | Risk | queued (muted) |

**Bottom badge:** `Top-tier clients get priority` (full-width teal button/badge)

## Design Notes

- The phone mockup matches the visual language of `NoShowScreen` and `CalendarScreen` — same spacing, typography, and color usage
- Use `--primary` for the header icon and "Slot recovery" label (matches other screens)
- Use `teal-100`/`teal-700` for the "Active" badge (matches "Draft ready" in old screen)
- SMS bubble should look like a real SMS — left-aligned, rounded corners, light background
- Offer status uses the same `text-[10px] uppercase tracking-wide` pattern as other screen labels
- The Offer Queue section is new to the mockup — it shows the cascading tier priority visually, reinforcing the bullet copy on the left
- Dark background (slate-900) behind the full slide section, with white phone frame

### Pages impacted

- `/` — landing page features carousel

## Acceptance Criteria

- [ ] Slide 2 label reads "Slot Recovery" (not "Marketing Tools")
- [ ] Slide 2 title reads "Fill cancelled slots in minutes"
- [ ] Slide 2 description and bullets describe real slot recovery behavior
- [ ] Phone mockup shows slot recovery SMS flow (not campaign composer)
- [ ] No references to "campaign", "re-engagement", "lapsed clients", "autopilot" remain in file
- [ ] `CAMPAIGN_AUDIENCES` and `CAMPAIGN_METRICS` constants are deleted
- [ ] Carousel navigation (dots, swipe) still works with 3 slides
- [ ] `pnpm check` passes

## Prerequisites

None.

## Dependencies

None — fully independent.
