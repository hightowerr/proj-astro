# Landing Page — Slices Doc

**Selected shape:** C — Full Astro Landing Page
**Design system:** `docs/shaping/landing-page-design-system.md`
**Breadboard:** `docs/shaping/landing-page-shaping.md` → Breadboard section

---

## Page Order (locked)

Hero → How It Works → Feature Sections → Features Carousel → Pricing → FAQ → Final CTA → Footer

---

## V1: Site Shell

**Demo:** Dark branded navbar with scroll effect (transparent → frosted glass), working mobile drawer, clean footer. Page body is `bg-bg-dark` but content area is empty. Middleware protects `/app/*`.

### Files changed
- `tailwind.config.js` — add design tokens + keyframes
- `next.config.js` — `optimizePackageImports`, `images.remotePatterns`
- `src/app/layout.tsx` — Inter font, `bg-bg-dark text-white` body, metadata, remove boilerplate
- `src/components/site-header.tsx` — full rewrite
- `src/components/site-footer.tsx` — full rewrite
- `src/middleware.ts` — new file

### UI Affordances

| ID | Affordance | Notes |
|----|-----------|-------|
| U1 | Logo "Astro" text link | Links to `/` |
| U2 | Nav links: Features · Pricing · Login | Anchor scroll + `/login` |
| U3 | "Book a Demo" CTA button (navbar) | `bg-accent-coral` coral button |
| U4 | Hamburger `Menu` icon (mobile only) | Toggles drawer |
| U5 | Mobile slide-in drawer (right) | Full nav links stacked; closes on tap or backdrop |
| U29 | Footer logo "Astro" | Links to `/` |
| U30 | Footer nav links | Features · Pricing · Privacy · Terms · Contact |
| U31 | Footer copyright | © 2025 Astro. All rights reserved. |

### Non-UI Affordances

| ID | Affordance | Implementation |
|----|-----------|---------------|
| N1 | `useScroll()` scroll position | FM hook; drives navbar bg class toggle |
| N2 | `useState<boolean>` drawer open | Toggles `translate-x-0` / `translate-x-full` on drawer |
| N7 | `useReducedMotion()` | Imported in header; suppresses FM transitions if true |
| N18 | `src/middleware.ts` session check | Better Auth `auth.api.getSession()`; redirect to `/login` on `/app/:path*`, `/profile` |
| N19 | `next.config.js` build config | `optimizePackageImports: ['lucide-react', 'framer-motion']`; `images.remotePatterns` for `images.unsplash.com` |
| N20 | `tailwind.config.js` design tokens | All colour tokens, `fontFamily: { sans: ['Inter'] }`, all keyframes |

### Wiring

```
N1 (useScroll) → U2/navbar: add `bg-bg-dark/80 backdrop-blur-md border-b border-white/5` when scrollY > 0
U4 (hamburger click) → N2 (toggle true)
N2 (true) → U5: remove `translate-x-full`, add `translate-x-0`
U5 (link tap / backdrop tap) → N2 (toggle false)
N7 → suppress FM transitions site-wide if prefers-reduced-motion
N18 → on /app/* with no session → redirect /login
```

---

## V2: Hero

**Demo:** Full-screen hero loads with staggered text reveal (eyebrow → headline → sub-headline → CTAs), floating phone mockup on the right, dark salon photo with gradient overlay. `animate-float` on the phone.

### Files changed
- `src/app/page.tsx` — add Hero section (C3)
- `public/` — no local asset; image pulled from `images.unsplash.com` via `<Image>`

### UI Affordances

| ID | Affordance | Notes |
|----|-----------|-------|
| U6 | Eyebrow label + headline | FM stagger reveal; `text-5xl lg:text-7xl font-bold text-white` |
| U7 | Sub-headline | FM stagger reveal; `text-lg text-text-muted` |
| U8 | "Book a Demo" primary CTA | `bg-accent-coral`; `whileHover={{ scale: 1.02 }}` |
| U9 | "See how it works" secondary CTA | Ghost border; scrolls to `#how-it-works` |
| U10 | Social proof micro-line | "Trusted by 500+ beauty professionals"; `text-text-light-muted` |
| U11 | Floating phone mockup | Appointment dashboard static HTML; `animate-float` wrapper |

### Non-UI Affordances

| ID | Affordance | Implementation |
|----|-----------|---------------|
| N3 | FM `staggerChildren: 0.1` page load | Wraps hero content container; drives U6–U9 sequential reveal |
| N4 | `animate-float` CSS keyframe | `translateY(0 → -10px → 0)` 6s infinite from `tailwind.config.js`; wrapping `<div>` around U11 |
| N5 | FM `variants` hero text stagger | `hidden: { opacity: 0, y: 30 }` → `visible: { opacity: 1, y: 0 }`; `staggerChildren: 0.15` |
| N7 | `useReducedMotion()` (reused from V1) | Disables N3, N4, N5 |

