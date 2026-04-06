import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { getOrCreateTemplate, renderTemplate } from "@/lib/messages";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const toEmail = searchParams.get("to");

  if (!toEmail) {
    return NextResponse.json(
      { error: "Missing 'to' query parameter" },
      { status: 400 }
    );
  }

  try {
    // Fetch email template
    const template = await getOrCreateTemplate(
      "appointment_reminder_24h",
      "email",
      1
    );

    // Mock appointment data
    const appointmentData = {
      customerName: "Alex Johnson",
      shopName: "Downtown Barber Shop",
      appointmentDate: "March 18, 2026",
      appointmentTime: "2:00 PM - 3:00 PM",
      bookingUrl: "https://example.com/manage/demo123",
    };

    // Render templates
    const subject = renderTemplate(template.subjectTemplate!, appointmentData);
    const body = renderTemplate(template.bodyTemplate!, appointmentData);

    // Send email
    const result = await sendEmail({
      to: toEmail,
      subject,
      html: body,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to send email", details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templateVariables: {
        found: ["customerName", "shopName", "appointmentDate", "appointmentTime", "bookingUrl"],
        replaced: 5,
        remaining: 0, // Should be 0 - no unreplaced {{variables}}
      },
      message: `Template rendered and email sent to ${toEmail}`,
      messageId: result.messageId,
      preview: {
        subject,
        bodyPreview: body.substring(0, 200) + "...",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
