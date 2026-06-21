Material Symbols Outlined icon — the single icon vocabulary across Astro; toggle `fill` to signal active state.

```jsx
<Icon name="calendar_month" />
<Icon name="warning" size={24} fill color="var(--al-status-negative)" />
```

- `name` — any Material Symbols Outlined ligature (`home`, `notifications`, `receipt_long`, `group`…).
- `fill` — `false` (outline, default) for rest; `true` for active/selected nav items and emphasis.
- `size` — px; also sets the optical-size axis so glyphs stay crisp at any scale.
- Never substitute emoji or hand-drawn SVG — the brand uses Material Symbols exclusively.
