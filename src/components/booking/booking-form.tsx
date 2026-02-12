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

type Slot = { startsAt: string; endsAt: string };

type AvailabilityResponse = {
  date: string;
  timezone: string;
  slotMinutes: number;
  slots: Slot[];
};

type BookingFormProps = {
  shopSlug: string;
  shopName: string;
  timezone: string;
  slotMinutes: number;
  defaultDate: string;
  paymentsEnabled?: boolean;
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
  bookingUrl?: string | null;
  manageToken?: string | null;
};

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

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
  bookingUrl,
  returnUrl,
  onSuccess,
}: {
  amountCents: number;
  currency: string;
  timezone: string;
  slotLabel: string;
  bookingUrl?: string | null;
  returnUrl?: string | null;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handlePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentError(null);

    if (!stripe || !elements) {
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
        setPaymentError(error.message ?? "Payment failed.");
        return;
      }

      if (
        paymentIntent &&
        (paymentIntent.status === "succeeded" ||
          paymentIntent.status === "processing")
      ) {
        onSuccess();
        return;
      }

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
        <PaymentElement options={{ layout: "tabs" }} />
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
        <Button type="submit" disabled={!stripe || !elements || isPaying}>
          {isPaying
            ? "Processing..."
            : paymentError
              ? "Pay again"
              : "Pay now"}
        </Button>
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
}: BookingFormProps) {
  const searchParams = useSearchParams();
  const resumeAppointmentId = searchParams.get("appointment");
  const [date, setDate] = useState(defaultDate);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null
  );
  const [success, setSuccess] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
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
          setAvailabilityError("Failed to load availability");
          return;
        }

        const data = (await res.json()) as AvailabilityResponse;
        if (!active) return;
        setSlots(data.slots ?? []);
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
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
      setManageToken(null);

      try {
        const res = await fetch(`/api/bookings/${resumeAppointmentId}`, {
          method: "GET",
          signal: controller.signal,
        });

        if (!res.ok) {
          setResumeFailed(true);
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          setError(data?.error ?? "Failed to resume booking");
          return;
        }

        const data = (await res.json()) as BookingResponse;
        if (!active) return;

        setSelectedSlot(data.appointment.startsAt);
        setBookingUrl(data.bookingUrl ?? data.appointment.bookingUrl ?? null);
        setManageToken(data.manageToken ?? null);

        if (!data.paymentRequired || data.appointment.paymentStatus === "paid") {
          setSuccess(true);
          return;
        }

        if (!data.clientSecret) {
          setError("Payment cannot be resumed. Please contact the business.");
          return;
        }

        setPaymentAmountCents(data.amountCents);
        setPaymentCurrency(data.currency);
        setClientSecret(data.clientSecret);
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          setResumeFailed(true);
          setError("Failed to resume booking");
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!selectedSlot) {
      setError("Select a time slot.");
      return;
    }

    try {
      setIsSubmitting(true);
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
        setError("That slot was just taken. Please pick another.");
        setSelectedSlot(null);
        setRefreshToken((value) => value + 1);
        return;
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? "Failed to create booking");
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
          setError("Payment could not be initialized.");
          return;
        }
        setPaymentAmountCents(data.amountCents);
        setPaymentCurrency(data.currency);
        setClientSecret(data.clientSecret);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Failed to create booking");
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
          Fetching payment details...
        </p>
      </div>
    );
  }

  if (paymentsEnabled && clientSecret) {
    const slotLabel = selectedSlot
      ? timeFormatter.format(new Date(selectedSlot))
      : "Selected slot";

    if (!stripePromise) {
      return (
        <div className="rounded-lg border p-6 space-y-2">
          <h2 className="text-xl font-semibold">Payment unavailable</h2>
          <p className="text-sm text-muted-foreground">
            Payment setup is missing. Please try again later.
          </p>
        </div>
      );
    }

    return (
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <PaymentStep
          amountCents={paymentAmountCents}
          currency={paymentCurrency}
          timezone={timezone}
          slotLabel={slotLabel}
          bookingUrl={bookingUrl}
          returnUrl={bookingUrl}
          onSuccess={() => setSuccess(true)}
        />
      </Elements>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="space-y-2">
        <Label>Available slots</Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading slots...</p>
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
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={!selectedSlot || isSubmitting}>
        {isSubmitting ? "Booking..." : "Confirm booking"}
      </Button>
    </form>
  );
}
