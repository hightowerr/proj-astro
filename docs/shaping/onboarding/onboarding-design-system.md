# Astro — Onboarding Design System

> Extends `landing-page-design-system.md` for the two-step shop owner onboarding flow.
> Maintains dark theme, teal/coral palette, and Trust & Authority aesthetic.

---

## Overview

The onboarding flow introduces new UI patterns not present on the landing page:
- **Selectable card grids** (business type selection)
- **Multi-step forms** (progressive disclosure)
- **Form validation** (inline errors, success states)
- **Step progression** (breadcrumbs, back/next navigation)

This design system extends the landing page tokens while maintaining visual continuity.

---

## Color Extensions

### Onboarding-Specific States

Builds on the base palette from `landing-page-design-system.md`:

| Token | Hex | Tailwind class | Role |
|-------|-----|---------------|------|
| `success-green` | `#10B981` | `text-success-green` / `bg-success-green` | Form validation success, checkmarks |
| `error-red` | `#EF4444` | `text-error-red` / `bg-error-red` | Form validation errors |
| `warning-amber` | `#F59E0B` | `text-warning-amber` | Warnings, caution states |
| `card-selected` | `#3D8B8B` | `border-primary` | Selected card border (primary teal) |
| `card-hover` | `#5BA3A3` | `border-primary-light` | Card hover state |
| `input-error-bg` | `rgba(239, 68, 68, 0.05)` | `bg-error-red/5` | Error input background tint |

### Usage Rules

- **Success green** for validation checkmarks, success messages, completed step indicators
- **Error red** for validation errors, required field indicators
- **Primary teal** for selected cards, focused inputs, active step
- **Coral** reserved for primary CTA ("Next", "Create Shop")
- **Peach** for warm secondary accents (optional step indicators, help text backgrounds)

---

## Typography Extensions

Uses Inter (from landing page) with additional onboarding-specific roles:

| Role | Classes | Used in |
|------|---------|---------|
| **Form heading** | `text-2xl lg:text-3xl font-bold text-white mb-2` | Step titles |
| **Form subheading** | `text-base lg:text-lg text-text-muted mb-8` | Step descriptions |
| **Card label** | `text-base font-semibold text-white` | Business type card labels |
| **Input label** | `text-sm font-medium text-white mb-2 block` | Form field labels |
| **Input helper** | `text-xs text-text-light-muted mt-1.5` | Placeholder text, URL preview |
| **Error text** | `text-xs text-error-red mt-1.5 flex items-center gap-1` | Validation errors |
| **Success text** | `text-xs text-success-green mt-1.5 flex items-center gap-1` | Validation success |
| **Step indicator** | `text-xs font-medium text-text-light-muted uppercase tracking-wider` | "Step 1 of 2" |
| **Progress active** | `text-xs font-semibold text-primary` | Active step in breadcrumb |

---

## Component Patterns

### 1. Business Type Selection Cards

**Card Anatomy:**
```
┌─────────────────┐
│                 │
│    [Icon]       │  ← Lucide icon, w-12 h-12
│                 │
│  Business Type  │  ← Card label
│                 │
└─────────────────┘
```

**States:**

| State | Classes | Transition |
|-------|---------|-----------|
| **Default** | `bg-bg-dark-secondary rounded-xl p-6 border border-white/10 cursor-pointer` | 200ms ease |
| **Hover** | `border-primary-light/50 shadow-lg shadow-primary/5` | 200ms ease |
| **Selected** | `border-primary border-2 bg-primary/5 shadow-xl shadow-primary/10` | 200ms ease |
| **Focus** | `ring-2 ring-primary ring-offset-2 ring-offset-bg-dark outline-none` | Instant |

**Interactive Behavior:**
- On click: deselect all other cards, apply selected state
- On keyboard (Enter/Space): same behavior
- Icon transitions from `text-text-muted` → `text-primary` on selection
- Scale animation: `hover:scale-105 active:scale-100 transition-transform duration-200`

**Card Grid Layout:**
```css
/* Mobile: 2 columns */
grid-template-columns: repeat(2, 1fr);
gap: 1rem; /* gap-4 */

/* Tablet+: 3 columns */
@media (min-width: 768px) {
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem; /* gap-6 */
}
```

