"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CancellationResponse } from "@/types/cancellation";

type Slot = { startsAt: string; endsAt: string };

type AvailabilityResponse = {
  date: string;
  timezone: string;
  slotMinutes: number;
  durationMinutes: number;
  slots: Slot[];
};
type AvailabilityErrorResponse = {
  error?: string;
};
type BookingErrorResponse = {
  error?: string;
};

type BookingFormProps = {
  shopSlug: string;
  shopName: string;
  timezone: string;
  slotMinutes: number;
  defaultDate: string;
  paymentsEnabled?: boolean;
  forcePaymentSimulator?: boolean;
  selectedEventTypeId?: string | null;
  selectedEventTypeName?: string | null;
  selectedDurationMinutes?: number | null;
};

type BookingResponse = {
  appointment: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    paymentStatus: string;
    paymentRequired: boolean;
    bookingUrl?: string | null;
  };
  amountCents: number;
  currency: string;
  paymentRequired: boolean;
  clientSecret: string | null;
  usePaymentSimulator?: boolean;
  bookingUrl?: string | null;
  manageToken?: string | null;
};

type BookingErrorState = {
  message: string;
};

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
let stripePromise: ReturnType<typeof loadStripe> | null = null;
const getStripePromise = () => {
  if (!stripeKey) {
    return null;
  }

  if (!stripePromise) {
    stripePromise = loadStripe(stripeKey);
  }

  return stripePromise;
};
const shouldLogDiagnostics =
  process.env.NEXT_PUBLIC_PLAYWRIGHT_STRIPE_BYPASS === "true" ||
  process.env.NEXT_PUBLIC_PLAYWRIGHT === "true";

const logBookingDiagnostic = (
  event: string,
  payload: Record<string, unknown> = {}
) => {
  if (!shouldLogDiagnostics) {
    return;
  }

  console.warn(`[booking-form] ${event}`, payload);

  if (typeof window !== "undefined") {
    void fetch("/api/diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, payload }),
    }).catch(() => {});
  }
};

const formatCurrency = (amountCents: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
};

const stripeElementsAppearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#3dd4c8",
    colorBackground: "#1d2738",
    colorText: "#edf2f7",
    colorDanger: "#f45878",
    borderRadius: "0.625rem",
  },
  rules: {
    ".Input": {
      backgroundColor: "#1d2738",
      border: "1px solid rgba(255,255,255,0.11)",
      color: "#edf2f7",
    },
    ".Input:focus": {
      border: "1px solid #3dd4c8",
      boxShadow: "0 0 0 3px rgba(61,212,200,0.14)",
    },
    ".Label": {
      color: "#8aa2bc",
      fontSize: "0.75rem",
      fontWeight: "600",
    },
    ".Tab": {
      backgroundColor: "#161e2c",
      border: "1px solid rgba(255,255,255,0.11)",
      color: "#8aa2bc",
    },
    ".Tab--selected": {
      backgroundColor: "#1d2738",
      border: "1px solid #3dd4c8",
      color: "#edf2f7",
    },
    ".Block": {
      backgroundColor: "#161e2c",
      border: "1px solid rgba(255,255,255,0.07)",
    },
  },
};

