# Astro Marketing Site — UI Kit

The Astro public landing page, rebuilt in the **Atelier Light** system. (The site previously ran a dark theme; the whole product is now one system — light, editorial, navy + rationed terracotta.) Imagery is **editorial product vignettes**, not stock photography, staying true to the no-photo aesthetic.

## Files
- `index.html` — full scrolling page; assembles every section.
- `MarketingNav.jsx` — sticky glass top nav with brand mark + CTA.
- `MarketingHero.jsx` — headline + CTAs + an Atelier Light schedule-preview card (avatars, status pills, mono metrics).
- `HowItWorks.jsx` — 3 numbered steps on a sunken surface; exports `SectionKicker`.
- `FeatureRows.jsx` — 3 alternating feature rows, each with a product vignette (client scoring / slot-recovery SMS / deposit receipt) and floating stat cards.
- `Pricing.jsx` — one plan, monthly/annual toggle, feature checklist.
- `MarketingClose.jsx` — FAQ accordion + a navy ledger-band CTA + footer.
- `booking.html` + `Booking.jsx` — the client-facing **booking page** (selected service, date, slot grid, contact fields, SMS/email opt-ins, confirm + success state), redesigned in Atelier Light from the production `/book/[slug]` flow.

## Composition
Sections compose the published primitives (`Button`, `Badge`, `Avatar`, `StatusPill`, `Icon`) from `window.AstroDesignSystem_424d7f`. Marketing-only pieces (FloatCard, vignettes, pricing card) live inside this kit, not the component library.

## Copy
All headlines, step text, feature copy, pricing, and FAQ are the real strings from the production landing page (`src/components/landing/*`, `src/app/page.tsx`).
