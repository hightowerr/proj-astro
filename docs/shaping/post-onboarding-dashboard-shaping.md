# Post-Onboarding Dashboard — Shaping

After shop owner completes initial setup (business type + name/slug), where should they land and what should they see?

---

## Source

> Once shop is set up what is the logical landing page? Should it be the shop page for now or should we integrate the astro calendar with the shops google calendar as an optional completion step?

> The shop needs a simple mvp way to see bookings which is why their astro bookings should be linked to google calendar as an optional

---

## Frame

### Problem

- Shop owner completes onboarding (business type + name + slug)
- Shop is technically "bookable" (has default hours 9-5, 60-min slots)
- Shop owner needs a way to **view/manage bookings**
- Current options:
  - Built-in appointments list at `/app/appointments` (exists)
  - Google Calendar integration (doesn't exist yet)
- After shop creation, currently redirects to `/app` showing basic shop details
- Unclear what shop owner should do next or how to manage bookings

### Outcome

- Shop owner understands their shop is created and ready
- Shop owner knows how to view/manage bookings (two clear paths)
- Shop owner can choose between Google Calendar or built-in list
- Shop owner can test booking flow and share booking link
- Clear next steps without forcing unnecessary setup

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| **R0** | Shop owner knows their shop is created and ready | Core goal |
| **R1** | Shop owner can view/manage their bookings | Must-have |
| **R2** | Shop owner can access their public booking page | Must-have |
| **R3** | Shop owner can optionally connect Google Calendar for auto-sync | Nice-to-have |
| **R4** | Shop owner knows next steps (test, share, customize) | Must-have |
| **R5** | Flow doesn't force unnecessary setup steps | Must-have |

---

## CURRENT: Existing Post-Creation Flow

| Part | Mechanism |
|------|-----------|
| **CURRENT1** | After shop creation (`createShop()`), redirect to `/app` |
| **CURRENT2** | `/app` shows shop details card: name, slug, booking link |
| **CURRENT3** | No indication of next steps or how to manage bookings |
| **CURRENT4** | `/app/appointments` page exists but user doesn't know about it |
| **CURRENT5** | No Google Calendar integration exists yet |
| **CURRENT6** | Default configuration: 9am-5pm (7 days), 60-min slots, UTC timezone |

**Gaps:**
- Shop owner doesn't know how to view bookings
- No prompt to test booking flow
- No clear next steps
- Built-in appointments list exists but is "hidden" (not surfaced)

---

## A: Dashboard with Booking Management Choice

Land on `/app` dashboard showing success + two clear paths for booking management.

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | **Success Banner** | |
| A1.1 | Show dismissible banner: "Your [Business Type] is ready to accept bookings!" | |
| A1.2 | Banner appears only on first visit after shop creation (use localStorage or query param) | |
| A1.3 | Dismiss button: onClick hides banner permanently | |
| **A2** | **Booking Management Choice Card** | |
| A2.1 | Heading: "How do you want to manage bookings?" | |
| A2.2 | Two options displayed side-by-side (grid: 2 cols desktop, 1 col mobile) | |
| A2.3 | Option 1: "Google Calendar (Recommended)" card | |
| A2.4 | Google Calendar card icon + title + description: "Auto-sync to your calendar" | |
| A2.5 | Google Calendar card CTA: "Connect Google Calendar" → `/app/settings/calendar` (future) | |
| A2.6 | Option 2: "Appointments List" card | |
| A2.7 | Appointments List card icon + title + description: "View in simple table view" | |
| A2.8 | Appointments List card CTA: "View Appointments" → `/app/appointments` | |
| A2.9 | Helper text below cards: "You can connect Google Calendar later in Settings" | |
| **A3** | **Shop Overview Card** | |
| A3.1 | Display business type icon + name (from onboarding) | |
| A3.2 | Show booking link: `/book/{slug}` (copyable) | |
| A3.3 | Show current hours: "Mon-Sun 9am-5pm" (from default settings) | |
| A3.4 | Show slot duration: "60 minutes" | |
| **A4** | **Action Buttons** | |
| A4.1 | "Test Booking Page" button: onClick → open `/book/{slug}` in new tab | |
| A4.2 | "Copy Link" button: onClick → copy full URL to clipboard + show toast "Link copied!" | |
| **A5** | **Layout & Styling** | |
| A5.1 | Use Trust & Authority design system (cyan/green palette) | |
| A5.2 | Cards use hover states (border-primary/50 + shadow) | |
| A5.3 | Responsive: stack vertically on mobile (<768px) | |

---

## B: Calendar Integration Prompt First

Land on `/app` with Google Calendar as primary/prominent CTA, appointments list as fallback.

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **B1** | **Success Banner** | |
| B1.1 | Show banner: "Your shop is ready to accept bookings!" | |
| **B2** | **Google Calendar Integration Card (Prominent)** | |
| B2.1 | Large card with heading: "Connect Google Calendar to manage bookings" | |
| B2.2 | Explanation: "New bookings automatically appear in your calendar" | |
| B2.3 | Primary CTA (large button): "Connect Google Calendar" | |
| B2.4 | Secondary CTA (text link): "Skip for now" → redirects to `/app/appointments` | |
| **B3** | **Shop Overview Card (Below)** | |
| B3.1 | Collapsed/smaller version of shop details | |
| B3.2 | Booking link, hours, test button | |

---

## C: Direct to Appointments Page

Redirect to `/app/appointments` immediately after shop creation.

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **C1** | **Redirect After Creation** | |
| C1.1 | After `createShop()` success, redirect to `/app/appointments` (not `/app`) | |
| **C2** | **Success Banner (on Appointments Page)** | |
| C2.1 | Sticky banner at top: "Your shop is ready! Share your booking link: /book/{slug}" | |
| C2.2 | Copy button in banner | |
| **C3** | **Empty State** | |
| C3.1 | Table is empty, show: "No bookings yet. Share your link to get started." | |
| C3.2 | Display booking link prominently in empty state | |
| **C4** | **Optional: Google Calendar Card** | |
| C4.1 | Show card above empty table: "Connect Google Calendar for auto-sync" | |

---

## Fit Check

| Req | Requirement | Status | A | B | C |
|-----|-------------|--------|---|---|---|
| R0 | Shop owner knows shop is ready | Core goal | ✅ | ✅ | ✅ |
| R1 | Shop owner can view/manage bookings | Must-have | ✅ | ⚠️ | ✅ |
| R2 | Shop owner can access booking page | Must-have | ✅ | ✅ | ⚠️ |
| R3 | Optional Google Calendar integration | Nice-to-have | ✅ | ✅ | ✅ |
| R4 | Shop owner knows next steps | Must-have | ✅ | ⚠️ | ⚠️ |
| R5 | Doesn't force unnecessary setup | Must-have | ✅ | ✅ | ✅ |

**Notes:**
- **A passes all must-haves** — balanced presentation, clear choice between calendar and list
- **B partial on R1** — appointments list is "hidden" behind "Skip for now" (user might not discover it)
- **B partial on R4** — focuses on calendar, doesn't show shop overview or other next steps prominently
- **C partial on R2** — booking page access not prominent (buried in banner or empty state)
- **C partial on R4** — laser-focused on appointments, misses celebration and overview

**Selected:** Shape A (Dashboard with Booking Management Choice)

---

## Rationale for Shape A

**Why A beats B and C:**

1. **Balanced presentation** — Both booking management options are equal citizens
   - Google Calendar recommended but not forced
   - Appointments list visible and accessible

2. **Celebrates completion** — Success banner confirms shop is ready

3. **Shows shop overview** — User sees what they created (business type, link, hours)

4. **Clear next steps** — Test booking page, copy link, manage bookings

5. **Respects user freedom (R5)** — Doesn't force calendar integration

6. **Doesn't hide features** — Built-in appointments list is discoverable (R1)

**Why not B:**
- Hides appointments list behind "Skip for now" link
- User might not realize they can view bookings without calendar
- Too focused on one path (calendar) at expense of other options

**Why not C:**
- Misses opportunity to celebrate completion
- Doesn't show shop overview (booking link, hours, business type)
- Too focused on one feature (appointments) without context

---

## Design Specifications

### Success Banner

```tsx
<div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
  <div className="flex items-center gap-2">
    <CheckCircle className="w-5 h-5 text-green-600" />
    <p className="text-sm font-medium text-green-900">
      Your Hair Salon is ready to accept bookings!
    </p>
  </div>
  <button onClick={dismissBanner} className="text-green-600 hover:text-green-700">
    <X className="w-4 h-4" />
  </button>
</div>
```

### Booking Management Choice Card

```
┌─────────────────────────────────────────────┐
│ How do you want to manage bookings?         │
│                                             │
│ ┌─────────────────┐  ┌──────────────────┐  │
│ │ 📅              │  │ 📋              │  │
│ │ Google Calendar │  │ Appointments    │  │
│ │ (Recommended)   │  │ List            │  │
│ │                 │  │                 │  │
│ │ Auto-sync       │  │ View in simple  │  │
│ │ bookings to     │  │ table view      │  │
│ │ your calendar   │  │                 │  │
│ │                 │  │                 │  │
│ │ [Connect →]     │  │ [View List →]   │  │
│ └─────────────────┘  └──────────────────┘  │
│                                             │
│ You can connect Google Calendar later       │
└─────────────────────────────────────────────┘
```

**Component specs:**
- Card grid: 2 columns (desktop), 1 column (mobile <768px)
- Card size: Equal height, min 200px
- Icons: Lucide React (Calendar, ClipboardList)
- Hover: border-primary/50 + shadow-md
- Border: 2px solid border-gray-200 (default)
- Padding: p-6
- Gap: gap-4

### Shop Overview Card

```
┌─────────────────────────────────────────────┐
│ Your shop details                           │
│                                             │
│ [Icon] Hair                                 │
│ 🔗 /book/my-salon                           │
│ ⏰ Mon-Sun 9am-5pm                          │
│ ⏱️  60 minute slots                         │
│                                             │
│ [Test Booking Page →]  [Copy Link]         │
└─────────────────────────────────────────────┘
```

**Component specs:**
- Business type: Display icon from onboarding (from mapping)
- Booking link: Monospace font, clickable
- Action buttons: Primary (Test) + Secondary (Copy)
- Copy button: Shows toast notification on success

---

## Implementation

**✅ READY TO BUILD** — See complete implementation plan:
**`docs/shaping/slice-10-dashboard-v1-plan.md`**

The slice document provides:
- Step-by-step implementation guide (8 steps)
- Complete component code (TypeScript + React)
- Success banner with localStorage persistence
- Booking management choice cards (Google Calendar + Appointments List)
- Shop overview card with business type icon mapping
- Copy button with clipboard API + toast feedback
- Google Calendar placeholder page
- Testing plan (automated + manual E2E)
- Accessibility checklist
- Mobile responsive verification

**Dependencies:**
- Requires Slice 9 (Onboarding) to be completed first
- Uses business type from onboarding flow
- Redirects from `createShop()` with `?created=true` param

---

**Related shaping:**
- **`docs/shaping/slice-10-dashboard-v1-plan.md`** - 🚀 **Implementation plan** (step-by-step guide with complete code)
- `docs/shaping/shop-owner-onboarding-shaping.md` — Initial onboarding flow (business type + name/slug)
- `docs/shaping/slice-9-onboarding-v1-plan.md` — Onboarding implementation (dependency)
- `docs/shaping/onboarding-flow-research.md` — UX research for multi-step flows
- `docs/shaping/landing-page-design-system.md` — Base design system (dark theme, teal/coral palette)
