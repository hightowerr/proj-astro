import crypto from "node:crypto";
import { z } from "zod";
import { getGoogleCalendarOAuthEnv } from "@/lib/env";

const GOOGLE_AUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_LIST_URL =
  "https://www.googleapis.com/calendar/v3/users/me/calendarList";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().int().positive().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
});

const calendarListResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).optional(),
        summary: z.string().min(1).optional(),
        primary: z.boolean().optional(),
      })
    )
    .optional(),
});

type OAuthStatePayload = {
  shopId: string;
  nonce: string;
  expiresAt: number;
};

function getStateSigningSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required");
  }

  return secret;
}

function encodeStatePayload(payload: OAuthStatePayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeStatePayload(payload: string): OAuthStatePayload {
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<OAuthStatePayload>;

  if (
    typeof parsed.shopId !== "string" ||
    typeof parsed.nonce !== "string" ||
    typeof parsed.expiresAt !== "number"
  ) {
    throw new Error("Invalid state payload");
  }

  return {
    shopId: parsed.shopId,
    nonce: parsed.nonce,
    expiresAt: parsed.expiresAt,
  };
}

function signStatePayload(payloadB64: string) {
  return crypto
    .createHmac("sha256", getStateSigningSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createGoogleCalendarOAuthState(shopId: string): string {
  const payload: OAuthStatePayload = {
    shopId,
    nonce: crypto.randomBytes(16).toString("base64url"),
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  };
  const encodedPayload = encodeStatePayload(payload);
  const signature = signStatePayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseGoogleCalendarOAuthState(state: string): { shopId: string } {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) {
    throw new Error("Invalid state parameter");
  }

  const expectedSig = signStatePayload(encodedPayload);
  const actualSig = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSig);

  if (
    actualSig.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(actualSig, expectedSigBuffer)
  ) {
    throw new Error("Invalid state signature");
  }

  const payload = decodeStatePayload(encodedPayload);
  if (payload.expiresAt < Date.now()) {
    throw new Error("Expired state parameter");
  }

  return { shopId: payload.shopId };
}

export function buildGoogleCalendarConnectUrl(state: string): string {
  const env = getGoogleCalendarOAuthEnv();
  const url = new URL(GOOGLE_AUTH_BASE_URL);

  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeGoogleCalendarCode(code: string) {
  const env = getGoogleCalendarOAuthEnv();
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const json = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status})`);
  }

  const parsed = tokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid Google token response");
  }

  if (!parsed.data.refresh_token) {
    throw new Error("Missing refresh token from Google OAuth response");
  }

  return {
    accessToken: parsed.data.access_token,
    refreshToken: parsed.data.refresh_token,
    expiresAt: new Date(
      Date.now() + (parsed.data.expires_in ?? 3600) * 1000
    ),
  };
}

export type GoogleCalendarListEntry = {
  id: string;
  summary: string;
  primary: boolean;
};

export async function fetchGoogleCalendarList(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const response = await fetch(GOOGLE_CALENDAR_LIST_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const json = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(`Google calendar list fetch failed (${response.status})`);
  }

  const parsed = calendarListResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid Google calendar list response");
  }

  return (parsed.data.items ?? [])
    .filter(
      (item): item is { id: string; summary: string; primary?: boolean } =>
        Boolean(item.id && item.summary)
    )
    .map((item) => ({
      id: item.id,
      summary: item.summary,
      primary: Boolean(item.primary),
    }));
}
