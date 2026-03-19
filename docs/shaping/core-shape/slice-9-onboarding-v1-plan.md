# Slice 9: Shop Owner Onboarding — Implementation Plan

## Scope

Implements the two-step shop owner onboarding flow from `docs/shaping/shop-owner-onboarding-shaping.md`.

Demo goal: Progressive disclosure onboarding with visual business type selection (Step 1) and shop details form (Step 2). New users land on `/app` and see onboarding; after completing setup, they see shop dashboard. Dark theme with teal/coral palette matching landing page.

**Design system:** See `docs/shaping/onboarding-design-system.md` for complete UI specifications.

---

## Key Discoveries

### Better Auth setup
The project uses Better Auth for authentication. After signup/login, users are redirected to `/app`. Need to check session and determine if shop exists to show onboarding vs dashboard.

### Database schema
Need to add `business_type TEXT` column to `shops` table. Current schema has `name` and `slug` columns, but not business type.

### Server actions location
Check if `src/app/app/actions.ts` exists for server actions. If not, create it. Server actions should handle shop creation with business type.

### Existing /app page
Check current structure of `src/app/app/page.tsx`. Likely a server component that checks for shop. Need to conditionally render onboarding vs dashboard.

### Framer Motion already installed
Landing page slices installed `framer-motion`. No need to reinstall.

### Design tokens in Tailwind v4
Project uses Tailwind v4 with `@theme inline {}` in `globals.css`. Check if onboarding-specific tokens (success-green, error-red) need to be added.

---

## Files Changed

| File | Action |
|------|--------|
| `drizzle/[timestamp]_add_business_type.sql` | Create migration — add `business_type TEXT` to shops table |
| `drizzle/meta/[timestamp]_snapshot.json` | Generate migration snapshot |
| `src/lib/schema.ts` | Add `businessType` field to shops table schema |
| `src/app/globals.css` | Add onboarding color tokens (success-green, error-red, warning-amber) |
| `src/app/app/page.tsx` | Update to conditionally show onboarding vs dashboard |
| `src/app/app/actions.ts` | Create/update — server action for createShop with businessType |
| `src/components/onboarding/onboarding-flow.tsx` | Create — main two-step flow client component |
| `src/components/onboarding/business-type-card.tsx` | Create — selectable card component |
| `src/components/onboarding/business-type-step.tsx` | Create — Step 1 UI (card grid + next button) |
| `src/components/onboarding/shop-details-step.tsx` | Create — Step 2 UI (form inputs + submit) |
| `src/components/onboarding/form-input.tsx` | Create — reusable input with validation |
| `src/components/onboarding/step-container.tsx` | Create — animated step wrapper (Framer Motion) |

---

## Step-by-Step Implementation

### Step 1 — Database migration (add business_type)

Generate migration:
```bash
pnpm db:generate
```

This will create a new migration file in `drizzle/` after you update the schema in Step 2.

### Step 2 — Update schema.ts

In `src/lib/schema.ts`, find the `shops` table definition and add:

```ts
export const shops = pgTable("shops", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  businessType: text("business_type"), // NEW — nullable for existing shops
  // ... existing fields
});
```

**Important:** Make `businessType` nullable to support existing shops without migration data issues.

### Step 3 — Add color tokens to globals.css

In `src/app/globals.css`, inside the existing `@theme inline {}` block, add:

```css
/* Onboarding validation colors */
--color-success-green: #10B981;
--color-error-red: #EF4444;
--color-warning-amber: #F59E0B;
```

These extend the existing landing page tokens (bg-dark, primary, accent-coral, etc.).

### Step 4 — Run migration

```bash
pnpm db:migrate
```

Verify migration succeeded by checking database (or use `pnpm db:studio`).

### Step 5 — Create server action (createShop)

Create or update `src/app/app/actions.ts`:

