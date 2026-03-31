---
shaping: true
---

# V3 — Onboarding Step 3

**Demo:** New shop owner completes Business Type → Shop Details → lands on Step 3 "Add your first service", fills in name/duration/buffer and submits — custom event type created, lands on dashboard, no nudge. Separately: click "Skip for now" → default event type created with `isDefault=true`, lands on dashboard, nudge banner shown linking to `/app/settings/services`.

**Depends on:** V1 (schema + `createEventType` server action + `getBookingSettingsForShop`).

---

## Steps

### 1. Change `createShop` to return `{ shopId }` instead of redirecting

**File:** `src/app/app/actions.ts`

`createShop` currently calls `redirect('/app?created=true')` after inserting the shop, which throws a Next.js navigation error and terminates the action immediately. `OnboardingFlow.handleSubmit` never regains control, making Step 3 unreachable.

Change the function to return the created shop id. Two redirect call sites must be handled:

**The `existingShop` early-return path** (line 59–61): currently `redirect("/app")`. Change to return the existing shop id — the user already has a shop, Step 3 will run and `createEventType` / `createDefaultEventType` will use `getAuthorizedShop()` to find it:

```typescript
const existingShop = await getShopByOwnerId(session.user.id);
if (existingShop) {
  return { shopId: existingShop.id };   // ← was: redirect("/app")
}
```

**The success path** (line 75–76): remove `redirect`, return shopId:

```typescript
// Remove: redirect("/app?created=true");
revalidatePath("/app");
return { shopId: shop.id };
```

Update the return type of `createShopRecord` call site — `createShopRecord` in `src/lib/queries/shops.ts` already returns the shop object from the transaction, so `shop.id` is available.

The full updated tail of the function:

```typescript
  const shop = await createShopRecord({
    ownerUserId: session.user.id,
    name: parsed.data.shopName,
    slug: normalizedSlug,
    businessType: parsed.data.businessType,
  });

  revalidatePath("/app");
  return { shopId: shop.id };
}
```

**Note on `ShopDetailsStep`:** The `isRedirectSignal` helper in `shop-details-step.tsx` was there to silently swallow the old `NEXT_REDIRECT` throw. After this change `createShop` returns normally, so the `isRedirectSignal` branch will never fire. Leave it in place — it is harmless and removing it is out of scope.

---

### 2. Add `createDefaultEventType` server action

**File:** `src/app/app/settings/services/actions.ts`

Add a new exported function below `updateEventType`. It is called from the onboarding skip path. It uses the same `getAuthorizedShop()` + `getBookingSettingsForShop()` pattern already present in the file — no shopId argument needed from the client.

```typescript
export async function createDefaultEventType() {
  const shop = await getAuthorizedShop();
  const settings = await getBookingSettingsForShop(shop.id);
  const slotMinutes = settings?.slotMinutes ?? 60;

  // Only insert if no default already exists (idempotent)
  const existing = await db.query.eventTypes.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.shopId, shop.id), eq(table.isDefault, true)),
  });

  if (existing) {
    return;
  }

  await db.insert(eventTypes).values({
    shopId: shop.id,
    name: "Service",
    durationMinutes: slotMinutes,
    bufferMinutes: 0,
    depositAmountCents: null,
    isHidden: false,
    isActive: true,
    isDefault: true,
    sortOrder: 0,
  });

  revalidatePath("/app");
  revalidatePath("/app/settings/services");
}
```

The idempotency check (`if (existing) return`) means calling this action multiple times (e.g. double-click on "Skip") is safe.

---

### 3. New `AddServiceStep` component

**File:** `src/components/onboarding/add-service-step.tsx` (new)

This is a client component that matches the dark onboarding theme. It reuses `FormInput` from `./form-input`. Duration options are hardcoded to multiples of 60 min — the default `slotMinutes` for all newly created shops. Server-side `validateDuration` in `createEventType` will catch any mismatch, but this can never happen at onboarding time.

