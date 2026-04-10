---
shaping: true
---

# Auth Redesign — Slices

**Shape:** B (AuthShell Component Composed per Route)
**Shaping doc:** `auth-redesign-shaping.md`
**Date:** 2026-04-09

---

## Slice Overview

| Slice | Name | Parts | Demo |
|-------|------|-------|------|
| V1 | Shell + Route Wiring | B1, B2, B4, B5, B7, B8, B3×4 | All 4 auth routes render in full-viewport split-screen shell — no marketing header, correct editorial copy per route |
| V2 | Form Atelier Token Pass | B6 | Form inputs, labels, buttons, and password visibility toggle all use Atelier light design tokens |

V1 is the atomic unit — shell and route wiring cannot be separated. V2 is independent and additive; the form components work inside V1 with their existing shadcn styling until V2 ships.

---

## V1 — Shell + Route Wiring

**What ships:** Two new server components (`AuthBrandBar`, `AuthShell`). The `(auth)` layout strips marketing chrome. All 4 routes swap the Card wrapper for `<AuthShell>` with route-specific editorial props. The Unsplash hero image is allowed via `next.config.ts`.

**Demo:** Navigate to `/login` — full viewport, glassmorphic brand bar at top, hero panel on left with "The Modern Atelier." headline, form on right. Resize to mobile — hero hidden, form fills screen. Visit `/register`, `/forgot-password`, `/reset-password` — each shows correct hero headline and form title. Sign in → redirects to `/app`. Existing session → redirects to `/app` without rendering the form.

### Affordances

| ID | Affordance | Type |
|----|------------|------|
| B1 | `(auth)/layout.tsx` — sets `min-h-screen bg-background`, removes `SiteHeader`/`SiteFooter`, removes `calc(100vh-4rem)` offset | Layout |
| B2 | `<AuthShell>` — server component; accepts `heroHeadline`, `heroBody`, `formTitle`, `formSubtitle`, `children`; renders `flex flex-col md:flex-row min-h-screen pt-20`; hero panel `hidden md:flex md:w-1/2 lg:w-3/5`; form panel `w-full md:w-1/2 lg:w-2/5 bg-background` | Component |
| B4 | `<AuthBrandBar>` — server component; `fixed top-0 w-full z-50 bg-[#f9f9f7]/80 backdrop-blur-xl px-6 py-6 md:px-12`; Astro wordmark as `<a href="/">` with `text-xl font-bold tracking-tighter text-primary`; desktop tagline `hidden md:block text-on-surface-variant text-sm`; no nav, no marketing links | Component |
| B5 | Hero panel — Unsplash `photo-1562322140-8baeececf3df?w=1920&q=80`; `w-full h-full object-cover opacity-90 mix-blend-multiply grayscale-[20%]`; gradient `bg-gradient-to-t from-primary/60 via-transparent to-transparent`; headline `text-5xl lg:text-7xl font-bold tracking-tight text-on-primary`; body `text-lg lg:text-xl font-light opacity-90 max-w-md leading-relaxed` | Component |
| B3-login | `/login/page.tsx` — wraps `<SignInButton />` in `<AuthShell heroHeadline="The Modern Atelier." heroBody="Elevate your appointment experience with precision tools designed for the artisan." formTitle="Log in" formSubtitle="Welcome back. Please enter your details.">`; keeps session guard and `?reset=success` banner | Route |
| B3-register | `/register/page.tsx` — wraps `<SignUpForm />` in `<AuthShell heroHeadline="Your Studio Starts Here." heroBody="Join the platform built for beauty professionals who take their craft seriously." formTitle="Create an account" formSubtitle="Set up your account and you'll be booking in minutes.">` | Route |
| B3-forgot | `/forgot-password/page.tsx` — wraps `<ForgotPasswordForm />` in `<AuthShell heroHeadline="We've Got You." heroBody="A fresh start is just one email away." formTitle="Reset your password" formSubtitle="Enter your email and we'll send a reset link to your terminal.">` | Route |
| B3-reset | `/reset-password/page.tsx` — wraps `<ResetPasswordForm />` (inside existing `<Suspense>`) in `<AuthShell heroHeadline="Almost There." heroBody="Choose a strong password and get back to doing what you love." formTitle="Set a new password" formSubtitle="Your reset link is valid for 1 hour.">` | Route |
| B7 | No footer row — shell ends at bottom of form panel | Constraint |
| B8 | No Google sign-in control — form-only, no divider, no placeholder | Constraint |

