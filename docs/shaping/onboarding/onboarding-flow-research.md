# Onboarding Flow Design Research

Research findings for shop owner registration flow with business type selection.

**Context:** Next.js app, shop owner registration requires selecting business type (6 visual cards) + providing shop name and slug.

---

## Key Research Findings

### 1. Progressive Disclosure Best Practice

**Source:** Landing Page Patterns - "Funnel (3-Step Conversion)"

**Recommendation:** Progressive disclosure is the preferred pattern for multi-field onboarding flows.

**Key principles:**
- Show only essential info per step
- Use progress indicators (e.g., "Step 1 of 2")
- Each step should have a clear mini-goal
- Multiple CTAs (Next → Complete Setup)

**Why it works:**
- Reduces cognitive load
- Increases completion rate
- Feels less overwhelming than long forms
- Provides sense of progress

**When to use single-step instead:**
- Very few fields (≤ 3 total)
- All fields are equally important
- User needs to see all options at once

---

## 2. User Freedom in Onboarding

**Source:** UX Guidelines - "Onboarding: User Freedom"

**Critical requirement:** Users should be able to navigate freely.

**Must-have features:**
- ✅ Back button on Step 2+ (disabled on Step 1)
- ✅ Skip option if content is optional
- ✅ Clear progress indicator
- ❌ Don't force linear, unskippable flows

**Recommendation for your flow:**
- Step 1 (Business Type): No Back button OR Back returns to dashboard/logout
- Step 2 (Name/Slug): Back button returns to Step 1
- No Skip option (all fields are required)

---

## 3. Form Design Best Practices

**Source:** UX Guidelines - Forms

**Critical rules:**
1. **Labels:** Every input needs a visible label (not placeholder-only)
2. **Input types:** Use appropriate `type` and `inputmode` attributes
3. **Submit feedback:** Show loading state → success/error message
4. **Inline validation:** Validate on blur, not just on submit
5. **Mobile keyboards:** Use `inputmode="text"` for slug, `type="text"` for name

**Recommendation:**
```html
<!-- Good -->
<label for="shop-name" class="text-sm font-medium">Shop name</label>
<input id="shop-name" name="name" type="text" required />

<!-- Bad -->
<input placeholder="Shop name" /> <!-- Placeholder-only label -->
```

---

## 4. Interactive Card Selection Patterns

**Source:** UX Guidelines - Interaction

**Best practices for card selection:**

1. **Hover states** (desktop)
   - Change cursor to `cursor-pointer`
   - Add subtle visual feedback (border, background, shadow)
   - Use smooth transitions (150-300ms)

