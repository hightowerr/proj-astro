"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getSubscriptionStatus } from "./actions"

const POLL_INTERVAL = 2_000
const FALLBACK_THRESHOLD = 7  // ~14 seconds (7 polls x 2s)
const MAX_POLLS = 60          // stop after ~2 minutes (60 polls x 2s)

type Phase = "processing" | "fallback"

export default function ProcessingPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("processing")
  const [checking, setChecking] = useState(false)
  const pollCount = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const poll = async () => {
    try {
      const status = await getSubscriptionStatus()
      if (status === "active") {
        router.replace("/app/dashboard")
        return
      }
    } catch {
      // Server action failed (auth redirect, network) — keep polling
    }

    pollCount.current += 1
    if (pollCount.current >= FALLBACK_THRESHOLD && phase === "processing") {
      setPhase("fallback")
    }

    if (pollCount.current >= MAX_POLLS) return
    timerRef.current = setTimeout(poll, POLL_INTERVAL)
  }

  useEffect(() => {
    poll()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCheckAgain = async () => {
    setChecking(true)
    try {
      const status = await getSubscriptionStatus()
      if (status === "active") {
        router.replace("/app/dashboard")
        return
      }
    } catch {
      // Ignore — button returns to idle
    }
    setChecking(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-al-surface-low px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-[440px] text-center">
        {phase === "processing" ? (
          <ProcessingState />
        ) : (
          <FallbackState checking={checking} onCheckAgain={handleCheckAgain} />
        )}
      </div>
    </div>
  )
}

/* ---------- Processing state ---------- */

function ProcessingState() {
  return (
    <div className="flex flex-col items-center">
      {/* Spinner + lock icon */}
      <div className="relative mb-[30px] h-[76px] w-[76px] sm:h-[76px] sm:w-[76px]">
        <div className="al-spinner" />
        <span className="material-symbols-outlined absolute inset-0 m-auto h-[26px] w-[26px] text-[26px] text-al-primary">
          lock
        </span>
      </div>

      {/* Label */}
      <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[.2em] text-al-on-surface-variant/70">
        Payment received
      </div>

      {/* Heading with animated dots */}
      <h2 className="mb-3 text-[28px] font-extrabold leading-[1.15] tracking-tight text-al-primary [text-wrap:pretty] sm:text-[28px]">
        Activating your shop
        <span className="al-dots font-mono">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </h2>

      {/* Body */}
      <p className="mb-[30px] max-w-[360px] text-[15px] leading-relaxed text-al-on-surface-variant [text-wrap:pretty]">
        Thanks &mdash; your payment went through. We&rsquo;re switching
        everything back on and you&rsquo;ll be at your dashboard in a moment.
      </p>

      {/* Auto-refresh pill */}
      <div className="inline-flex items-center gap-[9px] rounded-full bg-al-surface-container-lowest px-4 py-[9px] shadow-[var(--al-shadow-float)]">
        <span className="material-symbols-outlined text-[17px] text-[#0e7a55]">
          check_circle
        </span>
        <span className="text-[13px] font-semibold text-al-on-surface">
          No need to refresh &mdash; this happens automatically
        </span>
      </div>
    </div>
  )
}

/* ---------- Fallback state ---------- */

function FallbackState({
  checking,
  onCheckAgain,
}: {
  checking: boolean
  onCheckAgain: () => void
}) {
  return (
    <div className="flex flex-col items-center">
      {/* Verified icon */}
      <span className="mb-6 inline-grid h-[60px] w-[60px] place-items-center rounded-full bg-[linear-gradient(135deg,#fdd8cb,#e2bfb3)]">
        <span className="material-symbols-outlined text-[30px] text-[#8a4a38]">
          verified
        </span>
      </span>

      {/* Label */}
      <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[.2em] text-[#8a4a38]">
        Payment confirmed
      </div>

      {/* Heading */}
      <h2 className="mb-3.5 text-[28px] font-extrabold leading-[1.15] tracking-tight text-al-primary [text-wrap:pretty] sm:text-[28px]">
        Your payment was received
      </h2>

      {/* Body */}
      <p className="mb-7 max-w-[400px] text-[15px] leading-relaxed text-al-on-surface-variant [text-wrap:pretty]">
        This is taking a little longer than usual. If your dashboard
        doesn&rsquo;t unlock in the next minute, re-check below or refresh the
        page &mdash; your subscription is safe either way.
      </p>

      {/* CTA button */}
      <button
        onClick={onCheckAgain}
        disabled={checking}
        className="inline-flex items-center gap-[9px] rounded-xl bg-[image:var(--al-gradient-cta)] px-7 py-3.5 text-[15px] font-extrabold tracking-[.01em] text-al-on-primary shadow-[var(--al-shadow-cta)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[19px]">refresh</span>
        {checking ? "Checking\u2026" : "Check again"}
      </button>

      {/* Support link */}
      <div className="mt-5 flex items-center gap-[7px]">
        <span className="material-symbols-outlined text-[16px] text-al-on-surface-variant">
          mail
        </span>
        <span className="text-[13px] text-al-on-surface-variant">
          Still stuck?{" "}
          <a href="mailto:support@showup.app" className="font-bold">
            Contact support
          </a>{" "}
          and we&rsquo;ll sort it out.
        </span>
      </div>
    </div>
  )
}
