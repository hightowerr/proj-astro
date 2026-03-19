# V3: How It Works + Feature Sections — Implementation Plan

## Scope
Implements V3 from `docs/shaping/landing-page-slices.md`.
Demo goal: scroll down — three step cards animate in with staggered `whileInView` (150ms apart), gradient flow line connects them. Below: three alternating feature blocks with Unsplash images and floating FloatCard stat chips appearing with staggered delays.

Assumes V1 (site shell, design tokens, framer-motion) and V2 (page.tsx server component + hero) are complete.

---

## Key Discoveries

### Component architecture (4 files)
- `how-it-works.tsx` → `"use client"` with `whileInView` step card animations; loaded via `next/dynamic({ ssr: false })` from page.tsx (bundle strategy)
- `feature-section.tsx` → **server component** for layout only (image + text grid, `children` slot for stat overlays)
- `float-card.tsx` → `"use client"` for `whileInView` stat chip animations; imported directly into page.tsx alongside FeatureSection
- `src/app/page.tsx` → add two new dynamic imports + 3 FeatureSection blocks with FloatCard children

### FloatCard delay: fixed, not random
`Math.random()` in client components causes React hydration mismatches. Use fixed `delay` props instead of randomised delays: first card `delay={0}`, second card `delay={0.2}`. Sufficient for the stagger visual effect.

### Anchor IDs from V1 header
- "How It Works" nav anchor → `id="how-it-works"` on the HowItWorks section
- "Features" nav anchor → `id="features"` on the features container section

### FeatureSection: server renders client children
Next.js allows server components to accept client components as `children: ReactNode`. page.tsx (server) passes `<FloatCard />` (client) as children to `<FeatureSection />` (server). This is valid and idiomatic.

### Unsplash images (3 beauty/salon shots)
All URLs already whitelisted via `images.unsplash.com` remotePattern (added in V1):
- Scoring block: `https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80`
- Slot Recovery block: `https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80`
- Deposits block: `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80`

---

## Files Changed

| File | Action |
|------|--------|
| `src/app/page.tsx` | Add `HowItWorksSection` dynamic import + 3 `FeatureSection` blocks with `FloatCard` children |
| `src/components/landing/how-it-works.tsx` | New `"use client"` — step cards + flow line + `whileInView` stagger |
| `src/components/landing/feature-section.tsx` | New server component — alternating image/text layout + `children` slot |
| `src/components/landing/float-card.tsx` | New `"use client"` — animated stat chip with `whileInView` |

---

## Step-by-Step Implementation

### Step 1 — Create float-card.tsx

New `"use client"` component:

```
Props: value: string, label: string, className?: string, delay?: number

Renders:
  <motion.div
    initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.5 }}
    transition={{ duration: 0.4, delay: delay ?? 0 }}
    className={`
      bg-bg-dark-secondary/90 backdrop-blur-sm rounded-xl px-4 py-3
      border border-white/10 shadow-lg absolute flex items-center gap-3
      ${className}
    `}
  >
    <div>
      <div className="text-2xl font-extrabold text-white">{value}</div>
      <div className="text-xs text-text-light-muted">{label}</div>
    </div>
  </motion.div>
```

`useReducedMotion()` from framer-motion: if true → `initial={{ opacity: 1, y: 0 }}` (instant visible, no whileInView transition).

### Step 2 — Create feature-section.tsx

Server component. No `"use client"`.

```
Props:
  title: string
  description: string
  imageSrc: string
  imageAlt: string
  imagePosition: "left" | "right"
  children: ReactNode       ← FloatCard instances

Renders:
  <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-16">

    {/* Image column */}
    <div className={`relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]
                     ${imagePosition === "left" ? "lg:order-1" : "lg:order-2"}`}>
      <Image src={imageSrc} alt={imageAlt} fill className="object-cover" />
      {children}   ← FloatCards sit absolute inside this container
    </div>

    {/* Text column */}
    <div className={imagePosition === "left" ? "lg:order-2" : "lg:order-1"}>
      <h3 className="text-3xl font-bold text-white mb-4">{title}</h3>
      <p className="text-base text-text-muted leading-relaxed">{description}</p>
    </div>

  </div>
```