2. **Selected state** (all devices)
   - Clear visual distinction (border color, background, checkmark icon)
   - Persist after click (don't rely on hover)
   - Single selection: deselect previous card automatically

3. **Touch targets** (mobile)
   - Minimum 44x44px tap targets
   - Adequate spacing between cards (16px+)

**Recommendation:**
```tsx
// Selected state
<div className={cn(
  "border-2 rounded-lg p-6 cursor-pointer transition-all duration-200",
  "hover:border-primary/50 hover:shadow-md",
  selected === "beauty"
    ? "border-primary bg-primary/5"
    : "border-gray-200"
)}>
```

---

## 5. Design System for Service Businesses

**Source:** Product Patterns + Design System Generator

**For service businesses (Beauty, Hair, Spa, Health, Personal Trainer, General Services):**

**Recommended style:** Trust & Authority + Soft UI Evolution
- Professional, clean, friendly
- Not too playful, not too corporate
- Focus on credibility and approachability

**Color palette:**
- Primary: #0891B2 (Fresh cyan - professional, clean)
- CTA: #22C55E (Green - positive action, "go")
- Background: #ECFEFF (Light cyan - calm, clean)
- Text: #164E63 (Dark cyan - readable, trustworthy)

**Typography:**
- Headings: Poppins (modern, friendly, professional)
- Body: Open Sans (clean, readable, approachable)

**Icons:**
- Use SVG icons (Heroicons or Lucide) - NOT emojis
- Consistent sizing (24x24px viewBox, w-6 h-6 classes)

---

## Option Analysis: Single-Step vs Two-Step

### Option A: Single-Step (Cards + Name/Slug Together)

**Pros:**
- ✅ Faster completion (one page)
- ✅ See all requirements upfront
- ✅ Simpler implementation

**Cons:**
- ❌ Higher cognitive load
- ❌ Longer page scroll on mobile
- ❌ Less "guided" feeling

**Best for:**
- When you want speed over guidance
- Desktop-first experiences
- Users who prefer efficiency

---

### Option B: Two-Step (Business Type → Name/Slug) ⭐ RECOMMENDED

**Pros:**
- ✅ Progressive disclosure reduces cognitive load
- ✅ Focused decision-making (one choice at a time)
- ✅ Can contextualize Step 2 based on Step 1 selection
  - Example: "Great! Now let's set up your [Hair Salon]"
- ✅ Feels more guided and intentional
- ✅ Higher perceived ease
- ✅ Easier to extend later (add Step 3 for staff size)

**Cons:**
- ❌ One extra click (Next button)
- ❌ Slightly more complex implementation

**Best for:**
- First-time users who need guidance
- Mobile-friendly onboarding
- When you may add more steps later
- Building trust through careful, deliberate flow

**Research support:**
- Landing pattern "Funnel (3-Step Conversion)" specifically recommends this
- UX guideline "Progress Indicators" shows users complete multi-step flows at higher rates when they see progress
- Matches product pattern for service businesses

---

### Option C: Two-Step (Name/Slug → Business Type)

**Pros:**
- ✅ Get commitment (name) before classification
- ✅ Progressive disclosure benefits

**Cons:**
- ❌ Less intuitive flow (why name first?)
- ❌ Can't contextualize name input with business type
- ❌ Misses opportunity to set context early

**Best for:**
- When name is the most important identifier
- When business type is optional/secondary

**Not recommended for your use case** - business type should come first to set context.

---

### Option D: Enhanced Single-Step (Cards Above Inputs)

**Pros:**
- ✅ Visual hierarchy separates concerns
- ✅ Single page (fast completion)
- ✅ Cards get prominent visual placement

**Cons:**
- ❌ Still higher cognitive load than two-step
- ❌ Long page on mobile
- ❌ Less focused than true progressive disclosure

**Best for:**
- Desktop-heavy users
- When you want visual prominence but can't do multi-step
- Compromise between A and B

---

## Testing Approach: Hypothesis Validation

### Recommended Testing Strategy

Since you're building an MVP, don't over-invest in A/B testing initially. Instead:

**Phase 1: Build & Launch (Option B recommended)**
1. Build two-step flow (Business Type → Name/Slug)
2. Instrument with analytics
3. Launch to initial users

**Phase 2: Measure (Week 1-2)**
Track these metrics:
- Completion rate (started → finished)
- Drop-off by step (how many abandon at Step 1 vs Step 2)
- Time to complete
- Mobile vs desktop completion rates
- Business type distribution

**Phase 3: Qualitative Feedback (Week 2-4)**
- User interviews (5-10 users)
- Questions to ask:
  - "Was the signup process clear?"
  - "Did any step feel confusing?"
  - "Would you prefer seeing everything on one page?"
  - "Did the progress indicator help?"

**Phase 4: Iterate (Week 4+)**
Only if data shows problems:
- High drop-off at Step 1 → Maybe too early to ask business type
- High drop-off at Step 2 → Maybe name/slug form has issues
- General low completion → Consider single-step

### Simple A/B Test (If You Have Traffic)

**Hypothesis:** Two-step flow (B) has higher completion rate than single-step (D)

**Test setup:**
- 50% users see Option B (two-step)
- 50% users see Option D (enhanced single-step)
- Primary metric: Completion rate
- Secondary: Time to complete, user satisfaction (post-signup survey)

**Minimum sample size:** ~100 completions per variant (200 total)

**Tools:**
- Next.js: Use middleware to randomly assign variant
- Analytics: Vercel Analytics, PostHog, or Google Analytics 4
- Simple implementation:
  ```ts
  const variant = Math.random() < 0.5 ? 'two-step' : 'single-step'
  // Track in analytics
  analytics.track('onboarding_started', { variant })
  ```

---

## Final Recommendation

### ⭐ Option B: Two-Step Flow (Business Type → Name/Slug)

**Rationale:**
1. ✅ Research-backed (progressive disclosure, funnel pattern)
2. ✅ Better UX for first-time users (lower cognitive load)
3. ✅ Matches your original vision ("multi-step onboarding")
4. ✅ Extensible (easy to add Step 3 later for staff size)
5. ✅ Mobile-friendly (less scrolling per step)
6. ✅ Can contextualize Step 2 based on Step 1 selection

**Implementation priorities:**
1. Clear progress indicator ("Step 1 of 2" → "Step 2 of 2")
2. Visual card selection with hover + selected states
3. Back button on Step 2 (returns to Step 1)
4. Loading state + success feedback on submit
5. Mobile-responsive card grid (2 cols mobile, 3 cols desktop)

### If You Want Speed to Launch

**Alternative:** Option D (Enhanced Single-Step)
- Faster to build (one page)
- Still delivers visual card experience
- Can iterate to two-step later if data shows need

---

## Design Specifications

### Step 1: Business Type Selection

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│  What type of business do you run?      │
│  Select one that best describes you     │
│                                         │
│  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │  💋    │  │  ✂️    │  │  ✋    │   │
│  │ Beauty │  │  Hair  │  │Spa/Mass│   │
│  └────────┘  └────────┘  └────────┘   │
│                                         │
│  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │  ❤️    │  │  🏋️    │  │  📅    │   │
│  │ Health │  │Personal│  │General │   │
│  │ Clinic │  │Trainer │  │Services│   │
│  └────────┘  └────────┘  └────────┘   │
│                                         │
│                      [Next →] (disabled)│
│                                         │
│              Step 1 of 2                │
└─────────────────────────────────────────┘
```

**Component specs:**
- Card size: 160px × 160px (desktop), 100px × 100px (mobile)
- Grid: 3 columns (desktop), 2 columns (mobile)
- Gap: 16px
- Icon size: 48px × 48px (use SVG, not emoji)
- Border: 2px solid #E5E7EB (unselected), 2px solid #0891B2 (selected)
- Background: white (unselected), #ECFEFF (selected)
- Hover: border-primary/50 + shadow-md
- Transition: 200ms ease

### Step 2: Shop Details

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│  Great! Now let's set up your Hair Salon│
│                                         │
│  Shop name                              │
│  [_________________________________]   │
│                                         │
│  Shop URL slug                          │
│  [_________________________________]   │
│  your-shop-name (auto-preview)          │
│                                         │
│  [← Back]          [Create Shop →]     │
│                                         │
│              Step 2 of 2                │
└─────────────────────────────────────────┘
```

**Component specs:**
- Input height: 44px minimum (touch target)
- Label: text-sm font-medium mb-2
- Input: border rounded-md px-3 py-2
- Auto-slug: Live preview below slug input (muted text)
- Validation: On blur (show errors inline)
- Submit: Loading state (spinner + "Creating shop...")

---

## Accessibility Checklist

Before shipping:

- [ ] All cards have `role="button"` and `tabindex="0"`
- [ ] Keyboard navigation works (Tab to cards, Enter/Space to select)
- [ ] Selected state visible without color alone (checkmark icon + border)
- [ ] Focus ring visible on all interactive elements
- [ ] Labels have `for` attribute matching input `id`
- [ ] Form validation errors announced to screen readers (`aria-live`)
- [ ] Progress indicator accessible ("Step 1 of 2" announced)
- [ ] Color contrast 4.5:1 minimum (text on background)

---

## Mobile Optimization

- [ ] Cards stack 2 columns on mobile (<768px)
- [ ] Minimum 44px touch targets
- [ ] No horizontal scroll
- [ ] Inputs trigger correct keyboard (`inputmode="text"`)
- [ ] Fixed navbar doesn't hide content
- [ ] Test on 375px width (iPhone SE)

---

## Implementation Notes

**Route structure for Option B:**
```
/app/onboarding
  └─ page.tsx (multi-step wizard with client state)
     OR
/app/onboarding/step-1 → /app/onboarding/step-2 (separate routes)
```

**Recommendation:** Single page with client-side state
- Simpler routing
- Preserve form state on Back
- No flash between steps
- Use URL params for current step: `/app/onboarding?step=1`

**State management:**
```tsx
const [step, setStep] = useState(1)
const [businessType, setBusinessType] = useState<string | null>(null)

// Step 1: Select business type → setBusinessType() → setStep(2)
// Step 2: Enter name/slug → createShop({ businessType, name, slug })
```

**Database:**
```sql
ALTER TABLE shops ADD COLUMN business_type TEXT;
```

Enum or text? **Text** for MVP (more flexible, easier to add types later)

---

## Summary

**Build:** Option B (Two-Step Flow)
**Style:** Trust & Authority + Soft UI
**Colors:** Cyan/Green professional palette
**Typography:** Poppins + Open Sans
**Icons:** Heroicons/Lucide SVGs (not emoji)
**Testing:** Instrument, measure, iterate
**Launch:** Ship fast, gather data, refine based on real usage
