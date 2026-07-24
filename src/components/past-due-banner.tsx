"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"

export function PastDueBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [pending, setPending] = useState(false)

  if (dismissed) return null

  async function handleUpdatePayment() {
    setPending(true)
    try {
      await authClient.customer.portal()
    } catch {
      setPending(false)
    }
  }

  return (
    <div
      role="alert"
      className="mx-4 mt-4 rounded-xl border border-[rgba(201,122,42,0.35)] bg-[rgba(201,122,42,0.10)] px-5 py-4 lg:mx-6"
    >
      <div className="flex items-start gap-4">
        {/* Warning icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(201,122,42,0.20)]">
          <span
            className="material-symbols-outlined text-xl text-[#c97a2a]"
            aria-hidden="true"
          >
            warning
          </span>
        </div>

        {/* Copy */}
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-al-on-surface">
            We couldn&apos;t charge your card
          </h3>
          <p className="mt-1 text-[13.5px] leading-relaxed text-al-on-surface-variant">
            Protection is still active. Update your payment method to avoid a
            pause on deposits and slot recovery.
          </p>
        </div>

        {/* CTA + dismiss */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleUpdatePayment}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#003366] px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span
              className="material-symbols-outlined text-base"
              aria-hidden="true"
            >
              credit_card
            </span>
            {pending ? "Redirecting\u2026" : "Update payment method"}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1.5 text-al-on-surface-variant transition-colors hover:bg-[rgba(201,122,42,0.15)]"
            aria-label="Dismiss payment warning"
          >
            <span
              className="material-symbols-outlined text-lg"
              aria-hidden="true"
            >
              close
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
