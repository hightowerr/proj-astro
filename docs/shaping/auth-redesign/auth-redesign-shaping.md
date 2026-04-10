# Auth Redesign — Shaping Doc

> Source: `docs/design/login-register-requirements.md`

---

## Frame

### Problem

- All 4 auth routes currently render inside `min-h-[calc(100vh-4rem)]`, baking in a 4rem header offset — the marketing `SiteHeader` is always present above them
- `(auth)/layout.tsx` is a passthrough (`<>{children}</>`) — it provides no shell, no visual isolation, and no chrome removal
- Every auth page uses a bare shadcn `<Card className="w-full max-w-md">` centered on screen — generic, unbranded, and disconnected from the Atelier light design system
- Login and register have identical card chrome ("Welcome back" / "Create an account") with placeholder helper copy — no editorial differentiation
- Auth copy makes implicit promises: "check your email" for forgot-password while resets are terminal-logged; no acknowledgement that Google sign-in is disabled
- The auth experience is visually disconnected from onboarding — the register-to-`/app` handoff feels like leaving one product and entering another

### Outcome

- Auth routes own the full viewport using a dedicated shell — no marketing header or footer bleeds in
- All 4 routes (`/login`, `/register`, `/forgot-password`, `/reset-password`) share a premium split-screen desktop layout: asymmetric hero/media panel on the left, form panel on the right
- The visual language uses Atelier light design tokens: filled input surfaces, soft depth primary buttons, ghost-border focus rings
- Each route has route-specific editorial headline and helper copy in both the hero panel and the form area
- Auth copy is truthful: no unconditional inbox claims, no live Google sign-in control, no implied verification-before-entry
- The register → onboarding handoff reads as one continuous experience

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Auth routes must render in a dedicated shell that owns the full viewport — no marketing `SiteHeader` or `SiteFooter`, no 4rem header offset | Core goal |
| R1 | Auth shell must implement a premium split-screen desktop layout with asymmetric hero/media panel (full-bleed image, gradient overlay, editorial headline + copy) and a narrower form panel; must collapse to single-column mobile without falling back to marketing chrome | Core goal |
| R2 | Auth UI must use Atelier light design tokens: filled `surface_container_low` inputs, soft rounded corners, subtle surface-elevation focus rings (no hard outlines), soft-depth primary CTA buttons, tertiary text-link secondary actions | Must-have |
| R3 | `/login` must support email/password sign-in with: forgot-password link adjacent to the password field, link to `/register`, `?reset=success` banner, redirect to `/app` for authenticated users, and route-specific editorial hero and form copy | Must-have |
| R4 | `/register` must support email/password account creation with the current 4-field contract (name, email, password, confirm password); must not absorb business setup fields; must frame the form as the beginning of onboarding with copy that previews the next step | Must-have |
| R5 | `/forgot-password` and `/reset-password` must remain in the auth shell: forgot-password accepts email and confirms submission truthfully (terminal delivery in dev); reset-password handles valid token and invalid/expired token states and redirects to `/login?reset=success` on success | Must-have |
| R6 | 🟡 Auth v1 scope boundary: email/password only; Google sign-in is **fully absent** (no control, no placeholder, no "coming soon" label); no verification-before-entry; auth copy must not claim inbox delivery unless a real email provider is wired | Must-have |
| R7 | Functional integrity must be preserved: existing Better Auth session guards, post-auth redirects to `/app`, onboarding trigger for users without a shop, and the full email/password auth flow must remain intact | Must-have |
| R8 | 🟡 Auth shell footer: **omitted entirely** — `/privacy`, `/terms`, and `/contact` routes are not shipping in v1; no dead links, no non-interactive placeholders | Must-have |
| R9 | 🟡 All auth endpoints must be rate-limited with per-IP controls shared across serverless instances (not per-process memory). `/sign-in` and `/sign-up` — 3 req/10 s. `/request-password-reset` and `/reset-password` — 5 req/60 s. Rate limiting must be active in all environments except Playwright E2E. | Must-have |

