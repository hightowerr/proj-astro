import { ReminderTimingsForm } from "@/components/settings/reminder-timings-form";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

type Interval = "10m" | "1h" | "2h" | "4h" | "24h" | "48h" | "1w";

export default async function ReminderSettingsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Reminders</h1>
        <p className="text-muted-foreground text-sm">
          Create your shop to configure reminder settings.
        </p>
      </div>
    );
  }

  const settings = await db.query.bookingSettings.findFirst({
    where: (table, { eq }) => eq(table.shopId, shop.id),
  });

  const initialTimings = (settings?.reminderTimings as Interval[]) ?? ["24h"];

  return (
    <div className="container mx-auto space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Reminders</h1>
        <p className="text-muted-foreground text-sm">
          Configure when automated reminders send before appointments.
        </p>
      </header>
      <div className="rounded-lg border p-6">
        <ReminderTimingsForm initialTimings={initialTimings} />
      </div>
    </div>
  );
}