```ts
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { shops, shopPolicies, shopHours } from "@/lib/schema";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createId } from "@paralleldrive/cuid2";

export async function createShop(formData: {
  businessType: string;
  shopName: string;
  shopSlug: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Normalize slug (lowercase, replace spaces with hyphens)
  const normalizedSlug = formData.shopSlug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  // Check if slug already exists
  const existingShop = await db.query.shops.findFirst({
    where: (shops, { eq }) => eq(shops.slug, normalizedSlug),
  });

  if (existingShop) {
    throw new Error("This shop URL is already taken");
  }

  const shopId = createId();

  // Create shop with business type
  await db.insert(shops).values({
    id: shopId,
    name: formData.shopName,
    slug: normalizedSlug,
    businessType: formData.businessType,
    ownerId: session.user.id,
    timezone: "America/New_York", // Default, can be updated later
  });

  // Create default shop policy
  await db.insert(shopPolicies).values({
    id: createId(),
    shopId,
    cancelCutoffMinutes: 1440, // 24 hours
    refundBeforeCutoff: true,
    resolutionGraceMinutes: 30,
    paymentMode: "deposit",
    depositPercentage: 50,
    isActive: true,
  });

  // Create default shop hours (9 AM - 5 PM, Mon-Fri)
  const defaultHours = [
    { day: 1, startTime: "09:00", endTime: "17:00", isOpen: true }, // Monday
    { day: 2, startTime: "09:00", endTime: "17:00", isOpen: true },
    { day: 3, startTime: "09:00", endTime: "17:00", isOpen: true },
    { day: 4, startTime: "09:00", endTime: "17:00", isOpen: true },
    { day: 5, startTime: "09:00", endTime: "17:00", isOpen: true }, // Friday
    { day: 6, startTime: "09:00", endTime: "17:00", isOpen: false }, // Saturday
    { day: 0, startTime: "09:00", endTime: "17:00", isOpen: false }, // Sunday
  ];

  await db.insert(shopHours).values(
    defaultHours.map((h) => ({
      id: createId(),
      shopId,
      ...h,
    }))
  );

  redirect("/app");
}
```

### Step 6 — Create BusinessTypeCard component

Create `src/components/onboarding/business-type-card.tsx`:

```tsx
"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface BusinessTypeCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  selected: boolean;
  onClick: (value: string) => void;
}

export function BusinessTypeCard({
  icon: Icon,
  label,
  value,
  selected,
  onClick,
}: BusinessTypeCardProps) {
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
        ${
          selected
            ? "border-primary border-2 bg-primary/5 shadow-xl shadow-primary/10"
            : "border-white/10 hover:border-primary-light/50 hover:shadow-lg hover:shadow-primary/5"
        }
      `}
      role="button"
      aria-pressed={selected}
      type="button"
    >
      <Icon
        className={`w-12 h-12 transition-colors duration-200 ${
          selected ? "text-primary" : "text-text-muted"
        }`}
      />
      <span className="text-base font-semibold text-white">{label}</span>
    </motion.button>
  );
}
```

### Step 7 — Create FormInput component

Create `src/components/onboarding/form-input.tsx`:

```tsx
"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