---

## CURRENT

> Describes the existing system as-is. Used as a baseline — not a candidate.

| Part | Mechanism |
|------|-----------|
| **CUR-1** | `(auth)/layout.tsx` = passthrough `<>{children}</>` — no shell, no chrome removal, no layout structure |
| **CUR-2** | All 4 routes use `min-h-[calc(100vh-4rem)]` — hardcoded offset assumes marketing `SiteHeader` is always above |
| **CUR-3** | All 4 routes use `<Card className="w-full max-w-md">` centered on screen — shadcn default, no Atelier tokens |
| **CUR-4** | Hero/media panel does not exist — single-column card layout only |
| **CUR-5** | Copy is generic ("Sign in to your account", "Get started with your new account") — no route-specific editorial content |
| **CUR-6** | Better Auth session guard (`auth.api.getSession` → `redirect("/app")`) exists and works on all 4 routes |
| **CUR-7** | Functional form components exist: `<SignInButton>`, `<SignUpForm>`, `<ForgotPasswordForm>`, `<ResetPasswordForm>` |
| **CUR-8** | `?reset=success` query param handling exists in `/login` |
| **CUR-9** | Rate limiting was disabled in dev; `/request-password-reset` and `/reset-password` had no meaningful protection (fell through to global 100 req/10 s limit). Storage was in-process memory — not shared across serverless instances. _(Closed by spike — see B9.)_ |
| **CUR-10** | `minPasswordLength` defaults to 8 server-side in Better Auth core — enforced in sign-up, password reset, and update routes. Client-side 8-char checks in `SignUpForm` and `ResetPasswordForm` duplicate existing server-side enforcement. No gap. |

**What CURRENT gets right:** Session guards, redirect logic, functional form components, and server-side password length enforcement are solid. These must be preserved.

**What CURRENT breaks:** R0 (no shell), R1 (no split-screen), R2 (no Atelier tokens), R3–R5 (no editorial copy), R8 (no footer at all), R9 (rate limiting gaps — now closed).

---

## Shapes

The core architectural question: **how is the split-screen auth shell composed across the 4 routes?**

---

### A: Layout-as-Shell with Route Config Map

`(auth)/layout.tsx` renders the complete split-screen structure. Hero content (headline, body, image path) comes from a static `AUTH_ROUTE_CONFIG` map keyed by pathname, consumed by a client component inside the layout.

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | `(auth)/layout.tsx` — renders full split-screen frame: hero panel column + form panel column, responsive collapse | |
| **A2** | `AUTH_ROUTE_CONFIG` — static record mapping each pathname to `{ headline, body, imageSrc }` | |
| **A3** | `AuthHeroPanel` client component inside layout — calls `usePathname()`, looks up config, renders hero image + editorial copy | |
| **A4** | Each route stripped to: session guard + redirect + form JSX only | |
| **A5** | Form components restyled with Atelier tokens (inputs, buttons, focus rings) | |
| **A6** | `(auth)/layout.tsx` removes marketing chrome by not rendering `SiteHeader`/`SiteFooter`; removes `4rem` offset | |

**Tradeoffs:**
- Hero content is centralized in the config map — easy to audit all routes at once
- Reading a route's `page.tsx` alone does **not** reveal what hero content it uses; developer must find `AUTH_ROUTE_CONFIG`
- Adding a new auth route requires updating the config map in a separate file from the route

---

### B: AuthShell Component Composed per Route

`(auth)/layout.tsx` handles only chrome removal (no marketing chrome, full viewport). Each route wraps its form in a shared `<AuthShell>` server component that accepts hero props directly.

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **B1** | `(auth)/layout.tsx` — minimal: sets `min-h-screen`, removes chrome (no `SiteHeader`/`SiteFooter`), no layout structure | |
| **B2** | `<AuthShell>` server component — accepts `heroHeadline`, `heroBody`, `heroImage`, `heroAlt` props; renders full split-screen frame | |
| **B3** | Each route wraps its form in `<AuthShell heroHeadline="..." heroBody="..." heroImage="...">` — route-specific hero is declared in `page.tsx` | |
| **B4** | Form components restyled with Atelier tokens (inputs, buttons, focus rings) | |
| **B5** | Shared `<AuthBrandBar>` minimal header component (brand anchor only, no nav) rendered inside `AuthShell` | |

