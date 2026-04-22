# Performance Audit

> **Status:** Static analysis only — Lighthouse scores require a production build with real environment variables. Run the audit commands below against a deployed instance or a local `pnpm build && pnpm start` to get measured scores.

---

## How to Run Lighthouse

```bash
# Build for production first (requires .env populated)
pnpm build && pnpm start

# Then in a second terminal (requires npx or global lighthouse):
npx lighthouse http://localhost:3000/app/settings/services \
  --output=html --output-path=./handoff/lighthouse-services.html \
  --preset=desktop

npx lighthouse http://localhost:3000/app/settings/services \
  --output=html --output-path=./handoff/lighthouse-services-mobile.html
```

Attach the generated reports to this file after the first production deploy.

---

## Bundle Analysis (Static)

### JavaScript — notable dependencies by weight

| Package | Why it's here | Weight notes |
|---------|--------------|-------------|
| `framer-motion` v12 | List/form/dialog animations throughout the app | Tree-shaken via `optimizePackageImports: ["framer-motion"]` in `next.config.ts` — only imported variants are bundled |
| `@stripe/stripe-js` + `@stripe/react-stripe-js` | Payment intent collection on the booking flow | Loaded only in booking routes (not in settings) |
| `drizzle-orm` | ORM — server-only | Does not appear in client bundles (used only in Server Components and Server Actions) |
| `better-auth` | Auth — server-only | Does not appear in client bundles |
| `lucide-react` | Icon set (outside the services page) | Tree-shaken via `optimizePackageImports` in `next.config.ts` |
| `@radix-ui/*` | Dialog, Dropdown, Label, Slot, Avatar | Per-primitive packages — only what's imported is bundled |
| `ai` + `@ai-sdk/react` | Chat feature | Loaded only in `/chat` route |
| Material Symbols | Services page icons | External Google Fonts CDN — not in JS bundle; loaded as a font stylesheet |

### CSS

Tailwind CSS v4 with `@theme inline` — outputs only used utility classes. The `--al-*` design token variables add ~2 KB to the `:root` block in `globals.css`.

Four Google Fonts loaded at the root layout: Cormorant Garamond, Bricolage Grotesque, Fira Code, Manrope. Each has `display: swap`. Manrope is the primary font for the services settings UI.

### Server-side footprint

| Route | DB queries on load |
|-------|--------------------|
| `/app/settings/services` | 3 parallel: `getEventTypesForShop`, `getBookingSettingsForShop`, `shopPolicies.findFirst` — plus 1 user-existence check in `requireAuth()` |
| All authenticated routes | +1 user-existence check (`SELECT id FROM user WHERE id = $1`) added as a stale-session guard |

---

## Known Bundle Considerations

### framer-motion on the services page

The services editor shell (`services-editor-shell.tsx`) uses `AnimatePresence`, `motion.div`, and spring variants for list stagger, pane transitions, and row entrance/exit animations. `framer-motion` v12 ships separate entry points per feature; `optimizePackageImports` in `next.config.ts` ensures only the used surface area is included.

If `framer-motion` becomes a bundle size concern, the animations are isolated to:
- `services-editor-shell.tsx` — list stagger (`containerVariants`/`itemVariants`), pane crossfade
- `service-editor-form.tsx` — form error slide-in, buffer chip tap scale, advanced options height animation
- `empty-pane.tsx` — entrance fade-up
- `service-list-row.tsx` — row tap scale via `motion.button`

All animations respect `useReducedMotion()` (checked in `service-editor-form.tsx`).

### Material Symbols (render-blocking risk)

Material Symbols are loaded via a `<link rel="stylesheet">` in `src/app/layout.tsx`. The layout includes `<link rel="preconnect">` for `fonts.googleapis.com` and `fonts.gstatic.com` which reduces connection latency. Because this is a management interface (authenticated, not a public landing page), render-blocking impact on Lighthouse scores is limited to the `/app/*` routes.

If this becomes a CWV concern: self-host the font subset via `next/font` or restrict the icon axes to reduce file size.

---

## Stitch Polish Phase — Bundle Regression

The polish slice (`docs/shaping/services-page/polish-slice.md`) added:
- Material Symbols font link (external CDN, not in JS bundle)
- `al-toggle-track`/`al-toggle-thumb` CSS classes (~200B of CSS)
- Additional `--color-al-*` aliases in `@theme inline` (~1 KB of CSS variables)
- No new npm packages; `framer-motion` was already a dependency

Net JS bundle impact from polish: **zero** (no new packages). Net CSS impact: **~1.2 KB unminified**.

---

## Optimization Recommendations

**High value, low effort:**

1. **Self-host Material Symbols subset** — the current `<link>` fetches the full variable font (~200 KB). A subset containing only the icons used (`schedule`, `payments`, `chevron_right`, `add`, `inventory_2`, `visibility_off`, `pause_circle`, `star`, `more_horiz`, `settings_backup_restore`, `link`, `arrow_back`, `edit_note`) would be ~10–15 KB. Use `pyftsubset` or a Google Fonts subset URL to generate it.

2. **Cap `requireAuth()` query to hot path** — the user-existence check added as a stale-session guard (`SELECT id FROM user WHERE id = $1`) hits the primary key index and will stay fast, but it adds one round-trip to every authenticated Server Component render. If Vercel Edge Network is used in future, consider adding a short-lived server-side cache (e.g., a 60-second TTL map keyed on session token) to coalesce identical checks within a request window.

3. **Stripe.js lazy load** — `@stripe/stripe-js` should only be loaded on routes that render the payment element. Confirm it is not imported in the root layout or any shared provider. Currently it appears to be route-scoped to the booking flow — verify this holds after any future refactors.

**Lower priority:**

4. **Font consolidation** — four distinct Google Font families (`Cormorant`, `Bricolage Grotesque`, `Fira Code`, `Manrope`) are loaded at the root layout. Only `Manrope` is used in the services settings UI. The others are used in the dashboard and booking flow. Consider auditing usage after any design refresh to determine if any can be removed.