**Accessibility:**
- `role="button"` or `<button>` element
- `tabindex="0"` for keyboard navigation
- `aria-pressed="true|false"` for selected state
- Focus ring always visible (no `focus:outline-none` without replacement)

---

### 2. Form Inputs (Shop Details)

**Input Anatomy:**
```
Label Text (required indicator if needed)
┌─────────────────────────────────┐
│ Placeholder text                │  ← Input field
└─────────────────────────────────┘
  Helper text or error message       ← Helper/error/success
```

**Input States:**

| State | Classes |
|-------|---------|
| **Default** | `bg-bg-dark-secondary border border-white/10 text-white placeholder:text-text-light-muted rounded-lg px-4 py-3 w-full text-base` |
| **Focus** | `focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none` |
| **Error** | `border-error-red focus:border-error-red focus:ring-error-red/20 bg-error-red/5` |
| **Success** | `border-success-green focus:border-success-green focus:ring-success-green/20` |
| **Disabled** | `opacity-50 cursor-not-allowed bg-bg-dark` |

**Label Pattern:**
```jsx
<label htmlFor="shop-name" className="text-sm font-medium text-white mb-2 block">
  Shop name <span className="text-error-red">*</span>
</label>
```

**Error Message Pattern:**
```jsx
<p className="text-xs text-error-red mt-1.5 flex items-center gap-1">
  <AlertCircle className="w-3.5 h-3.5" />
  <span>Shop name is required</span>
</p>
```

**Success Message Pattern:**
```jsx
<p className="text-xs text-success-green mt-1.5 flex items-center gap-1">
  <CheckCircle2 className="w-3.5 h-3.5" />
  <span>Available!</span>
</p>
```

**Slug Input with Live Preview:**
```jsx
<div>
  <label htmlFor="shop-slug" className="text-sm font-medium text-white mb-2 block">
    Shop URL slug <span className="text-error-red">*</span>
  </label>
  <input
    id="shop-slug"
    type="text"
    className="bg-bg-dark-secondary border border-white/10 text-white placeholder:text-text-light-muted rounded-lg px-4 py-3 w-full text-base focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors duration-200"
    placeholder="my-shop"
  />
  <p className="text-xs text-text-light-muted mt-1.5 font-mono">
    astro.com/book/<span className="text-primary">your-shop-slug</span>
  </p>
</div>
```

---

### 3. Button States (Multi-Step Flow)

Extends button patterns from landing page:

| Variant | Classes | Use Case |
|---------|---------|----------|
| **Primary CTA** | `bg-accent-coral hover:bg-[#F09070] text-bg-dark font-semibold px-8 py-3 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed` | "Next", "Create Shop" |
| **Secondary ghost** | `border border-white/30 text-white hover:bg-white/10 px-6 py-3 rounded-xl transition-colors duration-200` | "Back" button |
| **Disabled CTA** | `bg-accent-coral/50 text-bg-dark/70 font-semibold px-8 py-3 rounded-xl cursor-not-allowed` | Next button before selection |

**Loading State:**
```jsx
<button
  disabled
  className="bg-accent-coral text-bg-dark font-semibold px-8 py-3 rounded-xl flex items-center gap-2 opacity-75 cursor-wait"
>
  <Loader2 className="w-5 h-5 animate-spin" />
  <span>Creating shop...</span>
</button>
```

**Button Group Pattern:**
```css
/* Back + Submit buttons */
display: flex;
justify-content: space-between;
gap: 1rem; /* gap-4 */
```

**Mobile Stacking:**
```css
/* Mobile: full-width stacked */
@media (max-width: 640px) {
  flex-direction: column-reverse; /* Submit on top */
  .button {
    width: 100%;
  }
}
```

---

### 4. Step Progression UI

**Progress Indicator (Text):**
```jsx
<p className="text-xs font-medium text-text-light-muted uppercase tracking-wider text-center mt-8">
  Step 1 of 2
</p>
```

