# Spike C: Booking Component Full Scan

**Date:** 2026-06-19
**Status:** RESOLVED

## Findings

### File Existence

All 6 files from Spec #08 exist:

| # | Path | Exists |
|---|------|--------|
| 1 | `src/components/booking/booking-form.tsx` | Yes |
| 2 | `src/components/booking/service-selector.tsx` | Yes |
| 3 | `src/components/services/event-type-list.tsx` | Yes |
| 4 | `src/components/services/event-type-form.tsx` | Yes |
| 5 | `src/components/manage/manage-booking-view.tsx` | Yes |
| 6 | `src/components/conflicts/conflict-alert-banner.tsx` | Yes |

### Token Audit by File

#### 1. `booking-form.tsx` (16 unique `--color-*` tokens, heaviest user)

| Token | Lines |
|-------|-------|
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

#### 2. `service-selector.tsx` (6 unique tokens)

| Token | Lines |
|-------|-------|
| `--color-border-default` | 65 |
| `--color-brand` | 48, 56, 127 |
| `--color-brand-hover` | 53 |
| `--color-surface-raised` | 64 |
| `--color-text-primary` | 100 |
| `--color-text-secondary` | 106, 119 |

#### 3. `event-type-list.tsx` (16 unique tokens)

| Token | Lines |
|-------|-------|
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

#### 4. `event-type-form.tsx` (11 unique tokens)

| Token | Lines |
|-------|-------|
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

#### 5. `manage-booking-view.tsx` (19 unique tokens -- most variety)

| Token | Lines |
|-------|-------|
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

#### 6. `conflict-alert-banner.tsx` (1 unique token)

| Token | Lines |
|-------|-------|
| `--color-text-primary` | 99 (in Tailwind arbitrary: `hover:text-[var(--color-text-primary)]`) |

### Unmapped Tokens

The following tokens appear in the 6 files but are **NOT** covered by the Spec #07 mapping table:

| Unmapped Token | Used In |
|----------------|---------|
| `--color-brand-dim` | booking-form.tsx, event-type-form.tsx |
| `--color-surface-overlay` | booking-form.tsx, event-type-form.tsx, manage-booking-view.tsx |
| `--color-surface-void` | booking-form.tsx, event-type-list.tsx, event-type-form.tsx |
| `--color-error` | booking-form.tsx, event-type-list.tsx, event-type-form.tsx, manage-booking-view.tsx |
| `--color-error-border` | booking-form.tsx, event-type-list.tsx, manage-booking-view.tsx |
| `--color-error-subtle` | booking-form.tsx, event-type-list.tsx, manage-booking-view.tsx |
| `--color-success` | booking-form.tsx, manage-booking-view.tsx |
| `--color-success-border` | booking-form.tsx, manage-booking-view.tsx |
| `--color-success-subtle` | booking-form.tsx, manage-booking-view.tsx |
| `--color-warning` | event-type-list.tsx, manage-booking-view.tsx |
| `--color-warning-border` | event-type-list.tsx, manage-booking-view.tsx |
| `--color-warning-subtle` | event-type-list.tsx, manage-booking-view.tsx |
| `--color-border-subtle` | event-type-list.tsx, manage-booking-view.tsx |

**13 tokens lack AL mappings.** These fall into 4 categories:

1. **Status colors** (error, success, warning -- 9 tokens): need `--al-status-*` equivalents
2. **Surface variants** (`--color-surface-overlay`, `--color-surface-void` -- 2 tokens): need AL surface equivalents
3. **Brand variant** (`--color-brand-dim` -- 1 token): needs an AL primary dim/muted equivalent
4. **Border variant** (`--color-border-subtle` -- 1 token): needs an AL hairline equivalent

### CSS Class Verification

**`.al-service-card`** -- EXISTS at `globals.css` line 646:
```css
.al-service-card {
  background: var(--al-surface-container-low);
  border-radius: var(--al-radius-lg);
  padding: 1.25rem 1.5rem;
  transition: background var(--duration-fast) ease;
}
.al-service-card:hover {
  background: var(--al-surface-container);
}
```

**`.service-card`** (legacy) -- EXISTS at `globals.css` line 577:
```css
.service-card {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-default);
  ...
}
```
The legacy class uses `--color-surface-raised` and `--color-border-default` -- both forbidden tokens. It also has `:hover` using `--color-surface-elevated` and `--color-brand-border`.