function PaymentStep({
  amountCents,
  currency,
  timezone,
  slotLabel,
  usePaymentSimulator,
  bookingUrl,
  returnUrl,
  onSuccess,
  onBack,
  onCancel,
  isCancelling,
  cancelError,
  serviceName,
  serviceDurationMinutes,
}: {
  amountCents: number;
  currency: string;
  timezone: string;
  slotLabel: string;
  usePaymentSimulator: boolean;
  bookingUrl?: string | null;
  returnUrl?: string | null;
  onSuccess: () => void;
  onBack: () => void;
  onCancel?: (() => Promise<void>) | undefined;
  isCancelling?: boolean;
  cancelError?: string | null;
  serviceName?: string | null;
  serviceDurationMinutes?: number | null;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [mockCardNumber, setMockCardNumber] = useState("");
  const [mockExpiry, setMockExpiry] = useState("");
  const [mockCvc, setMockCvc] = useState("");

  useEffect(() => {
    logBookingDiagnostic("payment-step-mounted", {
      amountCents,
      currency,
      hasBookingUrl: Boolean(bookingUrl),
      hasReturnUrl: Boolean(returnUrl),
      usePaymentSimulator,
    });
  }, [amountCents, bookingUrl, currency, returnUrl, usePaymentSimulator]);

  const handlePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentError(null);
    logBookingDiagnostic("payment-submit", {
      usePaymentSimulator,
      hasStripe: Boolean(stripe),
      hasElements: Boolean(elements),
      hasMockCardNumber: mockCardNumber.replace(/\s+/g, "").length >= 12,
    });

    if (usePaymentSimulator) {
      const normalizedCard = mockCardNumber.replace(/\s+/g, "");
      if (normalizedCard.length < 12) {
        logBookingDiagnostic("payment-submit-blocked", {
          reason: "mock-card-incomplete",
        });
        setPaymentError("Payment form is still loading.");
        return;
      }

      setIsPaying(true);
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (normalizedCard === "4000000000000002") {
        logBookingDiagnostic("payment-submit-result", {
          mode: "mock",
          outcome: "failed",
        });
        setPaymentError("Payment failed.");
        setIsPaying(false);
        return;
      }

      logBookingDiagnostic("payment-submit-result", {
        mode: "mock",
        outcome: "succeeded",
      });
      onSuccess();
      setIsPaying(false);
      return;
    }

    if (!stripe || !elements) {
      logBookingDiagnostic("payment-submit-blocked", {
        reason: "stripe-not-ready",
      });
      setPaymentError("Payment form is still loading.");
      return;
    }

    try {
      setIsPaying(true);
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl ?? window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        logBookingDiagnostic("payment-submit-result", {
          mode: "stripe",
          outcome: "error",
          message: error.message ?? "Payment failed.",
        });
        setPaymentError(error.message ?? "Payment failed.");
        return;
      }

      if (
        paymentIntent &&
        (paymentIntent.status === "succeeded" ||
          paymentIntent.status === "processing")
      ) {
        logBookingDiagnostic("payment-submit-result", {
          mode: "stripe",
          outcome: paymentIntent.status,
        });
        onSuccess();
        return;
      }

      logBookingDiagnostic("payment-submit-result", {
        mode: "stripe",
        outcome: paymentIntent?.status ?? "unknown",
      });
      setPaymentError("Payment requires additional confirmation.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
        <div className="space-y-6">
      <div className="p-4 space-y-1" style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--al-outline-variant)", background: "var(--al-surface-container-lowest)" }}>
        <p className="text-sm font-medium">Payment due</p>
        <p className="text-2xl font-semibold">
          {formatCurrency(amountCents, currency)}
        </p>
        {serviceName ? (
          <p className="text-sm font-medium">{serviceName}</p>
        ) : null}
        {serviceDurationMinutes ? (
          <p className="text-xs" style={{ color: "var(--al-on-surface-variant)" }}>
            {serviceDurationMinutes} minutes
          </p>
        ) : null}
        <p className="text-xs" style={{ color: "var(--al-on-surface-variant)" }}>
          Booking time: {slotLabel} ({timezone})
        </p>
      </div>

      <form onSubmit={handlePayment} className="space-y-4">
        {usePaymentSimulator ? (
          <div className="space-y-3 rounded-md border border-dashed p-3" style={{ borderColor: "var(--al-outline-variant)", background: "var(--al-surface-container-low)" }}>
            <p className="text-xs" style={{ color: "var(--al-on-surface-variant)" }}>Playwright payment simulator</p>
            <div className="space-y-2">
              <Label htmlFor="playwright-card-number">Card number</Label>
              <Input
                id="playwright-card-number"
                name="playwrightCardNumber"
                value={mockCardNumber}
                onChange={(event) => setMockCardNumber(event.target.value)}
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="playwright-card-expiry">Expiry</Label>
                <Input
                  id="playwright-card-expiry"
                  name="playwrightCardExpiry"
                  value={mockExpiry}
                  onChange={(event) => setMockExpiry(event.target.value)}
                  autoComplete="cc-exp"
                  placeholder="12 / 34"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="playwright-card-cvc">CVC</Label>
                <Input
                  id="playwright-card-cvc"
                  name="playwrightCardCvc"
                  value={mockCvc}
                  onChange={(event) => setMockCvc(event.target.value)}
                  autoComplete="cc-csc"
                  placeholder="123"
                />
              </div>
            </div>
          </div>
        ) : (
          <PaymentElement options={{ layout: "tabs" }} />
        )}
        {paymentError ? (
          <p className="text-sm" style={{ color: "var(--al-status-negative)" }}>{paymentError}</p>
        ) : null}
        {bookingUrl ? (
          <p className="text-xs" style={{ color: "var(--al-on-surface-variant)" }}>
            Need to finish later? Use your booking link:{" "}
            <a href={bookingUrl} className="underline">
              Resume payment
            </a>
            .
          </p>
        ) : null}
        <button
          type="submit"
          disabled={
            (usePaymentSimulator
              ? mockCardNumber.replace(/\s+/g, "").length < 12
              : !stripe || !elements) ||
            isPaying ||
            Boolean(isCancelling)
          }
          style={{
            width: "100%",
            background: isPaying ? "var(--al-primary)" : "var(--al-primary)",
            color: "var(--al-on-primary)",
            borderRadius: "var(--radius-lg)",
            padding: "0.625rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            border: "none",
            cursor: isPaying ? "not-allowed" : "pointer",
            opacity: isPaying ? 0.7 : 1,
          }}
        >
          {isPaying
            ? "Processing…"
            : paymentError
              ? "Pay again"
              : "Pay now"}
        </button>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onBack} disabled={isPaying || Boolean(isCancelling)} style={{ background: "transparent", border: "1px solid var(--al-hairline-rest)", color: "var(--al-primary)", borderRadius: "var(--radius-lg)", padding: "0.5rem 1rem", fontSize: "0.875rem", cursor: "pointer" }}>Back to details</button>
          {onCancel ? (
            <button type="button" onClick={() => { void onCancel(); }} disabled={isPaying || Boolean(isCancelling)} style={{ background: "var(--al-status-negative-bg)", border: "1px solid var(--al-status-negative-border)", color: "var(--al-status-negative)", borderRadius: "var(--radius-lg)", padding: "0.5rem 1rem", fontSize: "0.875rem", cursor: "pointer" }}>
              {isCancelling ? "Cancelling…" : "Cancel booking"}
            </button>
          ) : null}
        </div>
        {cancelError ? <p className="text-sm" style={{ color: "var(--al-status-negative)" }}>{cancelError}</p> : null}
      </form>
    </div>
  );
}

