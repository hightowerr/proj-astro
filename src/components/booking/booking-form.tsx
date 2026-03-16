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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CancellationResponse } from "@/types/cancellation";

type Slot = { startsAt: string; endsAt: string };

type AvailabilityResponse = {
  date: string;
  timezone: string;
  slotMinutes: number;
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
};

const formatCurrency = (amountCents: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
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
      <div className="rounded-lg border p-4 space-y-1">
        <p className="text-sm font-medium">Payment due</p>
        <p className="text-2xl font-semibold">
          {formatCurrency(amountCents, currency)}
        </p>
        <p className="text-xs text-muted-foreground">
          Booking time: {slotLabel} ({timezone})
        </p>
      </div>

      <form onSubmit={handlePayment} className="space-y-4">
        {usePaymentSimulator ? (
          <div className="space-y-3 rounded-md border border-dashed p-3">
            <p className="text-xs text-muted-foreground">Playwright payment simulator</p>
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
          <p className="text-sm text-destructive">{paymentError}</p>
        ) : null}
        {bookingUrl ? (
          <p className="text-xs text-muted-foreground">
            Need to finish later? Use your booking link:{" "}
            <a href={bookingUrl} className="underline">
              Resume payment
            </a>
            .
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={
            (usePaymentSimulator
              ? mockCardNumber.replace(/\s+/g, "").length < 12
              : !stripe || !elements) ||
            isPaying ||
            Boolean(isCancelling)
          }
        >
          {isPaying
            ? "Processing…"
            : paymentError
              ? "Pay again"
              : "Pay now"}
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isPaying || Boolean(isCancelling)}
          >
            Back to details
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                void onCancel();
              }}
              disabled={isPaying || Boolean(isCancelling)}
            >
              {isCancelling ? "Cancelling…" : "Cancel booking"}
            </Button>
          ) : null}
        </div>
        {cancelError ? <p className="text-sm text-destructive">{cancelError}</p> : null}
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
}: BookingFormProps) {
  const searchParams = useSearchParams();
  const resumeAppointmentId = searchParams.get("appointment");
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

  const shouldResume =
    Boolean(resumeAppointmentId) && !resumeFailed && !success;

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
        setSlots(data.slots ?? []);
        logBookingDiagnostic("availability-loaded", {
          shopSlug,
          date,
          slotCount: data.slots?.length ?? 0,
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
  }, [date, shopSlug, refreshToken, shouldResume]);

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
          customer: {
            fullName,
            phone,
            email,
            smsOptIn,
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
      <div className="rounded-lg border p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Booking confirmed</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ve reserved your slot at {shopName}.
          </p>
          {selectedSlot ? (
            <p className="text-sm">
              {timeFormatter.format(new Date(selectedSlot))} ({timezone})
            </p>
          ) : null}
        </div>

        {manageToken ? (
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
            <h3 className="text-sm font-semibold">Manage your booking</h3>
            <p className="text-sm text-muted-foreground">
              Use this link to view details or cancel your appointment.
            </p>
            <Button asChild>
              <a href={`/manage/${manageToken}`}>Manage booking</a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Save this link — you&apos;ll need it to manage your appointment.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  if (shouldResume && resumeLoading) {
    return (
      <div className="rounded-lg border p-6 space-y-2">
        <h2 className="text-xl font-semibold">Loading your booking</h2>
        <p className="text-sm text-muted-foreground">
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
        <div className="rounded-lg border p-6 space-y-2">
          <h2 className="text-xl font-semibold">Payment unavailable</h2>
          <p className="text-sm text-muted-foreground">
            Payment setup is missing. Please try again later.
          </p>
        </div>
      );
    }

    if (showPaymentDetails) {
      return (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">Booking details</p>
          <p className="text-sm text-muted-foreground">
            {slotLabel} ({timezone})
          </p>
          <div className="grid gap-1 text-sm text-muted-foreground">
            {fullName ? <p>Name: {fullName}</p> : null}
            {phone ? <p>Phone: {phone}</p> : null}
            {email ? <p>Email: {email}</p> : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={() => setShowPaymentDetails(false)}
              disabled={isCancellingBooking}
            >
              Return to payment
            </Button>
            {manageToken ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  void handleCancelBooking();
                }}
                disabled={isCancellingBooking}
              >
                {isCancellingBooking ? "Cancelling…" : "Cancel booking"}
              </Button>
            ) : null}
          </div>
          {cancelBookingError ? (
            <p className="text-sm text-destructive">{cancelBookingError}</p>
          ) : null}
        </div>
      );
    }

    if (shouldUsePaymentSimulator) {
      return (
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
          {...(manageToken ? { onCancel: handleCancelBooking } : {})}
        />
      );
    }

    return (
      <Elements stripe={resolvedStripePromise} options={{ clientSecret }}>
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
          {...(manageToken ? { onCancel: handleCancelBooking } : {})}
        />
      </Elements>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {cancelBookingMessage ? (
        <div className="rounded-md border border-emerald-600/30 bg-emerald-500/5 p-3">
          <p className="text-sm text-emerald-700">{cancelBookingMessage}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="booking-date">Date</Label>
        <Input
          id="booking-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Available slots</legend>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading slots…</p>
        ) : availabilityError ? (
          <p className="text-sm text-destructive">{availabilityError}</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No slots available for this day.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((slot) => {
              const label = timeFormatter.format(new Date(slot.startsAt));
              const selected = selectedSlot === slot.startsAt;
              return (
                <Button
                  key={slot.startsAt}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  onClick={() => setSelectedSlot(slot.startsAt)}
                  className="justify-center"
                  data-slot={slot.startsAt}
                  aria-pressed={selected}
                  data-booking-slot={slot.startsAt}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Slot length: {slotMinutes} minutes ({timezone})
        </p>
      </fieldset>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex items-start gap-2">
        <input
          id="sms-opt-in"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          checked={smsOptIn}
          onChange={(event) => setSmsOptIn(event.target.checked)}
        />
        <Label htmlFor="sms-opt-in" className="text-sm leading-5">
          Send me SMS updates about this booking.
        </Label>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{error.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Please select a different time slot and try again.
          </p>
        </div>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Booking…" : "Confirm booking"}
      </Button>
    </form>
  );
}
