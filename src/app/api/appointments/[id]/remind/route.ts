import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sendReminderSMS } from "@/lib/confirmation";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { appointments } from "@/lib/schema";

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
    const appointment = await db.query.appointments.findFirst({
      where: and(eq(appointments.id, id), eq(appointments.shopId, shop.id)),
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const result = await sendReminderSMS(id);

    // Return detailed status based on the result
    if (result === "sent") {
      return NextResponse.json({
        success: true,
        status: "sent",
        message: "Reminder sent successfully",
      });
    }

    if (result === "already_sent") {
      return NextResponse.json({
        success: true,
        status: "already_sent",
        message: "Reminder was already sent for this appointment",
      });
    }

    if (result === "consent_missing") {
      return NextResponse.json({
        success: false,
        status: "consent_missing",
        message: "Customer has not opted in to receive SMS messages",
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      status: result,
      message: "Action completed",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to send reminder";
    const status =
      message === "SMS opt-in not found" ||
      message === "Cannot send reminder for non-booked appointment"
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
