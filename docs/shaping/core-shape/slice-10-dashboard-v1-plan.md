# Slice 10: Post-Onboarding Dashboard — Implementation Plan

## Scope

Implements the post-onboarding dashboard (Shape A) from `docs/shaping/post-onboarding-dashboard-shaping.md`.

Demo goal: After completing onboarding, shop owner lands on `/app` showing success banner, booking management options (Google Calendar vs Appointments List), shop overview with business type icon, booking link, and action buttons (Test Page, Copy Link). Dark theme with teal/coral palette matching landing page.

**Dependencies:** Requires Slice 9 (Onboarding) to be completed first.

---

## Key Discoveries

### Banner state management
Need to show success banner only on first visit after shop creation. Options:
1. URL query param: `/app?created=true` (simple, works with redirect)
2. localStorage: persist dismissed state per shop
3. Cookie: server-side state management

**Decision:** Use URL query param for initial display, localStorage for permanent dismissal.

### Business type icon mapping
Onboarding stores business type as string ("hair", "beauty", etc.). Need to map to Lucide icons for display.

### Copy to clipboard API
Modern browsers use `navigator.clipboard.writeText()`. Need fallback for older browsers and permission handling.

### Existing /app page structure
Currently shows simple shop details card. Need to expand to multi-section dashboard while maintaining shop existence check.

### Toast notifications
Need toast/notification system for "Link copied!" feedback. Check if Sonner toast is already installed (likely from landing page).

### Google Calendar placeholder
`/app/settings/calendar` doesn't exist yet. For MVP, show "Coming soon" state or link to future feature.

---

## Files Changed

| File | Action |
|------|--------|
| `src/app/app/page.tsx` | Update — conditional rendering for success banner + dashboard sections |
| `src/components/dashboard/success-banner.tsx` | Create — dismissible success message |
| `src/components/dashboard/booking-management-choice.tsx` | Create — two-card grid (Google Calendar + Appointments List) |
| `src/components/dashboard/shop-overview-card.tsx` | Create — business type, link, hours, actions |
| `src/components/dashboard/copy-button.tsx` | Create — clipboard copy with toast feedback |
| `src/lib/business-types.ts` | Create — icon mapping and labels for business types |
| `src/app/app/settings/calendar/page.tsx` | Create — placeholder page for Google Calendar integration |

---

## Step-by-Step Implementation

### Step 1 — Create business type mapping

Create `src/lib/business-types.ts`:

```ts
import {
  Scissors,
  Sparkles,
  Heart,
  Stethoscope,
  Dumbbell,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const businessTypes: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
  beauty: { label: "Beauty Salon", icon: Sparkles },
  hair: { label: "Hair Salon", icon: Scissors },
  "spa-massage": { label: "Spa & Massage Studio", icon: Heart },
  "health-clinic": { label: "Health Clinic", icon: Stethoscope },
  "personal-trainer": { label: "Personal Training Studio", icon: Dumbbell },
  "general-services": { label: "Service Business", icon: Wrench },
};

export function getBusinessTypeInfo(type: string | null) {
  if (!type) {
    return { label: "Business", icon: Wrench };
  }
  return businessTypes[type] || { label: "Business", icon: Wrench };
}
```

### Step 2 — Create CopyButton component

Create `src/components/dashboard/copy-button.tsx`:

```tsx
"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CopyButtonProps {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = "Copy Link" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy link");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="border border-white/30 text-white hover:bg-white/10 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
```

### Step 3 — Create SuccessBanner component

Create `src/components/dashboard/success-banner.tsx`:

```tsx
"use client";

import { CheckCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface SuccessBannerProps {
  businessTypeName: string;
  shopId: string;
}

export function SuccessBanner({ businessTypeName, shopId }: SuccessBannerProps) {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show if URL has ?created=true and banner not dismissed for this shop
    const isCreated = searchParams.get("created") === "true";
    const dismissedShops = JSON.parse(
      localStorage.getItem("dismissedBanners") || "[]"
    );

    if (isCreated && !dismissedShops.includes(shopId)) {
      setVisible(true);
    }
  }, [searchParams, shopId]);

  const handleDismiss = () => {
    setVisible(false);

    // Persist dismissal in localStorage
    const dismissedShops = JSON.parse(
      localStorage.getItem("dismissedBanners") || "[]"
    );
    dismissedShops.push(shopId);
    localStorage.setItem("dismissedBanners", JSON.stringify(dismissedShops));
  };

  if (!visible) return null;

  return (
    <div className="bg-success-green/10 border border-success-green/30 rounded-xl p-4 mb-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-success-green" />
        <p className="text-sm font-medium text-white">
          Your {businessTypeName} is ready to accept bookings!
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="text-text-muted hover:text-white transition-colors duration-200"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
```

