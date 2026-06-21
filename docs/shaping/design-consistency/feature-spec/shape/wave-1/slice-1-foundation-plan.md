# Slice 1 — Foundation: Fonts + Tokens

**Specs:** #01 (Font Loading Cleanup) + #03 (Missing AL Tokens)
**Files:** `src/app/layout.tsx`, `src/app/globals.css`
**Depends on:** Nothing

---

## Step 1: Remove legacy fonts from layout.tsx

**File:** `src/app/layout.tsx`

1. Replace the import on line 1:
   ```tsx
   // FROM:
   import { Cormorant_Garamond, Bricolage_Grotesque, Fira_Code, Manrope } from "next/font/google";
   // TO:
   import { Manrope, JetBrains_Mono } from "next/font/google";
   ```

2. Delete the three legacy font constant blocks (lines 8-27):
   - `const cormorant = Cormorant_Garamond({ ... })`
   - `const bricolage = Bricolage_Grotesque({ ... })`
   - `const firaCode = Fira_Code({ ... })`

3. Add JetBrains_Mono constant (after the existing `manrope` const):
   ```tsx
   const jetbrainsMono = JetBrains_Mono({
     subsets: ["latin"],
     weight: ["400", "500", "600", "700"],
     variable: "--font-jetbrains-mono",
     display: "swap",
   });
   ```

4. Update the body className (line 63):
   ```tsx
   // FROM:
   className={`${cormorant.variable} ${bricolage.variable} ${firaCode.variable} ${manrope.variable} antialiased bg-background`}
   // TO:
   className={`${manrope.variable} ${jetbrainsMono.variable} antialiased bg-background`}
   ```

---

## Step 2: Repoint font stacks in globals.css @theme inline

**File:** `src/app/globals.css`, lines 10-12

```css
/* FROM: */
--font-display:  var(--font-cormorant), Georgia, 'Times New Roman', serif;
--font-body:     var(--font-bricolage), system-ui, -apple-system, sans-serif;
--font-mono:     var(--font-fira-code), 'Courier New', monospace;

/* TO: */
--font-display:  var(--font-manrope-raw), 'Manrope', system-ui, sans-serif;
--font-body:     var(--font-manrope-raw), 'Manrope', system-ui, sans-serif;
--font-mono:     var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace;
```

Line 13 (`--font-manrope`) stays unchanged.

---

## Step 3: Add --al-font-mono to AL tokens block

**File:** `src/app/globals.css`, after the existing `--al-font-label` line (~line 380)

```css
--al-font-mono:   var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace;
```

---

## Step 4: Add missing AL tokens to :root

**File:** `src/app/globals.css`, after the existing AL tokens section (after ~line 389, inside the existing `:root` block)

Add tokens organized by category, copying values from `docs/design-system/tokens/*.css`:

### Typography scale (from typography.css)
```css
/* ── Type scale ─────────────────────────────────────── */
--al-display-md:   2.75rem;   /* 44px — page title */
--al-display-sm:   2.25rem;   /* 36px — money figures */
--al-headline-lg:  2rem;      /* 32px */
--al-headline-md:  1.5rem;    /* 24px — section title */
--al-headline-sm:  1.25rem;   /* 20px */
--al-title-lg:     1.125rem;  /* 18px */
--al-title-md:     1rem;      /* 16px */
--al-title-sm:     0.875rem;  /* 14px */
--al-body-lg:      1.125rem;
--al-body-md:      1rem;
--al-body-sm:      0.875rem;
--al-label-lg:     0.875rem;
--al-label-md:     0.75rem;   /* 12px */
--al-label-sm:     0.6875rem; /* 11px — eyebrow */
--al-label-xs:     0.625rem;  /* 10px */
```

### Weight scale (from typography.css)
```css
/* ── Weights ────────────────────────────────────────── */
--al-w-light:    300;
--al-w-regular:  400;
--al-w-medium:   500;
--al-w-semibold: 600;
--al-w-bold:     700;
--al-w-extra:    800;
```

