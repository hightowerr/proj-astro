Labelled text field — white wrap with a hairline border that deepens to a navy ghost border on focus.

```jsx
<Field label="Shop name" placeholder="Atelier No. 9" required />
<Field label="Buffer" icon="schedule" value="15 min" help="Time held after each booking" />
```

- `label` is bold navy; `required` appends a rose dot.
- On focus the wrap raises to `surface-container-high` and the border becomes navy @ 20%.
- `icon` — optional leading Material Symbol.
- `help` — muted helper line; use inline `<code>` chips on `surface-container-low` for token-like hints.
