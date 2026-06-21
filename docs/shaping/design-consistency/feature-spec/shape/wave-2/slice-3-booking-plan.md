# Slice 3 — Booking Components: Token Migration

**Shape:** design-consistency-wave2-shape.md
**Spec:** #08
**Files:** 6 components across `booking/`, `services/`, `manage/`, `conflicts/`
**Risk:** Low
**Depends on:** Slice 1 (needs `--al-status-negative-border`, `--al-status-caution-border`)

---

## Master Token Mapping

Apply these substitutions across all 6 files. Every `var(--color-*)` reference in an inline `style={{}}` gets swapped per this table:

| # | Deep Ledger Token | AL Replacement |
|---|---|---|
| 1 | `--color-border-default` | `--al-outline-variant` |
| 2 | `--color-border-medium` | `--al-outline-variant` |
| 3 | `--color-border-subtle` | `--al-ghost-border` |
| 4 | `--color-surface-raised` | `--al-surface-container-lowest` |
| 5 | `--color-surface-overlay` | `--al-surface-container-low` |
| 6 | `--color-surface-void` | `--al-on-primary` |
| 7 | `--color-text-primary` | `--al-on-surface` |
| 8 | `--color-text-secondary` | `--al-on-surface-variant` |
| 9 | `--color-text-tertiary` | `--al-on-surface-variant` |
| 10 | `--color-brand` | `--al-primary` |
| 11 | `--color-brand-dim` | `--al-primary` |
| 12 | `--color-brand-border` | `--al-hairline-strong` (hover) / `--al-hairline-rest` (rest) |
| 13 | `--color-brand-hover` | `--al-primary-container` |
| 14 | `--color-brand-subtle` | `rgba(0, 30, 64, 0.08)` |
| 15 | `--color-success` | `--al-status-positive` |
| 16 | `--color-success-subtle` | `--al-status-positive-bg` |
| 17 | `--color-success-border` | `--al-status-positive-border` |
| 18 | `--color-error` | `--al-status-negative` |
| 19 | `--color-error-subtle` | `--al-status-negative-bg` |
| 20 | `--color-error-border` | `--al-status-negative-border` |
| 21 | `--color-warning` | `--al-status-caution` |
| 22 | `--color-warning-subtle` | `--al-status-caution-bg` |
| 23 | `--color-warning-border` | `--al-status-caution-border` |

Plus one class swap:
| Old Class | New Class |
|---|---|
| `className="service-card"` | `className="al-service-card"` |

---

## Per-File Steps

### File 1: `src/components/booking/booking-form.tsx`

**16 unique token types. Heaviest file.**

Apply the master mapping to all `var(--color-*)` inline style references. Key locations from spike:

| Token | Lines |
|---|---|
| `--color-border-default` | 296, 947, 965, 976 |
| `--color-border-medium` | 316 |
| `--color-brand` | 380, 399, 921, 932, 939, 992, 1392 |
| `--color-brand-border` | 399, 932, 939 |
| `--color-brand-dim` | 380, 1392 |
| `--color-error` | 358, 401, 406, 1005, 1011, 1385 |
| `--color-error-border` | 401, 1005, 1384 |
| `--color-error-subtle` | 401, 1005, 1384 |
| `--color-success` | 1109 |
| `--color-success-border` | 1108 |
| `--color-success-subtle` | 1108 |
| `--color-surface-overlay` | 316 |
| `--color-surface-raised` | 296, 947, 965, 976 |
| `--color-surface-void` | 381, 922, 993 |
| `--color-text-secondary` | 305, 309, 361, 981 |
| `--color-text-tertiary` | 317 |

**DO NOT TOUCH:**
- Stripe Elements appearance object (lines 115–150) — hardcoded hex, cannot use CSS vars
- Dark success block (lines 880–940) — uses Tailwind classes, not `--color-*` tokens. Already in current-issues.md
- Hardcoded `rgba(195,198,209,0.50)` (7 instances) — separate cleanup
- `var(--font-mono)` inline references — reads from `@theme`, not in scope

### File 2: `src/components/booking/service-selector.tsx`

**6 unique token types + class swap.**

| Token | Lines |
|---|---|
| `--color-border-default` | 65 |
| `--color-brand` | 48, 56, 127 |
| `--color-brand-hover` | 53 |
| `--color-surface-raised` | 64 |
| `--color-text-primary` | 100 |
| `--color-text-secondary` | 106, 119 |

**Class swap:** Line 94, `className="service-card"` → `className="al-service-card"`. Also check for `service-card-arrow` at line 126 — verify if an `.al-service-card-arrow` equivalent exists, or if arrow styling should be handled inline.

### File 3: `src/components/services/event-type-list.tsx`

**16 unique token types.**

| Token | Lines |
|---|---|
| `--color-border-default` | 117 |
| `--color-border-medium` | 95 |
| `--color-border-subtle` | 212 |
| `--color-brand` | 40, 170, 188 |
| `--color-brand-border` | 39, 169 |
| `--color-brand-subtle` | 38 |
| `--color-error` | 50, 204 |
| `--color-error-border` | 49 |
| `--color-error-subtle` | 48 |
| `--color-surface-raised` | 96, 118 |
| `--color-surface-void` | 189 |
| `--color-text-primary` | 126 |
| `--color-text-secondary` | 99, 141, 149, 155 |
| `--color-warning` | 45 |
| `--color-warning-border` | 44 |
| `--color-warning-subtle` | 43 |

