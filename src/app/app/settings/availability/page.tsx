import { AvailabilitySettingsForm } from "@/components/settings/availability-settings-form";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";
import { updateAvailabilitySettings } from "./actions";

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const normalizeTime = (value: string | null | undefined, fallback: string) => {
  if (!value) {
    return fallback;
  }

  return value.slice(0, 5);
};

export default async function AvailabilitySettingsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="max-w-7xl mx-auto px-12 py-8">
        <h1 className="al-page-title">Availability settings</h1>
        <p className="al-lede">
          Create your shop to configure slot availability.
        </p>
      </div>
    );
  }

  const [settings, existingHours] = await Promise.all([
    db.query.bookingSettings.findFirst({
      where: (table, { eq }) => eq(table.shopId, shop.id),
    }),
    db.query.shopHours.findMany({
      where: (table, { eq }) => eq(table.shopId, shop.id),
    }),
  ]);

  const hoursByDay = new Map(existingHours.map((row) => [row.dayOfWeek, row]));

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-12 py-8">
      <header className="space-y-2">
        <h1 className="al-page-title">Availability settings</h1>
        <p className="al-lede">
          Configure working hours and slot duration used on your booking page.
        </p>
      </header>

      <AvailabilitySettingsForm
        action={updateAvailabilitySettings.bind(null, shop.id)}
        initial={{
          timezone: settings?.timezone ?? "UTC",
          slotMinutes: (settings?.slotMinutes ?? 60) as 15 | 30 | 45 | 60 | 90 | 120,
          defaultBufferMinutes: (settings?.defaultBufferMinutes ?? 0) as 0 | 5 | 10,
          days: DAY_LABELS.map((label, dayOfWeek) => {
            const row = hoursByDay.get(dayOfWeek);
            return {
              dayOfWeek,
              label,
              isClosed: !row,
              openTime: normalizeTime(row?.openTime, "09:00"),
              closeTime: normalizeTime(row?.closeTime, "17:00"),
            };
          }),
        }}
      />
    </div>
  );
}
