# V5: FAQ + Final CTA — Implementation Plan

**Slice:** V5 of 5 (final slice — completes the landing page)
**Depends on:** V1 (tokens, layout, header, footer), V2 (page.tsx, hero), V3 (how-it-works, feature-section), V4 (features-carousel, pricing-section)
**Design system:** `docs/shaping/landing-page-design-system.md`
**Shaping source:** `docs/shaping/landing-page-shaping.md` → C11, C7
**Breadboard affordances:** U23–U28, N16–N17, N4 (reused)

---

## What Gets Built

Two new standalone sections completing the landing page:

1. **FAQ** (`bg-bg-dark-secondary`) — animated accordion, 6 items, one open at a time via `AnimatePresence` height transition, `aria-expanded` triggers, rotating chevron
2. **Final CTA** (`bg-bg-dark`) — teal gradient depth background, floating phone mockup (booking confirmation screen), coral primary CTA and ghost secondary CTA

Then **full page assembly** in `page.tsx` — all five slices wired together in the locked page order:

```
Hero → How It Works → Feature Sections → Features Carousel → Pricing → FAQ → Final CTA → Footer
```

**Demo:** The page is complete end-to-end. Scrolling to FAQ and clicking a question smoothly expands the answer; a second click collapses it; clicking a different item collapses the previous one. The floating phone in the CTA bobs with `animate-float`. Every CTA in the page leads to `/app` or a demo anchor.

---

## Files

### New files
- `src/components/landing/faq-section.tsx`
- `src/components/landing/cta-section.tsx`

### Modified files
- `src/app/page.tsx` — import all section components; render in full locked page order; remove any V5 placeholder comment

---

## 1. `faq-section.tsx`

**Directive:** `"use client"` (uses `useState`, `useReducedMotion`, FM `AnimatePresence`)

### Data (6 FAQ items)

Defined as a module-scope constant — no props, no fetch:

```ts
const FAQ_ITEMS = [
  {
    q: "What happens if a client no-shows?",
    a: "Astro retains the deposit automatically and updates the client's reliability score. Two or more no-shows within 90 days flags them as a risk client, so you can decide whether to accept future bookings from them.",
  },
  {
    q: "Can clients cancel and get a refund?",
    a: "Cancelling before your cutoff window triggers a full automatic refund — no awkward conversations needed. After the cutoff, you keep the deposit. You set the cutoff (e.g. 24 hours) when you configure your policy.",
  },
  {
    q: "How long does it take to get started?",
    a: "Most beauty professionals are live and taking bookings within 20 minutes. Set your availability, cancellation policy, and deposit amount, then share your booking link.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — 14-day free trial, no credit card required. Every feature is available during the trial, including smart client scoring, slot recovery, and Stripe deposits.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Astro is month-to-month, no contracts. Cancel from your account settings at any time. Your data is exported on request.",
  },
  {
    q: "Which calendar and payment apps does Astro work with?",
    a: "Astro integrates with Google Calendar and processes payments via Stripe. SMS confirmations go out through Twilio. Additional integrations are on the roadmap.",
  },
]
```

### State (N16)

```ts
const [openIndex, setOpenIndex] = useState<number | null>(null)
const reducedMotion = useReducedMotion()
```

Toggle logic: same index → set `null` (close). Different index → set new index (closes previous, opens new).

```ts
const toggle = (i: number) =>
  setOpenIndex(prev => (prev === i ? null : i))
```

### Layout

```
<section className="bg-bg-dark-secondary py-24">
  <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Eyebrow label -->
    <!-- Section heading + sub-heading (centred) -->
    <!-- FAQ list -->
  </div>
</section>
```

### Section header

```tsx
<div className="text-center mb-16">
  <span className="bg-primary/15 text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full">
    FAQ
  </span>
  <h2 className="text-4xl font-bold text-white mt-4 mb-4">
    Common questions
  </h2>
  <p className="text-lg text-text-muted">
    Everything you need to know about Astro.
  </p>
</div>
```

### FAQ list + accordion (N17, U23, U24)

