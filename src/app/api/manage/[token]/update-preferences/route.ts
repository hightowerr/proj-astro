import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { validateToken } from "@/lib/manage-tokens";
import { customerContactPrefs } from "@/lib/schema";

const bodySchema = z.object({
  emailOptIn: z.boolean(),
});

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { token } = await params;
    const appointmentId = await validateToken(token);

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Invalid or expired booking link" },
        { status: 404 }
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const appointment = await db.query.appointments.findFirst({
      where: (table, { eq }) => eq(table.id, appointmentId),
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const existing = await db.query.customerContactPrefs.findFirst({
      where: (table, { eq }) => eq(table.customerId, appointment.customerId),
    });

    if (existing) {
      await db
        .update(customerContactPrefs)
        .set({
          emailOptIn: parsed.data.emailOptIn,
          updatedAt: new Date(),
        })
        .where(eq(customerContactPrefs.customerId, appointment.customerId));
    } else {
      await db.insert(customerContactPrefs).values({
        customerId: appointment.customerId,
        emailOptIn: parsed.data.emailOptIn,
        smsOptIn: false,
      });
    }

    return NextResponse.json({
      success: true,
      emailOptIn: parsed.data.emailOptIn,
      message: parsed.data.emailOptIn
        ? "You'll receive email reminders for future appointments."
        : "Email reminders have been turned off.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update preferences",
      },
      { status: 500 }
    );
  }
}
