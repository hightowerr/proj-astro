# Spike: Mixed Styling Coexistence

## Context

The booking page is being partially restyled — 5 of 9 components switch from `--color-*` to `--al-*` tokens. We need to understand if both token sets coexist and what visual conflicts arise.

## Goal

Identify whether both token sets are available simultaneously and where visual conflicts will appear during the mixed-style period.

## Questions & Answers

| # | Question | Answer |
|---|----------|--------|
| **S2-Q1** | Can `--color-*` and `--al-*` coexist? | Yes. Both are defined in `globals.css` — `--color-*` in `@theme inline {}` (lines 3-207), `--al-*` in `:root {}` (lines 258-383). No conflict; both active on every page. A bridge layer (`--color-al-*` aliases at lines 170-206) enables Tailwind utilities for AL tokens. |
| **S2-Q2** | Which unstyled sections use `--color-*`? | **Time slots:** `--color-brand`, `--color-surface-void`, `--color-border-default`, `--color-surface-overlay`, `--color-text-secondary`. **Contact fields:** shadcn `<Input>`/`<Label>` (already mapped to AL via `:root`). **Submit button:** `--color-brand`, `--color-brand-dim`, `--color-surface-void`. **Payment step:** `--color-surface-raised`, `--color-brand`, `--color-error-*`, plus hardcoded Deep Ledger hex in Stripe appearance. **Success state:** Mix of Tailwind classes (`text-white`, `bg-bg-dark-secondary/70`) and inline `--color-*`. |
| **S2-Q3** | Are `--al-*` tokens available? | Yes. Already defined and active in `:root`. No additional CSS changes needed. |
| **S2-Q4** | Visual conflict risks? | **Yes — three specific risks identified below.** |

## Visual Conflict Risks

### Risk 1: Hard edge at restyled/unstyled boundary (HIGH)

The service card (restyled, `#f4f4f2` bg) sits directly above the time-slot grid (unstyled, `--color-surface-overlay` = dark `#1d2738`). This creates a jarring light-to-dark boundary.

**Mitigation:** The time-slot buttons use inline `var(--color-*)` styles with no background on the container itself. The slot buttons float on the page background. Since the page background will be `#f9f9f7` (AL surface), the dark-styled slot buttons will look like dark pills on a light surface — unusual but not broken. The bigger issue is the selected-slot style using `--color-brand` (teal `#3dd4c8`) which won't match the navy AL palette.

**Verdict:** Tolerable. The slot grid will look "off-brand" but functional. Not a blocker.

### Risk 2: Stripe Elements hardcoded to dark theme (MEDIUM)

`stripeElementsAppearance` (line 111-150) uses hardcoded Deep Ledger hex values (`#1d2738`, `#3dd4c8`, `#8aa2bc`). The payment step is NOT in the current reskin scope, but if the surrounding page is light, the dark Stripe embed will look jarring.

**Mitigation:** Payment step is behind a state transition (user submits form first). It's not visible alongside the restyled components. Not a problem during the mixed period.

**Verdict:** Not a blocker. Address when spec 08 ships.

### Risk 3: shadcn components already on AL tokens (LOW)

`<Input>` and `<Label>` from shadcn resolve through `:root` mappings that already point to Atelier Light values. The contact form fields are already light-themed even in the "unstyled" state.

**Mitigation:** This is actually helpful — the contact form fields will blend with the restyled components above them. No action needed.

**Verdict:** Positive — reduces the mixed-style jarring.

## Conclusion

Both token sets coexist safely. The main visual artifact is the time-slot grid using teal brand colors (`--color-brand`) on a light background. This is tolerable for the mixed period and will be resolved when spec 05 ships. No blocking issues.
