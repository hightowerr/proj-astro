import { CalendarSettingsClient } from "@/components/settings/calendar-settings-client";
import { db } from "@/lib/db";
import { requireShopAuth } from "@/lib/session";

export default async function CalendarSettingsPage() {
  const { shop } = await requireShopAuth();

  const connection = await db.query.calendarConnections.findFirst({
    where: (table, { and, eq, isNull }) =>
      and(eq(table.shopId, shop.id), isNull(table.deletedAt)),
  });

  const isGoogleOAuthConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI &&
      process.env.CALENDAR_ENCRYPTION_KEY
  );

  return (
    <div className="min-h-screen font-manrope">
      <main className="mx-auto max-w-7xl px-12 py-8">
        {/* Breadcrumb */}
        <p className="al-eyebrow mb-4">
          Settings / Calendar
        </p>

        {/* Header */}
        <header className="mb-12 animate-fade-up">
          <h1 className="al-page-title mb-4">
            Calendar Settings
          </h1>
          <p className="al-lede max-w-2xl">
            Manage how your studio connects to external calendars and define
            your default booking behavior.
          </p>
        </header>

        <CalendarSettingsClient
          isGoogleOAuthConfigured={isGoogleOAuthConfigured}
          hasShop={true}
          connection={
            connection
              ? {
                  id: connection.id,
                  calendarName: connection.calendarName,
                  createdAt: connection.createdAt.toISOString(),
                }
              : null
          }
        />
      </main>
    </div>
  );
}