```tsx
<div className="divide-y divide-white/10">
  {FAQ_ITEMS.map((item, i) => {
    const isOpen = openIndex === i
    return (
      <div key={i}>
        {/* Trigger (U23) */}
        <button
          onClick={() => toggle(i)}
          aria-expanded={isOpen}
          aria-controls={`faq-answer-${i}`}
          className="w-full flex items-center justify-between py-5 text-left cursor-pointer group"
        >
          <span className={`text-xl font-semibold transition-colors duration-200 ${isOpen ? "text-white" : "text-text-light-muted group-hover:text-white"}`}>
            {item.q}
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 ml-4"
          >
            <ChevronDown className="w-5 h-5 text-text-muted" />
          </motion.span>
        </button>

        {/* Answer panel (U24) — N17 */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              id={`faq-answer-${i}`}
              key="answer"
              initial={reducedMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reducedMotion ? {} : { height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <p className="text-text-muted leading-relaxed pb-5">
                {item.a}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  })}
</div>
```

**`initial={false}` on `AnimatePresence`** prevents the first item from animating in on page load if a default open index were ever set. Since the default is `null`, this is a defensive guard.

**`reducedMotion` guard:** when true, `initial` is set to `false` (skip entry animation) and `exit` uses an empty object (instant removal). The chevron `motion.span` still receives the `animate` rotate — Framer Motion applies this without a transition when `useReducedMotion()` returns true, so no extra check needed there.

---

## 2. `cta-section.tsx`

**Directive:** Server component — no `useState`, no FM (the floating phone uses only the CSS `animate-float` keyframe from `tailwind.config.js`, and the CTA buttons use `whileHover` which is lightweight). If `motion.button` is used for the hover effect, add `"use client"`.

**Decision:** Add `"use client"` to support `motion.button` `whileHover` on the two CTAs. The gradient background and blur circles are pure Tailwind — no JS needed.

### Layout

```
<section className="bg-bg-dark py-24 relative overflow-hidden">
  {/* Background gradient + depth circles */}
  {/* Content: centred text, buttons, floating phone */}
</section>
```

### Background depth (C7.2)

```tsx
{/* Gradient overlay */}
<div className="absolute inset-0 bg-gradient-to-br from-bg-dark via-primary-dark/20 to-bg-dark pointer-events-none" />

{/* Blur circles at opposing corners */}
<div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
<div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
```

### Content (C7.3, U25–U27)

```tsx
<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
  <span className="bg-primary/15 text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full">
    Get started today
  </span>

  <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mt-4 mb-4">
    Your calendar deserves<br />to stay full
  </h2>

  <p className="text-lg text-text-muted mb-8 max-w-xl mx-auto">
    Join 500+ beauty professionals who have eliminated no-shows and put their slot recovery on autopilot.
  </p>

  <div className="flex flex-col sm:flex-row gap-4 justify-center">
    {/* Primary CTA (U26) */}
    <motion.button
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
      className="bg-accent-coral hover:bg-[#F09070] text-bg-dark px-8 py-3 rounded-xl font-semibold transition-colors duration-200 cursor-pointer"
    >
      Book a Demo
    </motion.button>

    {/* Ghost secondary (U27) */}
    <motion.button
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
      onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
      className="border border-white/30 text-white hover:bg-white/10 px-8 py-3 rounded-xl transition-colors duration-200 cursor-pointer"
    >
      See how it works
    </motion.button>
  </div>
</div>
```

**Note on "See how it works":** The `onClick` scroll call is client-side JS. If keeping `cta-section.tsx` as a server component is preferred, replace `motion.button` with a plain `<a href="#how-it-works">` — smooth scrolling can then be enabled via `scroll-behavior: smooth` in `globals.css` or Tailwind `[html]:scroll-smooth`. Either is valid; the `"use client"` + `motion.button` approach is used here for consistency with the hero CTA (V2).

### Floating phone (N4 reused, U28)

The `animate-float` class is already defined in `tailwind.config.js` from V1. No new keyframe needed.