interface FormInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  success?: string;
  required?: boolean;
  helper?: string;
  placeholder?: string;
  type?: string;
}

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
  placeholder,
  type = "text",
}: FormInputProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-white mb-2 block">
        {label} {required && <span className="text-error-red">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-required={required}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={
          error ? `${id}-error` : helper ? `${id}-helper` : undefined
        }
        className={`
          bg-bg-dark-secondary text-white placeholder:text-text-light-muted
          rounded-lg px-4 py-3 w-full text-base transition-all duration-200
          focus:outline-none focus:ring-2
          ${
            error
              ? "border border-error-red focus:border-error-red focus:ring-error-red/20 bg-error-red/5"
              : success
              ? "border border-success-green focus:border-success-green focus:ring-success-green/20"
              : "border border-white/10 focus:border-primary focus:ring-primary/20"
          }
        `}
      />
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-error-red mt-1.5 flex items-center gap-1"
        >
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

### Step 8 — Create StepContainer component

Create `src/components/onboarding/step-container.tsx`:

```tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface StepContainerProps {
  step: number;
  direction: number;
  children: ReactNode;
}

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
  }),
};

export function StepContainer({ step, direction, children }: StepContainerProps) {
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

### Step 9 — Create BusinessTypeStep component

Create `src/components/onboarding/business-type-step.tsx`:

```tsx
"use client";

import { BusinessTypeCard } from "./business-type-card";
import { Scissors, Sparkles, Heart, Stethoscope, Dumbbell, Wrench } from "lucide-react";

interface BusinessTypeStepProps {
  selected: string | null;
  onSelect: (value: string) => void;
  onNext: () => void;
}

const businessTypes = [
  { value: "beauty", label: "Beauty", icon: Sparkles },
  { value: "hair", label: "Hair", icon: Scissors },
  { value: "spa-massage", label: "Spa/Massage", icon: Heart },
  { value: "health-clinic", label: "Health Clinic", icon: Stethoscope },
  { value: "personal-trainer", label: "Personal Trainer", icon: Dumbbell },
  { value: "general-services", label: "General Services", icon: Wrench },
];

export function BusinessTypeStep({ selected, onSelect, onNext }: BusinessTypeStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          What type of business do you run?
        </h1>
        <p className="text-base lg:text-lg text-text-muted">
          Select one option below to get started
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {businessTypes.map((type) => (
          <BusinessTypeCard
            key={type.value}
            icon={type.icon}
            label={type.label}
            value={type.value}
            selected={selected === type.value}
            onClick={onSelect}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onNext}
          disabled={!selected}
          className="bg-accent-coral hover:bg-[#F09070] text-bg-dark font-semibold px-8 py-3 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
        <p className="text-xs font-medium text-text-light-muted uppercase tracking-wider">
          Step 1 of 2
        </p>
      </div>
    </div>
  );
}
```

### Step 10 — Create ShopDetailsStep component

Create `src/components/onboarding/shop-details-step.tsx`:

```tsx
"use client";

import { FormInput } from "./form-input";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface ShopDetailsStepProps {
  businessType: string;
  shopName: string;
  shopSlug: string;
  onShopNameChange: (value: string) => void;
  onShopSlugChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
}

const businessTypeLabels: Record<string, string> = {
  beauty: "Beauty Salon",
  hair: "Hair Salon",
  "spa-massage": "Spa & Massage Studio",
  "health-clinic": "Health Clinic",
  "personal-trainer": "Personal Training Studio",
  "general-services": "Service Business",
};

export function ShopDetailsStep({
  businessType,
  shopName,
  shopSlug,
  onShopNameChange,
  onShopSlugChange,
  onBack,
  onSubmit,
}: ShopDetailsStepProps) {
  const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateShopName = () => {
    if (!shopName.trim()) {
      setErrors((prev) => ({ ...prev, name: "Shop name is required" }));
      return false;
    }
    if (shopName.trim().length < 2) {
      setErrors((prev) => ({ ...prev, name: "Must be at least 2 characters" }));
      return false;
    }
    setErrors((prev) => ({ ...prev, name: undefined }));
    return true;
  };

  const validateShopSlug = () => {
    if (!shopSlug.trim()) {
      setErrors((prev) => ({ ...prev, slug: "Shop URL slug is required" }));
      return false;
    }
    if (shopSlug.trim().length < 3) {
      setErrors((prev) => ({ ...prev, slug: "Must be at least 3 characters" }));
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(shopSlug.trim())) {
      setErrors((prev) => ({
        ...prev,
        slug: "Only lowercase letters, numbers, and hyphens allowed",
      }));
      return false;
    }
    setErrors((prev) => ({ ...prev, slug: undefined }));
    return true;
  };

  const handleSubmit = async () => {
    const nameValid = validateShopName();
    const slugValid = validateShopSlug();

    if (!nameValid || !slugValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit();
    } catch (error) {
      console.error("Error creating shop:", error);
      // Handle error (could show toast or error message)
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizeSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Great! Now let&apos;s set up your {businessTypeLabels[businessType]}
        </h1>
        <p className="text-base lg:text-lg text-text-muted">
          We just need a few details to get started
        </p>
      </div>

      <div className="space-y-6">
        <FormInput
          label="Shop name"
          id="shop-name"
          value={shopName}
          onChange={onShopNameChange}
          onBlur={validateShopName}
          error={errors.name}
          required
          placeholder="My Awesome Shop"
        />

        <div>
          <FormInput
            label="Shop URL slug"
            id="shop-slug"
            value={shopSlug}
            onChange={(value) => onShopSlugChange(normalizeSlug(value))}
            onBlur={validateShopSlug}
            error={errors.slug}
            required
            placeholder="my-shop"
          />
          <p className="text-xs text-text-light-muted mt-1.5 font-mono">
            astro.com/book/<span className="text-primary">{shopSlug || "your-shop-slug"}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
        <button
          onClick={onBack}
          className="border border-white/30 text-white hover:bg-white/10 px-6 py-3 rounded-xl transition-colors duration-200"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-accent-coral hover:bg-[#F09070] text-bg-dark font-semibold px-8 py-3 rounded-xl transition-colors duration-200 disabled:opacity-75 disabled:cursor-wait flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creating shop...</span>
            </>
          ) : (
            "Create Shop"
          )}
        </button>
      </div>

      <p className="text-xs font-medium text-text-light-muted uppercase tracking-wider text-center">
        Step 2 of 2
      </p>
    </div>
  );
}
```

### Step 11 — Create OnboardingFlow component

Create `src/components/onboarding/onboarding-flow.tsx`:

```tsx
"use client";

import { useState } from "react";
import { BusinessTypeStep } from "./business-type-step";
import { ShopDetailsStep } from "./shop-details-step";
import { StepContainer } from "./step-container";
import { createShop } from "@/app/app/actions";

export function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [shopSlug, setShopSlug] = useState("");

  const handleNext = () => {
    setDirection(1);
    setStep(2);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!businessType) return;

    await createShop({
      businessType,
      shopName,
      shopSlug,
    });
  };

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <StepContainer step={step} direction={direction}>
          {step === 1 ? (
            <BusinessTypeStep
              selected={businessType}
              onSelect={setBusinessType}
              onNext={handleNext}
            />
          ) : (
            <ShopDetailsStep
              businessType={businessType!}
              shopName={shopName}
              shopSlug={shopSlug}
              onShopNameChange={setShopName}
              onShopSlugChange={setShopSlug}
              onBack={handleBack}
              onSubmit={handleSubmit}
            />
          )}
        </StepContainer>
      </div>
    </div>
  );
}
```

### Step 12 — Update /app page

Update `src/app/app/page.tsx` to conditionally show onboarding:

```tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default async function AppPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user has a shop
  const shop = await db.query.shops.findFirst({
    where: (shops, { eq }) => eq(shops.ownerId, session.user.id),
  });

  // If no shop, show onboarding
  if (!shop) {
    return <OnboardingFlow />;
  }

  // If shop exists, show dashboard (existing code)
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Your Shop: {shop.name}</h1>

      <div className="bg-bg-dark-secondary rounded-xl p-6 border border-white/10 space-y-4">
        <div>
          <p className="text-sm text-text-muted">Shop name</p>
          <p className="text-white font-medium">{shop.name}</p>
        </div>

        <div>
          <p className="text-sm text-text-muted">Booking URL</p>
          <p className="text-white font-mono">
            {process.env.NEXT_PUBLIC_BASE_URL || "astro.com"}/book/{shop.slug}
          </p>
        </div>

        {shop.businessType && (
          <div>
            <p className="text-sm text-text-muted">Business type</p>
            <p className="text-white font-medium capitalize">
              {shop.businessType.replace("-", " ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Testing Plan

### 1. Type checking and lint (automated)
```bash
pnpm lint && pnpm typecheck
```
Must pass with zero errors before marking done.

### 2. Database verification
```bash
pnpm db:studio
```
Check that:
- `shops` table has `business_type` column
- Column is TEXT type, nullable

### 3. Manual E2E flow (requires dev server)

**Prerequisites:**
- User must be logged out (or use incognito)
- Database should have no shop for test user

**Flow:**
1. Sign up new user → verify redirected to `/app`
2. Should see onboarding Step 1 (business type selection)
3. Click "Next" without selection → button should be disabled
4. Select "Hair" card → card should show selected state (blue border, teal icon)
5. Click "Next" → should animate to Step 2
6. Leave fields empty, try to submit → should show validation errors
7. Enter shop name "Test Salon", slug "test-salon"
8. Click "Create Shop" → should show loading state
9. After creation → should redirect to shop dashboard showing shop details

**Validation tests:**
10. Step 2: Leave shop name empty → blur → should show "Shop name is required"
11. Step 2: Enter "a" in shop name → blur → should show "Must be at least 2 characters"
12. Step 2: Enter "TEST SHOP" in slug → should auto-normalize to "test-shop"
13. Step 2: Enter "test@shop!" in slug → should show "Only lowercase letters, numbers, and hyphens allowed"

**Navigation tests:**
14. Step 2: Click "Back" → should return to Step 1 with selection preserved
15. Step 1: Reselect different business type → should deselect previous
16. Complete flow → verify shop created with correct business type in dashboard

### 4. Keyboard navigation
- [ ] Tab through cards in Step 1 → focus ring visible
- [ ] Press Enter/Space on card → should select
- [ ] Tab to "Next" button → Enter should advance
- [ ] Tab through inputs in Step 2 → all focusable
- [ ] Tab to "Back" / "Create Shop" → Enter should trigger action

### 5. Mobile responsive (resize to 375px)
- [ ] Cards show 2 columns on mobile
- [ ] Cards show 3 columns on desktop (>= 768px)
- [ ] Buttons stack vertically on mobile (< 640px)
- [ ] Buttons horizontal on desktop
- [ ] Touch targets minimum 44px height
- [ ] No horizontal scroll

### 6. Accessibility check
- [ ] All cards have `role="button"` and `aria-pressed`
- [ ] Inputs have `aria-required` and `aria-invalid`
- [ ] Error messages linked with `aria-describedby`
- [ ] Loading state has spinner + text (not just spinner)
- [ ] Step indicator announced to screen readers
- [ ] Focus order follows visual order

### 7. Animation check
- [ ] Step transition slides left/right (not abrupt)
- [ ] Card hover scales up smoothly
- [ ] Button states transition (not instant)
- [ ] Verify `prefers-reduced-motion` respected (check StepContainer)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Existing shops without business_type column | Make column nullable, update existing shops manually or via data migration if needed |
| Slug uniqueness collision | createShop checks for existing slug and throws error with clear message |
| Session not available in server action | Use `await headers()` pattern to pass headers to `auth.api.getSession()` |
| Framer Motion performance on mobile | Use `useReducedMotion()` hook to disable animations for users with motion preferences |
| Long business names overflow cards | Use `text-overflow: ellipsis` or limit input length |
| User refreshes during onboarding | State is local — will reset. Future enhancement: persist to localStorage or DB |
| Multiple shops per user | Current logic finds first shop. Future: allow user to select shop or manage multiple |

---

## Follow-up Enhancements (Out of Scope)

- **Persist progress:** Save partial onboarding state to localStorage or DB
- **Skip onboarding:** Allow admin users to skip and set up later
- **Multi-shop support:** UI for users with multiple shops
- **Business type filtering:** Use business type for personalized features
- **Onboarding analytics:** Track step completion rates, drop-off points
- **Sub-categories:** Add Step 3 for "General Services" users to select sub-category
- **Staff size selection:** Add Step 3 or 4 for team size configuration
- **Slug availability check:** Real-time API validation while typing
- **Custom domain support:** Allow users to configure custom booking domains

---

## Definition of Done

- [ ] Migration created and run successfully
- [ ] Schema updated with `businessType` field
- [ ] Color tokens added to `globals.css`
- [ ] All components created with TypeScript types
- [ ] Server action `createShop` accepts and stores business type
- [ ] `/app` page conditionally renders onboarding vs dashboard
- [ ] `pnpm lint && pnpm typecheck` passes
- [ ] Manual E2E flow completed successfully
- [ ] Keyboard navigation works
- [ ] Mobile responsive verified (375px, 768px, 1024px)
- [ ] Accessibility checks pass
- [ ] Animations smooth and respectful of motion preferences
- [ ] Shop dashboard displays business type after onboarding

---

## Related Documentation

- **Shaping:** `docs/shaping/shop-owner-onboarding-shaping.md`
- **Design system:** `docs/shaping/onboarding-design-system.md`
- **UX research:** `docs/shaping/onboarding-flow-research.md`
- **Next slice:** `docs/shaping/slice-10-dashboard-v1-plan.md` — Post-onboarding dashboard (natural follow-up)
- **Post-onboarding shaping:** `docs/shaping/post-onboarding-dashboard-shaping.md`
- **Landing page:** `docs/shaping/landing-page-design-system.md` (base tokens)
