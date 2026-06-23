import { EmailTemplateForm } from "@/components/settings/email-template-form";
import { ReminderTimingsForm } from "@/components/settings/reminder-timings-form";
import { SmsTemplateForm } from "@/components/settings/sms-template-form";
import { db } from "@/lib/db";
import { getOrCreateTemplate } from "@/lib/messages";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";
import {
  EMAIL_REMINDER_KEY,
  EMAIL_REMINDER_DEFAULTS,
  SMS_REMINDER_KEY,
  SMS_REMINDER_DEFAULTS,
} from "./template-constants";

type Interval = "10m" | "1h" | "2h" | "4h" | "24h" | "48h" | "1w";

export default async function ReminderSettingsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-12 py-8">
        <h1 className="al-page-title">Reminders</h1>
        <p className="al-lede">
          Create your shop to configure reminder settings.
        </p>
      </div>
    );
  }

  const settings = await db.query.bookingSettings.findFirst({
    where: (table, { eq }) => eq(table.shopId, shop.id),
  });

  const initialTimings = (settings?.reminderTimings as Interval[]) ?? ["24h"];

  const emailTemplate = await getOrCreateTemplate(
    EMAIL_REMINDER_KEY,
    "email",
    1,
    EMAIL_REMINDER_DEFAULTS,
  );

  const smsTemplate = await getOrCreateTemplate(
    SMS_REMINDER_KEY,
    "sms",
    1,
    SMS_REMINDER_DEFAULTS,
  );

  return (
    <div className="container mx-auto space-y-8 px-12 py-8">
      <header className="space-y-2">
        <h1 className="al-page-title">Reminders</h1>
        <p className="al-lede">
          Configure when automated reminders send before appointments.
        </p>
      </header>
      <div className="rounded-lg border p-6">
        <ReminderTimingsForm initialTimings={initialTimings} />
      </div>
      <div className="rounded-lg border p-6">
        <h2 className="al-section-title mb-1">Email reminder template</h2>
        <p className="text-sm text-al-on-surface-variant mb-6">
          Customize the email sent to customers before their appointment.
          Variables in <code>{"{{double braces}}"}</code> are replaced with real
          data at send time.
        </p>
        <EmailTemplateForm
          initialSubject={emailTemplate.subjectTemplate ?? ""}
          initialBody={emailTemplate.bodyTemplate}
          shopName={shop.name}
        />
      </div>
      <div className="rounded-lg border p-6">
        <h2 className="al-section-title mb-1">SMS reminder template</h2>
        <p className="text-sm text-al-on-surface-variant mb-6">
          Customize the SMS sent to high-risk customers before their appointment.
          Variables in <code>{"{{double braces}}"}</code> are replaced with real
          data at send time.
        </p>
        <SmsTemplateForm
          initialBody={smsTemplate.bodyTemplate}
          shopName={shop.name}
        />
      </div>
    </div>
  );
}
