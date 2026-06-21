Astro button — primary is always the navy gradient CTA; secondary is rationed terracotta; ghost is a hairline-bordered white control.

```jsx
<Button>Save policy</Button>
<Button variant="secondary" icon="add">New service</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button disabled>Saving…</Button>
```

- `variant` — `primary` (navy gradient, default), `secondary` (terracotta), `ghost` (white + hairline). Never recolor a primary button.
- `size` — `sm` / `md` / `lg`. Radius is 10 (sm) or 12.
- `icon` / `iconRight` — Material Symbols names; auto-sized to the label.
- Hover = subtle opacity dip (the system has no hover-lift on buttons by design).
