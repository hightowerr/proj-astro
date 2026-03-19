# Spike: `/app` Dashboard UI Review Fixes

## Context

The `/app` dashboard review surfaced a small set of recurring UI quality issues in the post-onboarding dashboard:

- interactive elements rely on hover but lack strong keyboard focus treatment
- dashboard cards use `transition-all`
- decorative icons are exposed to assistive tech
- app nav does not visually differentiate the active route enough
- shop details content is not hardened for long values
- heading copy is not aligned with the current UI content rule set

These are not architecture problems. They are surface-level quality gaps that should be fixed with a small, coherent pass rather than ad hoc tweaks.

## Goal

Define a low-risk implementation shape that:

1. fixes the review findings with minimal churn
2. standardizes the `/app` dashboard interaction patterns
3. avoids introducing a new design system layer for a handful of components
4. leaves the door open for broader dashboard cleanup later

## Questions

| # | Question |
|---|----------|
| **Q1** | How should focus treatment be standardized across links and buttons on `/app`? |
| **Q2** | What is the narrowest safe replacement for `transition-all`? |
| **Q3** | How should decorative icons be handled without making component code noisy? |
| **Q4** | What active-nav treatment fits the current dashboard without a redesign? |
| **Q5** | How should long shop names and booking URLs be handled? |
| **Q6** | Should these fixes be done as one pass or split into slices? |

---

## Investigation

### Q1: Focus Treatment

**Answer:** Use explicit `focus-visible` rings on all dashboard links and buttons that currently only respond to hover.

**Affected components:**
- `src/components/dashboard/booking-management-choice.tsx`
- `src/components/app/app-nav.tsx`
- `src/components/dashboard/shop-overview-card.tsx`
- `src/components/dashboard/copy-button.tsx`
- `src/components/dashboard/success-banner.tsx`

**Option A: Per-component class updates**

Add classes like:

```tsx
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-primary
focus-visible:ring-offset-2
focus-visible:ring-offset-bg-dark
```

**Pros**
- smallest change
- no new abstraction
- easy to verify in review

**Cons**
- repeats class strings
- pattern can drift later

**Option B: Introduce shared dashboard interactive class helper**

Create a small class helper in `src/lib` or a shared primitive wrapper for dashboard action links/buttons.

**Pros**
- centralizes behavior
- easier consistency later

**Cons**
- more abstraction than the current scope needs
- introduces refactor risk across mixed element types

**Recommendation:** Choose **Option A** now.

This is a targeted cleanup, not a component architecture problem. Repeating a small focus class set in 5 files is acceptable and keeps the change obvious.

### Q2: Replace `transition-all`

**Answer:** Restrict transitions to the properties actually changing.

**Current behavior in booking management cards:**
- border color changes
- shadow changes
- arrow icon translates
- text gap changes

**Shape:**
- card containers: `transition-[border-color,box-shadow]`
- arrow icons: keep `transition-transform`
- text row: either remove the gap animation or use a transform-only cue instead

**Option A: Minimal replacement**

Replace `transition-all` with:

```tsx
transition-[border-color,box-shadow]
```

and remove the gap animation from the CTA row.

**Option B: Keep the CTA motion**

Use transform on the arrow only and keep the text row static.

**Recommendation:** Use **Option B**.

The arrow shift already communicates interactivity. The `gap` animation is not worth keeping.

### Q3: Decorative Icons

**Answer:** Mark non-informational icons with `aria-hidden="true"`.

**Scope:**
- calendar/list icons in the choice cards
- arrow icons in card CTAs
- external-link icon in the test button
- copy/check icons in copy button
- close icon in banner dismiss button

**Rule:** If text next to the icon already conveys the meaning, hide the icon from assistive tech.

**Recommendation:** Apply the attribute inline. Do not introduce a custom icon wrapper for this pass.

### Q4: Active Navigation State

**Answer:** The nav needs a visible active treatment in addition to `aria-current`.

**Current issue:**
- active and inactive links are visually too similar
- state is available semantically but weak visually

**Option A: Stronger text + underline**

For active item:
- `text-white`
- `underline`
- `decoration-primary`

For inactive item:
- current muted treatment

**Option B: Pill treatment**

Use a rounded background for active item.

Example:

```tsx
rounded-md bg-white/10 text-white
```

