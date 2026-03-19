# V2: Hero — Implementation Plan

## Scope
Implements the Hero section (V2) from `docs/shaping/landing-page-slices.md`.
Demo goal: full-screen hero loads with staggered FM text reveal (eyebrow → headline → sub-headline → CTAs), floating phone mockup, dark salon photo with gradient overlay, `animate-float` on the phone.

Assumes V1 (site shell) is complete: design tokens in globals.css, framer-motion installed, dark body, fixed navbar.

---

## Key Discoveries

### page.tsx is currently full boilerplate
`src/app/page.tsx` is `"use client"` with SetupChecklist, StarterPromptModal, useDiagnostics, YouTube embed. All of this gets replaced. It becomes a **server component** shell importing the hero dynamically.

### Bundle strategy: next/dynamic
The shaping doc explicitly requires heavy FM entry points (hero) to be loaded via `next/dynamic({ ssr: false })`. So:
- `src/components/landing/hero-section.tsx` — `"use client"` with all Framer Motion code
- `src/app/page.tsx` — server component that imports hero via `dynamic()`

### animate-float already defined (in V1)
The `@keyframes float` + `--animate-float` CSS var are added to `globals.css` in V1. No new keyframe code needed here.

### Unsplash image
`next.config.ts` already has `images.unsplash.com` remotePattern (added in V1). Use:
`https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80` (hair salon, dark aesthetic)

---

## Files Changed

| File | Action |
|------|--------|
| `src/app/page.tsx` | Full rewrite — remove all boilerplate, become a server component, dynamically import `HeroSection` |
| `src/components/landing/hero-section.tsx` | New file — `"use client"`, full hero with FM stagger, phone mockup, Unsplash bg |

---

## Step-by-Step Implementation

### Step 1 — Rewrite page.tsx
Remove all boilerplate. Convert from `"use client"` to server component:

```tsx
import dynamic from "next/dynamic";

const HeroSection = dynamic(
  () => import("@/components/landing/hero-section"),
  { ssr: false }
);

export default function Home() {
  return (
    <main>
      <HeroSection />
      {/* V3: HowItWorks, FeatureSections */}
      {/* V4: FeaturesCarousel, PricingSection */}
      {/* V5: FaqSection, CtaSection */}
    </main>
  );
}
```

### Step 2 — Create src/components/landing/hero-section.tsx

**Full structure:**

```
"use client"

Section wrapper:
  <section className="relative min-h-screen overflow-hidden bg-bg-dark">

  ① Background image (Next.js Image):
    <Image
      src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80"
      alt=""        ← decorative, aria-hidden
      fill
      priority
      className="object-cover object-center"
    />

  ② Gradient overlay (on top of image):
    <div className="absolute inset-0 bg-gradient-to-r from-bg-dark/95 via-bg-dark/80 to-transparent" />

  ③ Content container (above both):
    <div className="relative z-10 container mx-auto grid grid-cols-1 lg:grid-cols-2
                    items-center gap-12 pt-32 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen">

      LEFT COLUMN — FM stagger container:
        <motion.div
          variants={containerVariants}
          initial={reducedMotion ? "visible" : "hidden"}
          animate="visible"
        >
          ① Eyebrow (motion.div child):
            <span className="bg-primary/15 text-primary text-xs font-semibold
                             uppercase tracking-widest px-3 py-1 rounded-full">
              For salons, stylists & barbers
            </span>

          ② Headline (motion.div child):
            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
              Stop losing money<br />to no-shows
            </h1>

          ③ Sub-headline (motion.div child):
            <p className="text-lg text-text-muted leading-relaxed max-w-lg">
              Astro protects your income with smart client scoring,
              automated deposits, and instant slot recovery.
            </p>

          ④ CTA row (motion.div child):
            <div className="flex flex-wrap gap-4">
              <motion.a
                href="/app"
                whileHover={reducedMotion ? {} : { scale: 1.02 }}
                transition={{ duration: 0.15 }}
                className="bg-accent-coral hover:bg-[#F09070] text-bg-dark
                           px-8 py-3 rounded-xl font-semibold transition-colors
                           duration-200 cursor-pointer"
              >
                Book a Demo
              </motion.a>
              <motion.a
                href="#how-it-works"
                whileHover={reducedMotion ? {} : { scale: 1.02 }}
                transition={{ duration: 0.15 }}
                className="border border-white/30 text-white hover:bg-white/10
                           px-8 py-3 rounded-xl transition-colors duration-200 cursor-pointer"
              >
                See how it works
              </motion.a>
            </div>

          ⑤ Social proof (motion.div child):
            <p className="text-sm text-text-light-muted">
              Trusted by 500+ beauty professionals
            </p>
        </motion.div>

      RIGHT COLUMN — Phone mockup:
        <div className="flex justify-center lg:justify-end">
          <div className={reducedMotion ? "" : "animate-float"}>
            <div className="w-64 lg:w-72 rounded-[2.5rem] border-4 border-white/10
                            bg-bg-dark-secondary shadow-2xl overflow-hidden">
              {/* Static appointment dashboard HTML — see Step 3 */}
            </div>
          </div>
        </div>
```

