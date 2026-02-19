# V1: Site Shell — Implementation Plan

## Scope
Implements the site shell (V1) from `docs/shaping/landing-page-slices.md`.
Demo goal: dark branded navbar with scroll effect (transparent → frosted glass), working mobile drawer, clean Astro-branded footer, dark body, middleware auth protection.

---

## Key Discoveries

### Tailwind v4 (not v4 config file)
The project uses **Tailwind v4** — tokens are defined in `globals.css` via `@theme inline {}` block, NOT via `tailwind.config.js`. All design tokens and keyframes must be added to `globals.css`.

### ThemeProvider removal
`src/app/layout.tsx` currently wraps everything in `<ThemeProvider>` (shadcn light/dark toggle). **Removing entirely** — dashboard goes dark-only too. No ThemeProvider anywhere after this slice.

### framer-motion not installed
`useScroll()` (N1) requires `framer-motion`. Must install before implementation.

### next.config is TypeScript
File is `next.config.ts` (TypeScript), not `.js`. Edits go there.

### No middleware.ts exists
`src/middleware.ts` must be created from scratch.

---

## Files Changed

| File | Action |
|------|--------|
| `pnpm add framer-motion` | Install dependency |
| `src/app/globals.css` | Add design tokens + keyframe animations to `@theme inline {}` |
| `next.config.ts` | Add `optimizePackageImports`, add `images.unsplash.com` remotePattern |
| `src/app/layout.tsx` | Swap to Inter font, dark body classes, update metadata, remove ThemeProvider + boilerplate |
| `src/components/site-header.tsx` | Full rewrite — `"use client"`, fixed positioning, scroll effect, flat nav, mobile drawer |
| `src/components/site-footer.tsx` | Full rewrite — Astro branding, remove Leon van Zyl/GitHub stars |
| `src/middleware.ts` | Create — Better Auth session check, redirect `/app/*` + `/profile` → `/login` |

---

## Step-by-Step Implementation

### Step 1 — Install framer-motion
```bash
pnpm add framer-motion
```

### Step 2 — globals.css: Add design tokens + keyframes
In the existing `@theme inline {}` block in `src/app/globals.css`, add:

```css
/* Design tokens */
--color-bg-dark: #1A1D21;
--color-bg-dark-secondary: #24282E;
--color-primary: #3D8B8B;
--color-primary-light: #5BA3A3;
--color-primary-dark: #2A6B6B;
--color-accent-peach: #E8C4B8;
--color-accent-coral: #F4A58A;
--color-text-muted: #6B7280;
--color-text-light-muted: #A1A5AB;

/* Keyframes */
--animate-float: float 6s ease-in-out infinite;
--animate-fade-up: fade-up 0.6s ease-out forwards;
```

And add the `@keyframes` blocks below the `@theme` block (not inside it):
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Step 3 — next.config.ts: bundle + image config
Add inside `nextConfig`:
```ts
experimental: {
  optimizePackageImports: ['lucide-react', 'framer-motion'],
},
```
And add to `images.remotePatterns`:
```ts
{ protocol: "https", hostname: "images.unsplash.com" },
```

### Step 4 — layout.tsx: Inter font, dark body, clean metadata
- Replace Geist fonts with `Inter` from `next/font/google`
- Set `<body className="... bg-bg-dark text-white antialiased">`
- Update `metadata`: title "Astro", description "Stop losing money to no-shows. Smart booking for beauty professionals."
- Remove `ThemeProvider`, `ModeToggle`, `jsonLd` structured data block
- Keep `SiteHeader`, `SiteFooter`, `Toaster`

### Step 5 — site-header.tsx: Full rewrite
`"use client"` component. Structure:

