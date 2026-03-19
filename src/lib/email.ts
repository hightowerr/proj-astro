import { Resend } from "resend";
import { getServerEnv } from "@/lib/env";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend
 *
 * @param params - Email parameters (to, subject, html)
 * @returns Result with success status and messageId or error
 *
 * @example
 * const result = await sendEmail({
 *   to: "customer@example.com",
 *   subject: "Appointment Reminder",
 *   html: "<p>Your appointment is tomorrow at 2pm</p>"
 * });
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<SendEmailResult> {
  const env = getServerEnv();
  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM_ADDRESS,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[sendEmail] Resend API error:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    if (!data) {
      console.error("[sendEmail] No data returned from Resend");
      return {
        success: false,
        error: "No response data from email service",
      };
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sendEmail] Exception:", error);
    return {
      success: false,
      error: message,
    };
  }
}
