import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { getGoogleCalendarOAuthEnv } from "@/lib/env";
import {
  decryptToken,
  deserializeEncryptedToken,
  encryptToken,
  serializeEncryptedToken,
} from "@/lib/google-calendar-encryption";
import { calendarConflictAlerts, calendarConnections } from "@/lib/schema";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API_BASE_URL = "https://www.googleapis.com/calendar/v3";
const CALENDAR_API_TIMEOUT_MS = 5000;
const CALENDAR_DELETE_TIMEOUT_MS = 3000;
const TOKEN_EXPIRY_SKEW_MS = 60_000;

const tokenRefreshResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive().optional(),
});

const createEventResponseSchema = z.object({
  id: z.string().min(1).optional(),
});

export type CalendarConnectionWithTokens = {
  id: string;
  shopId: string;
  calendarId: string;
  calendarName: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  encryptionKeyId: string;
};

type CalendarAuthConnection = Pick<
  CalendarConnectionWithTokens,
  "id" | "accessToken" | "refreshToken" | "tokenExpiresAt"
>;

export class CalendarEventCreationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CalendarEventCreationError";
  }
}

export class NoCalendarConnectionError extends Error {
  constructor(shopId: string) {
    super(`No active calendar connection for shop ${shopId}`);
    this.name = "NoCalendarConnectionError";
  }
}

export async function getCalendarConnection(
  shopId: string
): Promise<CalendarConnectionWithTokens | null> {
  const [connection] = await db
    .select({
      id: calendarConnections.id,
      shopId: calendarConnections.shopId,
      calendarId: calendarConnections.calendarId,
      calendarName: calendarConnections.calendarName,
      accessTokenEncrypted: calendarConnections.accessTokenEncrypted,
      refreshTokenEncrypted: calendarConnections.refreshTokenEncrypted,
      tokenExpiresAt: calendarConnections.tokenExpiresAt,
      encryptionKeyId: calendarConnections.encryptionKeyId,
    })
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.shopId, shopId),
        isNull(calendarConnections.deletedAt)
      )
    )
    .limit(1);

  if (!connection) {
    return null;
  }

  const accessToken = decryptToken(
    deserializeEncryptedToken(connection.accessTokenEncrypted)
  );
  const refreshToken = decryptToken(
    deserializeEncryptedToken(connection.refreshTokenEncrypted)
  );

  return {
    id: connection.id,
    shopId: connection.shopId,
    calendarId: connection.calendarId,
    calendarName: connection.calendarName,
    accessToken,
    refreshToken,
    tokenExpiresAt: connection.tokenExpiresAt,
    encryptionKeyId: connection.encryptionKeyId,
  };
}

export async function refreshAccessToken(input: {
  id: string;
  refreshToken: string;
}): Promise<{ accessToken: string; expiresAt: Date }> {
  const oauthEnv = getGoogleCalendarOAuthEnv();
  const body = new URLSearchParams({
    client_id: oauthEnv.GOOGLE_CLIENT_ID,
    client_secret: oauthEnv.GOOGLE_CLIENT_SECRET,
    refresh_token: input.refreshToken,
    grant_type: "refresh_token",
  });

  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    });
  } catch (error) {
    throw new CalendarEventCreationError("Failed to refresh calendar token", {
      cause: error,
    });
  }

  const json = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    console.error("[calendar] Token refresh failed", {
      connectionId: input.id,
      status: response.status,
    });
    throw new CalendarEventCreationError("Failed to refresh calendar token");
  }

  const parsed = tokenRefreshResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new CalendarEventCreationError("Invalid token refresh response");
  }

  const expiresAt = new Date(
    Date.now() + (parsed.data.expires_in ?? 3600) * 1000
  );

  await db
    .update(calendarConnections)
    .set({
      accessTokenEncrypted: serializeEncryptedToken(
        encryptToken(parsed.data.access_token)
      ),
      tokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(calendarConnections.id, input.id));

  console.warn("[calendar] Refreshed access token", {
    connectionId: input.id,
  });

  return {
    accessToken: parsed.data.access_token,
    expiresAt,
  };
}

function isTokenExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now() + TOKEN_EXPIRY_SKEW_MS;
}

async function getValidAccessToken(
  connection: CalendarAuthConnection
): Promise<string> {
  if (!isTokenExpired(connection.tokenExpiresAt)) {
    return connection.accessToken;
  }

  console.warn("[calendar] Access token expired, refreshing", {
    connectionId: connection.id,
  });
  const refreshed = await refreshAccessToken({
    id: connection.id,
    refreshToken: connection.refreshToken,
  });
  return refreshed.accessToken;
}

