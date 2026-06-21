# Plan: Slice 7 — Hex-to-Token Swap

**Slice:** `hex-to-token-slices.md` → Slice 2
**Spec:** #11 (Scattered Hardcoded Hex)
**File:** `src/components/dashboard/atelier-dashboard.tsx`
**Prerequisite:** Slice 6 (theme mapping) must be applied first.

---

## Steps

### 1. Step pill (line ~113)

```tsx
// Before
<span className="rounded-full bg-[#ffdbcf] px-4 py-1.5 font-mono tabular-nums text-[11px] font-bold uppercase tracking-[0.2em] text-[#2a170f]">

// After
<span className="rounded-full bg-al-secondary-fixed px-4 py-1.5 font-mono tabular-nums text-[11px] font-bold uppercase tracking-[0.2em] text-al-on-secondary-fixed">
```

### 2. Book-first icon tile (line ~156)

```tsx
// Before
<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fdd8cb] text-[#785c53] md:h-14 md:w-14">

// After
<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-al-secondary-container text-al-on-secondary-container md:h-14 md:w-14">
```

### 3. Avatar initials — map callback (line ~203)

```tsx
// Before
className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#fdd8cb] text-[10px] font-extrabold text-[#74584f]"

// After
className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-al-secondary-container text-[10px] font-extrabold text-al-secondary"
```

### 4. Avatar initials — overflow "+2" (line ~208)

```tsx
// Before
<div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#fdd8cb] text-[10px] font-extrabold text-[#74584f]">

// After
<div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-al-secondary-container text-[10px] font-extrabold text-al-secondary">
```

### 5. Error pill (line ~229)

```tsx
// Before
<span className="rounded-full bg-[#ffdad6] px-3 py-1 font-mono tabular-nums text-[11px] font-bold uppercase tracking-[0.2em] text-[#93000a]">

// After
<span className="rounded-full bg-al-error-container px-3 py-1 font-mono tabular-nums text-[11px] font-bold uppercase tracking-[0.2em] text-al-on-error-container">
```

---

## Self-testing

1. **No hardcoded hex remaining:**
   ```bash
   grep -E '#[0-9a-fA-F]{6}' src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: 0 matches.

2. **All DS token utilities present:**
   ```bash
   grep -c "al-secondary-fixed\|al-on-secondary-fixed\|al-secondary-container\|al-on-secondary-container\|al-secondary\b\|al-error-container\|al-on-error-container" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: at least 10 matches (12 replacements, some tokens appear multiple times).

3. **No TypeScript errors:**
   ```bash
   pnpm tsc --noEmit 2>&1 | grep atelier-dashboard
   ```
   Expected: no errors.

4. **Visual regression check:** Open the dashboard (`/app`). Every element should look identical to before:
   - Step pill: warm peach background with dark brown text
   - Book-first icon tile: terracotta background with brown icon
   - Team card avatars: terracotta circles with brown initials
   - Error pill ("12 Items Low"): light red background with dark red text

   If any color appears different, the token mapping is wrong — cross-reference the hex ↔ token table in the slices doc.

5. **Computed style spot-check:** Inspect the Step pill in DevTools. `background-color` should compute to `rgb(255, 219, 207)` (= `#ffdbcf`). `color` should compute to `rgb(42, 23, 15)` (= `#2a170f`). These confirm the tokens resolve to the same values as the old hex.