```typescript
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createEventType } from "@/app/app/settings/services/actions";
import { FormInput } from "./form-input";

type AddServiceStepProps = {
  onDone: () => void;
  onSkip: () => Promise<void>;  // async — must be awaited before navigation
};

const DURATION_OPTIONS = [
  { value: 60, label: "60 min" },
  { value: 120, label: "120 min" },
  { value: 180, label: "180 min" },
  { value: 240, label: "240 min" },
];

const BUFFER_OPTIONS: { value: 0 | 5 | 10; label: string }[] = [
  { value: 0, label: "None" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
];

export function AddServiceStep({ onDone, onSkip }: AddServiceStepProps) {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [bufferMinutes, setBufferMinutes] = useState<0 | 5 | 10>(0);
  const [depositDollars, setDepositDollars] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const validateName = () => {
    if (!name.trim()) {
      setNameError("Service name is required");
      return false;
    }
    setNameError(undefined);
    return true;
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!validateName()) return;

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("durationMinutes", String(durationMinutes));
    formData.set("bufferMinutes", String(bufferMinutes));
    if (depositDollars.trim()) {
      formData.set("depositAmountCents", depositDollars.trim());
    }

    setIsSubmitting(true);
    try {
      await createEventType(formData);
      onDone();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not save service. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      await onSkip();  // must await — onSkip calls createDefaultEventType then router.push
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not skip. Please try again."
      );
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-white lg:text-3xl">
          Add your first service
        </h1>
        <p className="text-base text-text-muted lg:text-lg">
          You can add more services later from your dashboard
        </p>
      </div>

      <div className="space-y-6">
        <FormInput
          label="Service name"
          id="service-name"
          value={name}
          onChange={(value) => {
            setName(value);
            setSubmitError(null);
          }}
          onBlur={validateName}
          error={nameError}
          required
          placeholder="e.g. Haircut, Full Colour, Deep Tissue Massage"
        />

        {/* Duration */}
        <div>
          <label className="mb-2 block text-sm font-medium text-white">
            Duration <span className="text-error-red">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDurationMinutes(opt.value)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  durationMinutes === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 bg-bg-dark-secondary text-white hover:border-white/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buffer */}
        <div>
          <label className="mb-2 block text-sm font-medium text-white">
            Buffer time
          </label>
          <p className="mb-2 text-xs text-text-light-muted">
            Built-in wrap-up time at the end of each slot (inclusive of duration)
          </p>
          <div className="flex gap-2">
            {BUFFER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBufferMinutes(opt.value)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  bufferMinutes === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/10 bg-bg-dark-secondary text-white hover:border-white/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Deposit override (optional) */}
        <FormInput
          label="Deposit amount (optional)"
          id="deposit-override"
          value={depositDollars}
          onChange={(value) => {
            setDepositDollars(value);
            setSubmitError(null);
          }}
          placeholder="e.g. 25.00"
          helper="Leave blank to use your shop's default deposit policy"
          type="number"
        />

        {submitError ? (
          <p
            role="alert"
            className="rounded-lg border border-error-red/40 bg-error-red/10 p-3 text-sm text-error-red"
          >
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse justify-between gap-4 sm:flex-row">
        <button
          onClick={handleSkip}
          disabled={isSkipping || isSubmitting}
          className="rounded-xl border border-white/30 px-6 py-3 text-white transition-colors duration-200 hover:bg-white/10 disabled:opacity-50"
          type="button"
        >
          Skip for now
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isSkipping}
          className="flex items-center justify-center gap-2 rounded-xl bg-accent-coral px-8 py-3 font-semibold text-bg-dark transition-colors duration-200 hover:bg-[#F09070] disabled:cursor-wait disabled:opacity-75"
          type="button"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <span>Saving...</span>
            </>
          ) : (
            "Add service"
          )}
        </button>
      </div>

      <p
        className="text-center text-xs font-medium tracking-wider text-text-light-muted uppercase"
        aria-live="polite"
      >
        Step 3 of 3
      </p>
    </div>
  );
}
```

---

### 4. Update `OnboardingFlow`

**File:** `src/components/onboarding/onboarding-flow.tsx`

Three changes: add `useRouter`, add `shopId` state, advance to step 3 after `createShop` returns, and handle step 3 submit/skip paths.

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createShop } from "@/app/app/actions";
import { createDefaultEventType } from "@/app/app/settings/services/actions";
import { AddServiceStep } from "./add-service-step";
import { BusinessTypeStep, type BusinessTypeValue } from "./business-type-step";
import { ShopDetailsStep } from "./shop-details-step";
import { StepContainer } from "./step-container";

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [businessType, setBusinessType] = useState<BusinessTypeValue | null>(null);
  const [shopName, setShopName] = useState("");
  const [shopSlug, setShopSlug] = useState("");

  const handleNext = () => {
    if (!businessType) return;
    setDirection(1);
    setStep(2);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(1);
  };

  // Called by ShopDetailsStep when the user clicks "Create Shop"
  const handleSubmit = async () => {
    if (!businessType) {
      throw new Error("Select a business type first");
    }
    await createShop({ businessType, shopName, shopSlug });
    // createShop now returns { shopId } instead of redirecting.
    // Advance to Step 3.
    setDirection(1);
    setStep(3);
  };

  // Called by AddServiceStep after createEventType succeeds
  const handleServiceDone = () => {
    router.push("/app");
  };

  // Called by AddServiceStep when user clicks "Skip for now"
  const handleServiceSkip = async () => {
    await createDefaultEventType();
    router.push("/app");
  };

  return (
    <div className="min-h-screen bg-bg-dark px-4 py-12">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-bg-dark p-6 sm:p-8">
        <StepContainer step={step} direction={direction}>
          {step === 1 ? (
            <BusinessTypeStep
              selected={businessType}
              onSelect={setBusinessType}
              onNext={handleNext}
            />
          ) : step === 2 && businessType ? (
            <ShopDetailsStep
              businessType={businessType}
              shopName={shopName}
              shopSlug={shopSlug}
              onShopNameChange={setShopName}
              onShopSlugChange={setShopSlug}
              onBack={handleBack}
              onSubmit={handleSubmit}
            />
          ) : step === 3 ? (
            <AddServiceStep
              onDone={handleServiceDone}
              onSkip={handleServiceSkip}
            />
          ) : null}
        </StepContainer>
      </div>
    </div>
  );
}
```

---

### 5. Update `ShopDetailsStep` step counter

**File:** `src/components/onboarding/shop-details-step.tsx`

One line change — update the step counter at the bottom of the form:

```typescript
// line 210 — was: "Step 2 of 2"
Step 2 of 3
```

---

### 6. Update `BusinessTypeStep` step counter

**File:** `src/components/onboarding/business-type-step.tsx`

The onboarding now has three steps. Update the counter at the bottom of `BusinessTypeStep`:

```typescript
// was: "Step 1 of 2"
Step 1 of 3
```

---

### 7. Dashboard nudge banner

**File:** `src/app/app/dashboard/page.tsx`

Load event types for the shop after the existing shop/data queries. Check if all active event types are default placeholders. If so, render a nudge banner before the main content.

Add import:

```typescript
import { getEventTypesForShop } from "@/lib/queries/event-types";
```

Add data fetch after `const shop = ...`:

```typescript
const activeEventTypes = await getEventTypesForShop(shop.id, { isActive: true });
const hasOnlyDefaultServices =
  activeEventTypes.length > 0 &&
  activeEventTypes.every((et) => et.isDefault);