**Alternative: Breadcrumb Dots:**
```jsx
<div className="flex items-center justify-center gap-2 mt-8">
  <div className="w-2 h-2 rounded-full bg-primary" />
  <div className="w-2 h-2 rounded-full bg-white/20" />
</div>
```

**Alternative: Progress Bar:**
```jsx
<div className="w-full max-w-xs mx-auto mt-8">
  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
    <div
      className="h-full bg-primary rounded-full transition-all duration-300"
      style={{ width: '50%' }} // 50% for step 1, 100% for step 2
    />
  </div>
  <p className="text-xs text-text-light-muted text-center mt-2">Step 1 of 2</p>
</div>
```

**Recommended:** Use text indicator for simplicity. Breadcrumb dots if visual polish needed.

---

### 5. Container & Layout

**Onboarding Container:**
```css
max-width: 42rem; /* max-w-2xl */
margin: 0 auto;
padding: 2rem 1rem; /* py-8 px-4 */

@media (min-width: 640px) {
  padding: 3rem 1.5rem; /* py-12 px-6 */
}
```

**Card Grid Container (Step 1):**
```css
display: grid;
grid-template-columns: repeat(2, 1fr);
gap: 1rem; /* gap-4 */

@media (min-width: 768px) {
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem; /* gap-6 */
}
```

**Form Container (Step 2):**
```css
display: flex;
flex-direction: column;
gap: 1.5rem; /* gap-6 */
```

---

### 6. Animation & Transitions

**Step Transition (Framer Motion):**
```jsx
const stepVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0
  })
};

<AnimatePresence mode="wait" custom={direction}>
  <motion.div
    key={step}
    custom={direction}
    variants={stepVariants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ duration: 0.3, ease: "easeInOut" }}
  >
    {/* Step content */}
  </motion.div>
</AnimatePresence>
```

**Card Hover Animation:**
```jsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.2 }}
  className="bg-bg-dark-secondary rounded-xl p-6 border border-white/10 cursor-pointer hover:border-primary-light/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
>
  {/* Card content */}
</motion.button>
```

**Loading Spinner (Lucide):**
```jsx
<Loader2 className="w-5 h-5 animate-spin text-bg-dark" />
```

---

### 7. Validation Patterns

**Real-time Validation:**
- **On blur**: validate required fields, format checks
- **On change**: clear error when user starts typing
- **On submit**: validate all fields, show errors, focus first error

**Validation Timing:**
```jsx
const [errors, setErrors] = useState({});
const [touched, setTouched] = useState({});

const handleBlur = (field) => {
  setTouched({ ...touched, [field]: true });
  validateField(field);
};

const handleChange = (field, value) => {
  setValue(field, value);
  if (errors[field]) {
    clearError(field);
  }
};
```

**Error Messages:**
- Required: "Shop name is required"
- Format: "Only letters, numbers, and hyphens allowed"
- Length: "Must be at least 3 characters"
- Taken: "This slug is already taken"

**Success Indicators:**
- Show checkmark icon + "Available!" for slug validation
- Green border on successful validation
- Don't show success on every field (only where helpful, like slug uniqueness)

---

### 8. Accessibility Checklist

- [ ] All interactive elements have focus states
- [ ] Focus order follows visual order (Step 1 cards, then Next button)
- [ ] Error messages linked to inputs with `aria-describedby`
- [ ] Required fields marked with `aria-required="true"`
- [ ] Invalid fields marked with `aria-invalid="true"`
- [ ] Loading states announced with `aria-live="polite"`
- [ ] Step progression announced to screen readers
- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Touch targets minimum 44px (cards, buttons)
- [ ] Color not sole indicator (icons + borders for states)

**ARIA Example:**
```jsx
<input
  id="shop-name"
  type="text"
  aria-required="true"
  aria-invalid={errors.shopName ? "true" : "false"}
  aria-describedby={errors.shopName ? "shop-name-error" : "shop-name-helper"}
/>
{errors.shopName && (
  <p id="shop-name-error" role="alert" className="text-xs text-error-red mt-1.5">
    {errors.shopName}
  </p>
)}
```

---

### 9. Mobile Responsive Patterns

**Breakpoints (from landing page):**
- Mobile: `< 640px`
- Tablet: `640px - 1024px`
- Desktop: `>= 1024px`

