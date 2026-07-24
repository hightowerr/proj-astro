"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"

interface CheckoutButtonProps {
  label: string
  slug: string
}

export function CheckoutButton({ label, slug }: CheckoutButtonProps) {
  const [pending, setPending] = useState(false)

  async function handleCheckout() {
    setPending(true)
    try {
      const result = await authClient.checkout({ slug })
      if (result.data?.url) {
        window.location.href = result.data.url
      }
    } catch {
      // If checkout fails, allow retry
      setPending(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={pending}
      className="w-full rounded-xl bg-[image:var(--al-gradient-cta)] px-6 py-[15px] text-[15.5px] font-extrabold tracking-[.01em] text-al-on-primary shadow-[var(--al-shadow-mark)] transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Redirecting\u2026" : label}
    </button>
  )
}
