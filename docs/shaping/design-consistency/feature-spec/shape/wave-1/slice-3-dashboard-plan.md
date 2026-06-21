# Slice 3 — Dashboard: Component Migration

**Spec:** #07 (Dashboard Components Forbidden Tokens)
**Files:** 5 components in `src/components/dashboard/`
**Depends on:** Slice 1 (needs `--al-status-neutral-*`, `--al-hairline-rest`, `--al-hairline-strong`, `--al-status-positive-border`)

---

## Master Token Mapping

This is the complete mapping for all 5 components, combining spec #07's table with spike A's extended mappings:

| Deep Ledger / Hardcoded | AL Replacement | Used in |
|---|---|---|
| `--color-border-default` | `--al-outline-variant` | shop-overview, booking-management, copy-button |
| `--color-surface-raised` | `--al-surface-container-lowest` | shop-overview, success-banner, booking-management |
| `--color-surface-base` | `--al-background` | shop-overview, copy-button, booking-management |
| `--color-text-primary` | `--al-on-surface` | all 5 components |
| `--color-text-secondary` | `--al-on-surface-variant` | shop-overview, copy-button |
| `--color-text-tertiary` | `--al-on-surface-variant` | shop-overview, success-banner, booking-management |
| `--color-text-inverse` | `--al-on-primary` | shop-overview |
| `--color-brand` | `--al-primary` | shop-overview, success-banner, copy-button, booking-management |
| `--color-brand-hover` | `--al-primary-container` | shop-overview |
| `--color-brand-border` | `--al-hairline-strong` (hover) | booking-management |
| `--color-surface-elevated` | `--al-surface-container-lowest` | copy-button |
| `--color-border-medium` | `--al-outline-variant` | copy-button |
| `--color-accent-amber` | `--al-status-caution` | booking-management |
| `--color-success` | `--al-status-positive` | success-banner |
| `--color-success-subtle` | `--al-status-positive-bg` | success-banner |
| `--color-success-border` | `--al-status-positive-border` | success-banner |
| `bg-amber-500/15 text-amber-300` | `bg-[var(--al-status-caution-bg)] text-[var(--al-status-caution)]` | confirmation-badge |
| `bg-emerald-500/15 text-emerald-300` | `bg-[var(--al-status-positive-bg)] text-[var(--al-status-positive)]` | confirmation-badge |
| `bg-rose-500/15 text-rose-300` | `bg-[var(--al-status-negative-bg)] text-[var(--al-status-negative)]` | confirmation-badge |
| `bg-white/10 text-text-light-muted` | `bg-[var(--al-status-neutral-bg)] text-[var(--al-status-neutral)]` | confirmation-badge |
| `ring-amber-500/30` | `ring-[var(--al-status-caution)]/30` | confirmation-badge |
| `ring-emerald-500/30` | `ring-[var(--al-status-positive)]/30` | confirmation-badge |
| `ring-rose-500/30` | `ring-[var(--al-status-negative)]/30` | confirmation-badge |

---

## Component 1: shop-overview-card.tsx

**File:** `src/components/dashboard/shop-overview-card.tsx`

This component uses inline `style=` attributes with `--color-*` tokens throughout. Replace every `style=` occurrence:

