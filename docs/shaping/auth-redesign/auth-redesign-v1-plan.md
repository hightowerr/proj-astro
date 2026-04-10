---
shaping: true
---

# Auth Redesign — V1 Implementation Plan

**Slice:** V1 — Shell + Route Wiring  
**Slices doc:** `auth-redesign-slices.md`  
**Date:** 2026-04-10

---

## Pre-flight Findings

1. **`next.config.ts`** — `images.unsplash.com` is already in `remotePatterns`. No change needed.
2. **Token mapping** — Atelier tokens live as CSS vars (`--al-*`) and are bridged to Tailwind via the shadcn compat layer in `globals.css`. Relevant mappings:
   - `bg-background` = `#f9f9f7`
   - `bg-primary` = `#001e40`
   - `text-primary-foreground` = `#ffffff`
   - `text-muted-foreground` = `#43474f`
   - `from-primary/60` — valid via Tailwind v4 opacity modifiers (`--color-primary` defined in `@theme inline`)
   - `.font-manrope` utility class already defined in `globals.css`

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/auth/auth-brand-bar.tsx` | Fixed glassmorphic top bar — wordmark + desktop tagline |
| `src/components/auth/auth-shell.tsx` | Split-screen frame — brand bar, hero panel, form panel |

## Files to Modify

| File | Change |
|------|--------|
| `src/app/(auth)/layout.tsx` | Replace passthrough with `min-h-screen bg-background` wrapper |
| `src/app/(auth)/login/page.tsx` | Swap Card for `<AuthShell>` with login props; keep session guard + `?reset=success` banner |
| `src/app/(auth)/register/page.tsx` | Swap Card for `<AuthShell>` with register props |
| `src/app/(auth)/forgot-password/page.tsx` | Swap Card for `<AuthShell>` with forgot-password props |
| `src/app/(auth)/reset-password/page.tsx` | Swap Card for `<AuthShell>` with reset-password props; keep `<Suspense>` |

---

## Step 1 — `src/components/auth/auth-brand-bar.tsx`

Server component. Fixed glassmorphic bar. Wordmark only — no nav, no marketing links.

```tsx
export function AuthBrandBar() {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#f9f9f7]/80 backdrop-blur-xl px-6 py-6 md:px-12">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <a href="/" className="text-xl font-bold tracking-tighter text-primary font-manrope">
          Astro
        </a>
        <span className="hidden md:block text-muted-foreground text-sm font-medium tracking-wide font-manrope">
          Manage your bookings with ease
        </span>
      </div>
    </header>
  )
}
```

---

## Step 2 — `src/components/auth/auth-shell.tsx`

Server component. Hero image is a constant (same Unsplash photo on all 4 routes).

**Mobile:** brand bar is `fixed`, so the form panel uses `pt-24` on mobile to clear it. On `md+`, content is `items-center` inside `min-h-screen` — sits naturally at ~50vh, well below the 72px bar.

**Fallback note:** if `from-primary/60` fails at build time, replace with `from-[#001e40]/60`.

```tsx
import Image from "next/image"
import { AuthBrandBar } from "./auth-brand-bar"

type AuthShellProps = {
  heroHeadline: string
  heroBody: string
  formTitle: string
  formSubtitle: string
  children: React.ReactNode
}

export function AuthShell({
  heroHeadline,
  heroBody,
  formTitle,
  formSubtitle,
  children,
}: AuthShellProps) {
  return (
    <div className="font-manrope relative flex flex-col md:flex-row min-h-screen">
      <AuthBrandBar />

      {/* Hero panel — desktop only */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1920&q=80"
          alt="Hairstylist working in a bright salon"
          fill
          className="object-cover opacity-90 mix-blend-multiply grayscale-[20%]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 z-10">
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-primary-foreground mb-4">
            {heroHeadline}
          </h1>
          <p className="text-lg lg:text-xl font-light text-primary-foreground opacity-90 max-w-md leading-relaxed">
            {heroBody}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 md:w-1/2 lg:w-2/5 bg-background flex items-center justify-center p-8 pt-24 md:p-12 lg:p-20">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-bold text-primary mb-2">{formTitle}</h2>
          <p className="text-muted-foreground mb-8">{formSubtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
```

---

## Step 3 — `src/app/(auth)/layout.tsx`

Replace passthrough `<>{children}</>` with a minimal wrapper.

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>
}
```

---

## Step 4 — `src/app/(auth)/login/page.tsx`

Remove: `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` imports and wrapper div with `min-h-[calc(100vh-4rem)]`.

The `?reset=success` banner moves inside children (before `<SignInButton />`).

```tsx
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { SignInButton } from "@/components/auth/sign-in-button"
import { AuthShell } from "@/components/auth/auth-shell"
import { auth } from "@/lib/auth"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect("/app")

  const { reset } = await searchParams

  return (
    <AuthShell
      heroHeadline="The Modern Atelier."
      heroBody="Elevate your appointment experience with precision tools designed for the artisan."
      formTitle="Log in"
      formSubtitle="Welcome back. Please enter your details."
    >
      <>
        {reset === "success" && (
          <div className="mb-4 rounded-xl bg-muted px-4 py-3 text-sm text-primary">
            Password reset successfully. Please sign in with your new password.
          </div>
        )}
        <SignInButton />
      </>
    </AuthShell>
  )
}
```

---

## Step 5 — `src/app/(auth)/register/page.tsx`

```tsx
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { auth } from "@/lib/auth"

