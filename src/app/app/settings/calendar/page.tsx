import { Calendar } from "lucide-react";
import { CalendarSettingsClient } from "@/components/settings/calendar-settings-client";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";

export default async function CalendarSettingsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Calendar settings</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to connect Google Calendar.
        </p>
      </div>
    );
  }

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
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-bg-dark-secondary text-primary">
          <Calendar className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-semibold">Calendar settings</h1>
        <p className="text-sm text-muted-foreground">
          Connect Google Calendar to prepare for appointment sync and conflict detection.
        </p>
      </header>

      <CalendarSettingsClient
        isGoogleOAuthConfigured={isGoogleOAuthConfigured}
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
    </div>
  );
}