**FM variants:**
```ts
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
```

`useReducedMotion()` from `framer-motion` — if true:
- `initial="visible"` on container (skip reveal)
- Remove `animate-float` class from phone wrapper
- `whileHover={}` on CTAs (no scale)

### Step 3 — Phone mockup static HTML
Static HTML appointment dashboard inside the phone frame:

```
Phone screen (overflow-hidden):

  Header bar:
    bg-bg-dark px-4 py-3 border-b border-white/10
    Text: "Today · Feb 19" (text-xs text-text-light-muted)
    Title: "Appointments" (text-sm font-semibold text-white)

  3 appointment rows (divide-y divide-white/5):
    Row 1: Sarah M. · 9:00 AM · [Top Tier badge: bg-accent-peach/20 text-accent-peach]
    Row 2: Jordan K. · 11:30 AM · [Neutral badge: bg-white/10 text-text-light-muted]
    Row 3: Taylor R. · 2:00 PM · [Risk badge: bg-accent-coral/20 text-accent-coral]

  Each row: px-4 py-3
    client name: text-sm font-medium text-white
    time: text-xs text-text-light-muted
    badge: text-xs font-medium px-2 py-0.5 rounded-full

  Bottom bar:
    bg-bg-dark px-4 py-2 border-t border-white/10
    "3 appointments" text-xs text-text-light-muted text-center
```

---

## Testing Plan

### 1. Lint + typecheck (automated)
```bash
pnpm lint && pnpm typecheck
```
Zero errors required.

### 2. Browser smoke tests via Playwright
User must start dev server (`pnpm dev`). Tests navigate to `http://localhost:3000`.

**Background image:**
1. Hero section has a visible background photo (not a blank dark area)
2. Gradient overlay fades from dark (left) toward the image (right)

**Text content (stagger reveal):**
3. Eyebrow badge "For salons, stylists & barbers" visible
4. Headline "Stop losing money to no-shows" visible
5. Sub-headline paragraph visible below headline
6. "Book a Demo" coral button present
7. "See how it works" ghost button present
8. "Trusted by 500+ beauty professionals" social proof text visible

**Phone mockup:**
9. Phone frame visible on right side (desktop ≥ 1024px)
10. Phone shows 3 appointment rows with client names + time + tier badges
11. Phone is animating (floating up/down) — visible after a few seconds

**Animation:**
12. On fresh page load, text elements reveal sequentially (not all at once)
13. Hovering "Book a Demo" slightly scales up (desktop)

**Reduced motion (test via DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`):**
14. Text is immediately visible (no reveal animation)
15. Phone is stationary (no float)

**Responsive:**
16. At ≤ 768px: single column layout (text on top, phone below or hidden)
17. At ≥ 1024px: two-column layout (text left, phone right)

**Navbar interaction:**
18. Fixed navbar still visible above hero (pt-32 accounts for it)
19. "See how it works" CTA scrolls to `#how-it-works` (anchor — will scroll to bottom since section doesn't exist yet in V2; confirm no JS error)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Unsplash image fails to load (CORS/404) | Add `alt=""` aria-hidden for decorative; gradient overlay still shows even if image 404s |
| `next/dynamic` with `ssr: false` causes layout shift | Hero section has `min-h-screen` so it reserves space; no CLS |
| FM `useReducedMotion` is a hook — must be inside `"use client"` component | Hero component IS `"use client"` — no issue |
| `whileHover` on `<a>` tags needs `motion.a` | Use `motion.a` or wrap with `motion.div` |
| Phone mockup width on small screens | `w-64` (256px) fits ≥ 375px viewport; add `hidden lg:flex` if phone is distracting on mobile |
