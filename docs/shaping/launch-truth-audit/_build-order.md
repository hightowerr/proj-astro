# Launch Truth Audit — Build Order

## Dependency Graph

```
01 (hero social proof)       — independent
02 (carousel slot recovery)  — independent
03 (float cards directional) — independent
04 (CTA section cleanup)     — independent
05 (FAQ onboarding claim)    — independent
06 (BookingNav cleanup)      — independent
```

Zero inter-dependencies. All specs touch different files.

## Phased Build Order

### Wave 1 — All specs (parallel)

| Spec | Title | Depends on | Files | Effort |
|------|-------|------------|-------|--------|
| 01 | Hero social proof → future social proof | none | `hero-section.tsx` | ~5 min |
| 02 | Carousel Slide 2 → Slot Recovery | none | `features-carousel.tsx` | ~25 min |
| 03 | Float cards → directional benefits | none | `page.tsx` | ~5 min |
| 04 | CTA section cleanup (subhead + mockup) | none | `cta-section.tsx` | ~5 min |
| 05 | FAQ onboarding claim reframe | none | `faq-section.tsx` | ~3 min |
| 06 | BookingNav remove marketing + auth | none | `booking-nav.tsx` | ~10 min |

**Total estimated: ~55 minutes. Single wave. Single PR.**

## Critical Path

```
No sequential chain. All specs are parallel.
Critical path = longest single spec = Spec 02 (~25 min).
```

The only spec with non-trivial work is **02** (carousel slide replacement) because it requires a new phone mockup component (`SlotRecoveryScreen`) to replace the deleted `MarketingScreen`, plus removal of orphaned constants. All other specs are string replacements.

---

## Design Briefs

### Brief 1: Slot Recovery Phone Mockup (Spec 02)

**Design:** [`design/Slot Recovery Phone Mockup (standalone).html`](design/Slot%20Recovery%20Phone%20Mockup%20(standalone).html)

**Replaces:** Campaign Composer mockup (re-engagement SMS feature that doesn't exist)
**New content:**
- Header: `RefreshCw` icon + "SLOT RECOVERY" label + green "Active" badge
- Outgoing SMS bubble: "Hi Sarah, a slot just opened tomorrow at 2pm for a Cut & Finish. Reply **YES** to book. Reply **STOP** to opt out."
- Offer Status panel: Offered to (1 of 3 eligible), Status (● Awaiting reply), Expires (30 min)
- Offer Queue: Sarah M. (Top · offered), Nadia R. (Neutral · next), Daniel P. (Risk · queued)
- Bottom badge: "Top-tier clients get priority"

**Visual language:** Match `NoShowScreen` and `CalendarScreen` patterns — same spacing, `text-[10px] uppercase tracking-wide` labels, `rounded-xl border border-gray-200 bg-white` cards, `primary` accent for header.

### Brief 2: Float Card Copy (Spec 03)

**Design:** [`design/Float Cards Directional Copy (standalone).html`](design/Float%20Cards%20Directional%20Copy%20(standalone).html)

**Impact:** Four float cards change from numeric values ("94%", "3x", "8 min", "£240") to word values ("Higher", "Fewer", "Minutes", "Lost revenue"). Row 1 (Know your clients) and Row 2 (Never lose revenue). Two structurally-true cards unchanged ("£0", "100%"). Verify visual balance — word values are wider but shorter. No layout changes.

### Brief 3: BookingNav Simplified (Spec 06)

**Design:** [`design/BookingNav Simplified.export.html`](design/BookingNav%20Simplified.export.html)

**Impact:** Booking page header goes from 3-section layout (brand + nav links + auth CTAs) to single-section (brand mark only). Flex note: with one child, `space-between` collapses to left-align — no spacer div needed. Mobile hamburger removed entirely. Optional "Powered by SHOWUP" variant for when merchant branding lives elsewhere on the page.

---

## Document Updates Needed (do NOT apply yet)

### `docs/context/project-overview.md`

1. **§2 Social proof line (line 25):** Update "Trusted by 500+ beauty professionals" to reflect the new future social proof framing
2. **§4 Exclusion #8 (line 84):** Update note — "win back clients on autopilot" copy has been removed from landing page. Feature remains excluded but the aspirational claim is no longer live.
3. **§3 Features (if slot recovery description was tied to landing page copy):** Verify alignment — the carousel now describes slot recovery differently than the project overview

### `docs/context/current-issues.md`

1. **BookingNav session awareness (Medium):** Move to Resolved — the underlying issue (marketing links + auth CTAs on booking page) is dissolved by removing them entirely (Via Negativa). The open question "Should BookingNav be session-aware?" is dissolved — no session elements remain.

### `docs/context/progress-tracker.md`

1. **Open Questions:** Remove "Should BookingNav be session-aware?" — dissolved
2. **Open Questions:** Remove "Do landing page sections have matching id anchors for nav links?" — BookingNav no longer has nav links
3. **Completed:** Add launch truth audit entry with spec count, wave count, pass/fail

### `docs/context/roadmap.md`

1. **Homepage update (parked):** Mark partially addressed — false claims removed, social proof updated, feature copy aligned with shipped capabilities. Remaining scope (feature cards for dispute visibility, payout status, configurable durations) is a separate content refresh, not a trust fix.
