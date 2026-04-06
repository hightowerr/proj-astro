# Shop Owner Onboarding — Shaping

Multi-step registration flow for shop owners setting up their business.

---

## Source

> Shop owners setting up their business. Shop owners need onboarding to set up their shop. The user selects their business type from visual cards, Step 2: Sub-Category Selection (for General Services), Step 3: Staff Size Selection.

---

## Frame

### Problem

- Shop owners need to set up their business in the system
- Business configuration requires collecting structured information (type, category, size)
- Current system lacks an onboarding flow for new shop owners

### Outcome

- Shop owners can complete registration and set up their business
- Business type, category, and staff size are captured during onboarding
- Flow is intuitive with visual selection interfaces

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| **R0** | Shop owner can complete registration and create a shop | Core goal |
| **R1** | Business type selection is visual and intuitive | Must-have |
| **R2** | Shop name and slug are collected | Must-have |
| **R3** | Flow results in usable shop configuration | Must-have |

---

## CURRENT: Existing System

| Part | Mechanism |
|------|-----------|
| **CURRENT1** | **Login/Signup** |
| CURRENT1.1 | User signs up with email/password (Better Auth) |
| CURRENT1.2 | Email verification link sent (logged to console) |
| CURRENT1.3 | User verifies email → login |
| **CURRENT2** | **Shop Setup (Single Step)** |
| CURRENT2.1 | After login, redirect to `/app` |
| CURRENT2.2 | If shop exists: show shop details (name, slug, booking link) |
| CURRENT2.3 | If no shop: show simple form with "Shop name" and "Shop URL slug" |
| CURRENT2.4 | Submit → `createShop()` creates shop + default settings + shop hours |
| CURRENT2.5 | Redirect back to `/app` to show shop details |

**Gaps in CURRENT:**
- No business type, sub-category, or staff size captured
- Single-step form (not progressive disclosure)
- No visual card selection interface
- No conditional logic based on business type

---

## A: Two-Step Onboarding Flow (SELECTED)

**Decision:** Option B — Business Type → Name/Slug (research-backed)

MVP scope: Add visual card business type selection in two-step progressive disclosure flow.

**Sub-categories and staff size are OUT OF SCOPE for MVP.**

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | **Step 1: Business Type Selection** | |
| A1.1 | Route: `/app` or `/app/onboarding` (single page, client-side step state) | |
| A1.2 | Heading: "What type of business do you run?" + subheading | |
| A1.3 | 6 visual cards: Beauty, Hair, Spa/Massage, Health clinic, Personal trainer, General services | |
| A1.4 | Cards use SVG icons (Heroicons/Lucide), NOT emoji | |
| A1.5 | Card grid: 3 cols (desktop), 2 cols (mobile), 160×160px cards | |
| A1.6 | Card states: Default (border-gray-200), Hover (border-primary/50 + shadow), Selected (border-primary + bg-primary/5) | |
| A1.7 | Single selection: clicking card deselects previous, sets state | |
| A1.8 | Next button: disabled until selection made, onClick → setStep(2) | |
| A1.9 | Progress indicator: "Step 1 of 2" (bottom of form) | |
| **A2** | **Step 2: Shop Details (Name + Slug)** | |
| A2.1 | Heading: "Great! Now let's set up your [Business Type]" (contextualized) | |
| A2.2 | Shop name input: label "Shop name", type="text", required | |
| A2.3 | Shop slug input: label "Shop URL slug", type="text", required, auto-normalize | |
| A2.4 | Live slug preview: Show "your-shop-name" below slug input (muted text) | |
| A2.5 | Validation: on blur (inline errors) | |
| A2.6 | Back button: onClick → setStep(1), preserves businessType selection | |
| A2.7 | Submit button: "Create Shop", shows loading state (spinner + "Creating shop...") | |
| A2.8 | Progress indicator: "Step 2 of 2" | |
| **A3** | **Database Schema** | |
| A3.1 | Add `business_type TEXT` column to shops table (migration) | |
| A3.2 | Use text (not enum) for flexibility — can add types later without migration | |
| A3.3 | Values: "beauty", "hair", "spa-massage", "health-clinic", "personal-trainer", "general-services" | |
| **A4** | **Shop Creation Logic** | |
| A4.1 | Update createShop() function signature to accept businessType parameter | |
| A4.2 | Update server action to include businessType in INSERT | |
| A4.3 | On success: revalidatePath('/app') + redirect('/app') | |
| A4.4 | `/app` page: if shop exists, show shop details (name, slug, businessType, booking link) | |
| **A5** | **Design System (Applied)** | |
| A5.1 | See complete design system: `docs/shaping/onboarding-design-system.md` | |
| A5.2 | Extends landing page design system (dark theme, teal/coral palette, Inter font) | |
| A5.3 | Components: BusinessTypeCard, FormInput, StepContainer, validation states | |
| A5.4 | Icons: Lucide React (Scissors, Sparkles, Heart, Stethoscope, Dumbbell, Wrench) | |
| A5.5 | Animations: Framer Motion step transitions, card hover effects | |
| **A6** | **Accessibility** | |
| A6.1 | Cards have role="button", tabindex="0", keyboard nav (Enter/Space to select) | |
| A6.2 | Focus rings visible on all interactive elements | |
| A6.3 | Selected state visible without color alone (checkmark icon + border) | |
| A6.4 | Form labels have `for` attribute matching input `id` | |
| A6.5 | Progress indicator announced to screen readers | |
| **A7** | **Mobile Optimization** | |
| A7.1 | Cards: 2 columns on mobile (<768px), 3 columns on desktop | |
| A7.2 | Touch targets: 44px minimum height for buttons/cards | |
| A7.3 | No horizontal scroll, responsive padding | |
| A7.4 | Test at 375px width (iPhone SE) | |