```tsx
{/* Floating phone (U28) */}
<div className="animate-float mt-16 flex justify-center">
  <div className="w-64 lg:w-72 rounded-[2.5rem] border-4 border-white/10 bg-bg-dark-secondary shadow-2xl overflow-hidden">
    {/* Status bar */}
    <div className="bg-bg-dark px-4 py-2 text-xs text-text-light-muted flex justify-between">
      <span>9:41</span><span>●●●</span>
    </div>
    {/* Booking confirmation screen */}
    <div className="p-5 flex flex-col items-center gap-4">
      {/* Green checkmark */}
      <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-400" />
      </div>
      <p className="text-white font-semibold text-center text-sm">Booking Confirmed!</p>
      {/* Receipt block */}
      <div className="w-full bg-bg-dark rounded-xl p-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-text-light-muted">Client</span>
          <span className="text-white">Sarah M.</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-light-muted">Date</span>
          <span className="text-white">Fri 14 Mar, 2:00 pm</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-text-light-muted">Deposit paid</span>
          <span className="text-primary font-semibold">£15.00</span>
        </div>
      </div>
      {/* Status badge */}
      <span className="bg-green-500/20 text-green-400 text-xs font-medium px-3 py-1 rounded-full">
        SMS sent ✓
      </span>
    </div>
  </div>
</div>
```

**`useReducedMotion` for the float:** The `animate-float` class is a CSS keyframe. To respect reduced motion in pure CSS, add a `@media (prefers-reduced-motion: reduce)` rule in `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-float {
    animation: none;
  }
}
```

This is the correct approach for a CSS animation — no JS check needed in `cta-section.tsx`. The same rule covers the hero phone from V2.

**If `globals.css` is not used for custom rules** (the shaping doc says keyframes go in `tailwind.config.js`): add a Tailwind `motion-reduce:animate-none` utility class alongside `animate-float`. This is supported in Tailwind v3+ via `motion-safe`/`motion-reduce` variants:

```tsx
<div className="animate-float motion-reduce:animate-none mt-16 flex justify-center">
```

Use the Tailwind variant approach to stay consistent with the design system rule (no `globals.css` additions).

---

## 3. `page.tsx` — Full Page Assembly

This is the final `page.tsx` edit. All five slices are assembled. The file imports every section component and renders them in the locked order.

### Import block (add at top)

```tsx
import HowItWorks from "@/components/landing/how-it-works"           // V3
import FeatureSection from "@/components/landing/feature-section"     // V3
import FeaturesCarousel from "@/components/landing/features-carousel" // V4
import PricingSection from "@/components/landing/pricing-section"     // V4
import FaqSection from "@/components/landing/faq-section"             // V5
import CtaSection from "@/components/landing/cta-section"             // V5
```

(Hero from V2 is inline in `page.tsx` or imported depending on how V2 was implemented — do not move it.)

### Return body (locked page order)

```tsx
return (
  <>
    {/* V2 */}
    <HeroSection />

    {/* V3 */}
    <HowItWorks />
    <FeatureSectionsBlock />   {/* the three alternating blocks from V3 */}

    {/* V4 */}
    <FeaturesCarousel />
    <PricingSection />

    {/* V5 */}
    <FaqSection />
    <CtaSection />

    {/* Footer is in layout.tsx from V1 — no repeat here */}
  </>
)
```

Remove any `{/* V5 placeholder */}` comment that may exist from V4's page edit.

---

## Self-Testing Plan

All steps are run sequentially. Each must pass before proceeding to the next.

### Step 1 — Type and lint check

```bash
pnpm lint && pnpm typecheck
```

Pass criteria: zero errors. Common things to check:
- `AnimatePresence` imported from `"framer-motion"` not `"framer-motion/dist/..."`
- `motion.span` and `motion.button` require `"use client"` on the containing component
- `aria-controls` value matches the `id` on the answer `<div>`
- `ChevronDown` and `CheckCircle` imported from `"lucide-react"`

### Step 2 — Build check

```bash
pnpm build
```

Pass criteria: build completes. If `AnimatePresence` triggers a hydration error, add `"use client"` to `faq-section.tsx` (it already has it) or wrap with `next/dynamic({ ssr: false })` in `page.tsx`.

