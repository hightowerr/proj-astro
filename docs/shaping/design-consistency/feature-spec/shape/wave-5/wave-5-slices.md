# Wave 5 — Spec #20: Dead Token Cleanup — Slices

**Shape:** A (Grep-verified incremental removal)  
**Date:** 2026-06-22

---

## Slice Grid

|  |  |
|:--|:--|
| **V1: COMPONENT MIGRATIONS**<br>⏳ PENDING<br><br>• booking-form.tsx: 4 --color-* → AL tokens<br>• event-type-list.tsx: inline .status-pill styles<br>• service-selector.tsx: fix .service-card-arrow hover<br>• `pnpm check` after slice<br><br>*Demo: Booking confirmation buttons use AL colors, status pills render identically, service card arrow animates on hover* | **V2: DEAD CODE REMOVAL**<br>⏳ PENDING<br><br>• Remove 48 dead token declarations<br>• Remove .dark {} block (30 lines)<br>• Remove 15 dead utility classes<br>• Add DEFERRED comment for retained tokens<br>• `pnpm check` + grep audit after slice<br><br>*Demo: globals.css shrunk by ~120 lines, grep confirms zero orphaned refs* |

---

## V1: Component Migrations

**Files:** 3  
**Parts:** A1, A2, A3

### Changes

**`src/components/booking/booking-form.tsx`** (A1)
- Line 921: `background: "var(--color-brand)"` → `background: "var(--al-primary)"`
- Line 922: `color: "var(--color-surface-void)"` → `color: "var(--al-on-primary)"`
- Line 932: `border: "1px solid var(--color-brand-border)"` → `border: "1px solid var(--al-outline-variant)"`
- Line 932: `color: "var(--color-brand)"` → `color: "var(--al-primary)"`
- Line 939: Same changes as line 932

**`src/components/services/event-type-list.tsx`** (A2)
- Line 56: Replace `className="status-pill"` with `className` containing inline Tailwind classes that replicate `.status-pill` layout: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.04em]`

**`src/components/booking/service-selector.tsx`** + **`src/app/globals.css`** (A3)
- In globals.css: Change `.service-card .service-card-arrow` → `.al-service-card .service-card-arrow`
- In globals.css: Change `.service-card:hover .service-card-arrow` → `.al-service-card:hover .service-card-arrow`

### Verification
- `pnpm check` passes
- Grep: zero `--color-` refs in booking-form.tsx
- Grep: zero `.status-pill` refs in src/components/
- Visual: service card arrow hover works

---

## V2: Dead Code Removal

**Files:** 1 (globals.css)  
**Parts:** A4, A5, A6, A7

### Changes

**Remove from `@theme inline`** (A4):
- Lines 15-21: `--color-surface-overlay`, `--color-surface-elevated`, `--color-surface-float` (keep void/base/raised for landing page)
- Lines 23-25: `--color-bg-dark-*` block
- Lines 33-35: `--color-text-muted`, `--color-text-light-muted`
- Lines 45-48: `--color-primary`, `--color-primary-light`, `--color-primary-dark`
- Lines 50-58: All `--color-accent-*` tokens
- Lines 60-79: All `--color-success/warning/error/info` tokens + compat aliases
- Lines 81-92: All `--color-tier-*` tokens
- Lines 95-99: `--color-border-subtle`, `--color-border-medium`, `--color-border-strong` (keep default/hairline for landing page)
- Lines 101-107: All `--shadow-*` tokens

**Remove `.dark {}` block** (A5):
- Lines 458-490

**Remove dead utility classes** (A6):
- Lines 519-522: `.font-display`, `.font-body`, `.font-mono`
- Lines 524-530: `.surface-*` utilities
- Lines 532-538: `.card-glass`
- Lines 540-543: `.glow-brand`
- Lines 545-555: `.skeleton`
- Lines 557-566: `.tier-dot*`
- Lines 569-579: `.status-pill`
- Lines 581-600: `.service-card` + `.service-card:hover` (but keep arrow rules under `.al-service-card` from V1)
- Lines 602-606: `.focus-brand`

**Add deferred comment** (A7):
- Wrap retained `--color-brand-*`, `--color-surface-*`, `--color-text-*`, `--color-border-*` tokens in a clearly labeled deferred block

### Verification
- `pnpm check` passes
- `rg "color-surface|color-text|color-brand|color-border|color-tier|color-accent" src/` returns only: landing page files + globals.css deferred block
- `rg "\.dark\s" src/app/globals.css` returns zero matches
- `rg "surface-void|surface-base|card-glass|glow-brand|skeleton|service-card[^-]|focus-brand|tier-dot|status-pill" src/` returns zero matches outside globals.css
