# Prompt: Generate UI Context Document

You are auditing the visual design system and UI implementation of an existing codebase. Explore the stylesheets, theme config, component files, and rendered output thoroughly. Produce a single markdown document with the following sections. Describe what the code *actually implements*, not what a design brief might wish for.

---

### 1. Theme Summary
Two sentences: the visual identity (light/dark, tone, aesthetic lineage) and the primary constraint that shapes every decision (e.g., "no rounded corners", "monochrome only", "accessibility-first"). Include the one-line brand test — a sentence that defines what the design is *not* (e.g., "If it could appear in a SaaS dashboard template, redesign it").

### 2. Token Map
Extract every design token from the source of truth (CSS variables, Tailwind theme, design-tokens file, styled-components theme). Present as a single annotated code block showing the actual config. Group by: colors, fonts, shadows, radii, motion/easing, spacing scale, breakpoints. Note the token naming convention and where they're defined.

### 3. Color Usage Guide
Two tables — one for light contexts, one for dark. Columns: **Token/Utility** | **Value** | **Where used**. Map every color to its actual usage in components, not just its name. Call out accent frequency rules (e.g., "gold appears N times per viewport") and any colors that exist in the config but are unused.

### 4. Typography
#### Scale
Table format. Columns: **Usage** | **Size** | **Weight** | **Tracking** | **Family**. List every distinct type treatment from largest (hero) to smallest (micro labels). Note which sizes use fluid/clamp values vs fixed.

#### Font Loading
Show the actual font loading implementation (next/font, @font-face, Google Fonts link, local files). Note weights and styles loaded.

#### Pairing Rules
State the hierarchy rule that governs which family is used where (e.g., "display = serif italic, everything else = sans"). Flag any violations found in the codebase.

### 5. Layout System
#### Containers
Show the actual container patterns with classes/styles. Note max-widths, padding, and how they respond to breakpoints.

#### Section Spacing
Document the vertical rhythm — section padding, gap patterns, and how they change at each breakpoint.

#### Grid Patterns
Table format. Columns: **Pattern** | **Implementation** | **Used in**. List every distinct grid/flex layout pattern actually used. Note the responsive collapse behavior for each.

### 6. Component Recipes
For each recurring UI pattern, provide the actual implementation snippet (JSX/HTML + classes) as found in the codebase. Cover at minimum:
- Section header (eyebrow + title + lede)
- Card variants (each distinct card style)
- Button variants (each distinct CTA style)
- Navigation states (default, scrolled, mobile)
- Form field pattern
- Any brand-signature micro-interactions

Present as copy-pasteable code blocks. One block per pattern.

### 7. Interaction States
Single table. Columns: **Element** | **Hover** | **Active/Press** | **Focus**. Cover every interactive element. Note what is *not* done (e.g., "no shadow change on card hover", "no color inversion").

### 8. Shadows & Elevation
List every shadow token and where it's used. State the elevation philosophy (e.g., "cards use hairlines not shadows", "only nav and modals float").

### 9. Borders & Corners
State the radius philosophy and list exceptions. Document border/divider patterns including any hairline-grid techniques.

### 10. Imagery & Media
Document background image treatments (overlays, gradients, blend modes), photography style constraints, and icon usage patterns. Include actual overlay code if gradient overlays are used.

### 11. Animation & Motion
#### Easing & Duration
List every timing function and duration token. State whether there's a single canonical curve or multiple.

#### Scroll Reveals
Document the reveal-on-scroll pattern (implementation, threshold, direction). Note stagger rules.

#### Signature Animations
Document any branded animations (hero sequences, micro-interactions, loading states) with keyframes and timing.

### 12. Breakpoints
Table. Columns: **Name** | **Value** | **Direction** (min/max) | **What collapses**. State whether the system is mobile-first or desktop-first. Note which breakpoint utilities to use and which to avoid.

### 13. Brand Non-Negotiables
Numbered list of absolute rules extracted from the implementation. These are the constraints a contributor must never break. Write each as a direct prohibition or requirement. Aim for 8-12 rules.

---

### 14. Design System Quality Assessment

Score each dimension **1-5** (1 = significant problems, 5 = excellent). One-sentence justification per score.

| Dimension | Score | Evidence |
|---|---|---|
| **Token coverage** | | Are all visual values tokenized, or are magic numbers scattered in components? |
| **Token consistency** | | Are tokens used correctly everywhere, or do components bypass them with hardcoded values? |
| **Naming clarity** | | Do token names communicate intent (e.g., `ink-body`) or just describe values (e.g., `gray-600`)? |
| **Responsive coherence** | | Do breakpoints produce intentional layouts, or do things just stack/shrink? |
| **Typography discipline** | | Is the type scale followed consistently, or do components invent ad-hoc sizes? |
| **Component reuse** | | Are UI patterns extracted into reusable components, or copy-pasted with drift? |
| **Interaction consistency** | | Do hover/focus/active states follow a unified pattern across all interactive elements? |
| **Animation restraint** | | Is motion purposeful and unified, or inconsistent/excessive? |
| **Accessibility baseline** | | Color contrast, focus indicators, semantic markup, ARIA where needed. |
| **Dead code / drift** | | Unused tokens, orphaned styles, components that diverge from the stated system. |

**Top 3 risks:** Where the design system is most likely to break or drift.

**Top 3 strengths:** What's worth preserving and building on.

---

### Output rules
- Every claim must reference a specific file path, class name, or token.
- Show actual code from the codebase, not idealized examples.
- If the codebase has no formal design system, document the *implicit* one — the patterns that repeat.
- If a stated convention is violated somewhere, note both the rule and the violation.
- Prefer tables and code blocks over prose.
- Target 300-500 lines. Cut anything that doesn't help a new contributor ship a visually correct screen on day one.