**Pros**
- stronger scanability
- more clearly “selected”

**Cons**
- changes the dashboard nav look more noticeably

**Recommendation:** Choose **Option A**.

It strengthens the state without redesigning the nav.

### Q5: Long Content Handling

**Answer:** Harden the shop details card against long names and long slugs.

**Problems to guard against:**
- long `shopName` can overflow or create awkward wrapping
- booking URL path should remain breakable on small widths

**Shape:**
- add `break-words` to the shop name value
- keep the booking link `break-all`
- add `min-w-0` on flex rows that contain variable-length text

**Optional follow-up:**
- if business type labels can be long, apply the same treatment there

**Recommendation:** Add only the minimal hardening now:

- `break-words` for shop name
- `min-w-0` on the business type row text container if needed

### Q6: Delivery Shape

**Answer:** Implement as one small polish slice, not multiple independent tasks.

These issues are tightly related:
- accessibility semantics
- keyboard focus
- small interaction polish
- overflow resilience

Splitting them would create unnecessary review overhead.

---

## Proposed Shape

### A: Focus, Semantics, and Low-Risk Visual Polish

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | Add explicit `focus-visible` treatment to all dashboard links/buttons identified in review | |
| **A2** | Replace `transition-all` with property-specific transitions in booking management cards | |
| **A3** | Add `aria-hidden="true"` to decorative icons | |
| **A4** | Strengthen active state in `AppNav` with higher-contrast text + underline styling | |
| **A5** | Add long-content protection in `ShopOverviewCard` (`break-words`, `min-w-0` where needed) | |
| **A6** | Update dashboard heading copy to Title Case where it is a visible heading or CTA label | |

### B: Shared Interactive Primitive Pass

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **B1** | Create shared dashboard action link/button variants | |
| **B2** | Move focus and hover treatment into reusable abstractions | |
| **B3** | Normalize nav, cards, and action controls around those abstractions | |

**Not selected for now.**

This is reasonable later if the dashboard surface expands, but it is too much machinery for the current issue set.

---

## Fit Check

| Requirement | A | B |
|-------------|---|---|
| Fixes review findings directly | ✅ | ✅ |
| Low implementation risk | ✅ | ⚠️ |
| Minimal churn | ✅ | ⚠️ |
| Easy to verify visually | ✅ | ⚠️ |
| Creates reusable system | ⚠️ | ✅ |

**Selected:** Shape A

---

## Implementation Notes

### 1. Focus Ring Standard

Use one consistent focus recipe on dark surfaces:

```tsx
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-primary
focus-visible:ring-offset-2
focus-visible:ring-offset-bg-dark
```

For controls sitting on `bg-bg-dark-secondary`, use the same offset color unless it visually disappears. If it does, offset to the closer parent surface.

### 2. Motion Standard

Use:

```tsx
transition-[border-color,box-shadow]
duration-200
```

for cards, and:

```tsx
transition-transform
duration-200
```

for arrow icons.

Do not animate `gap`.

### 3. Active Nav Standard

Active item should have:

- `text-white`
- underline visible by default
- stronger decoration color than inactive hover state

Inactive item keeps muted text and hover underline.

### 4. Copy and Heading Adjustments

Update visible dashboard strings to match current rules:

- `How Do You Want to Manage Bookings?`

Do not do a repo-wide content normalization pass as part of this slice.

---

## Files Expected to Change

- `src/components/dashboard/booking-management-choice.tsx`
- `src/components/app/app-nav.tsx`
- `src/components/dashboard/shop-overview-card.tsx`
- `src/components/dashboard/copy-button.tsx`
- `src/components/dashboard/success-banner.tsx`

---

## Acceptance Criteria

1. All reviewed `/app` links and buttons show a visible keyboard focus state.
2. No `transition-all` remains in the booking management choice component.
3. Decorative icons in the reviewed dashboard components are hidden from assistive tech.
4. The active app nav item is visually distinct without relying on hover.
5. Long shop names wrap without breaking card layout on small screens.
6. The dashboard heading copy matches the chosen content style.

---

## Recommended Next Step

Implement Shape A as a single polish pass, then verify with:

```bash
pnpm lint
pnpm typecheck
```

If the dashboard grows more action surfaces after this, revisit Shape B and extract shared interactive primitives then.
