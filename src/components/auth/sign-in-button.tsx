"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { signIn, useSession } from "@/lib/auth-client"

const INPUT_CLASS_NAME =
  "w-full rounded-xl border-0 bg-input px-5 py-4 text-foreground outline-none transition-all placeholder:text-[#737780]/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50"

const PASSWORD_INPUT_CLASS_NAME = `${INPUT_CLASS_NAME} pr-12`

const PRIMARY_BUTTON_CLASS_NAME =
  "w-full rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-xl shadow-primary/5 transition-all duration-300 hover:bg-[#003366] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"

export function SignInButton() {
  const { data: session } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)

  if (session) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsPending(true)

    try {
      const result = await signIn.email({
        email,
        password,
      })

      if (result.error) {
        setError(result.error.message || "Failed to sign in")
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
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      {/* BOUNDARY: auth-redesign-v2 styles the existing email/password login only; no social auth controls ship in this slice. */}
      {/* TODO: Stitch polish — no loading skeleton on session check; acceptable while the server guard owns initial auth gating. */}
      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-semibold text-primary"
        >
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
          autoComplete="email"
          aria-describedby={error ? "sign-in-error" : undefined}
          aria-invalid={error ? "true" : undefined}
          className={INPUT_CLASS_NAME}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-semibold text-primary">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
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
            autoComplete="current-password"
            aria-describedby={error ? "sign-in-error" : undefined}
            aria-invalid={error ? "true" : undefined}
            className={PASSWORD_INPUT_CLASS_NAME}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            disabled={isPending}
            className="absolute top-1/2 right-4 -translate-y-1/2 text-[#737780] transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {error && (
        <p
          id="sign-in-error"
          role="alert"
          aria-live="polite"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        className={PRIMARY_BUTTON_CLASS_NAME}
        disabled={isPending}
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
