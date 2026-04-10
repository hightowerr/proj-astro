---
shaping: true
---

# Auth Redesign — V2 Implementation Plan

**Slice:** V2 — Form Atelier Token Pass  
**Slices doc:** `auth-redesign-slices.md`  
**Date:** 2026-04-10

---

## Pre-flight Findings

Reading all 4 form components:

1. **All components** use `<Input>`, `<Label>`, `<Button>` from shadcn. These will be replaced with native `<input>`, `<label>`, `<button>` elements — cleaner than fighting shadcn's default className merging.

2. **Token gaps** — two Atelier tokens are not in `@theme inline` and have no Tailwind utility:
   - `--al-primary-container: #003366` → use `hover:bg-[#003366]`
   - `--al-outline: #737780` → use `text-[#737780]` and `placeholder:text-[#737780]/50`
   - Everything else maps: `bg-input` = `#f4f4f2`, `text-primary` = `#001e40`, `text-primary-foreground` = `#ffffff`, `text-muted-foreground` = `#43474f`, `bg-muted` = `#eeeeec`, `ring-primary/20` works via Tailwind v4 opacity modifier.

3. **Lucide React** is already in the project (`Eye`/`EyeOff` available). No new dependency needed.

4. **Forgot-password link** in `sign-in-button.tsx` currently sits at the bottom of the form as a standalone link. It moves to inline-right of the password label row.

5. **`ResetPasswordForm`** has no sign-in link at the bottom — shaping doc doesn't add one, leave as-is.

6. **`ForgotPasswordForm` success state** and **`ResetPasswordForm` invalid token state** both use `<Button variant="outline">` — replaced with a secondary `<Link>` styled as a soft button.

---

## Shared Token Classes

Defined once here, used verbatim in every step:

| Element | Classes |
|---------|---------|
| Label (standard) | `block text-sm font-semibold text-primary mb-2` |
| Input (text/email) | `w-full bg-input border-0 rounded-xl py-4 px-5 text-foreground placeholder:text-[#737780]/50 outline-none focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50` |
| Input (password) | same as above + `pr-12` |
| Password wrapper | `relative` |
| Visibility toggle | `absolute right-4 top-1/2 -translate-y-1/2 text-[#737780] hover:text-primary transition-colors` + `type="button"` |
| Primary CTA | `w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-[#003366] active:scale-95 transition-all duration-300 shadow-xl shadow-primary/5 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100` |
| Secondary action link | `block w-full bg-muted text-primary font-semibold py-4 rounded-xl hover:bg-[var(--al-surface-container-high)] transition-all duration-300 text-center` |
| Tertiary link | `font-bold text-primary hover:underline` |
| Link row wrapper | `text-center text-sm text-muted-foreground` |
| Forgot-pw label row | `flex items-center justify-between mb-2` |
| Error message | `text-sm text-destructive` _(no change)_ |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/auth/sign-in-button.tsx` | Native elements; visibility toggle on password; forgot-pw link moves to label row |
| `src/components/auth/sign-up-form.tsx` | Native elements; visibility toggle on both password fields |
| `src/components/auth/forgot-password-form.tsx` | Native elements; styled success state |
| `src/components/auth/reset-password-form.tsx` | Native elements; visibility toggle on both password fields; styled invalid-token state |

---

## Step 1 — `src/components/auth/sign-in-button.tsx`

Changes:
- Remove `Button`, `Input`, `Label` imports
- Add `Eye`, `EyeOff` from `lucide-react`
- Add `showPassword` state
- Email field: label + native input
- Password field: forgot-pw link moves into the label row; native input with `pr-12`; visibility toggle
- Remove the standalone "Forgot password?" link block at the bottom

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "@/lib/auth-client"

export function SignInButton() {
  const { data: session, isPending: sessionPending } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  if (sessionPending) {
    return (
      <button
        disabled
        className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl opacity-60 cursor-not-allowed"
      >
        Loading...
      </button>
    )
  }

  if (session) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsPending(true)
    try {
      const result = await signIn.email({ email, password, callbackURL: "/app" })
      if (result.error) {
        setError(result.error.message || "Failed to sign in")
      } else {
        router.push("/app")
        router.refresh()
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full">
      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-primary mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
          className="w-full bg-input border-0 rounded-xl py-4 px-5 text-foreground placeholder:text-[#737780]/50 outline-none focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
        />
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="password" className="text-sm font-semibold text-primary">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isPending}
            className="w-full bg-input border-0 rounded-xl py-4 px-5 pr-12 text-foreground placeholder:text-[#737780]/50 outline-none focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737780] hover:text-primary transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-[#003366] active:scale-95 transition-all duration-300 shadow-xl shadow-primary/5 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        New to Astro?{" "}
        <Link href="/register" className="font-bold text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  )
}
```

---

## Step 2 — `src/components/auth/sign-up-form.tsx`

Changes:
- Remove `Button`, `Input`, `Label` imports
- Add `Eye`, `EyeOff` from `lucide-react`
- Add `showPassword`, `showConfirmPassword` states
- All 4 fields use native elements; both password fields get visibility toggles

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { signUp } from "@/lib/auth-client"

