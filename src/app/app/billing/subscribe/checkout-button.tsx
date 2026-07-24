"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"

interface CheckoutButtonProps {
  label: string
  slug: string
}

export function CheckoutButton({ label, slug }: CheckoutButtonProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    setPending(true)
    setError(null)
    try {
      const result = await authClient.checkout({ slug })
      if (result.data?.url) {
        window.location.href = result.data.url
        return
      }
      setPending(false)
      setError("Something went wrong. Please try again.")
    } catch {
      setPending(false)
      setError("Something went wrong. Please try again.")
    }
  }

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={pending}
        className="w-full rounded-xl bg-[image:var(--al-gradient-cta)] px-6 py-[15px] text-[15.5px] font-extrabold tracking-[.01em] text-al-on-primary shadow-[var(--al-shadow-mark)] transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Redirecting\u2026" : label}
      </button>
      {error && (
        <p className="mt-2 text-center text-[13px] text-al-error">{error}</p>
      )}
    </div>
  )
}