export async function getAuthClient(
  connection: CalendarAuthConnection
): Promise<string> {
  return await getValidAccessToken(connection);
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CALENDAR_API_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new CalendarEventCreationError("Calendar API timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function deleteWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CALENDAR_DELETE_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Calendar API timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function createCalendarEvent(input: {
  shopId: string;
  customerName: string;
  startsAt: Date;
  endsAt: Date;
  shopName?: string;
  bookingUrl?: string | null;
}): Promise<string> {
  const connection = await getCalendarConnection(input.shopId);
  if (!connection) {
    throw new NoCalendarConnectionError(input.shopId);
  }

  const createEventUrl = `${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${encodeURIComponent(
    connection.calendarId
  )}/events`;
  const eventBody = {
    summary: `Appointment: ${input.customerName}`,
    description: input.bookingUrl
      ? `Booking details: ${input.bookingUrl}`
      : "Appointment booked via booking system",
    location: input.shopName,
    start: {
      dateTime: input.startsAt.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: input.endsAt.toISOString(),
      timeZone: "UTC",
    },
  };

  const tryCreate = async (accessToken: string) => {
    return await fetchWithTimeout(createEventUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
      cache: "no-store",
    });
  };

  try {
    let accessToken = await getAuthClient(connection);
    let response = await tryCreate(accessToken);

    if (response.status === 401) {
      const refreshed = await refreshAccessToken({
        id: connection.id,
        refreshToken: connection.refreshToken,
      });
      accessToken = refreshed.accessToken;
      response = await tryCreate(accessToken);
    }

    const json = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      console.error("[calendar] Event creation failed", {
        shopId: input.shopId,
        connectionId: connection.id,
        status: response.status,
      });
      throw new CalendarEventCreationError("Failed to create calendar event");
    }

    const parsed = createEventResponseSchema.safeParse(json);
    if (!parsed.success || !parsed.data.id) {
      throw new CalendarEventCreationError("Invalid calendar event response");
    }

    console.warn("[calendar] Event created", {
      shopId: input.shopId,
      connectionId: connection.id,
      eventId: parsed.data.id,
    });

    return parsed.data.id;
  } catch (error) {
    if (error instanceof CalendarEventCreationError) {
      throw error;
    }

    console.error("[calendar] Unexpected event creation error", {
      shopId: input.shopId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw new CalendarEventCreationError("Failed to create calendar event", {
      cause: error,
    });
  }
}

export async function deleteCalendarEvent(input: {
  shopId: string;
  calendarEventId: string;
}): Promise<boolean> {
  const connection = await getCalendarConnection(input.shopId);
  if (!connection) {
    console.warn("[calendar] No connection found; skipping event deletion", {
      shopId: input.shopId,
      calendarEventId: input.calendarEventId,
    });
    return false;
  }

  const deleteEventUrl = `${GOOGLE_CALENDAR_API_BASE_URL}/calendars/${encodeURIComponent(
    connection.calendarId
  )}/events/${encodeURIComponent(input.calendarEventId)}`;

  try {
    const accessToken = await getAuthClient(connection);
    const response = await deleteWithTimeout(deleteEventUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (response.status === 404) {
      console.warn("[calendar] Event already deleted (404)", {
        shopId: input.shopId,
        calendarEventId: input.calendarEventId,
      });
      return true;
    }

    if (!response.ok) {
      console.error("[calendar] Event deletion failed", {
        shopId: input.shopId,
        calendarEventId: input.calendarEventId,
        status: response.status,
      });
      return false;
    }

    console.warn("[calendar] Event deleted", {
      shopId: input.shopId,
      calendarEventId: input.calendarEventId,
    });
    return true;
  } catch (error) {
    console.error("[calendar] Event deletion failed", {
      shopId: input.shopId,
      calendarEventId: input.calendarEventId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

export async function autoResolveAlert(
  shopId: string,
  calendarEventId: string
): Promise<void> {
  try {
    const now = new Date();
    const updated = await db
      .update(calendarConflictAlerts)
      .set({
        status: "auto_resolved_cancelled",
        resolvedAt: now,
        resolvedBy: "system_cancelled",
        updatedAt: now,
      })
      .where(
        and(
          eq(calendarConflictAlerts.shopId, shopId),
          eq(calendarConflictAlerts.calendarEventId, calendarEventId),
          eq(calendarConflictAlerts.status, "pending")
        )
      )
      .returning({ id: calendarConflictAlerts.id });

    if (updated.length > 0) {
      console.warn("[calendar] Auto-resolved conflict alerts after cancellation", {
        shopId,
        calendarEventId,
        count: updated.length,
      });
    }
  } catch (error) {
    console.error("[calendar] Failed to auto-resolve conflict alerts", {
      shopId,
      calendarEventId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function invalidateCalendarCache(
  shopId: string,
  date: string
): Promise<void> {
  const { invalidateCalendarCache: invalidate } = await import(
    "@/lib/google-calendar-cache"
  );
  await invalidate(shopId, date);
}