export function SignUpForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    setIsPending(true)
    try {
      const result = await signUp.email({ name, email, password, callbackURL: "/app" })
      if (result.error) {
        setError(result.error.message || "Failed to create account")
      } else {
        window.location.assign("/app")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-primary mb-2">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isPending}
          className="w-full bg-input border-0 rounded-xl py-4 px-5 text-foreground placeholder:text-[#737780]/50 outline-none focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-primary mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
          className="w-full bg-input border-0 rounded-xl py-4 px-5 text-foreground placeholder:text-[#737780]/50 outline-none focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-primary mb-2">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isPending}
            className="w-full bg-input border-0 rounded-xl py-4 px-5 pr-12 text-foreground placeholder:text-[#737780]/50 outline-none focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737780] hover:text-primary transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-primary mb-2">
          Confirm Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isPending}
            className="w-full bg-input border-0 rounded-xl py-4 px-5 pr-12 text-foreground placeholder:text-[#737780]/50 outline-none focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737780] hover:text-primary transition-colors"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-[#003366] active:scale-95 transition-all duration-300 shadow-xl shadow-primary/5 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isPending ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
```

---

## Step 3 — `src/components/auth/forgot-password-form.tsx`

Changes:
- Remove `Button`, `Input`, `Label` imports
- Success state: replace `<Button variant="outline">` with a styled `<Link>`
- Form: native email input + primary CTA button

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { requestPasswordReset } from "@/lib/auth-client"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsPending(true)
    try {
      const result = await requestPasswordReset({ email, redirectTo: "/reset-password" })
      if (result.error) {
        setError(result.error.message || "Failed to send reset email")
      } else {
        setSuccess(true)
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsPending(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-5 w-full text-center">
        <p className="text-sm text-muted-foreground">
          If an account exists with that email, a password reset link has been sent.
          Check your terminal for the reset URL.
        </p>
        <Link
          href="/login"
          className="block w-full bg-muted text-primary font-semibold py-4 rounded-xl hover:bg-[var(--al-surface-container-high)] transition-all duration-300 text-center"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-primary mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
          className="w-full bg-input border-0 rounded-xl py-4 px-5 text-foreground placeholder:text-[#737780]/50 outline-none focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-[#003366] active:scale-95 transition-all duration-300 shadow-xl shadow-primary/5 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isPending ? "Sending..." : "Send reset link"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
```

---

## Step 4 — `src/components/auth/reset-password-form.tsx`

Changes:
- Remove `Button`, `Input`, `Label` imports
- Add `Eye`, `EyeOff` from `lucide-react`
- Add `showPassword`, `showConfirmPassword` states
- Invalid token state: replace `<Button variant="outline">` with styled `<Link>`
- Both password fields get visibility toggles
- No sign-in link added at the bottom (not in shaping doc scope)

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { resetPassword } from "@/lib/auth-client"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const error = searchParams.get("error")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formError, setFormError] = useState("")
  const [isPending, setIsPending] = useState(false)

  if (error === "invalid_token" || !token) {
    return (
      <div className="space-y-5 w-full text-center">
        <p className="text-sm text-destructive">
          {error === "invalid_token"
            ? "This password reset link is invalid or has expired."
            : "No reset token provided."}
        </p>
        <Link
          href="/forgot-password"
          className="block w-full bg-muted text-primary font-semibold py-4 rounded-xl hover:bg-[var(--al-surface-container-high)] transition-all duration-300 text-center"
        >
          Request a new link
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")
    if (password !== confirmPassword) {
      setFormError("Passwords do not match")
      return
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters")
      return
    }
    setIsPending(true)
    try {
      const result = await resetPassword({ newPassword: password, token })
      if (result.error) {
        setFormError(result.error.message || "Failed to reset password")
      } else {
        router.push("/login?reset=success")
      }
    } catch {
      setFormError("An unexpected error occurred")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full">
      {/* New Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-primary mb-2">
          New Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isPending}
            className="w-full bg-input border-0 rounded-xl py-4 px-5 pr-12 text-foreground placeholder:text-[#737780]/50 outline-none focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737780] hover:text-primary transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-primary mb-2">
          Confirm New Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isPending}
            className="w-full bg-input border-0 rounded-xl py-4 px-5 pr-12 text-foreground placeholder:text-[#737780]/50 outline-none focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737780] hover:text-primary transition-colors"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-[#003366] active:scale-95 transition-all duration-300 shadow-xl shadow-primary/5 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        {isPending ? "Resetting..." : "Reset password"}
      </button>
    </form>
  )
}
```

---

## Testing

### Automated (run myself)

After all 4 components are updated:
```bash
pnpm lint && pnpm typecheck
```
Catches: leftover `Button`/`Input`/`Label` imports, missing `type="button"` on toggle buttons (lint won't catch the latter but typecheck will surface JSX issues).

```bash
pnpm build
```
Catches: any SSR boundary issue from `Eye`/`EyeOff` inside `"use client"` components (should be fine — lucide components are isomorphic), and confirms `hover:bg-[var(--al-surface-container-high)]` compiles without errors.

### Visual checklist (requires `pnpm dev`)

| Check | Expected |
|-------|----------|
| `/login` — input at rest | Cream fill (`#f4f4f2`), no visible border |
| `/login` — input focused | Ghost ring appears, no hard outline |
| `/login` — password field | Eye icon visible on the right; clicking toggles `type` |
| `/login` — "Forgot password?" | Inline right of the Password label, not below the button |
| `/login` — submit | Button scales down on press (`active:scale-95`) |
| `/login` — submit disabled | Button fades to 60% opacity, cursor is not-allowed |
| `/register` — both password fields | Each has its own independent visibility toggle |
| `/forgot-password` — success state | Muted soft button links back to sign in |
| `/reset-password?token=x` | Both password fields have visibility toggles |
| `/reset-password` (no token) | Error message + soft "Request a new link" link |
| All forms — error state | Red destructive text, no layout shift |
| Mobile (all routes) | Tokens hold; no overflow from `pr-12` on inputs |
