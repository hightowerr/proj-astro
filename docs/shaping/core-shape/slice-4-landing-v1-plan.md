# V4: Features Carousel + Pricing — Implementation Plan

**Slice:** V4 of 5
**Depends on:** V1 (design tokens, layout), V2 (page.tsx exists), V3 (feature-section.tsx pattern)
**Design system:** `docs/shaping/landing-page-design-system.md`
**Shaping source:** `docs/shaping/landing-page-shaping.md` → C5.6, C6
**Breadboard affordances:** U17–U22, N9–N15

---

## What Gets Built

Two new standalone sections added to the landing page, in order below the Feature Sections from V3:

1. **Features Carousel** (`bg-bg-dark-secondary`) — animated tab + swipe slider showcasing No-Show Protection, Marketing Tools, and Calendar
2. **Pricing** (`bg-bg-dark`) — single-plan card with monthly/annual toggle and `aria-live` price update

**Demo:** Tab pills switch slides with a spring animation. Dragging left/right also advances the slide. A progress bar tracks position. Below, clicking the annual toggle updates the price with a "Save 20%" chip, and the price span is announced via `aria-live`.

---

## Files

### New files
- `src/components/landing/features-carousel.tsx`
- `src/components/landing/pricing-section.tsx`

### Modified files
- `src/app/page.tsx` — import and render both new sections in order after the Feature Sections block

---

## 1. `features-carousel.tsx`

**Directive:** `"use client"` (uses `useState`, FM gesture, `useReducedMotion`)

### Data (N9)

Static array defined at module scope — no fetch, no props:

```ts
const SLIDES = [
  {
    label: "No-Show Protection",
    title: "Stop no-shows before they cost you",
    description: "Astro flags high-risk clients automatically based on their booking history. Deposits are collected upfront so a no-show never means lost revenue.",
    bullets: [
      "Risk tier assigned based on 90-day history",
      "Deposit held on cancellation after cutoff",
      "Score updates automatically after each appointment",
    ],
    // Static HTML phone screen — inline JSX, no image fetch
    phoneScreen: "NoShowScreen", // maps to inline JSX constant below
  },
  {
    label: "Marketing Tools",
    title: "Win back clients on autopilot",
    description: "Send targeted re-engagement SMS to clients who haven't booked in 60+ days. Personalised messages go out from your number, not a generic shortcode.",
    bullets: [
      "Segment by last booking date automatically",
      "One-click SMS campaign to lapsed clients",
      "Replies routed back to your inbox",
    ],
    phoneScreen: "MarketingScreen",
  },
  {
    label: "Calendar",
    title: "Your schedule, always full",
    description: "See today's appointments at a glance. Colour-coded slots show booked, available, and blocked times. Sync with Google Calendar in one click.",
    bullets: [
      "Week view with colour-coded availability",
      "Google Calendar sync",
      "Block time off without affecting your booking link",
    ],
    phoneScreen: "CalendarScreen",
  },
]
```

### State (N10)

```ts
const [activeIndex, setActiveIndex] = useState(0)
const reducedMotion = useReducedMotion()
```

### Phone screen JSX constants

Three `const NoShowScreen`, `MarketingScreen`, `CalendarScreen` — pure static JSX, no `"use client"` needed on their own. Defined above the component in the same file.

**NoShowScreen:** Dark phone shell containing a client card with name, `"High Risk"` badge (`bg-accent-coral/20 text-accent-coral`), last appointment date, and a flagged reason line. A teal `ShieldAlert` icon at top.

**MarketingScreen:** SMS composer mockup — a text area with "We miss you, [Name]! Book your next appointment →" pre-filled, a "Send to 12 clients" teal button below.

**CalendarScreen:** 5-column week grid (Mon–Fri). Each column has 3 time slots. Filled slots are `bg-primary/20 text-primary text-xs rounded p-1`. Available slots are `border border-white/10 text-text-light-muted text-xs rounded p-1`. One blocked slot is `bg-white/5 text-text-light-muted line-through text-xs rounded p-1`.

### Layout

```
<section id="features" className="bg-bg-dark-secondary py-24">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Eyebrow + heading (centred) -->
    <!-- Tab pills (U17) -->
    <!-- Progress bar (U19) -->
    <!-- AnimatePresence slide (U18) -->
  </div>
</section>
```