### Wiring

```
(auth)/layout.tsx
  <div className="min-h-screen bg-background">
    {children}
  </div>

page.tsx (each route)
  session guard → redirect("/app") if session exists
  └── <AuthShell heroHeadline="..." heroBody="..." formTitle="..." formSubtitle="...">
        ├── <AuthBrandBar />        (rendered inside AuthShell, fixed positioning)
        ├── Hero panel              (left: image + gradient overlay + editorial copy from props)
        └── Form panel             (right: formTitle + formSubtitle + {children})
              └── <SignInButton /> | <SignUpForm /> | <ForgotPasswordForm /> | <ResetPasswordForm />
```

### Tasks

1. **`next.config.ts`** — add `images.unsplash.com` to `images.remotePatterns`
   ```ts
   { protocol: "https", hostname: "images.unsplash.com" }
   ```

2. **`src/components/auth/auth-brand-bar.tsx`** — create server component
   - Fixed glassmorphic bar: `fixed top-0 w-full z-50 bg-[#f9f9f7]/80 backdrop-blur-xl px-6 py-6 md:px-12`
   - Inner: `max-w-7xl mx-auto flex justify-between items-center`
   - Wordmark: `<a href="/" className="text-xl font-bold tracking-tighter text-primary">Astro</a>`
   - Tagline: `<span className="hidden md:block text-on-surface-variant text-sm font-medium tracking-wide">Manage your bookings with ease</span>`

3. **`src/components/auth/auth-shell.tsx`** — create server component
   - Props: `heroHeadline`, `heroBody`, `formTitle`, `formSubtitle`, `children: React.ReactNode`
   - Outer: `relative flex flex-col md:flex-row min-h-screen pt-20`
   - Hero panel: `hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden`
     - Next.js `<Image>` with `fill` sizing, `object-cover`, `opacity-90`, `mix-blend-multiply`, `grayscale-[20%]`
     - Gradient overlay: `absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent`
     - Copy anchored to bottom: `absolute bottom-0 left-0 right-0 p-8 lg:p-12 z-10`
       - Headline: `text-5xl lg:text-7xl font-bold tracking-tight text-on-primary mb-4`
       - Body: `text-lg lg:text-xl font-light text-on-primary opacity-90 max-w-md leading-relaxed`
   - Form panel: `flex-1 md:w-1/2 lg:w-2/5 bg-background flex items-center justify-center p-8 md:p-12 lg:p-20`
     - Form title: `text-3xl font-bold text-primary mb-2`
     - Form subtitle: `text-on-surface-variant mb-8`
     - `{children}` below subtitle

4. **`src/app/(auth)/layout.tsx`** — replace passthrough
   ```tsx
   export default function AuthLayout({ children }: { children: React.ReactNode }) {
     return <div className="min-h-screen bg-background">{children}</div>
   }
   ```

5. **`src/app/(auth)/login/page.tsx`** — replace Card wrapper
   - Remove: `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` imports
   - Remove: outer `<div className="flex min-h-[calc(100vh-4rem)]...">` and `<Card>` wrapper
   - Add: `<AuthShell>` with login props (see B3-login above)
   - Keep: session guard, `?reset=success` banner (move inside form panel before `<SignInButton />`)
   - `?reset=success` banner styling: `mb-4 rounded-xl bg-surface-container-low px-4 py-3 text-sm text-primary`

6. **`src/app/(auth)/register/page.tsx`** — replace Card wrapper (same swap pattern)

7. **`src/app/(auth)/forgot-password/page.tsx`** — replace Card wrapper (same swap pattern)

8. **`src/app/(auth)/reset-password/page.tsx`** — replace Card wrapper
   - Keep existing `<Suspense>` wrapping `<ResetPasswordForm />` as `children` passed to `<AuthShell>`

### Verification

```bash
pnpm lint && pnpm typecheck
```