```
fixed top-0 z-50 w-full (header element)
  ↳ class toggles: transparent | bg-bg-dark/80 backdrop-blur-md border-b border-white/5
  ↳ driven by useScroll() from framer-motion → scrolled: boolean state

Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16

Left: Logo — "Astro" text link → / (text-xl font-bold text-white)

Centre (desktop): nav links flex gap-8
  - "Features" → #features anchor
  - "Pricing" → #pricing anchor
  - "Login" → /login
  Each: text-sm font-medium text-text-light-muted hover:text-white transition-colors duration-200

Right (desktop):
  - "Book a Demo" button: bg-accent-coral text-bg-dark px-4 py-2 rounded-lg font-semibold text-sm

Mobile only (< md):
  - Hamburger icon (Menu from lucide-react) → onClick: setDrawerOpen(true)

Mobile Drawer (right-side slide-in):
  - Fixed overlay: bg-black/50 inset-0 z-40 (backdrop, click closes drawer)
  - Drawer panel: fixed right-0 top-0 bottom-0 w-72 bg-bg-dark-secondary z-50
  - translate-x-full → translate-x-0 transition via CSS (not FM — keeps V1 simple)
  - Contents: logo, stacked nav links (Features, Pricing, Login), "Book a Demo" button
  - X (close) icon top-right of drawer
  - useReducedMotion() from framer-motion: if true, suppress transition class
```

State:
- `const [drawerOpen, setDrawerOpen] = useState(false)`
- `const { scrollY } = useScroll()` → `useMotionValueEvent(scrollY, "change", ...)` → `setScrolled(scrollY > 0)`

### Step 6 — site-footer.tsx: Full rewrite
Server component. Structure:
```
bg-bg-dark border-t border-white/10 py-12

  max-w-7xl mx-auto px-4 flex flex-col items-center gap-6

  Row 1: "Astro" — text-xl font-bold text-white (Link to /)

  Row 2: nav links flex flex-wrap justify-center gap-x-8 gap-y-2
    Features · Pricing · Privacy Policy · Terms of Service · Contact
    Each: text-sm text-text-muted hover:text-white transition-colors duration-200 cursor-pointer

  Row 3: copyright
    "© 2025 Astro. All rights reserved." — text-sm text-text-light-muted
```
Remove: `GitHubStars` import, Leon van Zyl link.

### Step 7 — src/middleware.ts: Auth protection
```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/profile"],
};
```

---

## Testing Plan

### 1. Type checking and lint (automated)
```bash
pnpm lint && pnpm typecheck
```
Must pass with zero errors before marking done.

### 2. Browser smoke tests (Playwright)
Manually verify by navigating to `http://localhost:3000` (user must start dev server).

**Navbar scroll effect:**
1. Load `/` — navbar should be transparent (no bg)
2. Scroll down > 0px — navbar should show `bg-bg-dark/80 backdrop-blur-md border-b`
3. Scroll back to top — should return to transparent

**Mobile drawer (resize to < 768px):**
4. Hamburger icon visible, nav links hidden
5. Click hamburger → drawer slides in from right
6. Click backdrop → drawer closes
7. Click a link in drawer → drawer closes

**Desktop nav:**
8. Nav links (Features, Pricing, Login) visible at ≥ 768px
9. "Book a Demo" coral button visible in navbar

**Footer:**
10. "Astro" logo link present
11. Footer links present: Features, Pricing, Privacy Policy, Terms of Service, Contact
12. Copyright text: "© 2025 Astro. All rights reserved."
13. No GitHub stars widget, no "Leon van Zyl" text

**Dark body:**
14. Body background is `#1A1D21` (dark), not white

**Middleware:**
15. Navigate to `/app` while logged out → should redirect to `/login`

### 3. Accessibility check
- Hamburger button has `aria-label` and `aria-expanded`
- Mobile drawer has `role="dialog"` and `aria-modal`
- Skip-to-content link preserved in header
- All nav links keyboard-navigable

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| ThemeProvider removal affects shadcn components | shadcn components still function without ThemeProvider in dark-mode-only setup |
| `useScroll` from framer-motion requires client component | Header is `"use client"` — no issue |
| Tailwind v4 custom color naming (`bg-bg-dark` etc.) | Tailwind v4 maps `--color-bg-dark` CSS var → `bg-bg-dark` class automatically |
| Middleware: Better Auth `getSession` signature | Check existing usage in `src/lib/auth.ts` before writing middleware |
