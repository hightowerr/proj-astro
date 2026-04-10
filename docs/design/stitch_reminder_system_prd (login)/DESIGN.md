# Design System Specification: High-End Editorial Experience

## 1. Overview & Creative North Star: "The Modern Atelier"

The Creative North Star for this design system is **The Modern Atelier**. It represents a space where artisanal craftsmanship meets digital precision. Unlike generic "SaaS-standard" layouts that rely on rigid grids and heavy borders, this system treats the screen as a curated editorial canvas.

We achieve a premium feel through **intentional asymmetry** and **tonal layering**. By utilizing high-contrast typography scales and generous, "expensive" whitespace (Spacing 16-24), we create a sense of calm and authority. The experience should feel less like an app and more like a high-end invitation or a boutique gallery catalog—breathable, sophisticated, and deeply tactile. The global spacing is set to `2`.

---

## 2. Color & Surface Philosophy

The palette is rooted in warmth. We avoid "dead" grays in favor of "living" neutrals that feel organic and human.

### Surface Hierarchy & The "No-Line" Rule
*   **The Rule:** Standard 1px solid borders are strictly prohibited for sectioning. 
*   **The Execution:** Boundaries are created through background shifts. A section should transition from `surface` (#f9f9f7) to `surface_container_low` (#f4f4f2) to define a change in context.
*   **Nesting:** Treat the UI as physical layers of fine paper. For example, a `surface_container_lowest` (#ffffff) card should sit atop a `surface_container_low` (#f4f4f2) background to create a soft, natural lift.

### Glass & Gradient Soul
To move beyond a flat digital look, use **Glassmorphism** for floating elements (like navigation bars or modals).
*   **Token Usage:** Use semi-transparent `surface` colors with a `backdrop-blur` of 20px.
*   **Gradients:** Hero sections or primary CTAs should utilize subtle gradients (e.g., `primary` #001e40 transitioning to `primary_container` #003366) to add depth and "visual soul" that flat color cannot replicate.

---

## 3. Typography: Editorial Authority

We use **Manrope** for its modern, geometric clarity and humanist warmth.

*   **Display (lg/md/sm):** These are your "statement" levels. Use `display-lg` (3.5rem) with tight letter-spacing for hero headlines to create an authoritative, editorial impact.
*   **Headlines & Titles:** Use `primary` (#001e40) for these to ensure high contrast and immediate hierarchy.
*   **Body & Labels:** Use `on_surface_variant` (#43474f) for body copy. This warm-toned gray maintains legibility while feeling softer than pure black, contributing to the "High-End" aesthetic.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are often a crutch for poor layout. In this system, we prioritize **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by "stacking" surface tiers. Place a `surface_container_highest` (#e2e3e1) element inside a `surface_container` (#eeeeec) to denote a specialized interactive zone.
*   **Ambient Shadows:** If a floating effect is required (e.g., a dropdown), use an extra-diffused shadow. 
    *   *Spec:* `0px 20px 40px rgba(26, 28, 27, 0.06)`. The shadow color must be a tinted version of `on_surface`, never pure black.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline_variant` at **20% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons
*   **Primary:** `primary` background with `on_primary` text. Use `xl` (1.5rem) roundedness. 
*   **Secondary:** `secondary_container` background with `on_secondary_container` text. This provides a soft, peach-toned alternative that feels premium.
*   **Tertiary:** No background; use `on_surface` text with an underline that appears on hover.

### Input Fields
*   **Styling:** Forgo the four-sided box. Use a `surface_container_low` background with a soft `md` corner radius. 
*   **States:** On focus, transition the background to `surface_container_high` and add a "Ghost Border" of `primary` at 20% opacity.

### Cards & Lists
*   **The Divider Rule:** Strictly forbid horizontal divider lines. 
*   **Spacing as Structure:** Use the Spacing Scale (`8` or `10`) to separate list items. 
*   **Grouping:** Use `surface_container` backgrounds to group related items together rather than drawing lines around them.

### Signature Component: The Curator Chip
Used for categories or filters. Use `secondary_fixed` (#ffdbcf) with `on_secondary_fixed` text. The roundedness should be `full` to create a pill shape that contrasts against the more structured headline elements.

---

## 6. Do's and Don'ts

### Do
*   **DO** use asymmetric layouts (e.g., a large image offset against right-aligned text) to create a "custom-designed" feel.
*   **DO** use the `24` (8.5rem) spacing token for top-level section padding to give content room to breathe.
*   **DO** use "Glassmorphism" for navigation overlays to keep the warm `background` color visible beneath.

### Don'ts
*   **DON'T** use 1px solid gray lines. This immediately makes the UI look like a generic template.
*   **DON'T** use high-contrast drop shadows. They break the "Atelier" softness.
*   **DON'T** crowd the edges. If a container feels full, increase the padding using the Spacing Scale (move from `3` to `5`).
*   **DON'T** use pure #000000 for text. Use `primary` (#001e40) for titles and `on_surface` (#1a1c1b) for body.