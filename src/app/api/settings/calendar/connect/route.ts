import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildGoogleCalendarConnectUrl,
  createGoogleCalendarOAuthState,
} from "@/lib/google-calendar-oauth";
import { getShopByOwnerId } from "@/lib/queries/shops";

function redirectToSettingsWithError(request: NextRequest, message: string) {
  const url = new URL("/app/settings/calendar", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await getShopByOwnerId(session.user.id);
    if (!shop) {
      return NextResponse.json({ error: "No shop found for user" }, { status: 404 });
    }

    const state = createGoogleCalendarOAuthState(shop.id);
    return NextResponse.redirect(buildGoogleCalendarConnectUrl(state));
  } catch (error) {
    console.error("[calendar/connect] Failed to initiate OAuth flow", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    const message =
      error instanceof Error && error.message.includes("configured")
        ? "Google Calendar integration is not configured"
        : "Failed to initiate calendar connection";

    return redirectToSettingsWithError(request, message);
  }
}
