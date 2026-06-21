---
name: astro-design
description: Use this skill to generate well-branded interfaces and assets for Astro (the "Atelier Light" / Modern Atelier system), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping booking-protection / studio-management UIs.
user-invocable: true
---

Read `readme.md` in this skill first — it covers product context, content fundamentals, visual foundations, and iconography. Then explore the other files.

- **Tokens & global CSS:** link `styles.css` (it `@import`s everything in `tokens/`). Prefer the `--al-*` custom properties (or the `--bg` / `--ink` / `--hairline` semantic aliases) over hardcoded hex.
- **Components:** authored in `components/` and compiled to `window.AstroDesignSystem_424d7f` via `_ds_bundle.js`. Read each component's `.prompt.md` for usage. Mount in HTML with `const { Button, Sheet, StatusPill, … } = window.AstroDesignSystem_424d7f`.
- **UI kit:** `ui_kits/app/` is an interactive recreation of the Astro studio-management app — copy its screen JSX as a starting point for new product surfaces.
- **Foundation cards:** `guidelines/*.card.html` are live specimens of color, type, spacing, and brand.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy the assets/tokens you need and produce static HTML files for the user to view. If working on production code, copy assets and follow the rules in `readme.md` to design as an Astro brand expert.

Brand non-negotiables to honor every time: light theme only; navy `#001e40` is the only ink and CTA (always the navy gradient); terracotta is rationed to avatars; every data number is tabular + mono; eyebrows are 10–11px / 800 / .2em / UPPERCASE; one card elevation, hairlines not boxes; Material Symbols icons only (fill 0→1 for active); motion stays under ~0.3s.

If the user invokes this skill without other guidance, ask what they want to build, ask a few clarifying questions, and act as an expert Astro designer who outputs HTML artifacts or production code as needed.
