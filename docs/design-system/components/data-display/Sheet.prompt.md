The single card elevation — a white sheet on one soft float shadow (radius 24), with an optional header.

```jsx
<Sheet eyebrow="The ledger" title="Recent appointments" action={<Button size="sm" variant="ghost">Export</Button>}>
  …rows…
</Sheet>

<Sheet padded={false}>{/* full-bleed table */}</Sheet>
```

- One elevation only — no hover lift on cards. Deeper shadows are for CTAs/menus.
- `padded={false}` for full-bleed tables; the header still pads.
- Group related content inside a Sheet rather than drawing borders around it.
