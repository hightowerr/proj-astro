# Drift: Rebrand Wave 1

## Date
2026-07-14

## Scope
Wave 1 (P0-metadata, P1-site-header, P1-auth-brand, P1-booking-nav, P1-site-footer, P2-auth-cta, P2-landing-copy)

## Divergences

### D1: features-carousel.tsx demo URL
- Spec: not listed (P2-landing-copy only listed brand name text)
- What diverged: `astro.app/book` demo URL existed at line 207, not in spec
- Classification: EVOLUTION
- Why: Post-sweep grep found additional brand reference in a demo URL; fixing it is a genuine improvement — customers would see "astro.app" on a showup.dev page

### D2: page.tsx feature card descriptions (×2)
- Spec: not listed (P2-landing-copy didn't cover page.tsx FeatureSection)
- What diverged: Two `description` props in page.tsx referenced "Astro" (lines 20, 41)
- Classification: EVOLUTION
- Why: Post-sweep grep found references in a component not audited during shaping; the strings are customer-facing landing page copy

### D3: shop-details-step.tsx onboarding demo URL
- Spec: not listed
- What diverged: `astro.com/book/` demo URL in onboarding wizard (line 174)
- Classification: EVOLUTION
- Why: Onboarding preview showing the old domain would confuse new merchants during setup

### D4: Coder agent used wrong domain
- Spec: domain is `showup.dev`
- What diverged: Agent initially wrote `showup.app` for features-carousel URL
- Classification: EVOLUTION (caught and corrected by human)
- Why: Agent hallucinated a plausible-sounding domain; manual review caught it

## Spec inaccuracy (not a divergence)
P4-internal-docs claims `auth-origins.test.ts` has "0 matches" for Astro, but file contains 3 `astro.example.com` fixture URL references (lines 8, 11, 15). These are test fixture URLs, not brand references, so excluding them from scope is reasonable — but the claim of "0 matches" is factually incorrect. Spec should say "has fixture URLs with `astro.example.com` — excluded from scope (test data, not brand copy)."

## Remaining specs vs implementation
- P3-app-copy: no conflicts. Line numbers (294, 922) verified accurate.
- P3-email-rebrand: no conflicts. Line numbers (106, 115, 117, 122) verified accurate. Cross-dep with typography fix unchanged.
- P4-internal-docs: no conflicts. Line numbers (1, 7, 10, 11, 13, 79, 83) verified accurate. Spec inaccuracy noted above.

## Quality ratchet
Evolution/shortcut ratio: 4/0 (0% shortcuts)
All divergences were finding and fixing additional brand references not caught during shaping.
