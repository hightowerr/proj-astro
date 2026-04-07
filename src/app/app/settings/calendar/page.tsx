import { CalendarSettingsClient } from "@/components/settings/calendar-settings-client";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

export default async function CalendarSettingsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  const connection = shop
    ? await db.query.calendarConnections.findFirst({
        where: (table, { and, eq, isNull }) =>
          and(eq(table.shopId, shop.id), isNull(table.deletedAt)),
      })
    : null;

  const isGoogleOAuthConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI &&
      process.env.CALENDAR_ENCRYPTION_KEY
  );

  return (
    <div
      className="min-h-screen font-manrope"
      style={{ background: "var(--al-background)" }}
    >
      <main className="mx-auto max-w-screen-xl px-6 md:px-12 py-12 md:py-16">
        {/* Breadcrumb */}
        <p
          className="text-sm font-medium mb-4"
          style={{ color: "var(--al-on-surface-variant)" }}
        >
          Settings / Calendar
        </p>

        {/* Header */}
        <header
          className="mb-12"
          style={{ animation: "fade-up 0.4s ease-out both" }}
        >
          <h1
            className="font-manrope text-4xl md:text-5xl font-extrabold tracking-tight mb-4"
            style={{ color: "var(--al-primary)" }}
          >
            Calendar Settings
          </h1>
          <p
            className="text-lg font-light max-w-2xl"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            Manage how your studio connects to external calendars and define
            your default booking behavior.
          </p>
        </header>

        <CalendarSettingsClient
          isGoogleOAuthConfigured={isGoogleOAuthConfigured}
          hasShop={Boolean(shop)}
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