**Mobile Optimizations:**

| Element | Mobile | Desktop |
|---------|--------|---------|
| Card grid | 2 columns | 3 columns |
| Card size | min-h-32 | min-h-40 |
| Heading | text-2xl | text-3xl |
| Input padding | py-3 px-4 | py-3 px-4 |
| Button group | Stacked (full-width) | Horizontal (space-between) |
| Container padding | px-4 | px-6 lg:px-8 |

**Touch Targets:**
- Buttons: `min-h-[44px]` (iOS guideline)
- Cards: `min-h-32` on mobile, `min-h-40` on desktop
- Input fields: `py-3` (48px total height)

**Horizontal Scroll Prevention:**
```css
body {
  overflow-x: hidden;
}

.onboarding-container {
  width: 100%;
  max-width: 100vw;
}
```

---

### 10. Icon System (Lucide)

**Business Type Icons:**

| Business Type | Icon Component | Size | Color |
|---------------|----------------|------|-------|
| Beauty | `Sparkles` | `w-12 h-12` | `text-text-muted` default, `text-primary` selected |
| Hair | `Scissors` | `w-12 h-12` | `text-text-muted` default, `text-primary` selected |
| Spa/Massage | `Heart` | `w-12 h-12` | `text-text-muted` default, `text-primary` selected |
| Health Clinic | `Stethoscope` | `w-12 h-12` | `text-text-muted` default, `text-primary` selected |
| Personal Trainer | `Dumbbell` | `w-12 h-12` | `text-text-muted` default, `text-primary` selected |
| General Services | `Wrench` | `w-12 h-12` | `text-text-muted` default, `text-primary` selected |

**Form Icons:**

| Icon | Component | Use Case |
|------|-----------|----------|
| Error | `AlertCircle` | `w-3.5 h-3.5 text-error-red` |
| Success | `CheckCircle2` | `w-3.5 h-3.5 text-success-green` |
| Loading | `Loader2` | `w-5 h-5 animate-spin` |
| Info | `Info` | `w-3.5 h-3.5 text-text-muted` |

**Icon Transitions:**
```css
transition: color 200ms ease;
```

---

### 11. Background & Depth

**Onboarding Page Background:**
```css
background: #1A1D21; /* bg-dark */
min-height: 100vh;
```

**Optional Depth Elements:**

**Subtle gradient overlay (top):**
```css
background: linear-gradient(180deg, rgba(61, 139, 139, 0.03) 0%, transparent 50%);
```

**Blur circles (decorative):**
```jsx
<div className="fixed top-20 right-20 w-96 h-96 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
<div className="fixed bottom-20 left-20 w-96 h-96 bg-accent-coral/5 blur-3xl rounded-full pointer-events-none" />
```

**Recommendation:** Keep it minimal. Onboarding should be distraction-free. Use only if visual interest needed.

---

### 12. Complete Component Examples

**Business Type Card Component:**
```jsx
import { motion } from 'framer-motion';
import { Scissors } from 'lucide-react';

export function BusinessTypeCard({
  icon: Icon,
  label,
  value,
  selected,
  onClick
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick(value)}
      className={`
        bg-bg-dark-secondary rounded-xl p-6 border cursor-pointer
        transition-all duration-200 min-h-40 flex flex-col items-center justify-center gap-3
        focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg-dark focus:outline-none
        ${selected
          ? 'border-primary border-2 bg-primary/5 shadow-xl shadow-primary/10'
          : 'border-white/10 hover:border-primary-light/50 hover:shadow-lg hover:shadow-primary/5'
        }
      `}
      role="button"
      aria-pressed={selected}
    >
      <Icon className={`w-12 h-12 transition-colors duration-200 ${selected ? 'text-primary' : 'text-text-muted'}`} />
      <span className="text-base font-semibold text-white">{label}</span>
    </motion.button>
  );
}
```