```

Add the nudge before `<AttentionRequiredTable>`:

```tsx
{hasOnlyDefaultServices ? (
  <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-center justify-between gap-4">
    <p className="text-sm text-yellow-200">
      Your booking page is using a default service. Set up your real services to show customers accurate durations and names.
    </p>
    <a
      href="/app/settings/services"
      className="shrink-0 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-bg-dark hover:bg-yellow-400 transition-colors"
    >
      Set up services
    </a>
  </div>
) : null}
```

---

## Testing plan

I will test this myself in the following order before asking the user to verify the browser flow.

### Step A — Static checks after every file change

```bash
pnpm lint && pnpm typecheck
```

Run after each step above. No errors expected.

### Step B — Unit test for `createDefaultEventType`

Write a test in `src/lib/__tests__/` (or alongside the action) that mocks `db`, `requireAuth`, and `getShopByOwnerId` and verifies:
- Inserts with `isDefault: true`, `name: "Service"`, `durationMinutes: slotMinutes`, `bufferMinutes: 0`
- Is idempotent: calling twice does not insert a second row

```bash
pnpm test
```

All existing tests must still pass. The V1 migration and schema are already in place so no schema-related test failures are expected.

### Step C — Regression check on existing unit tests

```bash
pnpm test
```

Key test files to watch:
- `src/app/api/bookings/create/route.test.ts` — booking flow unchanged
- `src/lib/__tests__/booking-tier-pricing.test.ts` — tier pricing unchanged
- `src/lib/__tests__/availability-calendar.test.ts` — availability unchanged

### Step D — Browser smoke test (requires dev server — user to verify)

Since the dev server cannot be started in this session, provide the following checklist for manual verification:

**Submit path:**
1. Sign out, create a new account
2. Verify Step 1 shows "Step 1 of 3" counter
3. Complete Step 1 (select a business type), click Next
3. Complete Step 2 (shop name + slug), click "Create Shop"
4. Verify Step 3 appears with "Add your first service" heading and step counter "Step 3 of 3"
5. Enter a service name and click "Add service"
6. Verify redirect to `/app/dashboard`
7. Verify no nudge banner on the dashboard
8. Visit `/app/settings/services` — verify the new event type exists with `isDefault = false`

**Skip path:**
1. Repeat steps 1–4 above with a different account
2. Click "Skip for now"
3. Verify redirect to `/app/dashboard`
4. Verify the nudge banner is shown with a link to `/app/settings/services`
5. Visit `/app/settings/services` — verify a "Service" event type exists with the `isDefault` flag visible (Hidden badge absent, Active shown)
6. Create a new custom service via the form
7. Reload the dashboard — nudge banner should be gone

**Direct-link bypass (existing behaviour regression):**
8. Visit `/book/[slug]` for the new shop — verify the service is pre-selected (single active event type, selector skipped)

---

## Acceptance

- [ ] `pnpm lint && pnpm typecheck` passes clean
- [ ] `pnpm test` passes with no regressions
- [ ] `createShop` returns `{ shopId }` — TypeScript confirms return type is not `void`
- [ ] Step 3 renders in `OnboardingFlow` after Step 2 submits successfully
- [ ] Step counter in `BusinessTypeStep` reads "Step 1 of 3"
- [ ] Step counter in `ShopDetailsStep` reads "Step 2 of 3"
- [ ] "Add service" submit calls `createEventType`, creates event type with `isDefault=false`, navigates to `/app`
- [ ] "Skip for now" calls `createDefaultEventType`, creates event type with `isDefault=true`, navigates to `/app`
- [ ] `createDefaultEventType` is idempotent — calling twice does not create a second default
- [ ] Dashboard nudge appears when all active event types have `isDefault=true`
- [ ] Dashboard nudge disappears after owner creates a custom service via `/app/settings/services`
- [ ] Existing shop owners (pre-onboarding, already have a shop) are not affected — `createShop` early-returns their existing shopId
