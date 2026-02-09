import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";
import { buildBookingBaseUrl } from "@/lib/booking-url";
import {
  createAppointment,
  InvalidSlotError,
  ShopClosedError,
  SlotTakenError,
} from "@/lib/queries/appointments";
import { getShopBySlug } from "@/lib/queries/shops";

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

const normalizePhone = (phone: string) => {
  const parsed = parsePhoneNumberFromString(phone);
  if (!parsed || !parsed.isValid()) {
    throw new Error("Invalid phone number format.");
  }
  return parsed.number;
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return Response.json({ error: "Invalid startsAt" }, { status: 400 });
  }

  const shop = await getShopBySlug(parsed.data.shop);
  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  let phone: string;
  let email: string;
  try {
    phone = normalizePhone(parsed.data.customer.phone);
    email = normalizeEmail(parsed.data.customer.email);
  } catch (error) {
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
    const result = await createAppointment({
      shopId: shop.id,
      startsAt,
      customer: customerData,
      bookingBaseUrl,
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
      bookingUrl: result.bookingUrl,
    });
  } catch (error) {
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
