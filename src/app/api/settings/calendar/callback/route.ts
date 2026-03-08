import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptToken, serializeEncryptedToken } from "@/lib/google-calendar-encryption";
import {
  exchangeGoogleCalendarCode,
  fetchGoogleCalendarList,
  parseGoogleCalendarOAuthState,
} from "@/lib/google-calendar-oauth";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { calendarConnections } from "@/lib/schema";

function redirectToSettings(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/app/settings/calendar", request.url);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const oauthError = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (oauthError) {
    return redirectToSettings(request, { error: "Calendar connection was cancelled" });
  }

  if (!code || !state) {
    return redirectToSettings(request, { error: "Invalid callback parameters" });
  }

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return redirectToSettings(request, { error: "Please sign in and try again" });
    }

    const { shopId } = parseGoogleCalendarOAuthState(state);
    const shop = await getShopByOwnerId(session.user.id);

    if (!shop || shop.id !== shopId) {
      return redirectToSettings(request, { error: "Invalid calendar connection state" });
    }

    const tokens = await exchangeGoogleCalendarCode(code);
    const calendars = await fetchGoogleCalendarList(tokens.accessToken);
    const selectedCalendar = calendars.find((calendar) => calendar.primary) ?? calendars[0];

    if (!selectedCalendar) {
      return redirectToSettings(request, { error: "No calendars found in Google account" });
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(calendarConnections)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(calendarConnections.shopId, shop.id),
            isNull(calendarConnections.deletedAt)
          )
        );

      await tx.insert(calendarConnections).values({
        shopId: shop.id,
        calendarId: selectedCalendar.id,
        calendarName: selectedCalendar.summary,
        accessTokenEncrypted: serializeEncryptedToken(encryptToken(tokens.accessToken)),
        refreshTokenEncrypted: serializeEncryptedToken(encryptToken(tokens.refreshToken)),
        tokenExpiresAt: tokens.expiresAt,
        encryptionKeyId: "default",
      });
    });

    return redirectToSettings(request, { success: "Google Calendar connected" });
  } catch (error) {
    console.error("[calendar/callback] Failed to process OAuth callback", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return redirectToSettings(request, { error: "Failed to connect Google Calendar" });
  }
}