### Tab pills (U17)

```tsx
<div className="flex gap-2 justify-center mb-8 flex-wrap">
  {SLIDES.map((slide, i) => (
    <button
      key={slide.label}
      onClick={() => setActiveIndex(i)}
      className={
        i === activeIndex
          ? "text-sm text-white bg-primary rounded-full px-5 py-2 transition-colors duration-200 cursor-pointer"
          : "text-sm text-text-muted border border-white/10 bg-bg-dark-secondary rounded-full px-5 py-2 transition-colors duration-200 cursor-pointer hover:border-primary/40"
      }
    >
      {slide.label}
    </button>
  ))}
</div>
```

### Progress bar (N13, U19)

```tsx
<div className="w-full max-w-md mx-auto h-1 bg-white/10 rounded-full mb-12 overflow-hidden">
  <div
    className="h-full bg-primary rounded-full transition-all duration-300"
    style={{ width: `${((activeIndex + 1) / SLIDES.length) * 100}%` }}
  />
</div>
```

### AnimatePresence slide (N11, N12, U18)

Slide variants:
```ts
const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
}
```

Track direction in a `useRef<number>` updated whenever `setActiveIndex` is called (positive = forward, negative = backward). When `reducedMotion` is true, variants are replaced with `{ enter: {}, center: {}, exit: {} }` (instant, no translate).

```tsx
<AnimatePresence mode="wait" custom={directionRef.current}>
  <motion.div
    key={activeIndex}
    custom={directionRef.current}
    variants={reducedMotion ? {} : slideVariants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ type: "spring", stiffness: 300, damping: 30 }}
    drag={reducedMotion ? false : "x"}
    dragConstraints={{ left: 0, right: 0 }}
    dragElastic={0.1}
    onDragEnd={(_e, { offset }) => {
      if (offset.x < -50 && activeIndex < SLIDES.length - 1) {
        directionRef.current = 1
        setActiveIndex(i => i + 1)
      } else if (offset.x > 50 && activeIndex > 0) {
        directionRef.current = -1
        setActiveIndex(i => i - 1)
      }
    }}
    className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12 cursor-grab active:cursor-grabbing"
  >
    <!-- Left: text + bullets -->
    <!-- Right: phone frame with screen JSX -->
  </motion.div>
</AnimatePresence>
```

### Slide left column

```
eyebrow: slide.label  (text-xs font-semibold uppercase tracking-widest text-primary)
title:   text-3xl font-bold text-white mb-4
desc:    text-base text-text-muted leading-relaxed mb-6
bullets: ul, each li = flex gap-3 items-start
         Check icon w-4 h-4 text-primary flex-shrink-0 mt-0.5
         span text-base text-text-muted
```

### Slide right column (phone frame)

```tsx
<div className="flex justify-center">
  <div className="w-64 lg:w-72 rounded-[2.5rem] border-4 border-white/10 bg-bg-dark-secondary shadow-2xl overflow-hidden">
    {/* 40px status bar strip */}
    <div className="bg-bg-dark px-4 py-2 text-xs text-text-light-muted flex justify-between">
      <span>9:41</span><span>●●●</span>
    </div>
    {/* Feature-specific screen JSX */}
    {activeIndex === 0 && <NoShowScreen />}
    {activeIndex === 1 && <MarketingScreen />}
    {activeIndex === 2 && <CalendarScreen />}
  </div>
</div>
```

---

## 2. `pricing-section.tsx`

**Directive:** `"use client"` (uses `useState`)

### State (N14)

```ts
const [period, setPeriod] = useState<"monthly" | "annual">("monthly")
```

### Price calc (N15)

```ts
const MONTHLY_PRICE = 49
const price = period === "annual" ? Math.round(MONTHLY_PRICE * 0.8) : MONTHLY_PRICE
```

### Layout

```
<section id="pricing" className="bg-bg-dark py-24">
  <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Eyebrow + heading (centred) -->
    <!-- Toggle (U20) -->
    <!-- Pricing card (U21) -->
    <!-- CTA (U22) -->
  </div>
</section>
```

### Toggle (U20)