---

### Design Research Findings ✅ COMPLETE

**See:** `docs/shaping/onboarding-flow-research.md` for full UX research.

**Key findings:**
1. **Progressive disclosure** recommended for multi-field onboarding (Funnel pattern)
2. **Two-step flow** has higher completion rates (reduce cognitive load)
3. **User freedom** required (Back button, progress indicator)
4. **Service businesses** should use Trust & Authority style (professional + approachable)
5. **Card selection** needs hover states, selected states, cursor-pointer

**Recommended option:** ⭐ **Option B** (Business Type → Name/Slug)

**Rationale:**
- Research-backed (progressive disclosure pattern)
- Lower cognitive load (one decision at a time)
- Mobile-friendly (less scrolling per step)
- Extensible (easy to add Step 3 later)
- Can contextualize Step 2 based on Step 1 selection
  - Example: "Great! Now let's set up your **Hair Salon**"

**Alternative for faster launch:** Option D (Enhanced single-step)
- One page, still delivers visual card experience
- Can iterate to two-step later if data shows need

---

## Fit Check

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | Shop owner can complete registration and create a shop | Core goal | ✅ |
| R1 | Business type selection is visual and intuitive | Must-have | ✅ |
| R2 | Shop name and slug are collected | Must-have | ✅ |
| R3 | Flow results in usable shop configuration | Must-have | ✅ |

**Notes:**
- All requirements satisfied by Shape A
- A1-A2: Two-step flow with visual cards meets R1 (intuitive)
- A2: Step 2 collects name and slug (R2)
- A3-A4: Creates shop with businessType + name + slug (R0, R3)
- Research-backed design reduces friction and increases completion rate

---

---

