"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { resetPassword } from "@/lib/auth-client"

const INPUT_CLASS_NAME =
  "w-full rounded-xl border-0 bg-input px-5 py-4 text-foreground outline-none transition-all placeholder:text-[#737780]/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50"

const PASSWORD_INPUT_CLASS_NAME = `${INPUT_CLASS_NAME} pr-12`

const PRIMARY_BUTTON_CLASS_NAME =
  "w-full rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-xl shadow-primary/5 transition-all duration-300 hover:bg-[#003366] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"

const SECONDARY_LINK_CLASS_NAME =
  "block w-full rounded-xl bg-muted py-4 text-center font-semibold text-primary transition-all duration-300 hover:bg-[var(--al-surface-container-high)]"

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
      <div className="w-full space-y-5 text-center">
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {error === "invalid_token"
            ? "This password reset link is invalid or has expired."
            : "No reset token provided."}
        </p>
        {/* BOUNDARY: auth-redesign-v2 keeps the invalid-token path limited to requesting a new reset link. */}
        <Link href="/forgot-password" className={SECONDARY_LINK_CLASS_NAME}>
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
      const result = await resetPassword({
        newPassword: password,
        token,
      })

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
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-semibold text-primary"
        >
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
            autoComplete="new-password"
            aria-describedby={formError ? "reset-password-error" : undefined}
            aria-invalid={formError ? "true" : undefined}
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
            autoComplete="new-password"
            aria-describedby={formError ? "reset-password-error" : undefined}
            aria-invalid={formError ? "true" : undefined}
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

      {formError && (
        <p
          id="reset-password-error"
          role="alert"
          aria-live="polite"
          className="text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      <button
        type="submit"
        className={PRIMARY_BUTTON_CLASS_NAME}
        disabled={isPending}
      >
        {isPending ? "Resetting..." : "Reset password"}
      </button>
    </form>
  )
}
