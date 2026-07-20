# Spec 03 — Float Cards: Directional Benefits for Unverifiable Metrics

## Priority

P1 — HIGH. Independent. Ship standalone.

## Summary

Replace four unverifiable outcome metrics on the feature section float cards with directional benefit statements. Keep two structurally-true cards unchanged. At n=1 customer, specific numbers ("94%", "3x", "8 min", "£240") imply measured data that doesn't exist. Directional language ("Higher show-up rates", "Minutes, not days") is punchy without being falsifiable.

ADR: `docs/adr/0001-honest-positioning-at-low-adoption.md`

## Design Prototype

**[Float Cards Directional Copy (standalone).html](../design/Float%20Cards%20Directional%20Copy%20(standalone).html)**

## Changes

- **File:** `src/app/page.tsx`

### Cards to REPLACE (unverifiable outcome metrics)

Grouped by the feature section row they appear in:

**Row 1 · Know your clients:**

| Line | Current value | Current label | New value | New label |
|------|--------------|---------------|-----------|-----------|
| 27-30 | `"94%"` | `"client show-up rate"` | `"Higher"` | `"show-up rates with risk scoring"` |
| 32-35 | `"3x"` | `"fewer no-shows with risk flagging"` | `"Fewer"` | `"no-shows with automated flagging"` |

**Row 2 · Never lose revenue:**

| Line | Current value | Current label | New value | New label |
|------|--------------|---------------|-----------|-----------|
| 49-52 | `"8 min"` | `"average time to fill a cancelled slot"` | `"Minutes"` | `"to fill a cancelled slot"` |
| 54-57 | `"£240"` | `"avg. weekly recovery"` | `"Lost revenue"` | `"recovered automatically"` |

### Cards to KEEP (structurally true by design)

| Line | Value | Label | Why keep |
|------|-------|-------|----------|
| 67 | `"£0"` | `"owed after a no-show"` | Mechanically true — deposit collected, nothing owed |
| 69-72 | `"100%"` | `"deposit collection at booking"` | System behavior — 100% of configured deposits are collected |

## Design Notes

- Float card component and animation unchanged — only `value` and `label` prop strings change
- Directional values ("Higher", "Fewer", "Minutes") are shorter than numeric values — verify visual balance in the float card at mobile and desktop breakpoints
- No font size or styling changes
- In-context mockup (desktop): float cards overlap the feature vignette images at offset positions — "Higher" top-right, "Fewer" bottom-left on Row 1
- In-context mockup (mobile): single float card visible per row, positioned top-right of the vignette

### Pages impacted

- `/` — landing page feature sections

## Acceptance Criteria

- [ ] Four float cards show directional benefit language (no specific numbers)
- [ ] Two float cards ("£0", "100%") remain unchanged
- [ ] Float cards render correctly at mobile and desktop widths
- [ ] `pnpm check` passes

## Prerequisites

None.

## Dependencies

None — fully independent.