**Tradeoffs:**
- Each `page.tsx` is self-describing: hero content is co-located with the route that owns it
- Adding a new auth route = new `page.tsx` wrapping `<AuthShell {...props}>` — no separate config to update
- `<AuthShell>` is a server component — no `usePathname()` required, no client boundary at the shell level
- Some repetition: every route calls `<AuthShell>` — but 4 call sites over the life of this feature is acceptable

---

### C: Layout Shell with React Context Hero Slot

`(auth)/layout.tsx` renders the split-screen frame but exposes a hero slot via React Context. Pages inject their hero content by rendering a `<HeroProvider>` that passes hero JSX up to the layout's slot.

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **C1** | `(auth)/layout.tsx` — renders split-screen frame; renders `<HeroSlot>` in the hero panel column | |
| **C2** | `HeroContext` — React context that holds hero JSX; `<HeroSlot>` reads from it | ⚠️ |
| **C3** | `<HeroProvider>` client component — pages render this as their root, passing hero JSX as a prop | ⚠️ |
| **C4** | Each route wraps in `<HeroProvider hero={<HeroContent ... />}>` — but this requires client boundary on every page | ⚠️ |
| **C5** | Form components restyled with Atelier tokens | |

**Tradeoffs:**
- Elegant separation of concerns in principle — layout owns structure, routes own content
- In practice, React Context cannot pass state "up" from a child to a parent rendered in the layout — this pattern requires a client component boundary and is effectively a workaround for a limitation
- Three ⚠️ parts (C2, C3, C4) — the mechanism is not concretely understood without a spike
- Next.js App Router renders layout and page independently; context injection from page → layout is non-trivial and may require portals or a global store

---

## Fit Check

| Req | Requirement | Status | A | B | C |
|-----|-------------|--------|---|---|---|
| R0 | Auth routes must render in a dedicated shell that owns the full viewport — no marketing SiteHeader or SiteFooter, no 4rem header offset | Core goal | ✅ | ✅ | ✅ |
| R1 | Auth shell must implement a premium split-screen desktop layout with asymmetric hero/media panel and narrower form panel; must collapse to single-column mobile | Core goal | ✅ | ✅ | ❌ |
| R2 | Auth UI must use Atelier light design tokens: filled inputs, soft rounded corners, subtle focus rings, soft-depth primary CTA, tertiary text-link secondary | Must-have | ✅ | ✅ | ✅ |
| R3 | `/login` with email/password, forgot-password adjacent to password field, register link, reset=success banner, redirect guard, route-specific editorial copy | Must-have | ✅ | ✅ | ✅ |
| R4 | `/register` with 4-field contract, no business setup fields, onboarding-framed copy | Must-have | ✅ | ✅ | ✅ |
| R5 | `/forgot-password` and `/reset-password` in auth shell with truthful delivery messaging and token-based reset | Must-have | ✅ | ✅ | ✅ |
| R6 | Email/password only; no active Google control; no verification-before-entry; no fake inbox claims | Must-have | ✅ | ✅ | ✅ |
| R7 | Existing Better Auth session guards, post-auth redirects, onboarding trigger, and full auth flow must remain intact | Must-have | ✅ | ✅ | ✅ |
| R8 | Legal/footer links only interactive if matching routes exist; otherwise non-interactive or omitted | Must-have | ✅ | ✅ | ✅ |
| R9 | All auth endpoints rate-limited with per-IP controls shared across serverless instances; stricter limits on password reset endpoints; active in all non-E2E environments | Must-have | ✅ | ✅ | ✅ |

