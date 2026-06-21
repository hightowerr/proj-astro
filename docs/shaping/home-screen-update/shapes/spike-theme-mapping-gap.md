# Spike: @theme Mapping Gap for --al-on-secondary-container

**Question:** Is `--al-on-secondary-container` truly missing from the `@theme inline` block, and does the gap affect files beyond the dashboard?

## Findings

### Token definition — confirmed present in `:root`

| Location | Line | Value |
|----------|------|-------|
| `globals.css` `:root` | 313 | `--al-on-secondary-container: #785c53;` |
| `globals.css` `:root` | 271 | `--secondary-foreground: #785c53;` (shadcn compat alias with comment `/* al-on-secondary-container */`) |

### `@theme inline` block — confirmed MISSING

Lines 178-181 of `globals.css` contain the secondary mappings:

```css
--color-al-secondary:            var(--al-secondary);
--color-al-secondary-container:  var(--al-secondary-container);
--color-al-secondary-fixed:      var(--al-secondary-fixed);
--color-al-on-secondary-fixed:   var(--al-on-secondary-fixed);
```

`--color-al-on-secondary-container` is absent. This means `text-al-on-secondary-container` and `bg-al-on-secondary-container` do NOT work as Tailwind utilities.

### Files affected by the gap

| File | Line | Current workaround |
|------|------|--------------------|
| `atelier-dashboard.tsx` | 156 | `text-[#785c53]` (hardcoded hex) |
| `badge.tsx` | 21 | `[color:var(--al-on-secondary-container)]` (bracket syntax) |
| `button.tsx` | 26 | `[color:var(--al-on-secondary-container)]` (bracket syntax) |

### Also missing from `@theme`

`--al-secondary-fixed-dim` (#e2bfb3) is also missing from `@theme`, referenced by `badge.tsx` and `button.tsx` hover states via bracket syntax. Not in scope for Spec #11 but worth noting.

## Conclusion

**Adding `--color-al-on-secondary-container: var(--al-on-secondary-container);` to the `@theme inline` block benefits 3 files**, not just the dashboard. The fix is one line, zero risk (additive), and closes a gap in the secondary token family.