### Step 4 — Create BookingManagementChoice component

Create `src/components/dashboard/booking-management-choice.tsx`:

```tsx
"use client";

import { Calendar, ClipboardList, ArrowRight } from "lucide-react";
import Link from "next/link";

export function BookingManagementChoice() {
  return (
    <div className="bg-bg-dark-secondary rounded-xl border border-white/10 p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">
          How do you want to manage bookings?
        </h2>
        <p className="text-sm text-text-muted">
          Choose your preferred method to view and manage appointments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Google Calendar Option */}
        <Link
          href="/app/settings/calendar"
          className="bg-bg-dark rounded-xl border border-white/10 p-6 hover:border-primary-light/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-6 h-6 text-primary" />
              <div>
                <h3 className="text-base font-semibold text-white">
                  Google Calendar
                </h3>
                <span className="text-xs text-accent-peach font-medium">
                  Recommended
                </span>
              </div>
            </div>

            <p className="text-sm text-text-muted mb-4 flex-grow">
              Auto-sync new bookings to your Google Calendar. Get notifications
              and manage appointments from one place.
            </p>

            <div className="flex items-center text-primary text-sm font-medium group-hover:gap-2 transition-all duration-200">
              <span>Connect Calendar</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          </div>
        </Link>

        {/* Appointments List Option */}
        <Link
          href="/app/appointments"
          className="bg-bg-dark rounded-xl border border-white/10 p-6 hover:border-primary-light/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-3">
              <ClipboardList className="w-6 h-6 text-primary" />
              <h3 className="text-base font-semibold text-white">
                Appointments List
              </h3>
            </div>

            <p className="text-sm text-text-muted mb-4 flex-grow">
              View all your bookings in a simple table. See customer details,
              appointment times, and payment status.
            </p>

            <div className="flex items-center text-primary text-sm font-medium group-hover:gap-2 transition-all duration-200">
              <span>View Appointments</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          </div>
        </Link>
      </div>

      <p className="text-xs text-text-light-muted text-center">
        You can connect Google Calendar later in Settings
      </p>
    </div>
  );
}
```

### Step 5 — Create ShopOverviewCard component

Create `src/components/dashboard/shop-overview-card.tsx`:

