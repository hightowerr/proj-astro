import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  sendAppointmentReminderEmail,
} from "@/lib/messages";
import { getShopByOwnerId } from "@/lib/queries/shops";
import {
  appointments,
  bookingSettings,
  customerContactPrefs,
  customers,
  shops,
} from "@/lib/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const paramsSchema = z.object({
  id: z.string().uuid("Invalid appointment ID format"),
});

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await getShopByOwnerId(session.user.id);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const { id } = paramsSchema.parse(await params);

    const [row] = await db
      .select({
        appointmentId: appointments.id,
        shopId: appointments.shopId,
        customerId: appointments.customerId,
        customerName: customers.fullName,
        customerEmail: customers.email,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        bookingUrl: appointments.bookingUrl,
        shopName: shops.name,
        shopTimezone: bookingSettings.timezone,
        appointmentStatus: appointments.status,
        emailOptIn: customerContactPrefs.emailOptIn,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .innerJoin(shops, eq(appointments.shopId, shops.id))
      .leftJoin(
        customerContactPrefs,
        eq(appointments.customerId, customerContactPrefs.customerId)
      )
      .leftJoin(bookingSettings, eq(appointments.shopId, bookingSettings.shopId))
      .where(and(eq(appointments.id, id), eq(appointments.shopId, shop.id)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (row.appointmentStatus !== "booked") {
      return NextResponse.json(
        {
          error: "Cannot send reminder for non-booked appointment",
          status: row.appointmentStatus,
        },
        { status: 400 }
      );
    }

    if (!row.customerEmail) {
      return NextResponse.json(
        { error: "Customer does not have an email address" },
        { status: 400 }
      );
    }

    if (row.emailOptIn === false) {
      return NextResponse.json(
        { error: "Customer has not opted in to email reminders" },
        { status: 400 }
      );
    }

    const result = await sendAppointmentReminderEmail({
      appointmentId: row.appointmentId,
      shopId: row.shopId,
      customerId: row.customerId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      bookingUrl: row.bookingUrl,
      shopName: row.shopName,
      shopTimezone: row.shopTimezone ?? "UTC",
      reminderInterval: "24h",
    });

    if (result === "already_sent") {
      return NextResponse.json(
        {
          error: "Email reminder already sent for this appointment",
          appointmentId: row.appointmentId,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "sent",
      appointmentId: row.appointmentId,
      recipient: row.customerEmail,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to send email reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
