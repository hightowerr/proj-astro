Circular avatar — initials on a reliability-tier gradient (navy = top, terracotta = risk); no photography by default.

```jsx
<Avatar initials="SM" tier="top" />
<Avatar initials="TR" tier="risk" size={34} />
<Avatar src="/me.jpg" size={40} />
```

- `tier` — `top` (navy gradient), `risk` (terracotta gradient), `neutral` (flat muted).
- `src` — pass a real image when available; otherwise `initials` render on the gradient.
- The tier gradients are the brand's primary use of terracotta — keep avatars the home for the warm accent.
