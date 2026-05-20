export const EMAIL_REMINDER_KEY = "appointment_reminder_24h";

export const EMAIL_REMINDER_DEFAULTS = {
  subjectTemplate: "Reminder: Your appointment tomorrow at {{shopName}}",
  bodyTemplate: `<!DOCTYPE html>
<html lang="en">
  <body>
    <p>Hi {{customerName}},</p>
    <p>This is a reminder about your appointment tomorrow at {{shopName}}.</p>
    <p>Date: {{appointmentDate}}</p>
    <p>Time: {{appointmentTime}}</p>
    <p><a href="{{bookingUrl}}">Manage your booking</a></p>
  </body>
</html>`,
};

export const SMS_REMINDER_KEY = "appointment_reminder_24h";

export const SMS_REMINDER_DEFAULTS = {
  bodyTemplate:
    "Reminder: Your appointment tomorrow at {{time}} at {{shop_name}}. {{manage_link}}Reply STOP to opt out.",
};