export default async function RegisterPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect("/app")

  return (
    <AuthShell
      heroHeadline="Your Studio Starts Here."
      heroBody="Join the platform built for beauty professionals who take their craft seriously."
      formTitle="Create an account"
      formSubtitle="Set up your account and you'll be booking in minutes."
    >
      <SignUpForm />
    </AuthShell>
  )
}
```

---

## Step 6 — `src/app/(auth)/forgot-password/page.tsx`

```tsx
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { auth } from "@/lib/auth"

export default async function ForgotPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect("/app")

  return (
    <AuthShell
      heroHeadline="We've Got You."
      heroBody="A fresh start is just one email away."
      formTitle="Reset your password"
      formSubtitle="Enter your email and we'll send a reset link to your terminal."
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
```

---

## Step 7 — `src/app/(auth)/reset-password/page.tsx`

Keep the existing `<Suspense>` — `<ResetPasswordForm />` reads `useSearchParams()` internally, which requires a suspense boundary in Next.js App Router.

```tsx
import { Suspense } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { AuthShell } from "@/components/auth/auth-shell"
import { auth } from "@/lib/auth"

export default async function ResetPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect("/app")

  return (
    <AuthShell
      heroHeadline="Almost There."
      heroBody="Choose a strong password and get back to doing what you love."
      formTitle="Set a new password"
      formSubtitle="Your reset link is valid for 1 hour."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  )
}
```

---

## Testing

### Automated (run myself)

After steps 1–2 (components created, pages untouched):
```bash
pnpm typecheck
```
Catches type errors in the new components before touching any pages.

After steps 3–7 (all pages wired):
```bash
pnpm lint && pnpm typecheck
```
Catches: unused Card imports left in pages, wrong prop names on `AuthShell`, Image import issues.

```bash
pnpm build
```
Catches SSR errors the type checker misses — whether `from-primary/60` compiles in the CSS output, and whether any `async` server component boundary issue surfaces.

### Visual checklist (requires `pnpm dev`)

| Check | Expected |
|-------|----------|
| `/login` desktop (`≥768px`) | Brand bar fixed at top, hero panel left with "The Modern Atelier.", form right |
| `/login` mobile (`<768px`) | Hero hidden, form fills width, brand bar still visible at top |
| `/register` | "Your Studio Starts Here." hero, "Create an account" form title |
| `/forgot-password` | "We've Got You." hero, "Reset your password" form title |
| `/reset-password` | "Almost There." hero, "Set a new password" form title |
| Authenticated visit to any auth route | Immediate redirect to `/app` — no form flash |
| `/login?reset=success` | Muted banner above the sign-in form |
| All 4 routes | No marketing `SiteHeader` visible |