### Step 3 — Full page visual snapshot

Navigate to `http://localhost:3000` (dev server started by user). Take a full-page screenshot.

Pass criteria:
- Page renders all sections in order: Hero → How It Works → Feature Sections → Features Carousel → Pricing → FAQ → Final CTA → Footer
- No section is missing or rendering out of order
- No white background flash between dark sections
- FAQ section has `bg-bg-dark-secondary`; Final CTA section has `bg-bg-dark` with a subtle teal glow visible in the background
- Footer from V1 is visible at the bottom

### Step 4 — FAQ accordion: open/close

Click the first FAQ item ("What happens if a client no-shows?"):

1. The answer expands smoothly (height `0 → auto`, opacity `0 → 1`)
2. The chevron rotates 180°
3. The `aria-expanded` attribute on the button becomes `"true"`

Click the same item again:

1. The answer collapses (height `auto → 0`)
2. The chevron rotates back to 0°
3. `aria-expanded` returns to `"false"`

Pass criteria: all of the above.

### Step 5 — FAQ accordion: single-open enforcement

Click the first FAQ item to open it. Then click the second FAQ item:

1. First item collapses
2. Second item expands
3. Only one item is open at any time

Click the second item again to close it. State returns to `openIndex = null` (all closed).

Pass criteria: no more than one item open at a time.

### Step 6 — FAQ accordion: all six items

Expand and collapse each of the six items in sequence, verifying:
- Each question text matches the `FAQ_ITEMS` data
- Each answer text matches
- No item is stuck open or fails to animate

### Step 7 — Reduced motion: FAQ

In browser DevTools, enable "Emulate CSS media feature prefers-reduced-motion: reduce". Reload. Click a FAQ trigger.

Pass criteria:
- Answer panel appears instantly (no height animation, no opacity fade)
- Chevron still rotates (FM applies the `rotate` without a transition when reduced motion is active — this is acceptable behaviour; chevron can also be made instant by checking `reducedMotion` on the `transition` prop)
- No layout shift or content jump

### Step 8 — Final CTA section visual

Scroll to the Final CTA section:

1. Two blur circles are visible at opposing corners (subtle teal glow — may be faint)
2. Eyebrow label, headline, sub-headline are centred
3. Coral "Book a Demo" button and ghost "See how it works" button are on the same row (desktop) or stacked (mobile)
4. Floating phone mockup is below the buttons
5. Phone shows the booking confirmation screen: green checkmark, "Booking Confirmed!", receipt block, "SMS sent ✓" badge

### Step 9 — Floating phone animation

On desktop with normal motion preference:

1. The phone mockup in the CTA section visibly bobs up and down (`animate-float` 6s loop)

With reduced motion enabled (`motion-reduce:animate-none`):

1. The phone is static — no bob

Pass criteria: animation present in normal mode, absent in reduced-motion mode.

### Step 10 — CTA button hover

Hover over the coral "Book a Demo" button:

1. Button scales to `1.02` (FM `whileHover`)
2. Background colour transitions to `#F09070` (Tailwind `hover:` class)

Hover over the ghost "See how it works" button:

1. Button scales to `1.02`
2. Background transitions to `bg-white/10`

### Step 11 — "See how it works" scroll

Click the "See how it works" ghost button in the Final CTA:

1. Page smooth-scrolls up to the How It Works section (`#how-it-works`)

Pass criteria: scroll fires and lands on the correct section. Verify the `#how-it-works` id is present on the How It Works section element (from V3).

### Step 12 — Full page keyboard navigation

Tab through the entire page from top to bottom:

1. All interactive elements receive focus in DOM order: navbar links → hero CTAs → pricing toggle → pricing CTA → FAQ triggers (×6) → CTA buttons
2. Every focused button shows a visible focus ring (browser default or custom via Tailwind `focus-visible:ring-2`)
3. Each FAQ trigger can be activated with Enter or Space
4. No keyboard trap

Pass criteria: complete tab traversal without getting stuck.

### Step 13 — Accessibility: aria attributes

