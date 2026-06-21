# Plan: Slice 2 — Icon Swap

**Slice:** `docs/shaping/home-screen-ds-conformance-slices.md` → Slice 2
**Spec:** #1 (Wrong Icon Set)
**File:** `src/components/dashboard/atelier-dashboard.tsx`

---

## Steps

### 1. Remove lucide-react imports

Delete the entire import block (lines 5-15):
```tsx
import {
  ArrowRight, BarChart3, CalendarDays, ChevronRight,
  Copy, ExternalLink, Package, UserPlus, Users,
} from "lucide-react";
```

### 2. Add file-local Icon helper

Add at the top of the file (after imports, before component types):

```tsx
function MsIcon({ name, size = 20, fill = false }: { name: string; size?: number; fill?: boolean }) {
  return (
    <span
      className="material-symbols-outlined"
      aria-hidden="true"
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        lineHeight: 1,
        display: "inline-flex",
      }}
    >
      {name}
    </span>
  );
}
```

Name it `MsIcon` to avoid colliding with the destructured `icon: Icon` in the essentials map callback (line 177).

### 3. Replace icon usages

Apply this mapping throughout the component:

| Location | Old (lucide) | New (Material Symbol) |
|----------|-------------|----------------------|
| Hero watermark (line ~115) | `<CalendarDays className="h-52 w-52" strokeWidth={1} />` | `<MsIcon name="calendar_month" size={208} />` |
| Calendar icon tile (line ~120) | `<CalendarDays className="h-8 w-8 md:h-10 md:w-10" />` | `<MsIcon name="calendar_month" size={32} />` (md variant handled by container) |
| Connect Now button arrow (line ~136) | `<ArrowRight className="h-4 w-4" />` | `<MsIcon name="arrow_forward" size={16} />` |
| Book first client icon (line ~149) | `<UserPlus className="h-6 w-6" />` | `<MsIcon name="person_add" size={24} />` |
| Book first client chevron (line ~162) | `<ChevronRight className="h-4 w-4" />` | `<MsIcon name="chevron_right" size={16} />` |
| Essentials card icons (line ~208-209) | `<Icon className="h-6 w-6" />` (lucide component) | `<MsIcon name={iconName} size={24} />` |
| Essentials external link (line ~246) | `<ExternalLink className="h-4 w-4 ..." />` | `<MsIcon name="open_in_new" size={16} />` |
| Open Booking Page button (line ~289) | `<ExternalLink className="h-4 w-4" />` | `<MsIcon name="open_in_new" size={16} />` |
| Copy button (line ~296) | `<Copy className="h-4 w-4" />` | `<MsIcon name="content_copy" size={16} />` |

### 4. Update the essentials data array

Change the `icon` field from `React.ElementType` (lucide component) to `string` (Material Symbol name):

```tsx
// Before
icon: Package,    // lucide component reference
icon: BarChart3,
icon: Users,

// After
icon: "inventory_2",    // Material Symbol name string
icon: "bar_chart",
icon: "group",
```

Update the type definition:
```tsx
// Before
icon: React.ElementType;

// After
icon: string;
```

Update the map callback to use `MsIcon` with the string:
```tsx
// Before
const { icon: Icon, ... } = item;
<Icon className="h-6 w-6" />

// After  
const { icon: iconName, ... } = item;
<MsIcon name={iconName} size={24} />
```

---

## Self-testing

1. **No lucide imports remain:**
   ```bash
   grep -c "lucide-react" src/components/dashboard/atelier-dashboard.tsx
   ```
   Expected: 0.

2. **All Material Symbol names are valid:** Open the dashboard in the browser. All 9 icon positions should show recognizable icons, not empty boxes or fallback glyphs. Cross-reference against [Material Symbols catalog](https://fonts.google.com/icons).

3. **Icon sizing:** Visually confirm icons maintain approximately the same visual weight as the lucide originals. The hero watermark should be large (~208px), tile icons ~24-32px, inline icons ~16px.

4. **`aria-hidden="true"`:** Inspect any icon in DevTools — the `<span>` should have `aria-hidden="true"`.

5. **No TypeScript errors:**
   ```bash
   pnpm tsc --noEmit 2>&1 | grep atelier-dashboard
   ```
   Expected: no errors.