```tsx
import { ExternalLink } from "lucide-react";
import { CopyButton } from "./copy-button";
import { getBusinessTypeInfo } from "@/lib/business-types";

interface ShopOverviewCardProps {
  shopName: string;
  shopSlug: string;
  businessType: string | null;
  timezone: string;
}

export function ShopOverviewCard({
  shopName,
  shopSlug,
  businessType,
  timezone,
}: ShopOverviewCardProps) {
  const { label, icon: Icon } = getBusinessTypeInfo(businessType);
  const bookingUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/book/${shopSlug}`;

  return (
    <div className="bg-bg-dark-secondary rounded-xl border border-white/10 p-6 lg:p-8">
      <h2 className="text-xl font-semibold text-white mb-6">Your Shop Details</h2>

      <div className="space-y-4 mb-6">
        {/* Business Type */}
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-text-muted">Business Type</p>
            <p className="text-sm font-medium text-white">{label}</p>
          </div>
        </div>

        {/* Shop Name */}
        <div>
          <p className="text-xs text-text-muted mb-1">Shop Name</p>
          <p className="text-sm font-medium text-white">{shopName}</p>
        </div>

        {/* Booking Link */}
        <div>
          <p className="text-xs text-text-muted mb-1">Booking Page</p>
          <p className="text-sm font-mono text-white break-all">
            /book/{shopSlug}
          </p>
        </div>

        {/* Default Hours */}
        <div>
          <p className="text-xs text-text-muted mb-1">Default Hours</p>
          <p className="text-sm text-white">Mon-Fri 9:00 AM - 5:00 PM</p>
          <p className="text-xs text-text-light-muted mt-1">
            Customize hours in Settings
          </p>
        </div>

        {/* Slot Duration */}
        <div>
          <p className="text-xs text-text-muted mb-1">Appointment Duration</p>
          <p className="text-sm text-white">60 minutes</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={`/book/${shopSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary hover:bg-primary-light text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Test Booking Page</span>
        </a>
        <CopyButton text={bookingUrl} label="Copy Link" />
      </div>
    </div>
  );
}
```

### Step 6 — Update /app page

Update `src/app/app/page.tsx` to show dashboard:

```tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { SuccessBanner } from "@/components/dashboard/success-banner";
import { BookingManagementChoice } from "@/components/dashboard/booking-management-choice";
import { ShopOverviewCard } from "@/components/dashboard/shop-overview-card";
import { getBusinessTypeInfo } from "@/lib/business-types";

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

  // If shop exists, show dashboard
  const { label } = getBusinessTypeInfo(shop.businessType);

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12">
        {/* Success Banner (conditional) */}
        <SuccessBanner businessTypeName={label} shopId={shop.id} />

        {/* Main Dashboard Grid */}
        <div className="space-y-6">
          {/* Booking Management Choice */}
          <BookingManagementChoice />

          {/* Shop Overview */}
          <ShopOverviewCard
            shopName={shop.name}
            shopSlug={shop.slug}
            businessType={shop.businessType}
            timezone={shop.timezone}
          />
        </div>
      </div>
    </div>
  );
}
```

### Step 7 — Create Google Calendar placeholder page

Create `src/app/app/settings/calendar/page.tsx`:

```tsx
import { Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CalendarSettingsPage() {
  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="max-w-3xl mx-auto px-4 py-8 lg:py-12">
        {/* Back Button */}
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-white transition-colors duration-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Google Calendar Integration
          </h1>
          <p className="text-text-muted">
            Sync your bookings with Google Calendar automatically
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-bg-dark-secondary rounded-xl border border-white/10 p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">
            Coming Soon
          </h2>
          <p className="text-text-muted max-w-md mx-auto mb-6">
            Google Calendar integration is currently in development. You&apos;ll
            be able to connect your calendar and automatically sync all new
            bookings.
          </p>

          <div className="bg-bg-dark rounded-lg border border-white/10 p-4 text-left max-w-md mx-auto">
            <p className="text-sm font-medium text-white mb-2">
              What you&apos;ll get:
            </p>
            <ul className="text-sm text-text-muted space-y-1">
              <li>• Automatic sync of new bookings</li>
              <li>• Calendar notifications for upcoming appointments</li>
              <li>• Two-way sync (update from calendar or dashboard)</li>
              <li>• Conflict detection and prevention</li>
            </ul>
          </div>

          <Link
            href="/app"
            className="inline-block mt-6 bg-primary hover:bg-primary-light text-white font-medium px-6 py-2 rounded-lg transition-colors duration-200"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### Step 8 — Update createShop redirect

Update `src/app/app/actions.ts` to redirect with success param:

```ts
// At the end of createShop function, replace:
// redirect("/app");

// With:
redirect("/app?created=true");
```

This enables the success banner to display on first visit.

---

## Testing Plan

### 1. Type checking and lint (automated)
```bash
pnpm lint && pnpm typecheck
```
Must pass with zero errors before marking done.

### 2. Success banner flow (manual)

**Prerequisites:**
- Complete onboarding flow (Slice 9)
- New shop just created

**Flow:**
1. After shop creation → should redirect to `/app?created=true`
2. Success banner should appear: "Your [Business Type] is ready to accept bookings!"
3. Banner has green checkmark icon and dismiss X button
4. Click X → banner should disappear
5. Refresh page → banner should NOT reappear (persisted in localStorage)
6. Clear localStorage → create new shop → banner should appear again

### 3. Booking management cards (manual)

**Prerequisites:**
- Logged in with shop created
- On `/app` dashboard

**Flow:**
7. Two cards visible: "Google Calendar" (left) and "Appointments List" (right)
8. Google Calendar card shows "Recommended" badge
9. Hover over cards → border changes to teal, shadow appears
10. Click "Connect Calendar" → redirects to `/app/settings/calendar`
11. Click "View Appointments" → redirects to `/app/appointments`
12. Helper text below cards: "You can connect Google Calendar later in Settings"

### 4. Shop overview card (manual)

**Prerequisites:**
- On `/app` dashboard with shop created

**Flow:**
13. Shop overview card displays:
    - Business type icon (matches onboarding selection)
    - Business type label (e.g., "Hair Salon")
    - Shop name
    - Booking page URL (`/book/{slug}`)
    - Default hours: "Mon-Fri 9:00 AM - 5:00 PM"
    - Appointment duration: "60 minutes"
14. Click "Test Booking Page" → opens `/book/{slug}` in new tab
15. Click "Copy Link" → shows success toast "Link copied to clipboard!"
16. Button text changes to "Copied!" with checkmark icon
17. After 2 seconds, button reverts to "Copy Link"

### 5. Google Calendar placeholder page (manual)

**Flow:**
18. Navigate to `/app/settings/calendar`
19. Page shows "Coming Soon" message
20. Calendar icon displayed in circle
21. "What you'll get" feature list visible
22. Click "Back to Dashboard" → returns to `/app`
23. Click "Return to Dashboard" → returns to `/app`

### 6. Mobile responsive (resize to 375px, 768px, 1024px)

**Layouts:**
- [ ] Success banner: full width, icon + text + dismiss button fit
- [ ] Booking management cards: stack vertically on mobile (< 768px)
- [ ] Booking management cards: 2 columns on desktop (>= 768px)
- [ ] Shop overview: action buttons stack on mobile (< 640px)
- [ ] Shop overview: action buttons horizontal on desktop
- [ ] All cards maintain readable padding and spacing
- [ ] No horizontal scroll

### 7. Accessibility check

**Success banner:**
- [ ] Dismiss button has `aria-label="Dismiss banner"`
- [ ] Checkmark icon decorative (no alt text needed)

**Booking management cards:**
- [ ] Cards are links with proper href
- [ ] Hover states visible
- [ ] Keyboard navigation works (Tab to focus, Enter to activate)

**Shop overview:**
- [ ] "Test Booking Page" link has `rel="noopener noreferrer"` for security
- [ ] Copy button provides toast feedback (screen reader announced)
- [ ] All interactive elements keyboard-navigable

**Google Calendar page:**
- [ ] Back button keyboard accessible
- [ ] Return to Dashboard button keyboard accessible

### 8. localStorage persistence

**Flow:**
24. Inspect browser localStorage → should have `dismissedBanners` key
25. Value should be JSON array: `["shop-id-123"]`
26. Create second shop → new shop ID added to array
27. Banner dismissed for each shop independently

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Banner shows on every page load | Use URL param `?created=true` to show only once + localStorage for dismissal |
| Clipboard API not supported in older browsers | Wrap in try/catch, show error toast if fails |
| Business type null for existing shops | `getBusinessTypeInfo()` provides fallback (Wrench icon + "Business" label) |
| Google Calendar link leads nowhere | Create placeholder page with "Coming Soon" message |
| Success banner localStorage collision | Use shop ID as unique key in dismissed array |
| Toast notification dependency missing | Verify Sonner toast is installed (likely from landing page) |
| Multiple shops per user | Current logic finds first shop — future enhancement for multi-shop support |

---

## Follow-up Enhancements (Out of Scope)

**Phase 2: Enhanced Dashboard**
- Quick stats: Total bookings this week, revenue, upcoming appointments
- Recent activity feed: Latest bookings, cancellations, payments
- Calendar widget: Week view of upcoming appointments

**Phase 3: Google Calendar Integration**
- OAuth flow for Google Calendar
- Sync bookings → calendar events
- Two-way sync (update from calendar or dashboard)
- Conflict detection and prevention

**Phase 4: Personalization**
- Contextual tips based on business type
- Onboarding checklist: customize hours, set prices, add services
- Analytics: booking trends, peak times, customer retention

**Phase 5: Multi-Shop Support**
- Shop switcher dropdown
- Per-shop dashboard
- Aggregate view across all shops

---

## Definition of Done

- [ ] Business type mapping created (`business-types.ts`)
- [ ] CopyButton component created with toast feedback
- [ ] SuccessBanner component created with localStorage persistence
- [ ] BookingManagementChoice component created with 2-card grid
- [ ] ShopOverviewCard component created with business type icon
- [ ] `/app` page updated to show dashboard sections
- [ ] Google Calendar placeholder page created
- [ ] `createShop` redirect updated to include `?created=true` param
- [ ] `pnpm lint && pnpm typecheck` passes
- [ ] Success banner appears and dismisses correctly
- [ ] Booking management cards link to correct pages
- [ ] Shop overview displays all information correctly
- [ ] Copy button copies to clipboard and shows toast
- [ ] Test Booking Page opens in new tab
- [ ] Mobile responsive verified (375px, 768px, 1024px)
- [ ] Keyboard navigation works for all interactive elements
- [ ] localStorage persistence works across sessions

---

## Related Documentation

- **Shaping:** `docs/shaping/post-onboarding-dashboard-shaping.md`
- **Design system:** `docs/shaping/landing-page-design-system.md` (base tokens)
- **Dependency:** `docs/shaping/slice-9-onboarding-v1-plan.md` (must be completed first)
- **Future:** Google Calendar integration (to be shaped separately)

---

## Quick Reference

**Success banner trigger:**
```tsx
// After createShop() in actions.ts
redirect("/app?created=true");

// Banner shows if:
// 1. URL has ?created=true
// 2. Shop ID not in localStorage dismissedBanners array
```

**Business type icon usage:**
```tsx
import { getBusinessTypeInfo } from "@/lib/business-types";

const { label, icon: Icon } = getBusinessTypeInfo(shop.businessType);

<Icon className="w-5 h-5 text-primary" />
<span>{label}</span>
```

**Copy button usage:**
```tsx
import { CopyButton } from "@/components/dashboard/copy-button";

<CopyButton
  text={fullBookingUrl}
  label="Copy Link"
/>
```
