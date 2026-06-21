# Plan: Slice 4 — Typography & Color Tokens

**Slice:** `docs/shaping/home-screen-ds-conformance-slices.md` → Slice 4
**Specs:** #3 (Off-Palette Status Pill), #4 (Numbers Not in Mono), #8 (Hero Title Oversized), #9 (Eyebrow Tracking), #10 (Dividers Wrong Token)
**File:** `src/components/dashboard/atelier-dashboard.tsx`

---

## Steps

### 1. Fix hero title size (Spec #8)

Current (line ~91):
```tsx
<h1 className="mb-5 font-manrope text-5xl font-extrabold tracking-tight text-al-primary md:text-7xl">
```

Replace `text-5xl ... md:text-7xl` with the DS display cap:
```tsx
<h1 className="mb-5 font-manrope font-extrabold text-al-primary" style={{ fontSize: 'var(--al-display-lg)', letterSpacing: '-0.02em' }}>
```

This caps at 56px (`--al-display-lg`) and uses the DS display tracking (`-0.02em`). Remove the `md:text-7xl` breakpoint override entirely — the DS has no fluid type.

### 2. Normalize eyebrow tracking to 0.2em (Spec #9)

Find all `tracking-[0.28em]` and `tracking-[0.22em]` instances and replace with `tracking-[0.2em]`:

| Location | Current | New |
|----------|---------|-----|
| Hero eyebrow (line ~88) | `tracking-[0.28em]` | `tracking-[0.2em]` |
| Onboarding section header (line ~103) | `tracking-[0.28em]` | `tracking-[0.2em]` |
| Step pill (line ~106) | `tracking-[0.22em]` | `tracking-[0.2em]` |
| Book first client sub-label (line ~155) | `tracking-[0.22em]` | `tracking-[0.2em]` |
| Studio Essentials header (line ~171) | `tracking-[0.28em]` | `tracking-[0.2em]` |
| Public Booking Link header (line ~263) | `tracking-[0.28em]` | `tracking-[0.2em]` |

### 3. Fix status pill colors (Spec #3)

The "+14% This Month" pill (line ~237):
```tsx
// Before
<span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">

// After
<span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]"
  style={{ background: 'var(--al-status-positive-bg)', color: 'var(--al-status-positive)' }}>
```

The error pill (line ~233) using `bg-[#ffdad6] text-[#93000a]` maps to `--al-error-container` / `--al-on-error-container` — these are already correct semantic tokens. Leave as-is or optionally switch to `var()` for consistency.

### 4. Add mono font + tabular-nums to numeric data (Spec #4)

Add `font-mono tabular-nums` to these elements:

| Element | Content | Location |
|---------|---------|----------|
| Status pill positive | "+14% This Month" | line ~237 |
| Status pill error | "12 Items Low" | line ~233 |
| Step pill | "Step 1 of 2" | line ~106 |
| Booking URL | `{bookingUrl}` | line ~273 |

Example:
```tsx
// Before
<span className="rounded-full bg-[#ffdad6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#93000a]">
  {kicker}
</span>

// After (add font-mono tabular-nums)
<span className="rounded-full bg-[#ffdad6] px-3 py-1 font-mono tabular-nums text-[11px] font-bold uppercase tracking-[0.2em] text-[#93000a]">
  {kicker}
</span>
```

For the booking URL:
```tsx
// Before
<p className="break-all text-sm text-al-on-surface-variant">{bookingUrl}</p>

// After
<p className="break-all font-mono tabular-nums text-sm text-al-on-surface-variant">{bookingUrl}</p>
```

### 5. Fix dividers to use `--al-hairline` (Spec #10)

Find all `border-al-surface-container-high` on section dividers and replace:

| Location | Current | New |
|----------|---------|-----|
| Onboarding header (line ~102) | `border-b border-al-surface-container-high` | `border-b` + `style={{ borderColor: 'var(--al-hairline)' }}` |
| Studio Essentials header (line ~170) | `border-b border-al-surface-container-high` | Same |
| Public Booking Link header (line ~261) | `border-b border-al-surface-container-high` | Same |

Alternative (if `--al-hairline` is added to the Tailwind theme or a utility class exists):
```tsx
<div className="border-b" style={{ borderColor: 'var(--al-hairline)' }}>
```

---

## Self-testing

1. **No oversized title:**
   ```bash
   grep -E "text-5xl|text-7xl" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: 0 matches.

2. **Consistent eyebrow tracking:**
   ```bash
   grep "tracking-\[" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: all instances show `tracking-[0.2em]` only. No `0.28em` or `0.22em`.

3. **No Tailwind emerald classes:**
   ```bash
   grep "emerald" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: 0 matches.

4. **Mono on numerics:**
   ```bash
   grep "font-mono" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: at least 4 matches (one per numeric element).

5. **Divider token:**
   ```bash
   grep "al-surface-container-high" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: 0 matches (dividers now use `--al-hairline`).

6. **Visual check:** Open dashboard. Hero title should be noticeably smaller (~56px vs previous 72px). Eyebrow labels should look uniform. "+14%" pill should be green-on-green (not Tailwind emerald). Numeric data should render in the mono font. Divider lines should be nearly invisible hairlines.
