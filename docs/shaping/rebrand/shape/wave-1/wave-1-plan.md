# Wave 1 — Core Rebrand Implementation Plan

## Scope

21 string replacements across 8 source files. All P0 + P1 + P2 specs. Ship as one atomic PR.

## Acceptance Criteria

1. `grep -r "Astro" src/app/layout.tsx src/components/site-header.tsx src/components/auth/auth-brand-bar.tsx src/components/booking/booking-nav.tsx src/components/site-footer.tsx src/components/auth/sign-in-button.tsx src/components/landing/` returns **0 matches**
2. `grep -r "ASTRO" src/components/booking/booking-nav.tsx` returns **0 matches**
3. `pnpm check` passes (lint + typecheck)
4. No logic, routing, or layout changes — diff shows only string content changes
5. Brand mark (icon) code untouched
6. `--al-*` tokens untouched

## Files to Modify

| File | Replacements | Spec |
|------|:---:|------|
| `src/app/layout.tsx` | 1 | P0-metadata |
| `src/components/site-header.tsx` | 3 | P1-site-header |
| `src/components/auth/auth-brand-bar.tsx` | 1 | P1-auth-brand |
| `src/components/booking/booking-nav.tsx` | 2 | P1-booking-nav |
| `src/components/site-footer.tsx` | 2 | P1-site-footer |
| `src/components/auth/sign-in-button.tsx` | 1 | P2-auth-cta |
| `src/components/landing/hero-section.tsx` | 1 | P2-landing-copy |
| `src/components/landing/faq-section.tsx` | 5 | P2-landing-copy |
| `src/components/landing/how-it-works.tsx` | 3 | P2-landing-copy |
| `src/components/landing/features-carousel.tsx` | 1 | P2-landing-copy |
| `src/components/landing/pricing-section.tsx` | 1 | P2-landing-copy |

## Implementation Sequence

Single sweep — no ordering constraints within this wave. All replacements are independent.

1. Open each file
2. Replace "Astro" → "ShowUp" (mixed case contexts)
3. Replace "ASTRO" → "SHOWUP" (uppercase contexts — booking-nav only)
4. Replace "Astro Pro" → "ShowUp Pro" (pricing-section only)
5. Update aria-labels: "Astro homepage" → "ShowUp homepage" (site-header, booking-nav)
6. Update copyright: "© 2025 Astro." → "© 2025 ShowUp."
7. Run `pnpm check`
8. Run acceptance criteria grep to verify zero remaining occurrences

## Post-sweep Verification (cascading-rename signal)

After all replacements, grep for partial matches that could indicate missed references:

```bash
grep -ri "astro" src/app/layout.tsx src/components/site-header.tsx src/components/auth/ src/components/booking/booking-nav.tsx src/components/site-footer.tsx src/components/landing/
```

This catches: aria-labels, alt text, data attributes, comments, or any non-obvious string reference.

## Dependencies

- **Requires:** nothing
- **Blocks:** Wave 2 (P3 + P4 specs)

## DO NOT

- Modify brand mark icon code
- Change `--al-*` token names
- Change any logic, routing, or layout
- Self-test with Playwright (Phase 3 handles verification)
