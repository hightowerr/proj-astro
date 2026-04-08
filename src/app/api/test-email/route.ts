import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const emailSchema = z.string().email("Invalid email address format");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const toEmail = searchParams.get("to");

  if (!toEmail) {
    return NextResponse.json(
      {
        error:
          "Missing 'to' query parameter. Usage: /api/test-email?to=your@email.com",
      },
      { status: 400 }
    );
  }

  const parsedEmail = emailSchema.safeParse(toEmail);
  if (!parsedEmail.success) {
    return NextResponse.json(
      { error: parsedEmail.error.issues[0]?.message ?? "Invalid email address" },
      { status: 400 }
    );
  }

  const result = await sendEmail({
    to: parsedEmail.data,
    subject: "Test Email from Booking System",
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #333;">Email Infrastructure Test</h1>
          <p>This is a test email from your booking system.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
          <hr style="margin: 20px 0;" />
          <p style="color: #666; font-size: 14px;">
            If you received this email, your email infrastructure is working correctly!
          </p>
        </body>
      </html>
    `,
  });

  if (!result.success) {
    console.error("[test-email] Failed to send:", result.error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: result.error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Email sent successfully to ${parsedEmail.data}`,
    messageId: result.messageId,
  });
}
