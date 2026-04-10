"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { signUp } from "@/lib/auth-client"

const INPUT_CLASS_NAME =
  "w-full rounded-xl border-0 bg-input px-5 py-4 text-foreground outline-none transition-all placeholder:text-[#737780]/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50"

const PASSWORD_INPUT_CLASS_NAME = `${INPUT_CLASS_NAME} pr-12`

const PRIMARY_BUTTON_CLASS_NAME =
  "w-full rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-xl shadow-primary/5 transition-all duration-300 hover:bg-[#003366] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"

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
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError("Name is required")
      return
    }

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
      const result = await signUp.email({
        name: trimmedName,
        email,
        password,
      })

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
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      {/* BOUNDARY: auth-redesign-v2 keeps the existing four-field signup contract and does not add onboarding/business fields. */}
      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-semibold text-primary"
        >
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
          autoComplete="name"
          aria-describedby={error ? "sign-up-error" : undefined}
          aria-invalid={error ? "true" : undefined}
          className={INPUT_CLASS_NAME}
        />
      </div>

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
          aria-describedby={error ? "sign-up-error" : undefined}
          aria-invalid={error ? "true" : undefined}
          className={INPUT_CLASS_NAME}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-semibold text-primary"
        >
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
            autoComplete="new-password"
            aria-describedby={error ? "sign-up-error" : undefined}
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

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-semibold text-primary"
        >
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
            autoComplete="new-password"
            aria-describedby={error ? "sign-up-error" : undefined}
            aria-invalid={error ? "true" : undefined}
            className={PASSWORD_INPUT_CLASS_NAME}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((value) => !value)}
            disabled={isPending}
            className="absolute top-1/2 right-4 -translate-y-1/2 text-[#737780] transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            aria-pressed={showConfirmPassword}
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {error && (
        <p
          id="sign-up-error"
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
