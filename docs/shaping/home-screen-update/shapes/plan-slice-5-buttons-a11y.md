# Plan: Slice 5 — Buttons & Accessibility

**Slice:** `docs/shaping/home-screen-ds-conformance-slices.md` → Slice 5
**Specs:** #7 (Flat Navy Buttons), #12 (Buttons Lack Focus Ring)
**File:** `src/components/dashboard/atelier-dashboard.tsx`

---

## Steps

### 1. Apply gradient CTA + CTA shadow to primary buttons (Spec #7)

Two primary buttons need the DS treatment:

**"Connect Now" button (line ~132-137):**
```tsx
// Before
className="... bg-al-primary ... shadow-[0px_8px_24px_rgba(0,30,64,0.28)] transition-transform hover:-translate-y-0.5 ..."

// After
className="... ..."
style={{ background: 'var(--al-gradient-cta)', boxShadow: 'var(--al-shadow-cta)' }}
```

Remove: `bg-al-primary`, `shadow-[0px_8px_24px_rgba(0,30,64,0.28)]`, `transition-transform`, `hover:-translate-y-0.5`
Keep: `rounded-xl`, `px-7 py-4`, `text-base font-bold text-white`, layout classes

**"Open Booking Page" button (line ~285-290):**
```tsx
// Before
className="... bg-al-primary ... transition-transform hover:-translate-y-0.5"

// After
className="... ..."
style={{ background: 'var(--al-gradient-cta)', boxShadow: 'var(--al-shadow-cta)' }}
```

Remove: `bg-al-primary`, `transition-transform`, `hover:-translate-y-0.5`
Keep: `rounded-xl`, `px-5 py-3.5`, `text-sm font-bold text-white`, layout classes

### 2. Add focus-visible ring to all interactive elements (Spec #12)

Add this focus ring class string to every `<button>`, `<Link>`, and clickable element in the dashboard:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,30,64,0.12)] focus-visible:ring-offset-2
```

Or use the token (once added in Slice 1):
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
```
with `style` including `--tw-ring-color: var(--al-focus-ring)` — but since `--al-focus-ring` is a box-shadow value (not a color), use the raw rgba value in the Tailwind arbitrary class.

**Actually:** `--al-focus-ring` is defined as `0 0 0 3px rgba(0, 30, 64, 0.12)` — a full box-shadow, not just a color. For Tailwind's `ring-*` utilities, we need just the color. Use the rgba directly:

```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,30,64,0.12)] focus-visible:ring-offset-2
```

**Affected elements:**

| Element | Location | Notes |
|---------|----------|-------|
| "Connect Now" `<Link>` | line ~132 | Primary CTA |
| "Book Your First Client" `<Link>` | line ~143 | Card-level link |
| Essentials card `<Link>` (x3) | line ~179 | Card-level links |
| "Open Booking Page" `<Link>` | line ~284 | Primary CTA |
| "Copy Booking Link" `<button>` | line ~292 | Ghost button |

### 3. Remove remaining hover-translate on "View Appointments" text

The "View Appointments" inline text (line ~160) has `transition-transform group-hover:translate-x-1`. Remove both classes — motion should be "deliberately still" per Brand Law #12.

---

## Self-testing

1. **No flat navy buttons:**
   ```bash
   grep "bg-al-primary" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: 0 matches on button/link elements. (May still appear on text color — that's fine.)

2. **Gradient CTA present:**
   ```bash
   grep "al-gradient-cta\|al-shadow-cta" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: at least 2 matches each (one per primary button).

3. **Focus rings on all interactive elements:**
   ```bash
   grep -c "focus-visible:ring" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: at least 6 matches (one per interactive element).

4. **No hover-translate remaining:**
   ```bash
   grep -E "hover:-translate|hover:translate" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: 0 matches.

5. **Keyboard navigation test:** Open the dashboard in browser. Press Tab repeatedly. Every button and link should show a visible navy-tinted focus ring (2px, with 2px offset). The ring should only appear on `focus-visible` (keyboard), not on mouse click.

6. **Visual check:** "Connect Now" and "Open Booking Page" buttons should show a subtle navy gradient (not flat) with a softer shadow underneath. They should NOT lift on hover.