**Notes:**
- C fails R1: C2 and C3 are flagged unknowns — the mechanism for injecting hero content from a child page into a parent layout in Next.js App Router is not concretely solved. A flagged unknown fails the fit check. The split-screen structure cannot be guaranteed until C2/C3 are resolved via a spike.
- A and B both pass all requirements. The differentiator is developer ergonomics: A centralizes hero config away from the route; B co-locates hero content in each route's `page.tsx`. Both are valid.
- R9 is satisfied by all shapes: the rate limiting mechanism lives entirely in `src/lib/auth.ts` — independent of which shell composition approach is chosen. Already implemented (see B9).

---

## Decision

**Shape B is the recommended direction.**

B passes all requirements. It requires no client boundary at the shell level (AuthShell is a server component). It keeps hero content co-located with the route that owns it — reading any `page.tsx` fully describes what that route renders. And it imposes no hidden coupling: adding `/verify-email` or any future auth route is a single file that wraps `<AuthShell>`.

A is a reasonable alternative if centralizing hero config is preferred (e.g., for content management reasons). If that preference holds, A works equally well.

C requires a spike before it can be evaluated — the context-slot pattern in Next.js App Router is non-trivial and C2/C3 are currently flagged unknowns.

---

## Decisions (Closed)

| # | Question | Decision |
|---|----------|----------|
| OQ-1 | Does the hero/media panel need a real image asset at v1? | 🟡 **Real image.** Use Unsplash photo `photo-1562322140-8baeececf3df` — hairstylist blow-drying a client in a bright, naturally lit salon. Editorial quality, warm tones, free for commercial use (Unsplash License). CDN URL: `https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1920&q=80` |
| OQ-2 | What does `<AuthBrandBar>` show? | 🟡 **Astro wordmark only.** Brand anchor linking to `/` — no nav items, no marketing links. |
| OQ-3 | Are legal/support routes (`/privacy`, `/terms`, `/contact`) shipping in v1? | 🟡 **No.** Footer row omitted entirely from the auth shell. No dead links, no non-interactive placeholders. Clean. |
| OQ-4 | Google sign-in: disabled placeholder or absent? | 🟡 **Absent.** No Google sign-in control of any kind — not disabled, not greyed out, not labelled "coming soon". Email/password form only. |

---

## Design System Reference

> Sources: `docs/design-system/design-system.md` · `docs/design/stitch_reminder_system_prd (login)/code.html` · `screen.png`

### Core Tokens (Atelier Light)

| Role | Token | Value | Tailwind class |
|------|-------|-------|----------------|
| Page canvas | `--al-background` | `#f9f9f7` | `bg-background` |
| Input background | `--al-surface-container-low` | `#f4f4f2` | `bg-surface-container-low` |
| Input focus bg | `--al-surface-container-high` | `#e8e8e6` | `bg-surface-container-high` |
| Primary / headlines | `--al-primary` | `#001e40` | `text-primary` / `bg-primary` |
| Primary container | `--al-primary-container` | `#003366` | `bg-primary-container` |
| On-primary (white) | `--al-on-primary` | `#ffffff` | `text-on-primary` |
| Body text | `--al-on-surface` | `#1a1c1b` | `text-on-surface` |
| Secondary / labels | `--al-on-surface-variant` | `#43474f` | `text-on-surface-variant` |
| Placeholder / disabled | `--al-outline` | `#737780` | `text-outline` |
| Ghost border | `--al-ghost-border` | `rgba(195,198,209,0.20)` | `ring-primary/20` |
| Float shadow | `--al-shadow-float` | `0px 20px 40px rgba(26,28,27,0.06)` | `shadow-xl shadow-primary/5` |

**Typography:** Manrope for all — headline, body, label. Load via Google Fonts.  
**Roundness:** `rounded-xl` (0.75rem) for inputs and buttons. `rounded-full` for chips.  
**No-line rule:** No `border border-gray-*`. Sectioning via background shifts only. Ghost border (`ring-primary/20`) for focus only.