Manual:
- `/login` — full viewport, brand bar visible, hero panel on desktop (`md+`), form on right
- Mobile viewport — hero hidden, form fills width, brand bar still present
- `/register`, `/forgot-password`, `/reset-password` — correct hero headline and form title per route
- `/login` while authenticated → redirects to `/app`
- `/login?reset=success` — success banner renders above the form fields
- Sign in with valid credentials → redirects to `/app`

---

## V2 — Form Atelier Token Pass

**What ships:** All 4 form components (`SignInButton`, `SignUpForm`, `ForgotPasswordForm`, `ResetPasswordForm`) restyled with Atelier light design tokens. Inputs use filled `surface-container-low` surfaces. Buttons use soft-depth primary. Focus rings are ghost borders. Password fields get a visibility toggle. Forgot-password link moves adjacent to the password field.

**Demo:** Open `/login` — input fields are cream-filled with no border, no hard outline. Focus an input — subtle ghost ring appears. The "Forgot password?" link sits inline at the right of the password label row. "Log in" button is dark navy with `active:scale-95` press effect. Text links ("Don't have an account?") use `font-bold text-primary`.

**Depends on:** V1 shipped. `AuthShell` renders `{children}` — token pass affects only the child form components.

### Affordances

| ID | Affordance | Type |
|----|------------|------|
| B6-inputs | Input fields — `bg-surface-container-low border-none focus:ring-1 focus:ring-primary/20 rounded-xl py-4 px-5 text-on-surface placeholder:text-outline/50 outline-none transition-all` | Styling |
| B6-labels | Labels — `text-sm font-semibold text-primary mb-2` | Styling |
| B6-password | Password fields — same input styling + `pr-12`; visibility toggle button `absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors` using `<Eye>` / `<EyeOff>` Lucide icons | Styling |
| B6-forgot | Forgot-password link row — `flex items-center justify-between mb-2` wrapping label + `<Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>` | Layout |
| B6-button | Primary CTA — `w-full bg-primary text-on-primary font-bold py-4 rounded-xl hover:bg-primary-container active:scale-95 transition-all duration-300 shadow-xl shadow-primary/5` | Styling |
| B6-links | Tertiary text links — `font-bold text-primary hover:underline`; wrapper prose: `text-sm text-on-surface-variant text-center` | Styling |
| B6-error | Error state — `text-sm text-destructive mt-1` (no change from current, already correct) | Styling |

### Tasks

1. **`src/components/auth/sign-in-button.tsx`**
   - Apply Atelier classes to email `<Input>` and password `<Input>`
   - Wrap password label + forgot-password link in `flex items-center justify-between` row
   - Move `<Link href="/forgot-password">` from bottom of form to that label row (remove it from bottom)
   - Add password visibility toggle: `useState` for `showPassword`, toggle `type="password"/"text"`, `<EyeOff>` / `<Eye>` icon button positioned absolutely inside a `relative` wrapper
   - Apply Atelier classes to `<Button type="submit">`
   - Restyle "Don't have an account?" link row

2. **`src/components/auth/sign-up-form.tsx`**
   - Apply Atelier classes to all 4 inputs (name, email, password, confirm password)
   - Add password visibility toggles to both password fields
   - Apply Atelier classes to submit `<Button>`
   - Restyle "Already have an account?" link row

3. **`src/components/auth/forgot-password-form.tsx`**
   - Apply Atelier classes to email `<Input>`
   - Apply Atelier classes to submit `<Button>`
   - Restyle any secondary links

4. **`src/components/auth/reset-password-form.tsx`**
   - Apply Atelier classes to both password inputs
   - Add visibility toggle to both password fields
   - Apply Atelier classes to submit `<Button>`

### Verification

```bash
pnpm lint && pnpm typecheck
```

Manual:
- `/login` — inputs have cream fill (`surface-container-low`), no visible border at rest, ghost ring on focus; "Forgot password?" is inline right of the password label
- "Log in" button is navy (`bg-primary`), scales down on click
- `/register` — all 4 fields styled; both password fields have visibility toggle icons
- `/forgot-password`, `/reset-password` — consistent token application
- Responsive: tokens hold on mobile single-column layout