### Step 3 — Create how-it-works.tsx

`"use client"` component (needs `whileInView` on each card).

```
Section: <section id="how-it-works" className="bg-bg-dark-secondary py-24 scroll-mt-20">

Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8

  ① Header block (centred):
    Eyebrow: <span className="bg-primary/15 text-primary text-xs font-semibold
                              uppercase tracking-widest px-3 py-1 rounded-full">
               How it works
             </span>
    Heading: <h2 className="text-4xl font-bold text-white mt-4 mb-4">
               How Astro works
             </h2>
    Sub-heading: <p className="text-lg text-text-muted max-w-2xl mx-auto">
                   From booking to protected revenue — completely automated.
                 </p>

  ② Cards grid + flow line wrapper:
    <div className="relative mt-16 max-w-5xl mx-auto">

      Flow line (desktop only, behind cards):
        <div className="hidden md:block absolute top-14 left-[20%] right-[20%]
                        h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

      Cards grid:
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-bg-dark rounded-2xl p-8 border border-white/5 relative"
            >
              <div className="text-7xl font-black text-primary/20 leading-none mb-2">
                {step.number}
              </div>
              <div className="mb-4">
                <step.Icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-base text-text-muted leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
    </div>
```

Step data array:
```ts
const steps = [
  {
    number: "01",
    Icon: BookOpen,
    title: "Clients book and pay a deposit",
    description: "Share your booking link. Clients pick a time, pay a deposit upfront, and get an instant SMS confirmation.",
  },
  {
    number: "02",
    Icon: ShieldCheck,
    title: "Astro protects your schedule",
    description: "Risk clients are flagged automatically. Late cancellations keep your deposit — your time is never wasted.",
  },
  {
    number: "03",
    Icon: RefreshCw,
    title: "Cancelled slots fill themselves",
    description: "When someone cancels, Astro offers the slot to your best available clients. Your calendar stays full without you lifting a finger.",
  },
];
```

Lucide imports: `BookOpen`, `ShieldCheck`, `RefreshCw` from `"lucide-react"`.
`useReducedMotion()` from `framer-motion`: if true → all cards use `initial={{ opacity: 1, y: 0 }}` (skip animation).

### Step 4 — Update page.tsx

Add `HowItWorksSection` dynamic import and feature blocks:

```tsx
// New dynamic import (alongside existing HeroSection dynamic import)
const HowItWorksSection = dynamic(
  () => import("@/components/landing/how-it-works"),
  { ssr: false }
);

// Direct server imports (no dynamic needed — no heavy FM)
import { FeatureSection } from "@/components/landing/feature-section";
import { FloatCard } from "@/components/landing/float-card";
```

Page body additions after `<HeroSection />`:

```tsx
<HowItWorksSection />

<section id="features" className="bg-bg-dark py-24">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">

    {/* Block 1: Scoring */}
    <FeatureSection
      title="Know your clients before they walk in"
      description="Astro scores every client on show-up history, cancellation patterns, and deposit behaviour. Risk clients are flagged before they cost you money."
      imageSrc="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80"
      imageAlt="Stylist reviewing client booking details"
      imagePosition="right"
    >
      <FloatCard value="94%" label="client show-up rate" className="top-6 right-6" delay={0} />
      <FloatCard value="3x" label="fewer no-shows with risk flagging" className="bottom-6 left-6" delay={0.2} />
    </FeatureSection>

    {/* Block 2: Slot Recovery */}
    <FeatureSection
      title="Never lose revenue when someone cancels"
      description="When a booking is cancelled, Astro automatically offers the slot to your best available clients in priority order. Your calendar fills itself."
      imageSrc="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80"
      imageAlt="Busy salon with fully booked schedule"
      imagePosition="left"
    >
      <FloatCard value="8 min" label="average time to fill a cancelled slot" className="top-6 left-6" delay={0} />
      <FloatCard value="£240" label="avg. weekly recovery" className="bottom-6 right-6" delay={0.2} />
    </FeatureSection>

    {/* Block 3: Deposits */}
    <FeatureSection
      title="Get paid before they even show up"
      description="Deposits are collected at booking time via Stripe. No-shows can't cost you — you've already been paid. Refunds for eligible cancellations are automatic."
      imageSrc="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80"
      imageAlt="Client paying via phone at salon"
      imagePosition="right"
    >
      <FloatCard value="£0" label="owed after a no-show" className="top-6 right-6" delay={0} />
      <FloatCard value="100%" label="deposit collection at booking" className="bottom-6 left-6" delay={0.2} />
    </FeatureSection>

  </div>
</section>
```