export function BookingForm({
  shopSlug,
  shopName,
  timezone,
  slotMinutes,
  defaultDate,
  paymentsEnabled = false,
  forcePaymentSimulator = false,
  selectedEventTypeId = null,
  selectedEventTypeName = null,
  selectedDurationMinutes = null,
}: BookingFormProps) {
  const searchParams = useSearchParams();
  const resumeAppointmentId = searchParams.get("appointment");
  const effectiveDurationMinutes = selectedDurationMinutes ?? slotMinutes;
  const [date, setDate] = useState(defaultDate);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<BookingErrorState | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  );
  const [success, setSuccess] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [usePaymentSimulator, setUsePaymentSimulator] = useState(false);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [manageToken, setManageToken] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeFailed, setResumeFailed] = useState(false);
  const [paymentAmountCents, setPaymentAmountCents] = useState(0);
  const [paymentCurrency, setPaymentCurrency] = useState("USD");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const [cancelBookingError, setCancelBookingError] = useState<string | null>(null);
  const [cancelBookingMessage, setCancelBookingMessage] = useState<string | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
      }),
    [timezone]
  );

  const [availabilityDurationMinutes, setAvailabilityDurationMinutes] =
    useState(effectiveDurationMinutes);

  useEffect(() => {
    setAvailabilityDurationMinutes(effectiveDurationMinutes);
  }, [effectiveDurationMinutes]);

  const shouldResume =
    Boolean(resumeAppointmentId) && !resumeFailed && !success && !clientSecret;

  logBookingDiagnostic("render", {
    shouldResume,
    resumeLoading,
    resumeAppointmentId,
    clientSecret: Boolean(clientSecret),
    success,
    paymentsEnabled,
    forcePaymentSimulator,
  });

  useEffect(() => {
    if (resumeAppointmentId) {
      setResumeFailed(false);
    }
  }, [resumeAppointmentId]);

  useEffect(() => {
    if (shouldResume) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    const loadAvailability = async () => {
      setLoading(true);
      setAvailabilityError(null);
      setSelectedSlot(null);
      setSlots([]);

      try {
        const params = new URLSearchParams({
          shop: shopSlug,
          date,
        });
        if (selectedEventTypeId) {
          params.set("service", selectedEventTypeId);
        }
        const res = await fetch(`/api/availability?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | AvailabilityErrorResponse
            | null;
          setAvailabilityError(data?.error ?? "Failed to load availability");
          return;
        }

        const data = (await res.json()) as AvailabilityResponse;
        if (!active) return;
        setAvailabilityDurationMinutes(
          data.durationMinutes ?? effectiveDurationMinutes
        );
        setSlots(data.slots ?? []);
        logBookingDiagnostic("availability-loaded", {
          shopSlug,
          date,
          slotCount: data.slots?.length ?? 0,
          durationMinutes: data.durationMinutes ?? effectiveDurationMinutes,
        });
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          logBookingDiagnostic("availability-failed", {
            shopSlug,
            date,
          });
          setAvailabilityError("Failed to load availability");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadAvailability();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    date,
    effectiveDurationMinutes,
    refreshToken,
    selectedEventTypeId,
    shouldResume,
    shopSlug,
  ]);

  useEffect(() => {
    if (!shouldResume || !resumeAppointmentId) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    const resumePayment = async () => {
      setResumeLoading(true);
      setError(null);
      setAvailabilityError(null);
      setCancelBookingError(null);
      setCancelBookingMessage(null);
      setManageToken(null);

      try {
        logBookingDiagnostic("resume-start", {
          appointmentId: resumeAppointmentId,
        });
        const res = await fetch(`/api/bookings/${resumeAppointmentId}`, {
          method: "GET",
          signal: controller.signal,
        });

        if (!res.ok) {
          setResumeFailed(true);
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          setError({ message: data?.error ?? "Failed to resume booking" });
          logBookingDiagnostic("resume-failed-response", {
            appointmentId: resumeAppointmentId,
            status: res.status,
            error: data?.error ?? "Failed to resume booking",
          });
          return;
        }

        const data = (await res.json()) as BookingResponse;
        if (!active) return;

        setSelectedSlot(data.appointment.startsAt);
        setBookingUrl(data.bookingUrl ?? data.appointment.bookingUrl ?? null);
        setManageToken(data.manageToken ?? null);
        logBookingDiagnostic("resume-success", {
          appointmentId: resumeAppointmentId,
          paymentRequired: data.paymentRequired,
          paymentStatus: data.appointment.paymentStatus,
          hasClientSecret: Boolean(data.clientSecret),
          hasManageToken: Boolean(data.manageToken),
        });

        if (!data.paymentRequired || data.appointment.paymentStatus === "paid") {
          setSuccess(true);
          return;
        }

        if (!data.clientSecret) {
          logBookingDiagnostic("resume-blocked", {
            appointmentId: resumeAppointmentId,
            reason: "missing-client-secret",
          });
          setError({ message: "Payment cannot be resumed. Please contact the business." });
          return;
        }

        setPaymentAmountCents(data.amountCents);
        setPaymentCurrency(data.currency);
        setUsePaymentSimulator(Boolean(data.usePaymentSimulator));
        setShowPaymentDetails(false);
        setClientSecret(data.clientSecret);
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          logBookingDiagnostic("resume-failed-exception", {
            appointmentId: resumeAppointmentId,
            message: err instanceof Error ? err.message : "Unknown error",
          });
          setResumeFailed(true);
          setError({ message: "Failed to resume booking" });
        }
      } finally {
        if (active) {
          setResumeLoading(false);
        }
      }
    };

    resumePayment();

    return () => {
      active = false;
      controller.abort();
    };
  }, [resumeAppointmentId, shouldResume]);

  const clearResumeQueryParam = () => {
    if (typeof window === "undefined") return;
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has("appointment")) return;
    currentUrl.searchParams.delete("appointment");
    window.history.replaceState(
      null,
      "",
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
    );
  };

  const handleBookAgain = () => {
    setSuccess(false);
    setError(null);
    setAvailabilityError(null);
    setCancelBookingError(null);
    setCancelBookingMessage(null);
    setClientSecret(null);
    setUsePaymentSimulator(false);
    setBookingUrl(null);
    setManageToken(null);
    setResumeFailed(true);
    setResumeLoading(false);
    setIsCancellingBooking(false);
    setShowPaymentDetails(false);
    setSelectedSlot(null);
    setRefreshToken((value) => value + 1);
    clearResumeQueryParam();
  };

  const handleCancelBooking = async () => {
    if (!manageToken) {
      setCancelBookingError("Manage link missing. Please refresh the page and try again.");
      return;
    }

    setIsCancellingBooking(true);
    setCancelBookingError(null);

    try {
      const response = await fetch(`/api/manage/${manageToken}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json().catch(() => null)) as
        | CancellationResponse
        | null;

      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? "Failed to cancel booking.");
      }

      setCancelBookingMessage(data.message);
      setClientSecret(null);
      setShowPaymentDetails(false);
      setManageToken(null);
      setBookingUrl(null);
      setSelectedSlot(null);
      setResumeFailed(true);
      setError(null);
      setAvailabilityError(null);
      setRefreshToken((value) => value + 1);
      clearResumeQueryParam();
    } catch (cancelError) {
      setCancelBookingError(
        cancelError instanceof Error ? cancelError.message : "Failed to cancel booking."
      );
    } finally {
      setIsCancellingBooking(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setCancelBookingMessage(null);
    setCancelBookingError(null);

    if (!selectedSlot) {
      setError({ message: "Please select a time slot before confirming." });
      return;
    }

    try {
      setIsSubmitting(true);
      logBookingDiagnostic("submit-start", {
        shopSlug,
        selectedSlot,
        paymentsEnabled,
      });
      const endpoint = paymentsEnabled
        ? "/api/bookings/create"
        : "/api/appointments";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: shopSlug,
          startsAt: selectedSlot,
          eventTypeId: selectedEventTypeId ?? undefined,
          customer: {
            fullName,
            phone,
            email,
            smsOptIn,
            emailOptIn,
          },
        }),
      });

      if (res.status === 409) {
        const data = (await res.json().catch(() => null)) as
          | BookingErrorResponse
          | null;
        logBookingDiagnostic("submit-conflict", {
          shopSlug,
          selectedSlot,
          error: data?.error ?? "That slot was just taken. Please pick another.",
        });
        setError({
          message: data?.error ?? "That slot was just taken. Please pick another.",
        });
        setSelectedSlot(null);
        setRefreshToken((value) => value + 1);
        return;
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | BookingErrorResponse
          | null;
        logBookingDiagnostic("submit-failed-response", {
          shopSlug,
          selectedSlot,
          status: res.status,
          error: data?.error ?? "Failed to create booking",
        });
        setError({ message: data?.error ?? "Failed to create booking" });
        return;
      }

      const data = (await res.json()) as BookingResponse;
      const resolvedBookingUrl =
        data.bookingUrl ?? data.appointment.bookingUrl ?? null;

      if (paymentsEnabled && data.paymentRequired) {
        setBookingUrl(resolvedBookingUrl);
      } else {
        setBookingUrl(null);
      }
      setManageToken(data.manageToken ?? null);
      logBookingDiagnostic("submit-success", {
        shopSlug,
        appointmentId: data.appointment.id,
        paymentRequired: data.paymentRequired,
        paymentStatus: data.appointment.paymentStatus,
        hasClientSecret: Boolean(data.clientSecret),
        hasManageToken: Boolean(data.manageToken),
      });

      if (
        paymentsEnabled &&
        data.paymentRequired &&
        resolvedBookingUrl &&
        typeof window !== "undefined"
      ) {
        try {
          const url = new URL(resolvedBookingUrl);
          if (url.origin === window.location.origin) {
            window.history.replaceState(
              null,
              "",
              `${url.pathname}${url.search}${url.hash}`
            );
          }
        } catch {
          // Ignore invalid URLs
        }
      }

      if (paymentsEnabled && data.paymentRequired) {
        if (!data.clientSecret) {
          logBookingDiagnostic("submit-blocked", {
            shopSlug,
            appointmentId: data.appointment.id,
            reason: "missing-client-secret",
          });
          setError({ message: "Payment could not be initialized." });
          return;
        }
        setPaymentAmountCents(data.amountCents);
        setPaymentCurrency(data.currency);
        setUsePaymentSimulator(Boolean(data.usePaymentSimulator));
        setClientSecret(data.clientSecret);
        setShowPaymentDetails(false);
        return;
      }

      setSuccess(true);
    } catch (submitError) {
      logBookingDiagnostic("submit-failed-exception", {
        shopSlug,
        selectedSlot,
        message: submitError instanceof Error ? submitError.message : "Unknown error",
      });
      setError({ message: "Failed to create booking" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-5 rounded-2xl border border-al-outline-variant bg-al-surface-container-lowest p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-al-primary">
            Booking confirmed
          </p>
          <h2 className="text-balance text-2xl font-semibold text-al-on-surface">
            You&apos;re booked with {shopName}
          </h2>
          <p className="text-pretty text-sm text-al-on-surface-variant">
            We&apos;ve reserved your slot at {shopName}.
          </p>
          {selectedSlot ? (
            <p className="text-sm font-medium text-al-on-surface">
              {timeFormatter.format(new Date(selectedSlot))} ({timezone})
            </p>
          ) : null}
          {selectedEventTypeName ? (
            <p className="text-sm font-medium text-al-on-surface">
              {selectedEventTypeName} - {effectiveDurationMinutes} min
            </p>
          ) : null}
        </div>

        {manageToken ? (
          <div className="space-y-4 rounded-xl border border-al-outline-variant bg-al-surface-container-low p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-al-on-surface">Manage your booking</h3>
              <p className="text-pretty text-sm text-al-on-surface-variant">
                Use this link to view details or cancel your appointment.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={`/manage/${manageToken}`}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--al-primary)",
                  color: "var(--al-on-primary)",
                  borderRadius: "var(--radius-lg)",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Manage booking
              </a>
              <button type="button" onClick={handleBookAgain} style={{ flex: 1, background: "transparent", border: "1px solid var(--al-outline-variant)", color: "var(--al-primary)", borderRadius: "var(--radius-lg)", padding: "0.5rem 1rem", fontSize: "0.875rem", cursor: "pointer" }}>Book again</button>
            </div>
            <p className="text-xs text-al-on-surface-variant">
              Save this link if you may need to change or cancel later.
            </p>
          </div>
        ) : (
          <button type="button" onClick={handleBookAgain} style={{ background: "transparent", border: "1px solid var(--al-outline-variant)", color: "var(--al-primary)", borderRadius: "var(--radius-lg)", padding: "0.5rem 1rem", fontSize: "0.875rem", cursor: "pointer" }}>Book again</button>
        )}
      </div>
    );
  }

  if (shouldResume && resumeLoading) {
    return (
      <div className="p-6 space-y-2" style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--al-outline-variant)", background: "var(--al-surface-container-lowest)" }}>
        <h2 className="text-xl font-semibold">Loading your booking</h2>
        <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
          Fetching payment details…
        </p>
      </div>
    );
  }

  if (paymentsEnabled && clientSecret) {
    const slotLabel = selectedSlot
      ? timeFormatter.format(new Date(selectedSlot))
      : "Selected slot";
    const shouldUsePaymentSimulator = forcePaymentSimulator || usePaymentSimulator;
    const resolvedStripePromise = shouldUsePaymentSimulator ? null : getStripePromise();

    if (!shouldUsePaymentSimulator && !resolvedStripePromise) {
      return (
        <div className="p-6 space-y-2" style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--al-outline-variant)", background: "var(--al-surface-container-lowest)" }}>
          <h2 className="text-xl font-semibold">Payment unavailable</h2>
          <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
            Payment setup is missing. Please try again later.
          </p>
        </div>
      );
    }

    if (showPaymentDetails) {
      return (
        <div className="p-4 space-y-3" style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--al-outline-variant)", background: "var(--al-surface-container-lowest)" }}>
          <p className="text-sm font-medium">Booking details</p>
          <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
            {slotLabel} ({timezone})
          </p>
          <div className="grid gap-1 text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
            {fullName ? <p>Name: {fullName}</p> : null}
            {phone ? <p>Phone: {phone}</p> : null}
            {email ? <p>Email: {email}</p> : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowPaymentDetails(false)}
              disabled={isCancellingBooking}
              style={{
                background: "var(--al-primary)",
                color: "var(--al-on-primary)",
                borderRadius: "var(--radius-lg)",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              Return to payment
            </button>
            {manageToken ? (
              <button type="button" onClick={() => { void handleCancelBooking(); }} disabled={isCancellingBooking} style={{ background: "var(--al-status-negative-bg)", border: "1px solid var(--al-status-negative-border)", color: "var(--al-status-negative)", borderRadius: "var(--radius-lg)", padding: "0.5rem 1rem", fontSize: "0.875rem", cursor: "pointer" }}>
                {isCancellingBooking ? "Cancelling…" : "Cancel booking"}
              </button>
            ) : null}
          </div>
          {cancelBookingError ? (
            <p className="text-sm" style={{ color: "var(--al-status-negative)" }}>{cancelBookingError}</p>
          ) : null}
        </div>
      );
    }

    if (shouldUsePaymentSimulator) {
      return (
        <Elements stripe={null}>
          <PaymentStep
          amountCents={paymentAmountCents}
          currency={paymentCurrency}
          timezone={timezone}
          slotLabel={slotLabel}
          usePaymentSimulator
          bookingUrl={bookingUrl}
          returnUrl={bookingUrl}
          onSuccess={() => setSuccess(true)}
          onBack={() => {
            setShowPaymentDetails(true);
          }}
          isCancelling={isCancellingBooking}
          cancelError={cancelBookingError}
          serviceName={selectedEventTypeName}
          serviceDurationMinutes={effectiveDurationMinutes}
          {...(manageToken ? { onCancel: handleCancelBooking } : {})}
        />
        </Elements>
      );
    }

    return (
      <Elements stripe={resolvedStripePromise} options={{ clientSecret, appearance: stripeElementsAppearance }}>
        <PaymentStep
          amountCents={paymentAmountCents}
          currency={paymentCurrency}
          timezone={timezone}
          slotLabel={slotLabel}
          usePaymentSimulator={false}
          bookingUrl={bookingUrl}
          returnUrl={bookingUrl}
          onSuccess={() => setSuccess(true)}
          onBack={() => {
            setShowPaymentDetails(true);
          }}
          isCancelling={isCancellingBooking}
          cancelError={cancelBookingError}
          serviceName={selectedEventTypeName}
          serviceDurationMinutes={effectiveDurationMinutes}
          {...(manageToken ? { onCancel: handleCancelBooking } : {})}
        />
      </Elements>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {selectedEventTypeName ? (
        <div style={{
          background: 'var(--al-surface-container-low)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontSize: '10px', fontWeight: 800, letterSpacing: '0.2em',
              textTransform: 'uppercase' as const, color: 'var(--al-on-surface-variant)',
              opacity: 0.55, marginBottom: '6px',
            }}>Selected service</div>
            <div style={{
              fontSize: '16px', fontWeight: 700, color: 'var(--al-primary)', marginBottom: '4px',
            }}>{selectedEventTypeName}</div>
            <div style={{ fontSize: '13px', color: 'var(--al-on-surface-variant)' }}>
              {effectiveDurationMinutes} minutes {'\u00b7'} {timezone}
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase' as const,
            color: 'var(--al-status-positive)',
            background: 'var(--al-status-positive-bg)',
            padding: '6px 14px', borderRadius: '9999px',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--al-status-positive)',
            }} />
            Selected
          </div>
        </div>
      ) : null}

      {cancelBookingMessage ? (
        <div className="p-3" style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--al-status-positive-border)", background: "var(--al-status-positive-bg)" }}>
          <p className="text-sm" style={{ color: "var(--al-status-positive)" }}>{cancelBookingMessage}</p>
        </div>
      ) : null}

      <div style={{ marginBottom: '24px' }}>
        <label
          htmlFor="booking-date"
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: 800, color: 'var(--al-primary)',
            marginBottom: '8px',
          }}
        >
          Date
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--al-primary)', display: 'inline-block',
          }} />
        </label>
        <div
          className="al-input-wrap"
          style={{
            background: 'var(--al-surface-container-lowest)',
            border: '1px solid rgba(195,198,209,0.50)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}>
          <input
            id="booking-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            style={{
              fontFamily: 'var(--font-manrope-raw), sans-serif',
              fontSize: '16px', fontWeight: 700, color: 'var(--al-primary)',
              border: 'none', outline: 'none', background: 'transparent', width: '100%',
            }}
          />
          <span
            className="material-symbols-outlined"
            style={{ color: 'var(--al-outline)', fontSize: '20px', flexShrink: 0 }}
            aria-hidden="true"
          >calendar_today</span>
        </div>
      </div>

      <fieldset>
        <div style={{ marginBottom: '12px' }}>
          <legend style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: 800, color: 'var(--al-primary)',
            marginBottom: '4px',
          }}>
            Available slots
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'var(--al-primary)', display: 'inline-block',
            }} />
          </legend>
          <p style={{ fontSize: '13px', color: 'var(--al-on-surface-variant)' }}>
            {availabilityDurationMinutes} minutes {'\u00b7'} {timezone}
          </p>
        </div>
        {loading ? (
          <p style={{ fontSize: '13px', color: 'var(--al-on-surface-variant)' }}>Loading slots…</p>
        ) : availabilityError ? (
          <p style={{ fontSize: '13px', color: 'var(--al-error)' }}>{availabilityError}</p>
        ) : slots.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--al-on-surface-variant)' }}>
            No slots available for this day.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '10px' }}>
            {slots.map((slot) => {
              const label = timeFormatter.format(new Date(slot.startsAt));
              const selected = selectedSlot === slot.startsAt;
              return (
                <button
                  key={slot.startsAt}
                  type="button"
                  onClick={() => setSelectedSlot(slot.startsAt)}
                  data-slot={slot.startsAt}
                  data-booking-slot={slot.startsAt}
                  aria-pressed={selected}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: selected ? 700 : 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: selected ? 'var(--al-on-primary)' : 'var(--al-on-surface-variant)',
                    background: selected ? 'var(--al-primary)' : 'var(--al-surface-container-lowest)',
                    border: `1px solid ${selected ? 'var(--al-primary)' : 'rgba(195,198,209,0.50)'}`,
                    borderRadius: '12px',
                    padding: '12px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: selected ? '0 0 0 4px rgba(0,30,64,0.08)' : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      <div>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="full-name" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: 800, color: 'var(--al-primary)',
            marginBottom: '8px',
          }}>
            Full name
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--al-primary)', display: 'inline-block' }} />
          </label>
          <div className="al-input-wrap" style={{
            background: 'var(--al-surface-container-lowest)',
            border: '1px solid rgba(195,198,209,0.50)',
            borderRadius: '12px',
            padding: '14px 16px',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}>
            <input
              id="full-name"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Jordan Carter"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              style={{
                fontFamily: 'var(--font-manrope-raw), sans-serif',
                fontSize: '16px', fontWeight: 700, color: 'var(--al-primary)',
                border: 'none', outline: 'none', background: 'transparent', width: '100%',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label htmlFor="phone" style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', fontWeight: 800, color: 'var(--al-primary)',
              marginBottom: '8px',
            }}>
              Phone
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--al-primary)', display: 'inline-block' }} />
            </label>
            <div className="al-input-wrap" style={{
              background: 'var(--al-surface-container-lowest)',
              border: '1px solid rgba(195,198,209,0.50)',
              borderRadius: '12px',
              padding: '14px 16px',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+44 7700 900123"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                style={{
                  fontFamily: 'var(--font-manrope-raw), sans-serif',
                  fontSize: '16px', fontWeight: 700, color: 'var(--al-primary)',
                  border: 'none', outline: 'none', background: 'transparent', width: '100%',
                }}
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', fontWeight: 800, color: 'var(--al-primary)',
              marginBottom: '8px',
            }}>
              Email
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--al-primary)', display: 'inline-block' }} />
            </label>
            <div className="al-input-wrap" style={{
              background: 'var(--al-surface-container-lowest)',
              border: '1px solid rgba(195,198,209,0.50)',
              borderRadius: '12px',
              padding: '14px 16px',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="you@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                style={{
                  fontFamily: 'var(--font-manrope-raw), sans-serif',
                  fontSize: '16px', fontWeight: 700, color: 'var(--al-primary)',
                  border: 'none', outline: 'none', background: 'transparent', width: '100%',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <span style={{
            width: '20px', height: '20px',
            border: smsOptIn ? '2px solid var(--al-primary)' : '2px solid rgba(195,198,209,0.50)',
            borderRadius: '6px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: smsOptIn ? 'var(--al-primary)' : 'var(--al-surface-container-lowest)',
            transition: 'all 0.15s ease',
          }}>
            {smsOptIn && <span style={{ color: 'var(--al-on-primary)', fontSize: '14px', fontWeight: 700 }}>{'\u2713'}</span>}
          </span>
          <input
            type="checkbox"
            checked={smsOptIn}
            onChange={(event) => setSmsOptIn(event.target.checked)}
            style={{ position: 'absolute' as const, opacity: 0, width: 0, height: 0 }}
            aria-label="Send me SMS updates about this booking"
          />
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--al-on-surface)' }}>
            Send me SMS updates about this booking.
          </span>
        </label>

        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          padding: '16px 20px',
          background: 'var(--al-surface-container-low)',
          borderRadius: '12px', cursor: 'pointer',
        }}>
          <span style={{
            width: '20px', height: '20px',
            border: emailOptIn ? '2px solid var(--al-primary)' : '2px solid rgba(195,198,209,0.50)',
            borderRadius: '6px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: emailOptIn ? 'var(--al-primary)' : 'var(--al-surface-container-lowest)',
            transition: 'all 0.15s ease', marginTop: '2px',
          }}>
            {emailOptIn && <span style={{ color: 'var(--al-on-primary)', fontSize: '14px', fontWeight: 700 }}>{'\u2713'}</span>}
          </span>
          <input
            type="checkbox"
            checked={emailOptIn}
            onChange={(event) => setEmailOptIn(event.target.checked)}
            style={{ position: 'absolute' as const, opacity: 0, width: 0, height: 0 }}
            aria-label="Send me email reminders"
          />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--al-on-surface)', marginBottom: '4px' }}>
              Send me email reminders.
            </div>
            <div style={{ fontSize: '13px', color: 'var(--al-on-surface-variant)', lineHeight: 1.5 }}>
              Get an email reminder about 24 hours before your appointment. You can opt out later.
            </div>
          </div>
        </label>
      </div>

      {error ? (
        <div className="p-3.5" style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--al-status-negative-border)", background: "var(--al-status-negative-bg)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--al-status-negative)" }}>{error.message}</p>
          <p className="mt-1.5 text-sm opacity-85">
            Please select a different time slot and try again.
          </p>
        </div>
      ) : null}

      <button type="submit" disabled={isSubmitting} style={{ width: "100%", height: "2.75rem", background: isSubmitting ? "var(--al-primary)" : "var(--al-primary)", color: "var(--al-on-primary)", borderRadius: "var(--radius-lg)", fontSize: "1rem", fontWeight: 600, border: "none", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
        {isSubmitting ? "Booking…" : "Confirm booking"}
      </button>
    </form>
  );
}
