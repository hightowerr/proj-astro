#!/usr/bin/env tsx

import { getOrCreateTemplate } from "@/lib/messages";

const EMAIL_TEMPLATE_KEY = "appointment_reminder_24h";
const EMAIL_TEMPLATE_VERSION = 1;

const EMAIL_SUBJECT_TEMPLATE =
  "Reminder: Your appointment tomorrow at {{shopName}}";

const EMAIL_BODY_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Appointment Reminder</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
      <h1 style="color: #2c3e50; margin-top: 0;">Hi {{customerName}}!</h1>
      <p style="font-size: 16px; color: #555;">
        This is a friendly reminder about your upcoming appointment.
      </p>

      <div style="background-color: white; border-left: 4px solid #3498db; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <h2 style="margin-top: 0; color: #2c3e50; font-size: 18px;">Appointment Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 100px;"><strong>Shop:</strong></td>
            <td style="padding: 8px 0; color: #333;">{{shopName}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Date:</strong></td>
            <td style="padding: 8px 0; color: #333;">{{appointmentDate}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Time:</strong></td>
            <td style="padding: 8px 0; color: #333;">{{appointmentTime}}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 16px; color: #555; margin-top: 30px;">
        Need to reschedule or cancel? Use the link below.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a
          href="{{bookingUrl}}"
          style="display: inline-block; background-color: #3498db; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;"
        >
          Manage Your Booking
        </a>
      </div>
    </div>

    <div style="text-align: center; color: #999; font-size: 14px; padding: 20px 0; border-top: 1px solid #eee;">
      <p style="margin: 5px 0;">We look forward to seeing you.</p>
      <p style="margin: 5px 0;">
        <a href="{{bookingUrl}}" style="color: #3498db; text-decoration: none;">View booking details</a>
      </p>
    </div>
  </body>
</html>
`.trim();

async function main() {
  console.log("Seeding email template...");

  const template = await getOrCreateTemplate(
    EMAIL_TEMPLATE_KEY,
    "email",
    EMAIL_TEMPLATE_VERSION,
    {
      subjectTemplate: EMAIL_SUBJECT_TEMPLATE,
      bodyTemplate: EMAIL_BODY_TEMPLATE,
    }
  );

  console.log("Email template ready");
  console.log(`  id: ${template.id}`);
  console.log(`  key: ${template.key}`);
  console.log(`  version: ${template.version}`);
  console.log(`  channel: ${template.channel}`);
}

main().catch((error) => {
  console.error("Failed to seed email template:", error);
  process.exit(1);
});
