Atelier toggle switch — hairline track when off, navy when on; thumb slides 20px in .15s.

```jsx
const [open, setOpen] = React.useState(true);
<Switch checked={open} onChange={setOpen} />
```

- Controlled: pass `checked` and handle `onChange(next)`.
- Use for binary settings (day open/closed, reminder enabled). Track color is the only state signal — no labels inside the track.
