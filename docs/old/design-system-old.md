# Astro Design System v2.0 — "Deep Ledger"

> Professional booking management for beauty professionals. Every token, component, and pattern.

---

## Table of Contents

1. [Foundations](#foundations)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Border Radius](#border-radius)
6. [Shadows](#shadows)
7. [Motion & Animation](#motion--animation)
8. [Surfaces](#surfaces)
9. [Components](#components)
   - [Buttons](#buttons)
   - [Badges](#badges)
   - [Cards](#cards)
   - [Inputs & Forms](#inputs--forms)
10. [Domain Patterns](#domain-patterns)
    - [Tier System](#tier-system)
    - [Status System](#status-system)
    - [Dashboard Cards](#dashboard-cards)
    - [Data Tables](#data-tables)
11. [Utility Classes](#utility-classes)
12. [Token Index](#token-index)

---

## Foundations

### Aesthetic Direction

**"Deep Ledger"** — The records of an elegant counting house, updated for the digital age. Dark as ink on paper, teal as a jade ledger ribbon, warm amber as the glow of a desk lamp. Typography with gravitas meets functional precision.

### Design Principles

| Principle | Description |
|-----------|-------------|
| **Dark-first** | All surfaces are dark. Light mode is not supported. |
| **Layered depth** | Six surface levels create spatial hierarchy without borders. |
| **Semantic color** | Every color has a meaning. Don't use tier colors for status or vice versa. |
| **Data clarity** | Financial figures, IDs, and phone numbers always use the mono font. |
| **Purposeful motion** | Animate to orient, not to decorate. |

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 with `@theme inline` tokens
- **Components**: shadcn/ui primitives + custom layer
- **Fonts**: Google Fonts via `next/font/google`
- **Animation**: Framer Motion + CSS keyframes

---

## Color System

All colors are defined as CSS custom properties in `src/app/globals.css` under the `@theme inline` block. Reference them with `var(--token-name)` in CSS or `bg-[var(--token-name)]` in Tailwind.

### Surface Hierarchy

Six layered background levels. Always step up one level when nesting containers.

| Token | Hex | Use |
|-------|-----|-----|
| `--color-surface-void` | `#070a0f` | Modal overlays, deepest backdrop |
| `--color-surface-base` | `#0e1420` | Page background (`bg-bg-dark`) |
| `--color-surface-raised` | `#161e2c` | Cards, panels (`bg-bg-dark-secondary`) |
| `--color-surface-overlay` | `#1d2738` | Input fields, nested containers |
| `--color-surface-elevated` | `#253044` | Hover states, tooltips |
| `--color-surface-float` | `#2e3a52` | Dropdowns, floating elements |

### Brand — Luminous Teal

| Token | Value | Use |
|-------|-------|-----|
| `--color-brand` | `#3dd4c8` | Primary CTAs, active states, links |
| `--color-brand-hover` | `#2abfb3` | Hover state for brand elements |
| `--color-brand-dim` | `#1a9990` | Pressed/active state |
| `--color-brand-subtle` | `rgba(61,212,200,0.08)` | Tinted backgrounds |
| `--color-brand-border` | `rgba(61,212,200,0.22)` | Brand-tinted borders |
| `--color-brand-glow` | `rgba(61,212,200,0.14)` | Focus rings, glow effects |

**Backwards-compat aliases**: `--color-primary`, `--color-primary-light`, `--color-primary-dark`

### Accent — Warm Amber

| Token | Value | Use |
|-------|-------|-----|
| `--color-accent-amber` | `#e8a232` | Secondary actions, financial highlights |
| `--color-accent-amber-hover` | `#d48e20` | Hover state |
| `--color-accent-amber-subtle` | `rgba(232,162,50,0.1)` | Tinted backgrounds |

**Backwards-compat aliases**: `--color-accent-coral`, `--color-accent-coral-hover`, `--color-accent-peach`

### Semantic Status

Each status has three variants: base, subtle (background), border.

| Status | Base | Subtle | Border |
|--------|------|--------|--------|
| **Success** | `--color-success` `#20d090` | `--color-success-subtle` | `--color-success-border` |
| **Warning** | `--color-warning` `#e8a232` | `--color-warning-subtle` | `--color-warning-border` |
| **Error** | `--color-error` `#f45878` | `--color-error-subtle` | `--color-error-border` |
| **Info** | `--color-info` `#3dd4c8` | `--color-info-subtle` | — |

**Backwards-compat aliases**: `--color-success-green`, `--color-error-red`, `--color-warning-amber`

### Text Scale

| Token | Value | Use |
|-------|-------|-----|
| `--color-text-primary` | `#edf2f7` | Headings, primary body copy |
| `--color-text-secondary` | `#8aa2bc` | Labels, descriptions, table data |
| `--color-text-tertiary` | `#485f74` | Metadata, timestamps, placeholders |
| `--color-text-inverse` | `#070a0f` | Text on brand/light backgrounds |

**Backwards-compat aliases**: `--color-text-muted`, `--color-text-light-muted`

### Border Opacity Scale

| Token | Value | Use |
|-------|-------|-----|
| `--color-border-hairline` | `rgba(255,255,255,0.04)` | Row dividers |
| `--color-border-subtle` | `rgba(255,255,255,0.07)` | Section dividers |
| `--color-border-default` | `rgba(255,255,255,0.11)` | Card borders |
| `--color-border-medium` | `rgba(255,255,255,0.18)` | Input borders, emphasis |
| `--color-border-strong` | `rgba(255,255,255,0.30)` | Active/focused borders |

---

## Typography

Three font families loaded via `next/font/google` and exposed as CSS variables on the root element.

### Font Families

| Role | Family | CSS Variable | Tailwind class |
|------|--------|--------------|----------------|
| **Display** | Cormorant Garamond | `--font-display` / `--font-cormorant` | `font-display` |
| **Body** | Bricolage Grotesque | `--font-body` / `--font-bricolage` | `font-body` |
| **Mono** | Fira Code | `--font-mono` / `--font-fira-code` | `font-mono` |

**Display (Cormorant Garamond)** — Elegant optical-size serif. Used for page titles, section headings, hero text, and large financial figures. Weights: 300, 400, 500, 600, 700 (normal + italic).

**Body (Bricolage Grotesque)** — Humanist grotesque with distinctive personality. Used for all UI text, labels, descriptions, and body copy. The default `font-family` on `body`. Weights: 200–800.

**Mono (Fira Code)** — Clean monospace with ligatures. Used for transaction IDs, phone numbers, deposit amounts, timestamps, and any tabular data. Weights: 300, 400, 500.

### Usage Rules

- Always use **display font** for headings (`h1`–`h4`) — handled automatically via `@layer base`
- Always use **mono font** for: phone numbers, amounts (£), IDs, codes, timestamps
- Never use Inter, Roboto, or system-font stacks in new components

### Type Scale

| Class | Size | Use |
|-------|------|-----|
| `text-7xl` | 72px | Hero / landing page |
| `text-5xl` | 48px | Page title |
| `text-3xl` | 30px | Section title |
| `text-2xl` | 24px | Card heading |
| `text-xl` | 20px | Subheading |
| `text-base` | 16px | Body text |
| `text-sm` | 14px | Secondary / table data |
| `text-xs` | 12px | Labels / metadata |

---

## Spacing & Layout

### Spacing Scale (4px base grid)

| Token | px | rem | Tailwind |
|-------|----|-----|---------|
| 1 | 4px | 0.25rem | `p-1`, `m-1` |
| 2 | 8px | 0.5rem | `p-2`, `m-2` |
| 3 | 12px | 0.75rem | `p-3`, `m-3` |
| 4 | 16px | 1rem | `p-4`, `m-4` |
| 6 | 24px | 1.5rem | `p-6`, `m-6` |
| 8 | 32px | 2rem | `p-8`, `m-8` |
| 12 | 48px | 3rem | `p-12`, `m-12` |
| 16 | 64px | 4rem | `p-16`, `m-16` |
| 24 | 96px | 6rem | `p-24`, `m-24` |

### Container

```html
<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
```

### Responsive Grid Patterns

```html
<!-- 4-column dashboard grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

<!-- 2-column feature layout -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

<!-- 3-column tier layout -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
```

---

## Border Radius

| Token | Value | Tailwind | Use |
|-------|-------|---------|-----|
| `--radius-sm` | ~0.375rem | `rounded-sm` | Small elements, chips |
| `--radius-md` | ~0.5rem | `rounded-md` | Inputs, small buttons |
| `--radius-lg` | 0.625rem | `rounded-lg` | Standard buttons, tags |
| `--radius-xl` | ~0.875rem | `rounded-xl` | Cards, panels |
| `--radius-2xl` | 1rem | `rounded-2xl` | Large cards |
| `--radius-3xl` | 1.5rem | `rounded-3xl` | Hero sections, modals |
| `--radius-full` | 9999px | `rounded-full` | Badges, pills, avatars |

---

## Shadows

| Token | Use |
|-------|-----|
| `--shadow-xs` | Tight inset elements |
| `--shadow-sm` | Subtle lift |
| `--shadow-md` | Cards, dropdowns |
| `--shadow-lg` | Modals, drawers |
| `--shadow-xl` | Full-screen overlays |
| `--shadow-brand` | Brand-highlighted elements (teal glow) |

```css
/* Apply via inline style or custom Tailwind utility */
box-shadow: var(--shadow-md);
box-shadow: var(--shadow-brand); /* teal glow for selected/active */
```

---

## Motion & Animation

### Duration Scale

| Token | Value | Use |
|-------|-------|-----|
| `--duration-instant` | 80ms | Micro-interactions (toggle, checkbox) |
| `--duration-fast` | 150ms | Hover states, color transitions |
| `--duration-normal` | 250ms | Panel transitions, dropdowns |
| `--duration-slow` | 400ms | Page reveals, slide-ins |
| `--duration-slower` | 700ms | Complex orchestrated animations |

### Easing Curves

| Token | Curve | Use |
|-------|-------|-----|
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy reveals, scale-in |
| `--ease-smooth` | `cubic-bezier(0.16, 1, 0.3, 1)` | Content entering, smooth exits |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Crossfades, value changes |

### Named Keyframe Animations

| Token | Description |
|-------|-------------|
| `--animate-float` | Gentle 10px vertical float (6s loop) |
| `--animate-fade-up` | Fade in from 30px below |
| `--animate-slide-in-left` | Slide in from the left |
| `--animate-slide-in-right` | Slide in from the right |
| `--animate-scale-in` | Scale from 92% with fade |
| `--animate-pulse-glow` | Teal glow pulse (2.5s loop) |
| `--animate-shimmer` | Skeleton loading shimmer |

```css
/* Usage */
.my-element {
  animation: var(--animate-fade-up);
  animation-delay: 150ms;
}
```

### Framer Motion Patterns

```tsx
// Staggered list reveal
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
}

// Page entry
const pageEntry = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
}
```

---

## Surfaces

### Surface Nesting Pattern

Always step **up one level** when nesting. Never use the same surface level for a container and its parent.

```
Page:    surface-base
  Card:  surface-raised
    Input: surface-overlay
      Hover: surface-elevated
```

### Surface Variants

```tsx
// Default card
<div style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}>

// Glass card (for floating panels, overlays)
<div className="card-glass">

// Brand-highlighted card
<div style={{
  background: "var(--color-surface-raised)",
  border: "1px solid var(--color-brand-border)",
  boxShadow: "var(--shadow-brand)"
}}>

// Status-tinted cards
<div style={{ background: "var(--color-success-subtle)", border: "1px solid var(--color-success-border)" }}>
<div style={{ background: "var(--color-warning-subtle)", border: "1px solid var(--color-warning-border)" }}>
<div style={{ background: "var(--color-error-subtle)",   border: "1px solid var(--color-error-border)"   }}>
```

---

## Components

### Buttons

#### Primary

```tsx
<button style={{
  background: "var(--color-brand)",
  color: "var(--color-surface-void)",
  borderRadius: "var(--radius-lg)",
  padding: "0.625rem 1.25rem",
  fontSize: "0.875rem",
  fontWeight: 600,
}}>
  Confirm Booking
</button>
```

#### Secondary (Outline)

```tsx
<button style={{
  background: "var(--color-surface-elevated)",
  border: "1px solid var(--color-border-medium)",
  color: "var(--color-text-primary)",
  borderRadius: "var(--radius-lg)",
  padding: "0.625rem 1.25rem",
}}>
  View Details
</button>
```

#### Brand Outline

```tsx
<button style={{
  background: "transparent",
  border: "1px solid var(--color-brand-border)",
  color: "var(--color-brand)",
  borderRadius: "var(--radius-lg)",
  padding: "0.625rem 1.25rem",
}}>
  Manage
</button>
```

#### Destructive

```tsx
<button style={{
  background: "var(--color-error-subtle)",
  border: "1px solid var(--color-error-border)",
  color: "var(--color-error)",
  borderRadius: "var(--radius-lg)",
  padding: "0.625rem 1.25rem",
}}>
  Cancel Booking
</button>
```

#### Sizes

| Size | Padding | Font |
|------|---------|------|
| xs | `px-3 py-1.5` | `text-xs` |
| sm | `px-4 py-2` | `text-sm` |
| md | `px-5 py-2.5` | `text-sm` |
| lg | `px-6 py-3` | `text-base` |

---

### Badges

Badges use the `.status-pill` base class. Always pair a background + matching border + matching text color.

```tsx
// Confirmed
<span className="status-pill" style={{
  background: "var(--color-success-subtle)",
  border: "1px solid var(--color-success-border)",
  color: "var(--color-success)",
}}>
  Confirmed
</span>

// Pending
<span className="status-pill" style={{
  background: "var(--color-warning-subtle)",
  border: "1px solid var(--color-warning-border)",
  color: "var(--color-warning)",
}}>
  Pending
</span>

// Generic pattern
<span style={{
  display: "inline-flex",
  alignItems: "center",
  gap: "0.375rem",
  padding: "0.25rem 0.625rem",
  borderRadius: "var(--radius-full)",
  fontSize: "0.6875rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  background: "{status}-subtle",
  border: "1px solid {status}-border",
  color: "{status}",
}}>
```

#### Financial Outcome Badges

| Outcome | Color Token |
|---------|-------------|
| Settled | `--color-success` |
| Refunded | `--color-brand` |
| Voided | `--color-error` |
| Unresolved | `--color-text-secondary` |
| Deposit Held | `--color-warning` |

---

### Cards

#### Dashboard Metric Card

```tsx
<div className="rounded-2xl p-5" style={{
  background: "var(--color-surface-raised)",
  border: "1px solid var(--color-border-default)",
}}>
  <div className="flex items-center justify-between mb-4">
    <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
      Total Upcoming
    </span>
    <span>📅</span>
  </div>
  <p className="text-3xl font-semibold mb-2" style={{
    fontFamily: "var(--font-display)",
    color: "var(--color-brand)",
  }}>
    24
  </p>
  <p className="text-xs" style={{ color: "var(--color-success)" }}>
    +3 today
  </p>
</div>
```

#### Info Card with Border Accent

```tsx
<div className="rounded-2xl p-6" style={{
  background: "var(--color-surface-raised)",
  borderLeft: "3px solid var(--color-brand)",
  border: "1px solid var(--color-brand-border)",
}}>
```

---

### Inputs & Forms

#### Input Base Styles

```tsx
// Default
<input style={{
  background: "var(--color-surface-overlay)",
  border: "1px solid var(--color-border-default)",
  color: "var(--color-text-primary)",
  borderRadius: "var(--radius-lg)",
  padding: "0.625rem 0.875rem",
  fontSize: "0.875rem",
  outline: "none",
}}/>

// Focused
style={{
  border: "1px solid var(--color-brand)",
  boxShadow: "0 0 0 3px var(--color-brand-glow)",
}}

// Error
style={{
  border: "1px solid var(--color-error)",
  boxShadow: "0 0 0 3px var(--color-error-subtle)",
}}

// Success
style={{
  border: "1px solid var(--color-success)",
  boxShadow: "0 0 0 3px var(--color-success-subtle)",
}}
```

#### Label

```html
<label class="block mb-1.5 text-xs font-semibold"
       style="color: var(--color-text-secondary)">
  Phone Number
</label>
```

#### Inline Error / Helper Text

```tsx
<p className="mt-1.5 text-xs" style={{ color: "var(--color-error)" }}>
  Invalid phone number format
</p>

<p className="mt-1.5 text-xs" style={{ color: "var(--color-success)" }}>
  Mobile number verified
</p>
```

#### Phone / Amount Fields

Always use the mono font for phone numbers and monetary values:

```tsx
<input
  style={{
    fontFamily: "var(--font-mono)",
    // ... other input styles
  }}
  placeholder="+44 7700 900000"
/>

<span style={{ fontFamily: "var(--font-mono)", color: "var(--color-brand)" }}>
  £35.00
</span>
```

---

## Domain Patterns

### Tier System

The tier system classifies customers by reliability score and voiding behaviour. **Never mix tier colors with status colors.**

| Tier | Score | Void Rule | Color | CSS Tokens |
|------|-------|-----------|-------|-----------|
| **Top** | ≥ 80 | 0 voids in 90 days | Emerald `#20d090` | `--color-tier-top*` |
| **Neutral** | 40–79 | < 2 voids in 90 days | Slate `#6a88a0` | `--color-tier-neutral*` |
| **Risk** | < 40 | ≥ 2 voids in 90 days | Rose `#f45878` | `--color-tier-risk*` |

Each tier has three tokens: base color, subtle background, border.

```
--color-tier-{top|neutral|risk}         // text color
--color-tier-{top|neutral|risk}-bg      // background tint
--color-tier-{top|neutral|risk}-border  // border
```

#### TierBadge Component

```tsx
import { TierBadge } from "@/components/customers/tier-badge"

<TierBadge tier="top" />      // Emerald pill with dot
<TierBadge tier="neutral" />  // Slate pill with dot
<TierBadge tier="risk" />     // Rose pill with dot
<TierBadge tier={null} />     // Dashed outline "No tier"

// Sizes
<TierBadge tier="top" size="sm" />  // Compact
<TierBadge tier="top" size="md" />  // Default
```

#### Tier Dot

A 6px dot used in tables and compact contexts:

```html
<span class="tier-dot tier-dot-top"></span>
<span class="tier-dot tier-dot-neutral"></span>
<span class="tier-dot tier-dot-risk"></span>
```

#### Slot Recovery Priority

When offering cancelled slots, priority order is: **Top → Neutral/null → Risk**

---

### Status System

#### Confirmation Status

| Value | Color | Use |
|-------|-------|-----|
| `pending` | `--color-warning` | Awaiting shop owner confirmation |
| `confirmed` | `--color-success` | Manually confirmed by owner |
| `needs_attention` | `--color-error` | High-risk, action required |
| _(none)_ | `--color-text-tertiary` | No status set |

#### Financial Outcome

| Value | Color | Description |
|-------|-------|-------------|
| `settled` | `--color-success` | Payment collected, appointment completed |
| `refunded` | `--color-brand` | Full refund issued |
| `voided` | `--color-error` | No-show, deposit retained |
| `unresolved` | `--color-text-secondary` | Outcome not yet determined |

#### Appointment Status

| Value | Color | Description |
|-------|-------|-------------|
| `booked` | `--color-brand` | Active upcoming appointment |
| _cancelled_ | `--color-error` | Cancelled by customer or owner |

---

### Dashboard Cards

Standard 4-column metric grid:

```tsx
// Grid wrapper
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
  {/* Each card: rounded-2xl p-5, surface-raised, border-default */}
</div>
```

Metric value uses display font + accent color. Delta text uses success/error/tertiary depending on direction.

---

### Data Tables

```tsx
// Container
<div className="overflow-hidden rounded-2xl" style={{ border: "1px solid var(--color-border-default)" }}>

  {/* Header bar */}
  <div className="flex items-center justify-between px-6 py-4" style={{
    background: "var(--color-surface-raised)",
    borderBottom: "1px solid var(--color-border-subtle)",
  }}>

  {/* Column headers */}
  <div className="grid grid-cols-5 px-6 py-3 text-[0.65rem] font-semibold uppercase tracking-widest"
       style={{ borderBottom: "1px solid var(--color-border-subtle)", color: "var(--color-text-tertiary)" }}>

  {/* Data rows — alternate between hairline dividers */}
  <div className="px-6 py-4" style={{
    borderBottom: "1px solid var(--color-border-hairline)",
  }}>
```

#### Table Column Patterns

- **Name column**: Primary text + mono phone number below
- **Date/Time column**: Date primary + mono time below
- **Amount column**: Always mono font, brand color for positive
- **Tier column**: `<TierBadge>` component
- **Status column**: Status pill badge

---

## Utility Classes

Available as CSS classes from `globals.css`:

| Class | Description |
|-------|-------------|
| `font-display` | Apply display font (Cormorant Garamond) |
| `font-body` | Apply body font (Bricolage Grotesque) |
| `font-mono` | Apply mono font (Fira Code) |
| `surface-void` | Background: `--color-surface-void` |
| `surface-base` | Background: `--color-surface-base` |
| `surface-raised` | Background: `--color-surface-raised` |
| `surface-overlay` | Background: `--color-surface-overlay` |
| `surface-elevated` | Background: `--color-surface-elevated` |
| `surface-float` | Background: `--color-surface-float` |
| `card-glass` | Frosted glass card with backdrop blur |
| `glow-brand` | Applies `--shadow-brand` box-shadow |
| `skeleton` | Shimmer loading placeholder |
| `tier-dot` | 6px dot (base) |
| `tier-dot-top` | Emerald dot |
| `tier-dot-neutral` | Slate dot |
| `tier-dot-risk` | Rose dot |
| `status-pill` | Base styles for badge/pill elements |
| `focus-brand` | Teal focus ring on `:focus-visible` |

---

## Token Index

All tokens available as CSS custom properties. Set in `src/app/globals.css`.

### Colors

```
/* Surfaces */
--color-surface-void
--color-surface-base
--color-surface-raised
--color-surface-overlay
--color-surface-elevated
--color-surface-float

/* Backwards compat */
--color-bg-dark
--color-bg-dark-secondary

/* Text */
--color-text-primary
--color-text-secondary
--color-text-tertiary
--color-text-inverse
--color-text-muted           /* alias → tertiary */
--color-text-light-muted     /* alias → secondary */

/* Brand */
--color-brand
--color-brand-hover
--color-brand-dim
--color-brand-subtle
--color-brand-border
--color-brand-glow

/* Backwards compat */
--color-primary
--color-primary-light
--color-primary-dark

/* Accent */
--color-accent-amber
--color-accent-amber-hover
--color-accent-amber-subtle

/* Backwards compat */
--color-accent-coral
--color-accent-coral-hover
--color-accent-peach

/* Status: Success */
--color-success
--color-success-subtle
--color-success-border
--color-success-green        /* alias → success */

/* Status: Warning */
--color-warning
--color-warning-subtle
--color-warning-border
--color-warning-amber        /* alias → warning */

/* Status: Error */
--color-error
--color-error-subtle
--color-error-border
--color-error-red            /* alias → error */

/* Status: Info */
--color-info
--color-info-subtle

/* Tier: Top */
--color-tier-top
--color-tier-top-bg
--color-tier-top-border

/* Tier: Neutral */
--color-tier-neutral
--color-tier-neutral-bg
--color-tier-neutral-border

/* Tier: Risk */
--color-tier-risk
--color-tier-risk-bg
--color-tier-risk-border

/* Borders */
--color-border-hairline
--color-border-subtle
--color-border-default
--color-border-medium
--color-border-strong
```

### Typography

```
--font-display       /* Cormorant Garamond */
--font-body          /* Bricolage Grotesque */
--font-mono          /* Fira Code */
--font-cormorant     /* Raw Next.js font variable */
--font-bricolage     /* Raw Next.js font variable */
--font-fira-code     /* Raw Next.js font variable */
```

### Shadows

```
--shadow-xs
--shadow-sm
--shadow-md
--shadow-lg
--shadow-xl
--shadow-brand
```

### Animation

```
--duration-instant
--duration-fast
--duration-normal
--duration-slow
--duration-slower

--ease-spring
--ease-smooth
--ease-in-out

--animate-float
--animate-fade-up
--animate-slide-in-left
--animate-slide-in-right
--animate-scale-in
--animate-pulse-glow
--animate-shimmer
```

### Radius

```
--radius-sm     /* ~0.375rem */
--radius-md     /* ~0.5rem */
--radius-lg     /* 0.625rem */
--radius-xl     /* ~0.875rem */
--radius-2xl    /* 1rem */
--radius-3xl    /* 1.5rem */
--radius-full   /* 9999px */
```

---

## Living Reference

The interactive design system page is available at [`/design-system`](/design-system) in the running application. It demonstrates every token, component variant, and domain pattern with live examples.

Source: `src/app/design-system/page.tsx`
Tokens: `src/app/globals.css`
Fonts: `src/app/layout.tsx`
Tier Badge: `src/components/customers/tier-badge.tsx`
