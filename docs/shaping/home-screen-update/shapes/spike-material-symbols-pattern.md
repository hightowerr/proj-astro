# Spike: Material Symbols Outlined Usage Pattern

**Question:** What is the canonical production pattern for Material Symbols icons, and should atelier-dashboard.tsx follow it?

## Findings

### Production pattern
Raw `<span>` elements with the `material-symbols-outlined` class. **No shared Icon component** exists in `src/components/`. The DS reference `Icon.jsx` in `docs/design-system/` is not imported by production code.

### Canonical snippet (from `app-nav.tsx`):
```tsx
<span 
  className="material-symbols-outlined" 
  style={{ 
    fontSize: 20, 
    fontVariationSettings: `'FILL' ${isActive ? 1 : 0}, 'wght' ${isActive ? 500 : 400}, 'GRAD' 0, 'opsz' 20` 
  }}
>
  calendar_month
</span>
```

### Font variation settings convention

| State | FILL | wght | GRAD | opsz |
|-------|------|------|------|------|
| Default | 0 | 400 | 0 | matches fontSize |
| Active/emphasis | 1 | 500 | 0 | matches fontSize |

### Other usage (services settings):
```tsx
<span
  className="material-symbols-outlined text-[15px] opacity-50"
  style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
>
  schedule
</span>
```

## Recommendation

Use a **file-local `Icon` helper** (Pattern B) — same pattern used by `conflicts-ledger` and `customers-editorial`. The dashboard is a content/data component, not a nav shell.

```tsx
function Icon({ name, size = 20, fill = false }: { name: string; size?: number; fill?: boolean }) {
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

### Icon mapping for dashboard:
| lucide name | Material Symbol name |
|-------------|---------------------|
| `CalendarDays` | `calendar_month` |
| `ArrowRight` | `arrow_forward` |
| `Package` | `inventory_2` |
| `BarChart3` | `bar_chart` |
| `Users` | `group` |
| `UserPlus` | `person_add` |
| `ExternalLink` | `open_in_new` |
| `Copy` | `content_copy` |
| `ChevronRight` | `chevron_right` |