### Wiring

```
N3 (page load) → N5 (variants) → U6, U7, U8, U9 sequentially (0.15s stagger)
N4 (animate-float div wrapper) → U11 bobs continuously
N7 (true) → N4 class removed; N5 initial = visible immediately
U9 click → scroll to #how-it-works
```

---

## V3: How It Works + Feature Sections

**Demo:** Scroll down — three step cards animate in with staggered `whileInView` (150ms apart), gradient flow line connects them. Below: three alternating feature blocks with Unsplash images and floating FloatCard stat chips that appear with staggered random delays.

### Files changed
- `src/app/page.tsx` — add How It Works + Feature Sections
- `src/components/landing/how-it-works.tsx` — new file
- `src/components/landing/feature-section.tsx` — new file (includes `FloatCard`)

### UI Affordances

| ID | Affordance | Notes |
|----|-----------|-------|
| U12 | Section heading + eyebrow | "How Astro works"; `text-4xl font-bold text-white` |
| U13 | Step cards ×3 | Book · Protect · Recover; `text-primary/20` step numbers; `text-primary` icons |
| U14 | Gradient flow line | `from-primary/20 via-primary to-primary/20`; `hidden md:block` |
| U15 | `FeatureSection` blocks ×3 | Scoring (right) · Slot Recovery (left) · Deposits (right) |
| U16 | `FloatCard` stat overlays | 2 per block; absolute positioned over image |

### Non-UI Affordances

| ID | Affordance | Implementation |
|----|-----------|---------------|
| N6a | FM `whileInView` step cards | `viewport={{ once: true, amount: 0.2 }}`; delay 0 / 0.15 / 0.3s per card |
| N6b | FM `whileInView` FloatCards | Staggered with randomised delays 0–0.4s (Pill Float pattern) |
| N8 | Feature data array | 3 objects: `{ title, description, imageSrc, imagePosition, stats[] }` |
| N7 | `useReducedMotion()` (reused) | Disables N6a, N6b |

### Wiring

```
N8 (data) → U15 (FeatureSection renders per item)
N8 (data) → U16 (FloatCard children rendered per block)
N6a (whileInView) → U13 cards: opacity 0→1, y 30→0, staggered
N6b (whileInView) → U16 FloatCards: opacity 0→1, y 20→0, random delay
N7 (true) → initial state = visible, no transition
```

---

## V4: Features Carousel + Pricing

**Demo:** Tab pills switch slides with spring animation; swipe gesture changes slides; progress bar tracks position. Below: monthly/annual toggle updates price with `aria-live` announcement.

### Files changed
- `src/app/page.tsx` — add Features Carousel + Pricing sections
- `src/components/landing/features-carousel.tsx` — new file
- `src/components/landing/pricing-section.tsx` — new file

### UI Affordances

| ID | Affordance | Notes |
|----|-----------|-------|
| U17 | Tab pills ×3 | No-Show Protection · Marketing Tools · Calendar; active = `bg-primary text-white` |
| U18 | Carousel slides ×3 | Text + phone mockup per slide; feature-specific screen |
| U19 | Progress bar | `h-1 bg-primary rounded-full`; width = `(index+1)/3 * 100%` |
| U20 | Monthly / Annual toggle | Pill toggle; annual shows "Save 20%" chip |
| U21 | Pricing card | `bg-bg-dark-secondary border border-primary/20`; 8 feature checkmarks |
| U22 | Pricing "Book a Demo" CTA | `bg-accent-coral w-full` |

### Non-UI Affordances

| ID | Affordance | Implementation |
|----|-----------|---------------|
| N9 | Carousel data array | 3 slides: `{ label, title, description, bullets[], phoneScreen }` |
| N10 | `useState<number>` active index | 0–2; drives N11, N13, U17 active pill |
| N11 | FM `AnimatePresence` slide variants | `enter: { x: 300, opacity: 0 }` → `center` → `exit: { x: -300 }`; spring stiffness 300 damping 30 |
| N12 | FM `drag="x"` + `onDragEnd` | Threshold ±50px → increment/decrement N10 |
| N13 | Progress bar width | `((N10 + 1) / 3) * 100` as inline style `width` |
| N14 | `useState<"monthly"\|"annual">` | Drives N15, U20 active style |
| N15 | Annual price calc | `Math.round(monthly * 0.8)`; rendered in `aria-live="polite"` span |
| N7 | `useReducedMotion()` (reused) | Disables N11 transitions |