### Layout Spec (from `screen.png` + `code.html`)

```
┌──────────────────────────────────────────────────────────┐
│  BRAND BAR  fixed · glassmorphic · bg-[#f9f9f7]/80      │
│  backdrop-blur-xl · z-50 · px-6 py-6 md:px-12          │
│  [Astro wordmark]          [tagline — desktop only]      │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────┬───────────────────────────┐
│  HERO PANEL                  │  FORM PANEL               │
│  hidden md:flex              │  w-full md:w-2/5 lg:w-2/5 │
│  md:w-1/2 lg:w-3/5          │  bg-background             │
│  full-bleed image            │  p-8 md:p-12 lg:p-20      │
│  + gradient overlay          │  flex items-center        │
│  + editorial copy (bottom)   │  justify-center            │
└──────────────────────────────┴───────────────────────────┘
```

### Hero Panel Spec

```html
<!-- Full-bleed image + gradient overlay -->
<div class="absolute inset-0">
  <img class="w-full h-full object-cover opacity-90 mix-blend-multiply grayscale-[20%]"
       src="https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1920&q=80"
       alt="Hairstylist working in a bright salon" />
  <div class="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
</div>
<!-- Editorial copy — anchored to bottom -->
<div class="relative z-10 text-on-primary">
  <h1 class="text-5xl lg:text-7xl font-bold tracking-tight mb-4">[Route headline]</h1>
  <p class="text-lg lg:text-xl font-light opacity-90 max-w-md leading-relaxed">[Route body]</p>
</div>
```

### Form Panel Spec

```html
<!-- Form heading -->
<h2 class="text-3xl font-bold text-primary mb-2">[Route form title]</h2>
<p class="text-on-surface-variant">[Route form subtitle]</p>

<!-- Input field -->
<label class="block text-sm font-semibold text-primary mb-2">Email Address</label>
<input class="w-full bg-surface-container-low border-none focus:ring-1 focus:ring-primary/20
              rounded-xl py-4 px-5 text-on-surface placeholder:text-outline/50
              transition-all outline-none" />

<!-- Password field with visibility toggle -->
<div class="relative">
  <input class="w-full bg-surface-container-low border-none focus:ring-1 focus:ring-primary/20
                rounded-xl py-4 px-5 text-on-surface placeholder:text-outline/50
                transition-all outline-none pr-12" type="password" />
  <button class="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary">
    <span class="material-symbols-outlined text-[20px]">visibility</span>
  </button>
</div>

<!-- Primary CTA -->
<button class="w-full bg-primary text-on-primary font-bold py-4 rounded-xl
               hover:bg-primary-container active:scale-95 transition-all duration-300
               shadow-xl shadow-primary/5">Sign in</button>

<!-- Tertiary link -->
<p class="text-sm text-on-surface-variant">
  New to Astro? <a class="font-bold text-primary hover:underline">Create an account</a>
</p>
```

### Brand Bar Spec

```html
<header class="fixed top-0 w-full z-50 bg-[#f9f9f7]/80 backdrop-blur-xl px-6 py-6 md:px-12">
  <div class="max-w-7xl mx-auto flex justify-between items-center">
    <a href="/" class="text-xl font-bold tracking-tighter text-primary">Astro</a>
    <span class="hidden md:block text-on-surface-variant text-sm font-medium tracking-wide">
      Manage your bookings with ease
    </span>
  </div>
</header>
```

### Design Deviations from Reference HTML

The reference `code.html` was a design exploration — three elements conflict with our closed decisions and must **not** appear in the implementation:

| Reference HTML element | Decision | Reason |
|------------------------|----------|--------|
| Google "Continue with Google" button (with "Coming Soon" badge) | **Absent entirely** | OQ-4: no Google control of any kind |
| "or use email" horizontal divider | **Removed** | Only meaningful when a social option exists above it |
| Footer: Privacy Policy · Terms of Service · Support links | **Omitted** | OQ-3: routes don't exist in v1; no dead links |
| Footer copyright line | **Omitted** | Same — keeps the shell clean |

