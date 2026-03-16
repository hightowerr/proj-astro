import { z } from "zod";
import { computeEndsAt } from "@/lib/booking";
import { buildBookingBaseUrl } from "@/lib/booking-url";
import {
  CalendarConflictError,
  validateBookingConflict,
} from "@/lib/calendar-conflicts";
import { createManageToken } from "@/lib/manage-tokens";
import { normalizePhoneNumber } from "@/lib/phone";
import {
  createAppointment,
  InvalidSlotError,
  getBookingSettingsForShop,
  ShopClosedError,
  SlotTakenError,
} from "@/lib/queries/appointments";
import { getShopBySlug } from "@/lib/queries/shops";
import { stripeIsMocked } from "@/lib/stripe";

const createBookingSchema = z.object({
  shop: z.string().min(1),
  startsAt: z.string().datetime(),
  customer: z.object({
    fullName: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(1),
    email: z.string().trim().email(),
    smsOptIn: z.boolean().optional(),
  }),
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function POST(req: Request) {
  console.warn("[booking-create] env debug", {
    STRIPE_MOCKED: process.env.STRIPE_MOCKED,
    PLAYWRIGHT: process.env.PLAYWRIGHT,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_PLAYWRIGHT_STRIPE_BYPASS: process.env.NEXT_PUBLIC_PLAYWRIGHT_STRIPE_BYPASS,
  });
  const startedAt = Date.now();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    console.warn("[booking-create] invalid json", {
      durationMs: Date.now() - startedAt,
    });
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("[booking-create] invalid request", {
      durationMs: Date.now() - startedAt,
      errors: parsed.error.flatten().fieldErrors,
    });
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  console.warn("[booking-create] request", {
    shopSlug: parsed.data.shop,
    startsAt: parsed.data.startsAt,
    hasSmsOptIn: typeof parsed.data.customer.smsOptIn === "boolean",
  });

  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    console.warn("[booking-create] invalid startsAt", {
      shopSlug: parsed.data.shop,
      startsAt: parsed.data.startsAt,
      durationMs: Date.now() - startedAt,
    });
    return Response.json({ error: "Invalid startsAt" }, { status: 400 });
  }

  const shop = await getShopBySlug(parsed.data.shop);
  if (!shop) {
    console.warn("[booking-create] shop not found", {
      shopSlug: parsed.data.shop,
      durationMs: Date.now() - startedAt,
    });
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  let phone: string;
  let email: string;
  try {
    phone = normalizePhoneNumber(parsed.data.customer.phone);
    email = normalizeEmail(parsed.data.customer.email);
  } catch (error) {
    console.warn("[booking-create] invalid customer details", {
      shopId: shop.id,
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json(
      { error: (error as Error).message ?? "Invalid customer details" },
      { status: 400 }
    );
  }

  try {
    const bookingBaseUrl = buildBookingBaseUrl(req, shop.slug);
    const customerData: {
      fullName: string;
      phone: string;
      email: string;
      smsOptIn?: boolean;
    } = {
      fullName: parsed.data.customer.fullName.trim(),
      phone,
      email,
    };
    if (typeof parsed.data.customer.smsOptIn === "boolean") {
      customerData.smsOptIn = parsed.data.customer.smsOptIn;
    }

    const bookingSettings = await getBookingSettingsForShop(shop.id);
    if (!bookingSettings) {
      throw new Error("Booking settings not found");
    }

    const endsAt = computeEndsAt({
      startsAt,
      timeZone: bookingSettings.timezone,
      slotMinutes: bookingSettings.slotMinutes,
    });

    await validateBookingConflict({
      shopId: shop.id,
      startsAt,
      endsAt,
      timezone: bookingSettings.timezone,
    });

    const result = await createAppointment({
      shopId: shop.id,
      startsAt,
      customer: customerData,
      bookingBaseUrl,
    });
    const manageToken = await createManageToken(result.appointment.id);
    console.warn("[booking-create] success", {
      shopId: shop.id,
      appointmentId: result.appointment.id,
      paymentRequired: result.paymentRequired,
      appointmentPaymentStatus: result.appointment.paymentStatus,
      paymentRowStatus: result.payment?.status ?? null,
      hasClientSecret: Boolean(result.clientSecret),
      hasManageToken: Boolean(manageToken),
      durationMs: Date.now() - startedAt,
    });

    return Response.json({
      appointment: {
        id: result.appointment.id,
        shopId: result.appointment.shopId,
        startsAt: result.appointment.startsAt,
        endsAt: result.appointment.endsAt,
        status: result.appointment.status,
        paymentStatus: result.appointment.paymentStatus,
        paymentRequired: result.appointment.paymentRequired,
        createdAt: result.appointment.createdAt,
        bookingUrl: result.bookingUrl,
      },
      customer: {
        id: result.customer.id,
        fullName: result.customer.fullName,
        phone: result.customer.phone,
        email: result.customer.email,
      },
      payment: result.payment
        ? {
            id: result.payment.id,
            status: result.payment.status,
            amountCents: result.payment.amountCents,
            currency: result.payment.currency,
          }
        : null,
      amountCents: result.amountCents,
      currency: result.currency,
      paymentRequired: result.paymentRequired,
      clientSecret: result.clientSecret,
      usePaymentSimulator: Boolean(result.clientSecret && stripeIsMocked()),
      bookingUrl: result.bookingUrl,
      manageToken,
    });
  } catch (error) {
    console.error("[booking-create] failed", {
      shopSlug: parsed.data.shop,
      startsAt: parsed.data.startsAt,
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    if (error instanceof CalendarConflictError) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    if (
      error instanceof Error &&
      error.message.includes("calendar sync error")
    ) {
      return Response.json(
        {
          error: "Failed to create booking",
          details:
            "Could not sync with calendar. Please try again or contact support.",
        },
        { status: 500 }
      );
    }

    if (error instanceof SlotTakenError) {
      return Response.json({ error: "Slot taken" }, { status: 409 });
    }

    if (error instanceof InvalidSlotError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ShopClosedError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