### Wiring

```
N9 (data) → U17 (pill labels), U18 (slide content)
U17 (pill click) → N10 (set index)
U18 (drag) → N12 (gesture) → N10 (set index)
N10 → N11 (AnimatePresence renders active slide)
N10 → N13 → U19 (progress bar width)
N10 → U17 (active pill style)
U20 (toggle click) → N14 (set period)
N14 → N15 (calc price) → U21 aria-live price span
```

---

## V5: FAQ + Final CTA

**Demo:** Page is complete. FAQ accordion opens/closes with smooth height animation; only one item open at a time. Final CTA section closes with dark teal gradient, blur circles, coral CTAs, and floating phone.

### Files changed
- `src/app/page.tsx` — add FAQ + Final CTA sections (assemble all sections in final order)
- `src/components/landing/faq-section.tsx` — new file
- `src/components/landing/cta-section.tsx` — new file

### UI Affordances

| ID | Affordance | Notes |
|----|-----------|-------|
| U23 | FAQ item triggers ×6 | `<button aria-expanded>`; question text + chevron `motion.span` |
| U24 | FAQ answer panels ×6 | `motion.div` height 0→auto; `text-text-muted` answer copy |
| U25 | CTA eyebrow + headline + sub-headline | White text on dark gradient |
| U26 | "Book a Demo" primary CTA (final) | `bg-accent-coral`; `whileHover={{ scale: 1.02 }}` |
| U27 | "See how it works" ghost button | `border border-white/30`; scrolls to `#how-it-works` |
| U28 | Floating phone mockup (booking confirmation) | "Booking Confirmed ✓" static screen; `animate-float` reused |

### Non-UI Affordances

| ID | Affordance | Implementation |
|----|-----------|---------------|
| N16 | `useState<number\|null>` open index | Toggle: same index → null; different index → new index |
| N17 | FM `AnimatePresence` accordion | `height: 0 → "auto"`, `opacity: 0 → 1`; `overflow: hidden` on `motion.div` |
| N4 | `animate-float` (reused from V2) | No new code; `animate-float` class on wrapper `<div>` around U28 |
| N7 | `useReducedMotion()` (reused) | Disables N17 transitions |

### Wiring

```
U23 (trigger click) → N16 (toggle index)
N16 (open index) → N17 (AnimatePresence mounts/unmounts answer)
N17 → U24 height 0→auto + opacity 0→1
N16 (chevron) → motion.span animate={{ rotate: isOpen ? 180 : 0 }}
N4 (animate-float) → U28 bobs continuously
N7 (true) → N17 instant height, no opacity fade
```

---

## Slices Grid

|  |  |  |
|:--|:--|:--|
| **V1: SITE SHELL**<br>⏳ PENDING<br><br>• `tailwind.config.js` tokens + keyframes<br>• `next.config.js` bundle + image config<br>• `layout.tsx` Inter font + dark body<br>• `site-header.tsx` full rewrite<br>• `site-footer.tsx` full rewrite<br>• `middleware.ts` auth protection<br><br>*Demo: Branded navbar scroll effect + mobile drawer* | **V2: HERO**<br>⏳ PENDING<br><br>• Hero full-screen with photo overlay<br>• FM stagger text reveal<br>• Floating phone mockup (appointment dashboard)<br>• `animate-float` CSS keyframe<br>• Coral CTAs with `whileHover`<br>• &nbsp;<br><br>*Demo: Hero animates on load* | **V3: HOW IT WORKS + FEATURES**<br>⏳ PENDING<br><br>• `how-it-works.tsx` step cards + flow line<br>• `feature-section.tsx` + `FloatCard`<br>• 3 alternating blocks (Scoring, Slot Recovery, Deposits)<br>• FM `whileInView` stagger on scroll<br>• Unsplash images per block<br><br>*Demo: Cards animate in on scroll* |
| **V4: CAROUSEL + PRICING**<br>⏳ PENDING<br><br>• `features-carousel.tsx` FM AnimatePresence<br>• Tab pills + drag swipe + progress bar<br>• `pricing-section.tsx` dark card<br>• Monthly/annual toggle (`aria-live`)<br>• &nbsp;<br><br>*Demo: Swipe carousel + price toggle* | **V5: FAQ + FINAL CTA**<br>⏳ PENDING<br><br>• `faq-section.tsx` AnimatePresence accordion<br>• `cta-section.tsx` dark gradient + blur circles<br>• Floating phone (booking confirmation)<br>• Full page assembly in correct order<br>• &nbsp;<br><br>*Demo: Complete page end-to-end* | |