### Per-Route Editorial Copy

| Route | Hero headline | Hero body | Form title | Form subtitle |
|-------|--------------|-----------|------------|---------------|
| `/login` | "The Modern Atelier." | "Elevate your appointment experience with precision tools designed for the artisan." | "Log in" | "Welcome back. Please enter your details." |
| `/register` | "Your Studio Starts Here." | "Join the platform built for beauty professionals who take their craft seriously." | "Create an account" | "Set up your account and you'll be booking in minutes." |
| `/forgot-password` | "We've Got You." | "A fresh start is just one email away." | "Reset your password" | "Enter your email and we'll send a reset link to your terminal." |
| `/reset-password` | "Almost There." | "Choose a strong password and get back to doing what you love." | "Set a new password" | "Your reset link is valid for 1 hour." |

---

## Updated Shape B Parts (post-decisions)

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **B1** | `(auth)/layout.tsx` — sets `min-h-screen`, removes chrome; no `SiteHeader`/`SiteFooter`; removes `calc(100vh-4rem)` offset | |
| **B2** | `<AuthShell>` server component — accepts `heroHeadline`, `heroBody`, `heroImage`, `heroAlt` props; renders `flex flex-col md:flex-row min-h-screen pt-20`; hero panel `hidden md:flex md:w-1/2 lg:w-3/5`; form panel `w-full md:w-1/2 lg:w-2/5 bg-background` | |
| **B3-login** | `/login/page.tsx` — hero: "The Modern Atelier." / "Elevate your appointment..."; form title: "Log in" / "Welcome back. Please enter your details." | |
| **B3-register** | `/register/page.tsx` — hero: "Your Studio Starts Here." / "Join the platform..."; form title: "Create an account" / "Set up your account..." | |
| **B3-forgot** | `/forgot-password/page.tsx` — hero: "We've Got You." / "A fresh start..."; form title: "Reset your password" / "Enter your email..." | |
| **B3-reset** | `/reset-password/page.tsx` — hero: "Almost There." / "Choose a strong password..."; form title: "Set a new password" / "Your reset link is valid for 1 hour." | |
| **B4** | `<AuthBrandBar>` — `fixed top-0 w-full z-50 bg-[#f9f9f7]/80 backdrop-blur-xl px-6 py-6 md:px-12`; Astro wordmark `text-xl font-bold tracking-tighter text-primary` as `<a href="/">`; desktop tagline `text-on-surface-variant text-sm` hidden on mobile; no nav, no marketing links | |
| **B5** | Hero image: Unsplash `photo-1562322140-8baeececf3df?w=1920&q=80`; `w-full h-full object-cover opacity-90 mix-blend-multiply grayscale-[20%]`; gradient `bg-gradient-to-t from-primary/60 via-transparent to-transparent`; headline `text-5xl lg:text-7xl font-bold tracking-tight text-on-primary`; body `text-lg lg:text-xl font-light opacity-90` | |
| **B6** | Inputs: `bg-surface-container-low border-none focus:ring-1 focus:ring-primary/20 rounded-xl py-4 px-5 text-on-surface placeholder:text-outline/50 outline-none`; labels: `text-sm font-semibold text-primary`; password visibility toggle: Material Symbols `visibility` icon; primary button: `bg-primary text-on-primary font-bold py-4 rounded-xl hover:bg-primary-container active:scale-95 shadow-xl shadow-primary/5`; tertiary links: `font-bold text-primary hover:underline` | |
| **B7** | No footer — legal/support routes not shipping in v1; shell ends at bottom of form panel | |
| **B8** | No Google sign-in control, no "Continue with Google" button, no "or use email" divider — email/password form only | |
| **B9** | ✅ **Already implemented.** `src/lib/auth.ts` — Upstash Redis `secondaryStorage`; `rateLimit.enabled: !isPlaywrightE2E`; custom rules `/request-password-reset` + `/reset-password` → 5 req/60 s; `/sign-in` + `/sign-up` → 3 req/10 s (built-in); `minPasswordLength` already 8 server-side | |
| **B10** | `revokeSessionsOnPasswordReset: true` in `emailAndPassword` config — forces all sessions invalid after a successful password reset (Gap 2 close) | |

