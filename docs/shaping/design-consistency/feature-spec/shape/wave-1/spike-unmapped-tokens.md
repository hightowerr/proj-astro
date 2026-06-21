# Spike A: Unmapped Token Equivalents

**Date:** 2026-06-19
**Parent:** design-consistency-wave1-shape.md, Section 4 "Spike A"
**Status:** Complete

---

## Summary

Six Deep Ledger tokens (or Tailwind dark-mode classes) used in dashboard components have no mapping in spec #07's table. This spike identifies the correct Atelier Light replacement for each.

---

## Mapping Table

| Deep Ledger Token | Current Value | Component | Recommended AL Replacement | Reasoning |
|---|---|---|---|---|
| `--color-success` | `#20d090` | `success-banner.tsx` (checkmark icon color) | `var(--al-status-positive)` (`#0e7a55`) | AL's status vocabulary uses `positive` for success states. The design system `StatusPill` component confirms `--al-status-positive` is the canonical success/settled/paid foreground. The hue shifts from a bright mint to a deeper, warm green -- this is intentional for the light palette's reduced-saturation editorial aesthetic. |
| `--color-success-subtle` | `rgba(32, 208, 144, 0.1)` | `success-banner.tsx` (banner background) | `var(--al-status-positive-bg)` (`rgba(14, 122, 85, 0.10)`) | Direct 1:1 semantic match. AL already provides a 10%-opacity tinted background for positive status. The pattern (foreground color at 0.10 opacity) is identical; only the base hue changes from mint to warm green. |
| `--color-success-border` | `rgba(32, 208, 144, 0.26)` | `success-banner.tsx` (banner border) | `rgba(14, 122, 85, 0.20)` -- propose new token `--al-status-positive-border` | **No direct AL token exists.** The design system has `*-bg` (0.10) tokens for status tints but no `*-border` tokens. The recommended approach: use the `--al-status-positive` base color at 0.20 opacity. This follows the hairline opacity ladder pattern (`.20` for dividers/subtle borders) documented in `colors.css`. A new semantic token `--al-status-positive-border` should be added to `globals.css` alongside the existing status tokens for reuse. |
| `--color-accent-amber` | `#e8a232` | `booking-management-choice.tsx` ("Recommended" badge text) | `var(--al-status-caution)` (`#c97a2a`) | AL's caution status is the semantic amber. Both are warm amber/gold tones used for attention-drawing labels. `--al-status-caution` is slightly deeper and less saturated, consistent with AL's editorial restraint. The "Recommended" badge is functionally an attention callout, which aligns with the caution/pending semantic role. |
| `--color-brand-border` | `rgba(61, 212, 200, 0.22)` | `booking-management-choice.tsx` (card hover border) | `var(--al-hairline-strong)` (`rgba(195, 198, 209, 0.50)`) | **No tinted-brand-border concept exists in AL.** Deep Ledger used a teal-tinted border for interactive hover; AL uses neutral hairlines at varying opacities for all borders. The design system's card components use `--al-hairline-strong` (0.50 opacity) for interactive/hover borders and `--al-hairline-rest` (0.30) for resting state. The hover effect should transition from `--al-hairline-rest` to `--al-hairline-strong` rather than introducing a brand-tinted border. This follows the effects spec: "Separation is otherwise done with hairlines, never boxes." |
| `bg-white/10 text-text-light-muted` | `rgba(255,255,255,0.1)` bg + `#A1A5AB` text | `confirmation-status-badge.tsx` ("none" status) | `bg: var(--al-status-neutral-bg)` (`#eeeeec`) + `color: var(--al-status-neutral)` (`#43474f`) | These Tailwind classes are dark-theme idioms (white at 10% on dark surface, light-muted text). In AL, the "none" status maps directly to the neutral status tier. The `StatusPill` component uses `{ fg: --al-status-neutral, bg: --al-status-neutral-bg }` for this exact purpose. The badge should follow the same pattern as the other statuses in `confirmation-status-badge.tsx`, using the AL status-neutral pair. |

---

## New Token Proposal

One new token is needed. The others map to existing AL tokens.

```css
/* Add to globals.css alongside --al-status-positive and --al-status-positive-bg */
--al-status-positive-border: rgba(14, 122, 85, 0.20);
```

**Rationale:** The success banner is the only component currently needing a status-positive border, but the pattern (bg at 0.10, border at 0.20, foreground at 1.0) is a natural extension of the existing status token system. Adding the token now prevents future one-off `rgba()` literals when other components need success borders.

**Optional follow-up tokens** (not required for Wave 1, but worth considering for completeness):

```css
--al-status-negative-border: rgba(168, 41, 74, 0.20);
--al-status-caution-border:  rgba(201, 122, 42, 0.20);
--al-status-neutral-border:  rgba(67, 71, 79, 0.20);
```

---

## Answers to Open Questions (from Wave 1 Shape)

**Q1: Should `--color-success` map to `--al-status-positive`?**
Yes. The success banner communicates a positive outcome ("Your shop is ready to accept bookings!"). This is semantically identical to the positive/settled/paid status. Using `--al-status-positive` keeps the color vocabulary unified.

**Q2: Should the "none" confirmation badge use an AL neutral style?**
Yes. Use `--al-status-neutral` / `--al-status-neutral-bg`. The current `bg-white/10` is a dark-theme artifact. In the light theme, the neutral pair (`#43474f` on `#eeeeec`) provides the correct minimal-but-visible treatment. This also brings the "none" status inline with the `StatusPill` component pattern from the design system.

---

## Implementation Notes

- All recommended tokens already exist in `docs/design-system/tokens/colors.css` and `src/app/globals.css` except `--al-status-positive-border`.
- The `--al-status-neutral` / `--al-status-neutral-bg` pair exists in the design system source (`colors.css` lines 87-88) but is **not yet declared** in `src/app/globals.css`. It must be added alongside the other status tokens (after line 364 in globals.css) before it can be used by `confirmation-status-badge.tsx`.
- The `--al-hairline-rest` and `--al-hairline-strong` tokens exist in the design system source but are also **not yet in production `globals.css`**. Spec #03 (Missing AL Tokens) already lists `--al-hairline-rest` and `--al-hairline-strong` in its "to be added" set -- this spike confirms they are needed for the `--color-brand-border` replacement.
- No source code changes were made by this spike.
