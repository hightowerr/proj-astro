# Astro — Design System Reference

> Ground truth for all Tailwind tokens, component patterns, typography, spacing, and section backgrounds.
> All shape parts reference this document. When a token changes here, update the shape parts that use it.

---

## Color Tokens

### Palette

| Token | Hex | Tailwind class | Role |
|-------|-----|---------------|------|
| `bg-dark` | `#1A1D21` | `bg-bg-dark` | Page base, darkest surfaces |
| `bg-dark-secondary` | `#24282E` | `bg-bg-dark-secondary` | Cards, elevated surfaces, alternating sections |
| `primary` | `#3D8B8B` | `bg-primary` / `text-primary` | Brand teal — links, icons, active states, flow lines |
| `primary-light` | `#5BA3A3` | `bg-primary-light` / `text-primary-light` | Hover on primary elements |
| `primary-dark` | `#2A6B6B` | `bg-primary-dark` | Pressed states, deep teal overlays |
| `accent-peach` | `#E8C4B8` | `text-accent-peach` / `bg-accent-peach` | Warm secondary accent — badges, highlights |
| `accent-coral` | `#F4A58A` | `bg-accent-coral` / `text-accent-coral` | Primary CTA buttons, key call-outs |
| `text-muted` | `#6B7280` | `text-text-muted` | Body text, descriptions, secondary copy |
| `text-light-muted` | `#A1A5AB` | `text-text-light-muted` | Placeholders, disabled, tertiary info |
| White | `#FFFFFF` | `text-white` | Primary headings and key text on dark backgrounds |

### Usage Rules

- **Never** use `indigo-*`, `emerald-*`, `purple-*`, or `slate-*` — replaced entirely by the tokens above
- **White text** for all headings on dark backgrounds
- **`text-text-muted`** for body copy and descriptions on dark backgrounds
- **`accent-coral`** is the single CTA colour — used only on primary action buttons
- **`primary`** (teal) signals interactivity and brand — links, active nav, icons, borders on focus
- **`accent-peach`** is reserved for warmth and secondary badges — not buttons

### Opacity utilities (approved)

| Usage | Class |
|-------|-------|
| Frosted navbar bg | `bg-bg-dark/80 backdrop-blur-md` |
| Card border | `border border-white/5` |
| FAQ divider | `border-b border-white/10` |
| Pricing card border | `border border-primary/20` |
| Ghost button border | `border border-white/30` |
| FloatCard bg | `bg-bg-dark-secondary/90 backdrop-blur-sm` |
| Blur depth circles (CTA) | `bg-primary/10 blur-3xl` |
| Step number (decorative) | `text-primary/20` |
| Badge bg (teal) | `bg-primary/15` |
| Badge bg (peach) | `bg-accent-peach/20` |
| Badge bg (coral) | `bg-accent-coral/20` |

---

## Section Background Strategy

Sections alternate between `bg-dark` and `bg-dark-secondary` for rhythm. No section uses white or light backgrounds — this is a full dark-theme product.

| Section | Background | Border / Separator |
|---------|-----------|-------------------|
| Navbar (top) | `transparent` | none |
| Navbar (scrolled) | `bg-bg-dark/80 backdrop-blur-md` | `border-b border-white/5 shadow-sm` |
| Hero | `bg-bg-dark` + salon photo + gradient overlay | none |
| How It Works | `bg-bg-dark-secondary` | none |
| Features (alternating blocks) | `bg-bg-dark` | none |
| Features Carousel | `bg-bg-dark-secondary` | none |
| Pricing | `bg-bg-dark` | none |
| FAQ | `bg-bg-dark-secondary` | none |
| Final CTA | `bg-bg-dark` + teal glow gradient | none |
| Footer | `bg-bg-dark` | `border-t border-white/10` |

### Hero gradient overlay
```
bg-gradient-to-r from-bg-dark/95 via-bg-dark/80 to-transparent
```

### Final CTA gradient
```
bg-gradient-to-br from-bg-dark via-primary-dark/20 to-bg-dark
```
Two `bg-primary/10 blur-3xl rounded-full` blur circles at opposing corners for depth.

---

## Typography Scale

**Font family:** Inter (`font-sans`)
**Weight usage:** 400 body · 500 medium · 600 semibold · 700 bold · 800 extrabold