---

## Testing Plan

### 1. Lint + typecheck (automated)
```bash
pnpm lint && pnpm typecheck
```
Zero errors required.

### 2. Browser smoke tests via Playwright
User must start dev server (`pnpm dev`). Navigate to `http://localhost:3000`.

**"How It Works" section:**
1. Section visible below hero with `bg-bg-dark-secondary` background
2. Eyebrow "How it works" badge visible
3. Heading "How Astro works" visible
4. All 3 step cards present: "01 Clients book and pay…", "02 Astro protects…", "03 Cancelled slots…"
5. Step numbers `01`, `02`, `03` in large decorative text (light teal)
6. Lucide icons visible in each card (BookOpen, ShieldCheck, RefreshCw)
7. On desktop (≥ 768px): gradient flow line visible between cards
8. On mobile (< 768px): flow line hidden, cards stack vertically

**Step card scroll animation:**
9. Scroll down to bring cards into view — they animate up from y:30 with stagger (cards appear one after another, ~150ms apart)
10. After scrolling past and back, cards remain visible (`once: true`)

**Feature sections:**
11. Section visible below How It Works with `bg-bg-dark` background
12. Block 1 (Scoring): image on right (desktop), text on left — "Know your clients before they walk in"
13. Block 2 (Slot Recovery): image on left (desktop), text on right — "Never lose revenue when someone cancels"
14. Block 3 (Deposits): image on right (desktop), text on left — "Get paid before they even show up"
15. All 3 Unsplash images load correctly

**FloatCard stat overlays:**
16. Block 1: "94%" chip top-right, "3x" chip bottom-left of image
17. Block 2: "8 min" chip top-left, "£240" chip bottom-right of image
18. Block 3: "£0" chip top-right, "100%" chip bottom-left of image
19. FloatCards animate in when scrolled into view (opacity + y transition)

**Anchor navigation:**
20. Click "See how it works" CTA (from hero) → page smoothly scrolls to How It Works section
21. Click "Features" in navbar → page scrolls to features section (`id="features"`)

**Reduced motion (`prefers-reduced-motion: reduce` via DevTools):**
22. Step cards appear immediately (no stagger reveal)
23. FloatCards appear immediately (no whileInView animation)

**Responsive (mobile ≤ 768px):**
24. Feature blocks stack: image above text (single column)
25. Image position `left`/`right` prop has no visual effect on mobile (single column)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Server/client boundary: FloatCard inside server FeatureSection | Valid Next.js pattern — server component accepts client component as `children: ReactNode` |
| FloatCard `Math.random()` delay → hydration mismatch | Use fixed `delay` props (0, 0.2) passed from page.tsx instead |
| `aspect-[4/3]` on image container: image may not fill correctly | Use `fill` + `object-cover` inside the `relative` container; `aspect-[4/3]` sets height |
| Unsplash photo IDs may 404 or not match expected aesthetic | Images are decorative — layout works without them; can swap URLs after visual review |
| FloatCard `absolute` positioning overflows on mobile | Add `overflow-hidden` to image container (already `overflow-hidden` from `rounded-2xl`) |
| `how-it-works` anchor needs to scroll below fixed navbar | Add `scroll-mt-20` class to the section element for correct offset |