**Security accepted tradeoff:** `proxy.ts` checks cookie *presence* only (`getSessionCookie`), not session validity. Recommended Better Auth middleware pattern — real validation boundary is the server component. Accepted as-is.

**Security open item — Gap 1:** No per-account lockout after failed sign-ins. IP rate limiting (3 req/10 s) is the current protection. A botnet can enumerate accounts by spreading requests. Requires a custom Better Auth `databaseHooks` implementation to track per-email failures. Out of scope for this shape; logged as a known gap.

---

## Implementation Plan

### Wiring

```
(auth)/layout.tsx          ← strip chrome, set min-h-screen
      │
      └── page.tsx (each route)
              │
              └── <AuthShell>          ← server component, owns split-screen
                    ├── <AuthBrandBar>  ← fixed glassmorphic header (rendered inside shell)
                    ├── Hero panel      ← left: image + overlay + editorial copy (from props)
                    └── Form panel     ← right: formTitle + formSubtitle (from props) + {children}
```

### Prop Contract

```typescript
type AuthShellProps = {
  heroHeadline: string
  heroBody: string
  formTitle: string
  formSubtitle: string
  children: React.ReactNode
  // hero image is a constant inside AuthShell — same Unsplash photo on all 4 routes
}
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/auth/auth-brand-bar.tsx` | Fixed glassmorphic top bar: Astro wordmark anchor + desktop tagline. Server component. |
| `src/components/auth/auth-shell.tsx` | Split-screen frame: renders `<AuthBrandBar>`, hero panel (image + gradient + editorial copy), form panel (title + subtitle + children). Server component. |

### Files to Modify

| File | Change |
|------|--------|
| `src/app/(auth)/layout.tsx` | Replace passthrough with `<div className="min-h-screen bg-background">{children}</div>` |
| `src/app/(auth)/login/page.tsx` | Replace Card wrapper with `<AuthShell heroHeadline="The Modern Atelier." heroBody="Elevate your appointment experience with precision tools designed for the artisan." formTitle="Log in" formSubtitle="Welcome back. Please enter your details.">`. Keep session guard, `?reset=success` banner, `<SignInButton />`. |
| `src/app/(auth)/register/page.tsx` | Same swap. Props: "Your Studio Starts Here." / "Join the platform built for beauty professionals..." / "Create an account" / "Set up your account and you'll be booking in minutes." |
| `src/app/(auth)/forgot-password/page.tsx` | Same swap. Props: "We've Got You." / "A fresh start is just one email away." / "Reset your password" / "Enter your email and we'll send a reset link to your terminal." |
| `src/app/(auth)/reset-password/page.tsx` | Same swap. Props: "Almost There." / "Choose a strong password and get back to doing what you love." / "Set a new password" / "Your reset link is valid for 1 hour." Keep `<Suspense>` wrapping `<ResetPasswordForm />` as children. |
| `next.config.ts` | Add `images.unsplash.com` to `images.remotePatterns` for Next.js `<Image>` to load the hero photo. |

### Out of Scope (this plan)

- Restyling existing form components with Atelier tokens (B4/B6) — separate pass
- Rate limiting (B9) — already implemented
- `revokeSessionsOnPasswordReset` (B10) — already in `src/lib/auth.ts`

### Verification

1. `pnpm lint && pnpm typecheck` — must pass clean
2. `/login` — full viewport, no marketing header, hero panel on desktop, collapses to single column on mobile
3. `/register`, `/forgot-password`, `/reset-password` — correct headline and copy on each
4. Sign in → redirects to `/app`
5. `/login?reset=success` — success banner renders above the form
6. Mobile viewport — hero hidden, form fills screen
