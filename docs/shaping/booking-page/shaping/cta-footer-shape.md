# CTA + Footer Reskin — Shaping Document

**Scope:** Restyle confirm-booking CTA (spec 08) + add booking footer (spec 09). Spec 07 already implemented.
**Appetite:** Now
**Constraint:** Design change only — no new functionality

---

## Frame

### Problem

- The "Confirm booking" button uses `--color-*` (Deep Ledger) tokens — teal brand color, flat appearance, no gradient or shadow
- Loading state is just text change ("Booking…") + opacity — spec calls for a CSS spinner
- Error block above the button uses `--color-error-*` tokens
- No footer on the booking page (SiteFooter removed in V1; spec 09 defines a minimal branded footer)
- These are the last 2 unimplemented specs (7 of 9 complete)

### Outcome

- CTA button matches Atelier Light: navy gradient, shadow, spinner loading state, disabled styling for isSubmitting
- Error block restyled to `--al-*` tokens
- Minimal booking footer with brand mark + "Powered by Astro · Protected booking" text
- 9 of 9 booking page specs complete

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Restyle confirm-booking CTA + add booking footer per specs 08 and 09 | Core goal |
| R1 | CTA: navy gradient bg, white 14px/700 text, 16px 24px padding, 12px radius, CTA shadow | Must-have |
| R2 | CTA loading (isSubmitting): text hidden, 20px white spinner centered via CSS @keyframes | Must-have |
| R3 | CTA disabled (isSubmitting): `#e8e8e6` bg, `#737780` text, no shadow, cursor not-allowed | Must-have |
| R4 | Error block: restyle from `--color-error-*` to `--al-error` / `--al-error-container` tokens | Must-have |
| R5 | Footer: centered brand mark (28px navy square + icon) + "ASTRO" name + attribution text, hairline top border | Must-have |
| R6 | Footer placed in `src/app/book/layout.tsx` after `{children}` | Must-have |
| R7 | No functional changes — existing form submission, isSubmitting toggle, error display unchanged | Must-have |

---

## Token Availability

| Token | Exists? | Value |
|-------|:-------:|-------|
| `--al-gradient-cta` | Yes | `linear-gradient(135deg, #001e40, #003366)` |
| `--al-surface-container-high` | Yes | `#e8e8e6` |
| `--al-outline` | Yes | `#737780` |
| `--al-error` | Yes | `#ba1a1a` |
| `--al-error-container` | Yes | `#ffdad6` |

---

## Shape

### A: Inline CTA restyle + keyframes in globals.css + new BookingFooter

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | Add `@keyframes al-spin` to `globals.css` + `.al-cta-loading` class for spinner | |
| **A2** | Restyle CTA button: navy gradient, shadow, 14px/700 text, 16px 24px padding. isSubmitting → spinner class + disabled styling | |
| **A3** | Restyle error block: `--al-error` text, `--al-error-container` bg, AL border/radius | |
| **A4** | Create `BookingFooter` server component with brand mark + attribution | |
| **A5** | Add `BookingFooter` to `src/app/book/layout.tsx` after `{children}` | |

### Fit Check (R × A)

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | Restyle confirm-booking CTA + add booking footer per specs 08 and 09 | Core goal | ✅ |
| R1 | CTA: navy gradient bg, white 14px/700 text, 16px 24px padding, 12px radius, CTA shadow | Must-have | ✅ |
| R2 | CTA loading (isSubmitting): text hidden, 20px white spinner centered via CSS @keyframes | Must-have | ✅ |
| R3 | CTA disabled (isSubmitting): #e8e8e6 bg, #737780 text, no shadow, cursor not-allowed | Must-have | ✅ |
| R4 | Error block: restyle from --color-error-* to --al-error / --al-error-container tokens | Must-have | ✅ |
| R5 | Footer: centered brand mark + name + attribution, hairline top border | Must-have | ✅ |
| R6 | Footer placed in layout.tsx after {children} | Must-have | ✅ |
| R7 | No functional changes | Must-have | ✅ |

**Selected shape: A**
