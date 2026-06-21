# Astro App — UI Kit

Interactive, high-fidelity recreation of the **Astro** studio-management app, built in the Atelier Light system. This is the core product surface: a two-column admin shell where salon and barbershop owners monitor bookings, reliability scoring, and automated SMS recovery.

## Files
- `index.html` — interactive shell; click the sidebar to switch screens.
- `AppShell.jsx` — 264px sidebar (brand mark + nav + profile) and main column. Composes `Icon`, `Avatar`.
- `Dashboard.jsx` — KPI summary cards (mono numerics) + high-risk attention ledger.
- `Appointments.jsx` — the canonical ledger: `FilterPills` + sort menu + hairline-separated table rows with `StatusPill` outcome/payment/tier.
- `Customers.jsx` — reliability roster with tier distribution and score bars.
- `Reminders.jsx` — reminder cadence toggles (`Switch`), the signature capacity dial, and an SMS template preview.

## Composition notes
Every screen composes the published primitives (`Sheet`, `SectionHeader`, `StatusPill`, `Avatar`, `Button`, `FilterPills`, `Switch`, `Icon`) from `window.AstroDesignSystem_424d7f` — no re-implemented components. Data is mocked inline; interactions (filter, sort, toggle, navigate) are real but local.

## Brand fidelity
- Navy ink + CTA, rationed terracotta (avatars only), tabular mono numerals.
- One card elevation (`--al-shadow-float`); hairline row dividers; no hover-lift.
- Eyebrow motif on every section; Material Symbols icons (fill 0→1 for active nav).