**Form Input with Validation:**
```jsx
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function FormInput({
  label,
  id,
  value,
  onChange,
  onBlur,
  error,
  success,
  required,
  helper,
  ...props
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-white mb-2 block">
        {label} {required && <span className="text-error-red">*</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-required={required}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        className={`
          bg-bg-dark-secondary text-white placeholder:text-text-light-muted
          rounded-lg px-4 py-3 w-full text-base transition-all duration-200
          focus:outline-none focus:ring-2
          ${error
            ? 'border border-error-red focus:border-error-red focus:ring-error-red/20 bg-error-red/5'
            : success
            ? 'border border-success-green focus:border-success-green focus:ring-success-green/20'
            : 'border border-white/10 focus:border-primary focus:ring-primary/20'
          }
        `}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-error-red mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </p>
      )}
      {success && !error && (
        <p className="text-xs text-success-green mt-1.5 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{success}</span>
        </p>
      )}
      {helper && !error && !success && (
        <p id={`${id}-helper`} className="text-xs text-text-light-muted mt-1.5">
          {helper}
        </p>
      )}
    </div>
  );
}
```

**Step Container with Animation:**
```jsx
import { motion, AnimatePresence } from 'framer-motion';

const stepVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0
  })
};

export function StepContainer({ step, direction, children }) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={step}
        custom={direction}
        variants={stepVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## Design Rationale

**Why dark theme?**
- Continuity from landing page (user just clicked "Get Started")
- Professional, modern aesthetic aligns with Trust & Authority
- Reduced eye strain during form completion
- Better visual hierarchy (white text on dark background)

**Why two-step flow?**
- Progressive disclosure reduces cognitive load (research-backed)
- Business type selection sets context for step 2
- Easier to validate and provide feedback per step
- Mobile-friendly (less scrolling per screen)

**Why teal/coral palette?**
- Teal (primary): Trust, professionalism, calmness
- Coral (CTA): Warmth, approachability, action
- Peach (accent): Friendly, welcoming, secondary emphasis
- Combination = professional + approachable (Trust & Authority)

**Why Inter font?**
- Already loaded from landing page (performance)
- Clean, readable, professional
- Excellent at small sizes (form labels, helper text)
- Extensive weight range (400-800)

---

## Implementation Checklist

- [ ] Install dependencies: `lucide-react`, `framer-motion`
- [ ] Verify Tailwind config includes all color tokens from landing page
- [ ] Add new color tokens: `success-green`, `error-red`, `warning-amber`
- [ ] Create reusable components: `BusinessTypeCard`, `FormInput`, `StepContainer`
- [ ] Implement form validation logic (Zod or custom)
- [ ] Test keyboard navigation (Tab, Enter, Space)
- [ ] Test mobile responsive layout (375px, 768px, 1024px)
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Verify focus states visible on all interactive elements
- [ ] Test loading states and error handling
- [ ] Verify transitions work with `prefers-reduced-motion`
- [ ] Test form submission and redirect flow

---

## Related Documentation

- **🚀 Implementation plan:** `docs/shaping/slice-9-onboarding-v1-plan.md` (step-by-step build guide)
- **Base design system:** `docs/shaping/landing-page-design-system.md`
- **Onboarding flow shaping:** `docs/shaping/shop-owner-onboarding-shaping.md`
- **Post-onboarding dashboard:** `docs/shaping/post-onboarding-dashboard-shaping.md`
- **UX research:** `docs/shaping/onboarding-flow-research.md`

---

## Quick Reference

**Card selection grid:**
```jsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
  {businessTypes.map(type => (
    <BusinessTypeCard key={type.value} {...type} />
  ))}
</div>
```

**Form layout:**
```jsx
<div className="flex flex-col gap-6">
  <FormInput label="Shop name" id="shop-name" required />
  <FormInput label="Shop URL slug" id="shop-slug" required />
  <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-4">
    <button className="border border-white/30 text-white hover:bg-white/10 px-6 py-3 rounded-xl transition-colors duration-200">
      Back
    </button>
    <button className="bg-accent-coral hover:bg-[#F09070] text-bg-dark font-semibold px-8 py-3 rounded-xl transition-colors duration-200">
      Create Shop
    </button>
  </div>
</div>
```

**Step progression:**
```jsx
<p className="text-xs font-medium text-text-light-muted uppercase tracking-wider text-center mt-8">
  Step {currentStep} of 2
</p>
```