```tsx
<div className="flex justify-center mb-10">
  <div className="inline-flex bg-bg-dark-secondary rounded-full p-1 border border-white/10">
    {(["monthly", "annual"] as const).map((p) => (
      <button
        key={p}
        onClick={() => setPeriod(p)}
        className={`${
          period === p
            ? "bg-primary text-white"
            : "text-text-muted"
        } rounded-full px-5 py-1.5 text-sm transition-colors duration-200 cursor-pointer capitalize flex items-center gap-2`}
      >
        {p}
        {p === "annual" && (
          <span className="bg-primary/15 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full">
            Save 20%
          </span>
        )}
      </button>
    ))}
  </div>
</div>
```

### Pricing card (U21)

```tsx
<div className="bg-bg-dark-secondary rounded-2xl p-8 lg:p-10 border border-primary/20 shadow-2xl">
  {/* Plan name */}
  <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">
    Astro Pro
  </p>
  {/* Price */}
  <div className="flex items-end gap-2 mb-2">
    <span
      aria-live="polite"
      className="text-6xl font-bold text-white"
    >
      ${price}
    </span>
    <span className="text-xl text-text-muted mb-2">/mo</span>
  </div>
  {period === "annual" && (
    <p className="text-sm text-text-light-muted mb-6">billed annually</p>
  )}
  {/* Feature list */}
  <ul className="space-y-3 mb-8">
    {FEATURES.map((f) => (
      <li key={f} className="flex items-center gap-3">
        <Check className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-base text-text-muted">{f}</span>
      </li>
    ))}
  </ul>
  {/* CTA (U22) */}
  <motion.button
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.15 }}
    className="bg-accent-coral hover:bg-[#F09070] text-bg-dark w-full font-semibold py-3.5 rounded-xl transition-colors duration-200 cursor-pointer"
  >
    Book a Demo
  </motion.button>
  <p className="text-sm text-text-light-muted text-center mt-3">
    No credit card required
  </p>
</div>
```

### Feature list constant

```ts
const FEATURES = [
  "Unlimited bookings",
  "Smart client scoring",
  "Slot recovery automation",
  "Stripe deposit collection",
  "SMS confirmations",
  "Cancellation policy enforcement",
  "Business dashboard",
  "Email support",
]
```

---

## 3. `page.tsx` changes

Add two imports and two JSX elements in the section order, after the `FeatureSections` block and before the placeholder for V5:

```tsx
import FeaturesCarousel from "@/components/landing/features-carousel"
import PricingSection from "@/components/landing/pricing-section"

// In the return:
<FeatureSections />       {/* V3 */}
<FeaturesCarousel />      {/* V4 — NEW */}
<PricingSection />        {/* V4 — NEW */}
{/* V5: FAQ + CTA will go here */}
```

Both components use `"use client"` internally so `page.tsx` can remain a server component (or be `"use client"` if V2/V3 already require it — match existing directive).

---

## Self-Testing Plan

All tests run without a live browser unless noted. Steps are sequential; each must pass before moving on.

### Step 1 — Type and lint check

```bash
pnpm lint && pnpm typecheck
```

Pass criteria: zero errors, zero warnings flagged as errors. Any type error in the new files is fixed before moving on.

### Step 2 — Build check

```bash
pnpm build
```

Pass criteria: build completes. If `AnimatePresence` or `motion` components cause SSR errors, ensure `"use client"` is present on both files. If FM is heavy, wrap with `next/dynamic({ ssr: false })` as described in the shaping doc.

### Step 3 — Visual snapshot (Playwright)

Navigate to `http://localhost:3000` (dev server started by user). Take a full-page screenshot:

```
scroll to #features section → screenshot
scroll to #pricing section → screenshot
```

Pass criteria:
- Features Carousel section has `bg-bg-dark-secondary` background, visible tab pills, phone frame, slide text and bullets
- Pricing section has `bg-bg-dark` background, the pricing card with teal border, plan name, price, feature list, and coral CTA button
- No layout overflow. No white flash on dark background. No unstyled text.

### Step 4 — Tab pill interaction

Click each of the three tab pills in sequence:

1. Click "No-Show Protection" → active pill turns `bg-primary text-white`; slide shows NoShowScreen phone content; progress bar at 33%
2. Click "Marketing Tools" → active pill updates; slide transitions (spring animation); MarketingScreen renders; progress bar at 67%
3. Click "Calendar" → CalendarScreen renders; progress bar at 100%