| Line | Current | Replacement |
|---|---|---|
| 20 | `border: "1px solid var(--color-border-default)", background: "var(--color-surface-raised)"` | `border: "1px solid var(--al-outline-variant)", background: "var(--al-surface-container-lowest)"` |
| 22 | `color: "var(--color-text-primary)"` | `color: "var(--al-on-surface)"` |
| 26 | `color: "var(--color-brand)"` | `color: "var(--al-primary)"` |
| 28 | `color: "var(--color-text-tertiary)"` | `color: "var(--al-on-surface-variant)"` |
| 29 | `color: "var(--color-text-primary)"` | `color: "var(--al-on-surface)"` |
| 34 | `color: "var(--color-text-tertiary)"` | `color: "var(--al-on-surface-variant)"` |
| 35 | `color: "var(--color-text-primary)"` | `color: "var(--al-on-surface)"` |
| 39 | `color: "var(--color-text-tertiary)"` | `color: "var(--al-on-surface-variant)"` |
| 44-45 | `color: "var(--color-text-primary)"`, `textDecorationColor: "var(--color-border-default)"` | `color: "var(--al-on-surface)"`, `textDecorationColor: "var(--al-outline-variant)"` |
| 44 | `hover:text-[var(--color-brand)]`, `focus-visible:ring-[var(--color-brand)]`, `ring-offset-[var(--color-surface-base)]` | `hover:text-[var(--al-primary)]`, `focus-visible:ring-[var(--al-primary)]`, `ring-offset-[var(--al-background)]` |
| 52 | `color: "var(--color-text-tertiary)"` | `color: "var(--al-on-surface-variant)"` |
| 53 | `color: "var(--color-text-primary)"` | `color: "var(--al-on-surface)"` |
| 54 | `color: "var(--color-text-secondary)"` | `color: "var(--al-on-surface-variant)"` |
| 58 | `color: "var(--color-text-tertiary)"` | `color: "var(--al-on-surface-variant)"` |
| 59 | `color: "var(--color-text-primary)"` | `color: "var(--al-on-surface)"` |
| 68-69 | `hover:bg-[var(--color-brand-hover)]`, `focus-visible:ring-[var(--color-brand)]`, `ring-offset-[var(--color-surface-base)]`, `background: "var(--color-brand)"`, `color: "var(--color-text-inverse)"` | `hover:bg-[var(--al-primary-container)]`, `focus-visible:ring-[var(--al-primary)]`, `ring-offset-[var(--al-background)]`, `background: "var(--al-primary)"`, `color: "var(--al-on-primary)"` |

---

## Component 2: confirmation-status-badge.tsx

**File:** `src/components/dashboard/confirmation-status-badge.tsx`

Replace the `STATUS_STYLES` map (lines 8-28):

```tsx
// FROM:
const STATUS_STYLES: Record<ConfirmationStatus, { label: string; className: string }> = {
  none: {
    label: "None",
    className: "bg-white/10 text-text-light-muted",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  },
  expired: {
    label: "Expired",
    className: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  },
};

// TO:
const STATUS_STYLES: Record<ConfirmationStatus, { label: string; className: string }> = {
  none: {
    label: "None",
    className: "bg-[var(--al-status-neutral-bg)] text-[var(--al-status-neutral)]",
  },
  pending: {
    label: "Pending",
    className: "bg-[var(--al-status-caution-bg)] text-[var(--al-status-caution)] ring-1 ring-[var(--al-status-caution)]/30",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-[var(--al-status-positive-bg)] text-[var(--al-status-positive)] ring-1 ring-[var(--al-status-positive)]/30",
  },
  expired: {
    label: "Expired",
    className: "bg-[var(--al-status-negative-bg)] text-[var(--al-status-negative)] ring-1 ring-[var(--al-status-negative)]/30",
  },
};
```

---

## Component 3: success-banner.tsx

**File:** `src/components/dashboard/success-banner.tsx`

Replace all `--color-*` token references in the JSX (lines 77-99):

| Line | Current token | Replacement |
|---|---|---|
| 82 | `--color-success-border` (border) | `--al-status-positive-border` |
| 82 | `--color-success-subtle` (background) | `--al-status-positive-bg` |
| 85 | `--color-success` (icon color) | `--al-status-positive` |
| 86 | `--color-text-primary` (text color) | `--al-on-surface` |
| 93 | `hover:text-[var(--color-text-primary)]` | `hover:text-[var(--al-on-surface)]` |
| 93 | `focus-visible:ring-[var(--color-brand)]` | `focus-visible:ring-[var(--al-primary)]` |
| 93 | `ring-offset-[var(--color-surface-base)]` | `ring-offset-[var(--al-background)]` |
| 94 | `--color-text-tertiary` (dismiss button color) | `--al-on-surface-variant` |

---

## Component 4: copy-button.tsx

**File:** `src/components/dashboard/copy-button.tsx`

Replace tokens in the button element (lines 48-49):