Using browser DevTools accessibility panel or `axe` DevTools extension:

- Each FAQ `<button>` has `aria-expanded` (`"true"` when open, `"false"` when closed)
- Each FAQ answer `<div>` has an `id` matching `aria-controls` on its trigger
- `aria-live="polite"` is present on the pricing price `<span>` (from V4 — regression check)
- No missing alt text on images (Unsplash images from V3 should have `alt` props)

### Step 14 — Page section order regression

Scroll through the full page and verify the locked section order:

Hero → How It Works → Feature Sections (×3) → Features Carousel → Pricing → FAQ → Final CTA → Footer

Pass criteria: exact order matches the spec. No section from V1–V4 was accidentally displaced by the V5 `page.tsx` edit.

### Step 15 — Mobile end-to-end (375px viewport)

Resize to 375px. Scroll through the complete page:

1. Hero: text and phone stack vertically, no overflow
2. How It Works: three step cards stack vertically; flow line is hidden (`hidden md:block`)
3. Feature Sections: image and text stack vertically
4. Features Carousel: tab pills wrap; phone frame centred below text
5. Pricing: card fills container; toggle row fits single line
6. FAQ: accordion works at narrow width; question text wraps cleanly
7. Final CTA: headline wraps to multiple lines; buttons stack (`flex-col sm:flex-row`); phone centred
8. Footer: links wrap; copyright centred

Pass criteria: no horizontal scroll on the page at 375px.

---

## Risk Notes

| Risk | Mitigation |
|------|------------|
| `AnimatePresence` with `height: "auto"` flickers on first open | Use `initial={false}` on `<AnimatePresence>` — prevents animate-in on mount if nothing is open |
| Answer panel height measured before fonts load | `height: "auto"` in FM uses `ResizeObserver` internally — works correctly even with late-loading fonts |
| Chevron rotation with reduced motion | The `motion.span` will still rotate (FM suppresses duration, not the target value). Add `transition={{ duration: reducedMotion ? 0 : 0.2 }}` if instant rotation is required |
| `"See how it works"` scroll in server component | Use `"use client"` on `cta-section.tsx` and `motion.button` with `onClick` scroll, or replace with `<a href="#how-it-works">` to avoid JS requirement |
| `animate-float motion-reduce:animate-none` Tailwind variant | Requires Tailwind `motionSafe`/`motionReduce` variants to be available (default in Tailwind v3+). Verify `tailwind.config.js` does not disable them |
| Page order broken by naïve paste into `page.tsx` | Read `page.tsx` current state before editing; place new imports and JSX exactly after V4's additions |
| Footer appearing twice | Footer is in `layout.tsx` from V1 — do not add another `<SiteFooter>` in `page.tsx` |

---

## Done Criteria

- [ ] `pnpm lint && pnpm typecheck` passes clean
- [ ] `pnpm build` succeeds
- [ ] Full page renders all sections in locked order without gaps or duplicates
- [ ] FAQ accordion: clicking opens answer (height animation + chevron rotation)
- [ ] FAQ accordion: second click on same item closes it
- [ ] FAQ accordion: clicking a different item closes the previous one
- [ ] All six FAQ items have correct question and answer text
- [ ] `aria-expanded` toggles correctly on FAQ triggers
- [ ] `aria-controls` on each trigger matches `id` on its answer panel
- [ ] Final CTA section has teal gradient + blur depth circles visible
- [ ] Floating phone shows booking confirmation screen (checkmark, receipt, SMS badge)
- [ ] `animate-float` bobs on the CTA phone; `motion-reduce:animate-none` stops it
- [ ] "Book a Demo" and "See how it works" CTAs have `whileHover={{ scale: 1.02 }}`
- [ ] "See how it works" scrolls to `#how-it-works`
- [ ] No default Tailwind colours (`indigo`, `emerald`, `slate`) — only approved design tokens
- [ ] Full page keyboard navigable; no tab trap
- [ ] Reduced motion disables FAQ height animation and float animation
- [ ] Mobile 375px renders without horizontal scroll
- [ ] Footer visible once at the bottom (not duplicated from `layout.tsx`)