Pass criteria: each click updates the active pill style, renders the correct phone screen, and the progress bar width animates.

### Step 5 — Drag/swipe gesture

On a desktop browser, use Playwright's drag action to simulate swipe:

- Drag slide content left by 100px → index advances to next slide
- Drag slide content right by 100px → index decrements to previous slide
- Drag less than 50px → index does not change (threshold guard)

Pass criteria: swipe navigation works. Progress bar updates. No crash on swipe past first/last slide.

### Step 6 — Pricing toggle

Click the "Annual" toggle pill:

1. Price updates from `$49` to `$39` (Math.round(49 × 0.8))
2. "Save 20%" chip is visible inside the Annual pill (always shown on the button label)
3. "billed annually" sub-label appears below the price
4. `aria-live="polite"` span wraps the price — verify in DOM inspector that the attribute is present

Click back to "Monthly":

1. Price returns to `$49`
2. "billed annually" label disappears

Pass criteria: all above.

### Step 7 — Accessibility spot-check

- `aria-live="polite"` present on the price `<span>` (DOM inspection)
- All `<button>` elements are keyboard-focusable (Tab key cycles through tab pills and toggle)
- No interactive elements that are `<div>` or `<span>` without `role="button"` — all tabs and toggle use `<button>`

### Step 8 — Reduced motion

In the browser DevTools, enable "Emulate CSS media feature prefers-reduced-motion: reduce". Reload the page.

Pass criteria:
- Slide transition on tab click is instant (no spring animation)
- `drag` is disabled on the slide — dragging does nothing (cursor is default, not grab)
- Progress bar still updates width (it uses CSS `transition-all`, not FM — this is acceptable)

### Step 9 — Mobile layout (375px viewport)

Resize to 375px width. Scroll to the carousel and pricing sections.

Pass criteria:
- Tab pills wrap to multiple rows without overflow
- Phone frame is centred below the text column (single-column layout)
- Pricing card fills the narrow container; price text is not clipped
- Pricing toggle fits in one row; "Save 20%" chip does not overflow

### Step 10 — Section scroll anchors

Verify the `id="features"` on the carousel section is reachable from the "Features" nav link (added in V1 header). Click "Features" in the navbar → page scrolls to the carousel section.

Verify `id="pricing"` is reachable from the "Pricing" nav link.

Pass criteria: smooth scroll lands on the correct section.

---

## Risk Notes

| Risk | Mitigation |
|------|------------|
| `AnimatePresence` + `drag` cause hydration mismatch | Wrap `FeaturesCarousel` in `next/dynamic({ ssr: false })` if needed |
| Slide direction ref stale closure | Use `useRef` for direction, not state, to avoid re-render lag |
| `aria-live` not announced if price element is replaced in DOM | Use a `<span>` that stays mounted; only its text content changes (controlled by `period` state) |
| Phone frame content overflow on small screens | Phone frame uses `overflow-hidden` on the outer container — all screen content must be shorter than the frame height |
| Progress bar shows `0%` on first render if `activeIndex` initialises to 0 | First pill = index 0, width = `(0+1)/3 * 100 = 33%`. Correct — progress starts at 33%, not 0%. This matches the "one of three" semantic. |

---

## Done Criteria

- [ ] `pnpm lint && pnpm typecheck` passes clean
- [ ] `pnpm build` succeeds
- [ ] Three tab pills render; clicking each updates the slide and progress bar
- [ ] Drag swipe advances/decrements slide with ≥ 50px threshold
- [ ] Pricing toggle switches price between $49 and $39; `aria-live` span is in the DOM
- [ ] "Save 20%" chip visible on the Annual toggle button
- [ ] "billed annually" sub-label appears only in annual mode
- [ ] Both sections use correct background tokens (`bg-bg-dark-secondary` carousel, `bg-bg-dark` pricing)
- [ ] No default Tailwind colours used (no `indigo`, `emerald`, `slate`, `gray` outside the approved palette)
- [ ] `useReducedMotion()` suppresses FM transitions and disables drag when true
- [ ] Mobile layout (375px) renders without overflow
- [ ] `#features` and `#pricing` anchor IDs present for navbar links