| Role | Classes | Used in |
|------|---------|---------|
| Display XL | `text-5xl lg:text-7xl font-bold text-white leading-tight` | Hero headline |
| Display L | `text-4xl lg:text-5xl font-bold text-white leading-tight` | CTA headline |
| Heading XL | `text-3xl font-bold text-white` | Feature block titles, carousel feature title |
| Heading L | `text-2xl font-semibold text-white` | Card titles, FAQ question (when open) |
| Heading M | `text-xl font-semibold text-white` | Step card titles, FAQ questions |
| Eyebrow | `text-xs font-semibold uppercase tracking-widest text-primary` | Section labels above headings |
| Body L | `text-lg text-text-muted leading-relaxed` | Hero sub-headline, section sub-headings |
| Body M | `text-base text-text-muted leading-relaxed` | Feature descriptions, FAQ answers, step descriptions |
| Body S | `text-sm text-text-light-muted` | Meta text, "no credit card required", copyright |
| Stat value | `text-3xl font-extrabold text-white` | FloatCard numbers |
| Stat label | `text-xs text-text-light-muted` | FloatCard labels |
| Step number | `text-7xl font-black text-primary/20 leading-none` | How It Works decorative numbers |
| Price | `text-6xl font-bold text-white` | Pricing card amount |
| Price unit | `text-xl text-text-muted` | `/mo` label |
| Plan name | `text-sm font-semibold uppercase tracking-widest text-primary` | "Astro Pro" label |
| Nav link | `text-sm font-medium text-text-light-muted hover:text-white transition-colors duration-200` | Navbar links |
| Footer link | `text-sm text-text-muted hover:text-white transition-colors duration-200 cursor-pointer` | Footer nav links |

---

## Component Token Map

### Buttons

| Variant | Classes |
|---------|---------|
| **Primary CTA** | `bg-accent-coral hover:bg-[#F09070] text-bg-dark font-semibold px-8 py-3 rounded-xl transition-colors duration-200 cursor-pointer` |
| **Secondary ghost** | `border border-white/30 text-white hover:bg-white/10 px-8 py-3 rounded-xl transition-colors duration-200 cursor-pointer` |
| **Teal action** | `bg-primary hover:bg-primary-light text-white font-medium px-6 py-2.5 rounded-lg transition-colors duration-200 cursor-pointer` |
| **Pricing CTA** | `bg-accent-coral hover:bg-[#F09070] text-bg-dark w-full font-semibold py-3.5 rounded-xl transition-colors duration-200 cursor-pointer` |
| **Tab pill (inactive)** | `text-sm text-text-muted border border-white/10 bg-bg-dark-secondary rounded-full px-5 py-2 transition-colors duration-200 cursor-pointer hover:border-primary/40` |
| **Tab pill (active)** | `text-sm text-white bg-primary rounded-full px-5 py-2 transition-colors duration-200 cursor-pointer` |

**Framer Motion hover on all CTA buttons:** `whileHover={{ scale: 1.02 }}` with `transition={{ duration: 0.15 }}`

### Cards

| Variant | Classes |
|---------|---------|
| **Feature card** | `bg-bg-dark-secondary rounded-2xl p-8 border border-white/5 shadow-xl` |
| **Step card** | `bg-bg-dark-secondary rounded-2xl p-8 border border-white/5 relative` |
| **FloatCard (stat)** | `bg-bg-dark-secondary/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 shadow-lg absolute` |
| **Pricing card** | `bg-bg-dark-secondary rounded-2xl p-8 lg:p-10 border border-primary/20 shadow-2xl` |
| **Phone frame** | `w-64 lg:w-72 rounded-[2.5rem] border-4 border-white/10 bg-bg-dark-secondary shadow-2xl overflow-hidden` |

**Card hover (non-interactive cards):** `hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 cursor-pointer`

### Badges

| Variant | Classes |
|---------|---------|
| **Tier — Top** | `bg-accent-peach/20 text-accent-peach text-xs font-medium px-3 py-1 rounded-full` |
| **Tier — Risk** | `bg-accent-coral/20 text-accent-coral text-xs font-medium px-3 py-1 rounded-full` |
| **Tier — Neutral** | `bg-white/10 text-text-light-muted text-xs font-medium px-3 py-1 rounded-full` |
| **Save % (pricing)** | `bg-primary/15 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full` |
| **Status — Confirmed** | `bg-green-500/20 text-green-400 text-xs font-medium px-3 py-1 rounded-full` |
| **Status — Risk flagged** | `bg-accent-coral/20 text-accent-coral text-xs font-medium px-3 py-1 rounded-full` |
| **Eyebrow label** | `bg-primary/15 text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full` |