| Line | Current | Replacement |
|---|---|---|
| 48 | `hover:bg-[var(--color-surface-elevated)]` | `hover:bg-[var(--al-surface-container-lowest)]` |
| 48 | `focus-visible:ring-[var(--color-brand)]` | `focus-visible:ring-[var(--al-primary)]` |
| 48 | `ring-offset-[var(--color-surface-base)]` | `ring-offset-[var(--al-background)]` |
| 49 | `--color-border-medium` (border) | `--al-outline-variant` |
| 49 | `--color-text-primary` (text color) | `--al-on-surface` |

---

## Component 5: booking-management-choice.tsx

**File:** `src/components/dashboard/booking-management-choice.tsx`

Replace all `--color-*` tokens throughout the JSX:

| Line(s) | Current token | Replacement |
|---|---|---|
| 8, 23, 52 | `--color-border-default` (card borders) | `--al-outline-variant` |
| 8, 23, 52 | `--color-surface-raised` / `--color-surface-base` (backgrounds) | `--al-surface-container-lowest` / `--al-background` |
| 11, 29, 57 | `--color-text-primary` (headings) | `--al-on-surface` |
| 14, 34, 60 | `--color-text-tertiary` (descriptions) | `--al-on-surface-variant` |
| 22, 51 | `hover:border-[var(--color-brand-border)]` | `hover:border-[var(--al-hairline-strong)]` |
| 22, 51 | `focus-visible:ring-[var(--color-brand)]` | `focus-visible:ring-[var(--al-primary)]` |
| 22, 51 | `ring-offset-[var(--color-surface-base)]` | `ring-offset-[var(--al-background)]` |
| 27, 56 | `--color-brand` (icon colors) | `--al-primary` |
| 30 | `--color-accent-amber` ("Recommended" text) | `--al-status-caution` |
| 39, 65 | `--color-brand` (link text) | `--al-primary` |
| 76 | `--color-text-secondary` (footer text) | `--al-on-surface-variant` |

---

## Self-testing

1. **Grep for forbidden tokens across all 5 files:**
   ```bash
   grep -r '\-\-color-\|bg-amber-\|bg-emerald-\|bg-rose-\|bg-white/10\|text-amber-\|text-emerald-\|text-rose-\|text-text-light-muted\|ring-amber-\|ring-emerald-\|ring-rose-' \
     src/components/dashboard/shop-overview-card.tsx \
     src/components/dashboard/confirmation-status-badge.tsx \
     src/components/dashboard/success-banner.tsx \
     src/components/dashboard/copy-button.tsx \
     src/components/dashboard/booking-management-choice.tsx
   ```
   Expected: zero matches.

2. **Grep for AL tokens to confirm replacements landed:**
   ```bash
   grep -c '\-\-al-' \
     src/components/dashboard/shop-overview-card.tsx \
     src/components/dashboard/confirmation-status-badge.tsx \
     src/components/dashboard/success-banner.tsx \
     src/components/dashboard/copy-button.tsx \
     src/components/dashboard/booking-management-choice.tsx
   ```
   Expected: non-zero count in each file.

3. **Build check:** Run `pnpm build` — must complete with zero errors.

4. **Type check:** Run `pnpm tsc --noEmit` — zero type errors (string changes only).

5. **Visual smoke test on dashboard:** Start dev server, navigate to `/app` (dashboard). Verify:
   - **Shop overview card:** White card background, dark text, navy brand color for CTA button, booking URL link in dark text
   - **Confirmation badges:** Pending = warm amber tint, Confirmed = green tint, Expired = rose tint, None = neutral gray. All on light backgrounds (not dark-theme transparent overlays)
   - **Success banner** (add `?created=true` to URL): Green-tinted background with green checkmark, dark text, dismiss X in muted gray
   - **Copy button:** Light background, gray border, dark text. Hover shows slight background shift
   - **Booking management cards:** White card backgrounds, neutral borders, navy icons and link text. "Recommended" badge shows amber/caution text. Hover border strengthens (gray, not teal-tinted)

6. **Dependency verification:** Confirm these tokens exist in globals.css (should be added by Slice 1):
   ```bash
   grep '\-\-al-status-neutral-bg\|--al-status-neutral:\|--al-hairline-rest\|--al-hairline-strong\|--al-status-positive-border' src/app/globals.css
   ```
   Expected: 5 matches. If any are missing, Slice 1 was not applied first.