### Tracking (from typography.css)
```css
/* ── Tracking ───────────────────────────────────────── */
--al-track-pill:    0.16em;
--al-track-display: -0.025em;
--al-track-tight:   -0.01em;
```

### Spacing (from spacing.css)
```css
/* ── Spacing scale ──────────────────────────────────── */
--al-sp-1:  4px;
--al-sp-2:  8px;
--al-sp-3:  12px;
--al-sp-4:  16px;
--al-sp-5:  20px;
--al-sp-6:  24px;
--al-sp-8:  32px;
--al-sp-10: 40px;
--al-sp-12: 48px;
--al-sp-16: 64px;
--al-sp-20: 80px;
--al-sp-24: 136px;
```

### Layout (from spacing.css)
```css
/* ── Layout ─────────────────────────────────────────── */
--al-main-pad-x: 48px;
--al-main-pad-y: 32px;
--al-sidebar-w:  264px;
```

### Motion (from effects.css)
```css
/* ── Motion ─────────────────────────────────────────── */
--al-dur-instant: 0.12s;
--al-dur-fast:    0.15s;
--al-dur-normal:  0.25s;
--al-dur-slow:    0.30s;
```

### Additional effects (from effects.css)
```css
/* ── Effects ────────────────────────────────────────── */
--al-shadow-menu:  0px 20px 40px rgba(26, 28, 27, 0.10);
--al-shadow-mark:  0px 8px 18px rgba(0, 30, 64, 0.18);
--al-shadow-ring:  0 0 0 4px rgba(0, 30, 64, 0.08);
--al-hairline-rest:   rgba(195, 198, 209, 0.30);
--al-hairline-strong: rgba(195, 198, 209, 0.50);
```

### New token (from spike A)
```css
/* ── Status border (new — extends existing status token pattern) ── */
--al-status-positive-border: rgba(14, 122, 85, 0.20);
```

---

## Step 5: Update current-issues.md

**File:** `docs/context/current-issues.md`

1. Move "JetBrains Mono not loaded" (line 12) from Open to Solved with note: "Resolved by Wave 1 Slice 1 — JetBrains Mono loaded via next/font, `--font-mono` and `--al-font-mono` repointed."
2. Move "--al-hairline-strong and --al-shadow-ring tokens not in globals.css" (line 11) from Open to Solved with note: "Resolved by Wave 1 Slice 1 — both tokens added to globals.css :root."

---

## Self-testing

1. **Build check:** Run `pnpm build` — must complete with zero errors. Font removal should reduce bundle size (3 fewer Google Font requests).

2. **Token existence check:** Run a grep to verify all new tokens are declared:
   ```bash
   grep -c '\-\-al-display-md\|--al-w-light\|--al-sp-1\|--al-dur-fast\|--al-shadow-menu\|--al-hairline-rest\|--al-font-mono\|--al-status-positive-border' src/app/globals.css
   ```
   Expected: 8 matches (one per representative token from each category).

3. **Font variable check:** Verify JetBrains Mono variable is injected:
   ```bash
   grep 'font-jetbrains-mono' src/app/layout.tsx src/app/globals.css
   ```
   Expected: matches in both files.

4. **No stale font references:** Verify removed fonts are gone:
   ```bash
   grep -r 'font-cormorant\|font-bricolage\|font-fira-code' src/
   ```
   Expected: zero matches.

5. **Visual smoke test:** Start dev server (`pnpm dev`), navigate to dashboard. Verify:
   - Body text renders in Manrope (not Bricolage/system-ui)
   - Monospace elements (booking URL, stat pills) render in JetBrains Mono (not Fira Code — check via browser DevTools computed font)
   - No FOIT (flash of invisible text) — `display: swap` should prevent this

6. **Type check:** Run `pnpm tsc --noEmit` — zero type errors (font const names changed but types are inferred).