### Inputs

| State | Classes |
|-------|---------|
| Default | `bg-bg-dark-secondary border border-white/10 text-white placeholder:text-text-light-muted rounded-lg px-4 py-2.5 w-full` |
| Focus | `focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary` |
| Combined | `bg-bg-dark-secondary border border-white/10 text-white placeholder:text-text-light-muted rounded-lg px-4 py-2.5 w-full focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors duration-200` |

### Icons (Lucide)

- Default size: `w-5 h-5`
- Feature icons: `w-7 h-7 text-primary`
- Step icons: `w-8 h-8 text-primary`
- Nav icons: `w-4 h-4`
- Check list icons: `w-4 h-4 text-primary flex-shrink-0`
- Chevron (FAQ): `w-5 h-5 text-text-muted`
- Close / X: `w-5 h-5 text-text-light-muted`

### Dividers

- Section: `border-t border-white/10`
- List: `divide-y divide-white/5`
- Subtle rule: `border-b border-white/5`

---

## Spacing Conventions

| Context | Value |
|---------|-------|
| Section vertical padding | `py-24` (default) · `py-16` (compact) · `py-32` (hero) |
| Container | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |
| Narrow container | `max-w-3xl mx-auto px-4` |
| Card padding | `p-8` (default) · `p-6` (small) · `p-10` (large/pricing) |
| Feature grid gap | `gap-12` |
| Card grid gap | `gap-8` |
| Inline gap | `gap-4` |
| Vertical list gap | `gap-6` |
| Button group gap | `gap-4` |
| Section heading margin | `mb-4` (headline) · `mb-6` (sub-heading) · `mb-16` (before content) |
| Fixed navbar height offset | `pt-20` on first content element below hero |

---

## Animation Reference

All keyframes defined in `tailwind.config.js` — no `globals.css` additions needed.

| Class | Keyframe | Use |
|-------|---------|-----|
| `animate-float` | `translateY(0 → -10px → 0)` 6s | Hero phone, CTA phone |
| `animate-fade-up` | `opacity 0→1, y 30→0` 0.6s | Section entry (fallback when FM not loaded) |
| `animate-slide-in-left` | `opacity 0→1, x -50→0` 0.6s | Left column slide-in |
| `animate-slide-in-right` | `opacity 0→1, x 50→0` 0.6s | Right column slide-in |
| `animate-count-up` | Drives `useCountUp` hook | FloatCard stat values |

### Framer Motion overrides (take precedence over Tailwind animations)

| Interaction | FM config |
|---|---|
| Page load stagger | `staggerChildren: 0.1` on main container |
| Hero text reveal | `variants` `y: 30→0, opacity: 0→1`, stagger 0.15s |
| Scroll reveal | `whileInView={{ opacity: 1, y: 0 }}` `initial={{ opacity: 0, y: 30 }}` `viewport={{ once: true, amount: 0.2 }}` |
| Button hover | `whileHover={{ scale: 1.02 }}` `transition={{ duration: 0.15 }}` |
| Carousel slide | `AnimatePresence` spring variants, `drag="x"` |
| FAQ accordion | `AnimatePresence` `height: 0→"auto"` + `opacity: 0→1` |
| Pill float | Staggered `whileInView` random delays 0–0.4s |
| Chevron rotate | `animate={{ rotate: 0 | 180 }}` `transition={{ duration: 0.2 }}` |

`useReducedMotion()` checked in every animated component — if true, skip all FM transitions.

---

## Flow Line (How It Works)

```
hidden md:block absolute top-14 left-[20%] right-[20%] h-0.5
bg-gradient-to-r from-primary/20 via-primary to-primary/20
```

---

## Tailwind Config Changes Required

Add to `tailwind.config.js` alongside the user-provided tokens:

```js
// Already in user config — verify present:
'bg-dark': '#1A1D21',
'bg-dark-secondary': '#24282E',
'primary': '#3D8B8B',
'primary-light': '#5BA3A3',
'primary-dark': '#2A6B6B',
'accent-peach': '#E8C4B8',
'accent-coral': '#F4A58A',
'text-muted': '#6B7280',
'text-light-muted': '#A1A5AB',

// next.config.js experimental:
optimizePackageImports: ['lucide-react', 'framer-motion']
```