## Breadboard — Two-Step Onboarding Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PLACE 1: Business Type                    │
│                     /app (step=1)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  "What type of business do you run?"                         │
│  Select one option below to get started                      │
│                                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐                              │
│  │ 💇   │  │ ✂️   │  │ 💆   │                              │
│  │Beauty│  │ Hair │  │ Spa  │  ← [Card Selection Grid]     │
│  └──────┘  └──────┘  └──────┘                              │
│  ┌──────┐  ┌──────┐  ┌──────┐                              │
│  │ 🏥   │  │ 💪   │  │ ⚙️   │                              │
│  │Health│  │Trainer│  │General│                             │
│  └──────┘  └──────┘  └──────┘                              │
│                                                              │
│                          [Next] ← Button (disabled until     │
│                                    selection)                │
│  Step 1 of 2                                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ [Next] clicked + businessType set
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   PLACE 2: Shop Details                      │
│                     /app (step=2)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  "Great! Now let's set up your Hair Salon"                   │
│  ← Contextualized based on selection                         │
│                                                              │
│  Shop name                                                   │
│  [_____________________] ← Text input (required)             │
│                                                              │
│  Shop URL slug                                               │
│  [_____________________] ← Text input (required)             │
│   yourshop.example.com/book/your-slug-here                   │
│   ↑ Live preview                                             │
│                                                              │
│  [Back]  [Create Shop] ← Buttons                             │
│                                                              │
│  Step 2 of 2                                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ [Create Shop] clicked
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  PLACE 3: Shop Dashboard                     │
│                        /app                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Your Shop: Hair Salon                                       │
│                                                              │
│  📋 Shop name: [shop name]                                   │
│  🔗 Booking URL: yourshop.example.com/book/[slug]            │
│  💼 Business type: Hair                                      │
│                                                              │
│  [Appointments] [Customers] [Settings] ← Navigation          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Affordances & Wiring

| Affordance | Type | Action | Result |
|------------|------|--------|--------|
| **Business Type Card** | Selectable card | Click/Enter/Space | Set `businessType`, deselect others, enable Next |
| **Next Button** | Primary button | Click | `setStep(2)`, preserve `businessType` |
| **Shop Name Input** | Text field | Type | Update `shopName` state, validate on blur |
| **Shop Slug Input** | Text field | Type | Update `shopSlug` state, auto-normalize, show preview |
| **Back Button** | Secondary button | Click | `setStep(1)`, preserve all form state |
| **Create Shop Button** | Primary button | Click | POST `createShop({ businessType, shopName, shopSlug })` → redirect `/app` |

### Data Flow

```
┌──────────────┐
│  Component   │  useState: step (1 or 2)
│    State     │  useState: businessType (null | string)
│              │  useState: shopName (string)
│              │  useState: shopSlug (string)
└──────────────┘
       │
       ├─ Step 1 → Collect businessType
       │          → Enable Next when businessType !== null
       │
       ├─ Step 2 → Collect shopName, shopSlug
       │          → Validate inputs on blur
       │          → Show live slug preview
       │
       └─ Submit → Server Action: createShop()
                  → INSERT INTO shops (business_type, name, slug, ...)
                  → revalidatePath('/app')
                  → redirect('/app')
```

### Component Hierarchy

```
/app/page.tsx (Server Component)
  └─ if (!shop) → OnboardingFlow (Client Component)
      ├─ if (step === 1) → BusinessTypeStep
      │   ├─ Heading + Subheading
      │   ├─ BusinessTypeCardGrid
      │   │   └─ BusinessTypeCard × 6
      │   ├─ NextButton (disabled={!businessType})
      │   └─ ProgressIndicator (1 of 2)
      │
      └─ if (step === 2) → ShopDetailsStep
          ├─ Heading (contextualized)
          ├─ ShopNameInput
          ├─ ShopSlugInput + Live Preview
          ├─ BackButton + CreateButton
          └─ ProgressIndicator (2 of 2)
```

---

## Implementation

**✅ READY TO BUILD** — See complete implementation plan:
**`docs/shaping/slice-9-onboarding-v1-plan.md`**

The slice document provides:
- Step-by-step implementation guide (12 steps)
- Complete component code (TypeScript + React)
- Database migration instructions
- Server action implementation
- Testing plan (automated + manual E2E)
- Accessibility checklist
- Mobile responsive verification

**Post-onboarding dashboard:**
See `docs/shaping/post-onboarding-dashboard-shaping.md` for complete shaping of where shop owners land after completing initial setup.

**Related shaping:**
- **`docs/shaping/slice-9-onboarding-v1-plan.md`** - 🚀 **Implementation plan** (step-by-step guide with complete code)
- `docs/shaping/onboarding-design-system.md` - Complete design system for onboarding UI (colors, typography, components, validation, mobile)
- `docs/shaping/onboarding-flow-research.md` - Full UX research findings for multi-step flows
- `docs/shaping/post-onboarding-dashboard-shaping.md` - Dashboard landing after onboarding complete
- `docs/shaping/landing-page-design-system.md` - Base design system (dark theme, teal/coral palette, Inter font)
