Segmented filter row — active pill fills navy, the rest are transparent with muted text.

```jsx
const [f, setF] = React.useState("all");
<FilterPills
  value={f}
  onChange={setF}
  options={[{key:"all",label:"All"},{key:"settled",label:"Settled"},{key:"risk",label:"Risk only"}]}
  counts={{ settled: 3 }}
/>
```

- The active pill is navy; an optional `counts[key]` appends as "Label · N".
- Pills are borderless, pill-shaped, transparent at rest — no hover treatment by design.
