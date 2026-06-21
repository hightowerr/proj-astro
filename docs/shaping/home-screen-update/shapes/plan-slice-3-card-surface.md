# Plan: Slice 3 — Card Surface & Elevation

**Slice:** `docs/shaping/home-screen-ds-conformance-slices.md` → Slice 3
**Specs:** #2 (Terracotta Card Background), #5 (Card Radius Below Spec), #6 (Non-Token Shadows + Hover-Lift)
**File:** `src/components/dashboard/atelier-dashboard.tsx`

---

## Steps

### 1. Fix card radius — all cards from `rounded-2xl` to `rounded-3xl` (Spec #5)

Find every `rounded-2xl` on card/sheet-level elements and change to `rounded-3xl`. Affected locations:

- Calendar sync card (line ~113): `rounded-2xl` → `rounded-3xl`
- Book first client card (line ~143): `rounded-2xl` → `rounded-3xl`
- Essentials cards (line ~182): `rounded-2xl` → `rounded-3xl`
- Public booking link card (line ~267): `rounded-2xl` → `rounded-3xl`

**Keep** `rounded-xl` on buttons, icon tiles, and controls — those stay at 10-12px per the DS ladder.

### 2. Fix shadows — bespoke values to `--al-shadow-float` (Spec #6)

Replace all bespoke shadow values with the DS float token:

| Location | Current | New |
|----------|---------|-----|
| Calendar sync card (line ~113) | `shadow-[0px_10px_30px_rgba(26,28,27,0.04)]` | `shadow-[var(--al-shadow-float)]` |
| Public booking card (line ~267) | `shadow-[0px_10px_30px_rgba(26,28,27,0.03)]` | `shadow-[var(--al-shadow-float)]` |

### 3. Remove hover-lift and scale animations (Spec #6)

Remove these classes/effects:

| Location | Remove |
|----------|--------|
| Essentials cards (line ~185) | `hover:shadow-[0px_12px_32px_rgba(74,40,20,0.1)]` |
| Essentials cards (line ~185) | `hover:shadow-[0px_12px_32px_rgba(0,30,64,0.1)]` |
| Essentials cards (line ~182) | `transition-shadow` |
| Icon tiles (line ~190, ~208) | `transition-transform duration-200 group-hover:scale-110` |
| Hero watermark (line ~114) | `transition-opacity group-hover:opacity-[0.065]` (keep base opacity) |
| Connect Now button (line ~134) | `transition-transform hover:-translate-y-0.5` |
| Open Booking Page button (line ~287) | `transition-transform hover:-translate-y-0.5` |
| Book first client chevron (line ~160) | `transition-transform group-hover:translate-x-1` |

**Replace card hover with sanctioned background-shift:**
```tsx
// Essentials cards: replace hover:shadow with hover:bg
hover:bg-[var(--al-surface-container)]
```

For the Book first client card, it already uses `hover:bg-al-surface-lowest` which is acceptable — keep it.

### 4. Restructure Team card — remove terracotta background (Spec #2)

The Team card (essentials array, `tone === "tertiary"` branch) currently uses:
- `bg-[#fff8f5]` → change to `bg-al-surface-lowest` (white, same as other cards)
- `border-[#ffdbcf]/50` → change to `border-al-surface-container-low` (same as other cards)
- `hover:shadow-[0px_12px_32px_rgba(74,40,20,0.1)]` → remove (already handled in step 3)
- `text-[#74584f]` on title → change to `text-al-primary` (navy, same as other cards)
- `text-[#9a6f64]` on description → change to `text-al-on-surface-variant` (same as other cards)
- Icon tile `bg-white/60` → change to `bg-al-surface-container` (same as other cards)
- Icon `text-[#74584f]` → remove (inherit from parent, navy)
- Avatar borders `border-[#fff8f5]` → change to `border-white` or `border-al-surface-lowest`

**Keep terracotta on avatars only** — the `bg-[#fdd8cb]` on the avatar circles is a legitimate avatar use per Brand Law #3. Keep `text-[#74584f]` on avatar initials (it's the on-secondary-container token).

**Simplification opportunity:** After this fix, the `tone === "tertiary"` branch of the essentials rendering can likely be merged with the default branch since both now use the same card surface. The only difference remaining is the avatar cluster vs single icon tile — keep the conditional for that structural difference, but unify the color/surface classes.

---

## Self-testing

1. **No `rounded-2xl` on cards:**
   ```bash
   grep "rounded-2xl" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: 0 matches (or only on non-card elements like buttons if any remain).

2. **No bespoke shadows:**
   ```bash
   grep "shadow-\[0px" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: 0 matches.

3. **No hover-lift or scale:**
   ```bash
   grep -E "hover:shadow|hover:-translate|group-hover:scale" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: 0 matches.

4. **No terracotta on card surface:**
   ```bash
   grep -E "fff8f5|ffdbcf.*50|9a6f64" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: 0 matches for bg/border uses. `#fdd8cb` should still appear only on avatar elements.

5. **Visual check:** Open the dashboard. All cards should:
   - Have the same white background and rounded-3xl corners
   - Show the soft float shadow (not elevated)
   - On hover, show a subtle background shift (not a shadow lift)
   - Team card avatars should still have terracotta gradient backgrounds