**Usage:** `service-selector.tsx` uses `className="service-card"` at line 94 and `className="service-card-arrow"` at line 126. These need to switch to `al-service-card` equivalents.

### AL Token Availability

All 11 replacement tokens from the Spec #07 mapping table are defined in `globals.css`:

| AL Token | Defined | Line |
|----------|---------|------|
| `--al-outline-variant` | Yes | 349 |
| `--al-ghost-border` | Yes | 368 |
| `--al-surface-container-lowest` | Yes | 334 |
| `--al-surface-container` | Yes | 336 |
| `--al-background` | Yes | 328 |
| `--al-on-surface` | Yes | 343 |
| `--al-on-surface-variant` | Yes | 344 |
| `--al-primary` | Yes | 297 |
| `--al-hairline-strong` | Yes | 439 |
| `--al-hairline-rest` | Yes | 438 |
| `--al-primary-container` | Yes | 298 |

All mapped tokens are available -- no blockers for the mapped subset.

### Hardcoded Values

#### Hardcoded hex colors in Stripe Elements theme (`booking-form.tsx` lines 115-150)

These are intentional -- they configure the Stripe Elements appearance object and cannot use CSS custom properties:
- `#1d2738` (background, input bg)
- `#edf2f7` (text, tab selected color)
- `#f45878` (danger)
- `#3dd4c8` (focus border, tab selected border)
- `#161e2c` (tab bg, block bg)
- `#8aa2bc` (label, tab text)
- `rgba(255,255,255,0.11)` (input/tab border)
- `rgba(61,212,200,0.14)` (focus shadow)
- `rgba(255,255,255,0.07)` (block border)

**Note:** These are Deep Ledger dark-theme colors baked into the Stripe theme. They will need a separate Stripe-theme migration pass or parameterization, but are not CSS token swaps.

#### Hardcoded rgba values in component styles (`booking-form.tsx`)

- `rgba(195,198,209,0.50)` at lines 1132, 1203, 1231, 1266, 1299, 1329, 1357 -- this matches `--al-hairline-strong` and should use that token
- `rgba(0,30,64,0.08)` at line 1208 -- this matches `--color-brand-subtle` / the mapping note for `rgba(0, 30, 64, 0.08)`

#### Hardcoded rgba in `conflict-alert-banner.tsx`

- `rgba(201,122,42,0.25)` at line 76 -- caution/warning border color, currently not tokenized

#### Forbidden Tailwind classes (`booking-form.tsx` lines 882-939, success confirmation block)

- `text-white` at lines 887, 894, 899, 908
- `bg-bg-dark-secondary/70` at line 882
- `bg-bg-dark` at line 906
- `border-white/10` at lines 882, 906
- `text-primary-light` at line 884
- `text-text-light-muted` at lines 890, 909, 934

These are dark-themed custom Tailwind classes used in the booking success confirmation UI. They are not `--color-*` tokens but are still non-AL legacy classes that need migration.

## Conclusion

**Scope:** All 6 files exist and contain forbidden `--color-*` tokens. The total count of unique legacy tokens across all files is **28**, of which **15 are covered** by the Spec #07 mapping table and **13 are not**.

**Gaps that block a clean migration:**

1. **13 unmapped tokens** need AL equivalents defined before migration can proceed. The largest categories are status colors (error/success/warning -- 9 tokens) and surface variants (overlay/void -- 2 tokens).

2. **Stripe Elements theme** in `booking-form.tsx` (lines 115-150) uses hardcoded hex colors that cannot be swapped to CSS variables without a separate approach (e.g., JS-side token resolution).

3. **Dark-themed success block** in `booking-form.tsx` (lines 880-940) uses non-token Tailwind classes (`text-white`, `bg-bg-dark`, etc.) that are outside the `--color-*` scope but still need AL migration.

4. **Hardcoded `rgba` values** in `booking-form.tsx` (7 instances of `rgba(195,198,209,0.50)`) should use `--al-hairline-strong` instead.

5. **`.service-card` to `.al-service-card`** class swap is confirmed needed in `service-selector.tsx` (line 94). The `.al-service-card` class is ready at `globals.css:646`.

**No blockers for the 15 mapped tokens** -- all AL replacements are defined in `globals.css`. The migration for the mapped subset can proceed immediately. The 13 unmapped tokens need AL equivalents added to `globals.css` first (recommend extending Spec #07).
