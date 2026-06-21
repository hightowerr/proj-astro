The Astro status vocabulary — a colored dot + label for outcomes, payment states, and reliability tiers.

```jsx
<StatusPill variant="positive">Top</StatusPill>          {/* tinted uppercase pill */}
<StatusPill variant="negative">Risk</StatusPill>
<StatusPill variant="caution" tinted={false}>Unresolved</StatusPill>  {/* bare dot + label */}
```

- `variant` — `positive` (green #0e7a55), `negative` (rose #a8294a), `caution` (amber #c97a2a), `neutral` (#43474f).
- `tinted` — `true` = tinted uppercase pill (tiers, payment status); `false` = bare dot + sentence-case (appointment outcome).
- Never render status as a solid fill or full-width banner — small pills/dots only.
