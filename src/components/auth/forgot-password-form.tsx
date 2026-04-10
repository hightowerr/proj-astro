"use client"

import { useState } from "react"
import Link from "next/link"
import { requestPasswordReset } from "@/lib/auth-client"

const INPUT_CLASS_NAME =
  "w-full rounded-xl border-0 bg-input px-5 py-4 text-foreground outline-none transition-all placeholder:text-[#737780]/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50"

const PRIMARY_BUTTON_CLASS_NAME =
  "w-full rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-xl shadow-primary/5 transition-all duration-300 hover:bg-[#003366] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"

const SECONDARY_LINK_CLASS_NAME =
  "block w-full rounded-xl bg-muted py-4 text-center font-semibold text-primary transition-all duration-300 hover:bg-[var(--al-surface-container-high)]"

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
      const result = await requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      })

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
      <div className="w-full space-y-5 text-center">
        {/* BOUNDARY: auth-redesign-v2 keeps the existing reset-link flow and only restyles the truthful dev delivery state. */}
        <p className="text-sm text-muted-foreground">
          If an account exists with that email, a password reset link has been sent.
          Check your terminal for the reset URL.
        </p>
        <Link href="/login" className={SECONDARY_LINK_CLASS_NAME}>
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
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
          aria-describedby={error ? "forgot-password-error" : undefined}
          aria-invalid={error ? "true" : undefined}
          className={INPUT_CLASS_NAME}
        />
      </div>

      {error && (
        <p
          id="forgot-password-error"
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