### File 4: `src/components/services/event-type-form.tsx`

**11 unique token types.**

| Token | Lines |
|---|---|
| `--color-border-default` | 70, 191 |
| `--color-brand` | 69, 71, 255, 302 |
| `--color-brand-border` | 252 |
| `--color-brand-dim` | 302 |
| `--color-brand-subtle` | 249 |
| `--color-error` | 293 |
| `--color-surface-overlay` | 71, 190, 250 |
| `--color-surface-void` | 89, 303 |
| `--color-text-primary` | 97, 192, 229 |
| `--color-text-secondary` | 205, 256 |
| `--color-text-tertiary` | 205 |

### File 5: `src/components/manage/manage-booking-view.tsx`

**19 unique token types. Most variety.**

| Token | Lines |
|---|---|
| `--color-border-default` | 314, 393, 407, 444, 520 |
| `--color-border-subtle` | 482 |
| `--color-brand` | 231, 300, 372 |
| `--color-brand-border` | 230, 299 |
| `--color-brand-subtle` | 229 |
| `--color-error` | 218, 431, 565 |
| `--color-error-border` | 217 |
| `--color-error-subtle` | 216 |
| `--color-success` | 256, 432, 458, 499, 525 |
| `--color-success-border` | 255, 455, 490 |
| `--color-success-subtle` | 254, 454, 489 |
| `--color-surface-overlay` | 406 |
| `--color-surface-raised` | 313, 392, 443, 519 |
| `--color-text-primary` | 331, 343, 352, 360, 474 |
| `--color-text-secondary` | 291, 319, 330, 342, 351, 359, 361, 362, 369, 375, 380, 397, 420, 461, 471, 509, 528, 538, 550, 578 |
| `--color-text-tertiary` | 328, 332, 340, 349, 357, 367, 469, 475 |
| `--color-warning` | 244, 501 |
| `--color-warning-border` | 243, 494 |
| `--color-warning-subtle` | 242, 493 |

**DO NOT TOUCH:** `var(--font-mono)` inline references at lines 362, 372 — reads from `@theme`, not in scope.

### File 6: `src/components/conflicts/conflict-alert-banner.tsx`

**1 token type. Simplest file.**

| Token | Lines |
|---|---|
| `--color-text-primary` | 99 (Tailwind arbitrary: `hover:text-[var(--color-text-primary)]`) |

Replace: `hover:text-[var(--color-text-primary)]` → `hover:text-[var(--al-on-surface)]`

**DO NOT TOUCH:** Hardcoded `rgba(201,122,42,0.25)` at line 76 — separate cleanup, will be noted in current-issues.md.

---

## Execution Order

Given the volume, process files in this order (lightest to heaviest, building confidence):

1. `conflict-alert-banner.tsx` (1 token) — sanity check the pattern
2. `service-selector.tsx` (6 tokens + class swap) — quick, includes class swap verification
3. `event-type-form.tsx` (11 tokens)
4. `event-type-list.tsx` (16 tokens)
5. `booking-form.tsx` (16 tokens, largest file, most exclusions)
6. `manage-booking-view.tsx` (19 tokens, highest volume)

---

## Self-testing

### Per-file verification
After each file, run:
```bash
grep -c "color-border-default\|color-border-medium\|color-border-subtle\|color-surface-raised\|color-surface-overlay\|color-surface-void\|color-text-primary\|color-text-secondary\|color-text-tertiary\|color-brand\|color-brand-dim\|color-brand-border\|color-brand-hover\|color-brand-subtle\|color-success\|color-success-subtle\|color-success-border\|color-error\|color-error-subtle\|color-error-border\|color-warning\|color-warning-subtle\|color-warning-border" <file>
```
Expected result: **0** for all files except `booking-form.tsx` (where Stripe Elements hex and dark success block remain — those are not `--color-*` patterns).

### Whole-slice verification
```bash
# Should only find occurrences in @theme inline block of globals.css, NOT in component files
grep -rn "var(--color-" src/components/booking/ src/components/services/ src/components/manage/ src/components/conflicts/
```
Expected: 0 matches (excluding any hardcoded non-token strings).

### Class swap verification
```bash
grep -n "service-card" src/components/booking/service-selector.tsx
```
Expected: only `al-service-card` references, no bare `service-card`.

### Build verification
```bash
pnpm build
```
Expected: clean build, no errors.

### Visual spot-checks
1. **Booking page** (`/book/[slug]`) — form renders with AL light-theme colors: white cards, navy buttons, muted secondary text
2. **Service catalog** (dashboard → services) — event type list/form uses AL surfaces and borders
3. **Manage booking** (`/manage/[token]`) — cancellation/details view renders with AL status colors (green/amber/rose pills)
4. **Conflict banner** (visible when calendar conflicts exist) — hover state uses AL text color

### Known remaining non-AL artifacts (not regressions)
- Stripe Elements in booking-form.tsx still renders dark-themed (out of scope)
- Success confirmation block in booking-form.tsx still uses dark Tailwind classes (out of scope, tracked in current-issues.md)
- Hardcoded rgba hairlines in booking-form.tsx (out of scope)
