# V1: Google Calendar OAuth Connection - Implementation Plan

**Status:** Ready for implementation
**Appetite:** 2-3 days
**Dependencies:** None (foundation slice)
**Demo:** Shop owner connects Google Calendar via OAuth, sees connection status, can disconnect

---

## Overview

V1 establishes the foundation for Google Calendar integration by implementing OAuth 2.0 authentication flow. Shop owners can authorize the application to access their Google Calendar, select which calendar to sync, view connection status, and disconnect at any time.

### Goal

Enable shop owners to:
1. **Connect** their Google Calendar account via OAuth 2.0
2. **Select** which calendar to sync with appointments
3. **View** connection status (connected calendar name, connection date)
4. **Disconnect** their calendar at any time

This slice provides the authentication foundation required for all subsequent calendar features (V2-V7).

---

## Current State Analysis

### Existing Infrastructure

**Authentication:**
- Better Auth authentication system already in place
- Protected routes use `src/proxy.ts` (Next.js 16 convention)
- Session management handles shop owner identification

**Settings Pages:**
- `/app/settings/payment-policy` exists as reference
- Settings UI pattern established with form components
- Dashboard navigation structure in place

**Environment Variables:**
- `env.example` and `src/lib/env.ts` handle configuration
- Pattern for secrets like `STRIPE_SECRET_KEY`, `TWILIO_AUTH_TOKEN`

**Database:**
- PostgreSQL with Drizzle ORM
- Migration system via `pnpm db:generate` and `pnpm db:migrate`
- Schema defined in `src/lib/schema.ts`

### What's Missing (to be built)

1. **Google OAuth credentials** - Not yet configured
2. **Calendar connections table** - No database schema
3. **Token encryption** - Need secure storage for refresh tokens
4. **OAuth routes** - `/api/settings/calendar/*` endpoints
5. **Calendar settings page** - UI at `/app/settings/calendar`

---

## Requirements

### Functional Requirements

**FR1: OAuth Initiation**
- Shop owner clicks "Connect Google Calendar" button
- Application generates OAuth URL with correct scopes
- State parameter included for CSRF protection
- Redirects to Google consent screen

**FR2: OAuth Callback**
- Google redirects to callback URL with authorization code
- Application validates state parameter
- Exchanges code for access token and refresh token
- Fetches user's calendar list from Google Calendar API
- Displays calendar selection UI

**FR3: Calendar Selection**
- Shop owner selects which calendar to sync
- Application stores connection with encrypted tokens
- Redirects back to settings page
- Shows success message

**FR4: Connection Status**
- Settings page displays connection status
- Shows connected calendar name
- Shows connection timestamp
- Provides "Disconnect" button

**FR5: Disconnect**
- Shop owner clicks "Disconnect"
- Application soft-deletes connection (sets `deletedAt`)
- Clears connection status display
- Shows disconnection confirmation

### Non-Functional Requirements

**NFR1: Security**
- Refresh tokens encrypted at rest using AES-256-GCM
- OAuth state parameter prevents CSRF attacks
- Tokens never exposed in logs or error messages
- Callback URL validates state before processing

**NFR2: Data Isolation**
- Each shop can have only one active calendar connection
- Connections scoped to shop ID (multi-tenancy)
- Soft deletion preserves audit trail

**NFR3: Error Handling**
- OAuth errors display user-friendly messages
- Failed token exchange logged with sanitized details
- Network failures show retry instructions
- Token encryption failures prevent connection storage

---

## Database Schema

### New Table: `calendar_connections`

**File:** `drizzle/0016_calendar_connections.sql` (new migration)

**Schema:**

```sql
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,

  -- Calendar identification
  calendar_id TEXT NOT NULL,           -- Google Calendar ID (e.g., "primary")
  calendar_name TEXT NOT NULL,         -- Display name (e.g., "My Calendar")

  -- OAuth tokens (encrypted)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- Encryption metadata
  encryption_key_id TEXT NOT NULL DEFAULT 'default',  -- For key rotation

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT one_active_connection_per_shop
    EXCLUDE (shop_id WITH =)
    WHERE (deleted_at IS NULL)
);

CREATE INDEX idx_calendar_connections_shop_id
  ON calendar_connections(shop_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_calendar_connections_deleted
  ON calendar_connections(deleted_at)
  WHERE deleted_at IS NOT NULL;
```

**Drizzle Schema Update:**

**File:** `src/lib/schema.ts`

```typescript
export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),

    // Calendar identification
    calendarId: text("calendar_id").notNull(),
    calendarName: text("calendar_name").notNull(),

    // OAuth tokens (encrypted)
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),

    // Encryption metadata
    encryptionKeyId: text("encryption_key_id").notNull().default("default"),

    // Audit fields
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    shopIdIdx: index("idx_calendar_connections_shop_id")
      .on(table.shopId)
      .where(sql`${table.deletedAt} IS NULL`),
    deletedIdx: index("idx_calendar_connections_deleted")
      .on(table.deletedAt)
      .where(sql`${table.deletedAt} IS NOT NULL`),
  })
);

export type CalendarConnection = typeof calendarConnections.$inferSelect;
export type NewCalendarConnection = typeof calendarConnections.$inferInsert;
```

---

## Environment Configuration

### New Environment Variables

**File:** `env.example` (update)

```bash
# Google Calendar Integration (V1)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/settings/calendar/callback

# Token encryption key (32 bytes, base64 encoded)
# Generate: openssl rand -base64 32
CALENDAR_ENCRYPTION_KEY=your_base64_encryption_key_here
```

**File:** `src/lib/env.ts` (update)

```typescript
import { z } from "zod";

const envSchema = z.object({
  // ... existing variables ...

  // Google Calendar OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_REDIRECT_URI: z.string().url("GOOGLE_REDIRECT_URI must be a valid URL"),

  // Token encryption
  CALENDAR_ENCRYPTION_KEY: z.string().min(1, "CALENDAR_ENCRYPTION_KEY is required"),
});

export const env = envSchema.parse(process.env);
```

---

## Implementation Steps

### Step 1: Token Encryption Service

**File:** `src/lib/google-calendar-encryption.ts` (new file)

**Purpose:** Encrypt and decrypt OAuth tokens for secure storage

```typescript
import crypto from "crypto";
import { env } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  salt: string;
}

/**
 * Derives encryption key from base key using PBKDF2.
 * Allows key rotation via different salts.
 */
function deriveKey(baseKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    baseKey,
    salt,
    100000, // iterations
    32, // key length
    "sha256"
  );
}

/**
 * Encrypts a plaintext token using AES-256-GCM.
 *
 * @param plaintext - Token to encrypt (access_token or refresh_token)
 * @returns Encrypted data with IV, auth tag, and salt
 */
export function encryptToken(plaintext: string): EncryptedData {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(env.CALENDAR_ENCRYPTION_KEY, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    salt: salt.toString("base64"),
  };
}

/**
 * Decrypts an encrypted token using AES-256-GCM.
 *
 * @param encryptedData - Encrypted data with IV, auth tag, and salt
 * @returns Decrypted plaintext token
 * @throws Error if decryption fails (wrong key, tampered data)
 */
export function decryptToken(encryptedData: EncryptedData): string {
  const salt = Buffer.from(encryptedData.salt, "base64");
  const key = deriveKey(env.CALENDAR_ENCRYPTION_KEY, salt);
  const iv = Buffer.from(encryptedData.iv, "base64");
  const authTag = Buffer.from(encryptedData.authTag, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Serializes encrypted data to single database column.
 */
export function serializeEncryptedToken(data: EncryptedData): string {
  return JSON.stringify(data);
}

/**
 * Deserializes encrypted data from database column.
 */
export function deserializeEncryptedToken(serialized: string): EncryptedData {
  const parsed = JSON.parse(serialized);

  // Validate structure
  if (
    typeof parsed.encrypted !== "string" ||
    typeof parsed.iv !== "string" ||
    typeof parsed.authTag !== "string" ||
    typeof parsed.salt !== "string"
  ) {
    throw new Error("Invalid encrypted token format");
  }

  return parsed as EncryptedData;
}
```

**Security Notes:**
- Uses AES-256-GCM for authenticated encryption
- PBKDF2 key derivation with 100,000 iterations
- Random IV and salt for each encryption
- Authentication tag prevents tampering
- No plaintext tokens stored in database or logs

---

### Step 2: OAuth Connect Route

**File:** `src/app/api/settings/calendar/connect/route.ts` (new file)

**Purpose:** Initiate OAuth flow by redirecting to Google consent screen

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { shops } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import crypto from "crypto";

/**
 * GET /api/settings/calendar/connect
 *
 * Initiates Google Calendar OAuth flow.
 * Generates authorization URL and redirects to Google.
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate shop owner
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get shop owned by user
    const [shop] = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.ownerId, session.user.id))
      .limit(1);

    if (!shop) {
      return NextResponse.json(
        { error: "No shop found for user" },
        { status: 404 }
      );
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString("base64url");

    // Store state in session (expires in 10 minutes)
    // Note: In production, use Redis with TTL for state storage
    // For V1, we'll validate in callback by re-deriving from shop ID
    const stateWithShopId = `${shop.id}:${state}`;

    // Build Google OAuth URL
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar");
    authUrl.searchParams.set("access_type", "offline"); // Get refresh token
    authUrl.searchParams.set("prompt", "consent"); // Force consent for refresh token
    authUrl.searchParams.set("state", stateWithShopId);

    // Redirect to Google
    return NextResponse.redirect(authUrl.toString());

  } catch (error) {
    console.error("[calendar/connect] Error initiating OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate calendar connection" },
      { status: 500 }
    );
  }
}
```

---

### Step 3: OAuth Callback Route

**File:** `src/app/api/settings/calendar/callback/route.ts` (new file)

**Purpose:** Handle OAuth callback, exchange code for tokens, store connection

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarConnections, shops } from "@/lib/schema";
import { eq, and, isNull } from "drizzle-orm";
import { env } from "@/lib/env";
import { encryptToken, serializeEncryptedToken } from "@/lib/google-calendar-encryption";
import { google } from "googleapis";

/**
 * GET /api/settings/calendar/callback
 *
 * OAuth callback from Google.
 * Exchanges authorization code for tokens and stores connection.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors (user denied consent)
    if (error) {
      console.error("[calendar/callback] OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/app/settings/calendar?error=${encodeURIComponent("Calendar connection cancelled")}`,
          request.url
        )
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          `/app/settings/calendar?error=${encodeURIComponent("Invalid callback parameters")}`,
          request.url
        )
      );
    }

    // Parse and validate state
    const [shopId, stateToken] = state.split(":");
    if (!shopId || !stateToken) {
      return NextResponse.redirect(
        new URL(
          `/app/settings/calendar?error=${encodeURIComponent("Invalid state parameter")}`,
          request.url
        )
      );
    }

    // Verify shop exists
    const [shop] = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);

    if (!shop) {
      return NextResponse.redirect(
        new URL(
          `/app/settings/calendar?error=${encodeURIComponent("Shop not found")}`,
          request.url
        )
      );
    }

    // Exchange authorization code for tokens
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Missing tokens in OAuth response");
    }

    // Set credentials to fetch calendar list
    oauth2Client.setCredentials(tokens);

    // Fetch user's calendar list
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const { data } = await calendar.calendarList.list();

    if (!data.items || data.items.length === 0) {
      return NextResponse.redirect(
        new URL(
          `/app/settings/calendar?error=${encodeURIComponent("No calendars found")}`,
          request.url
        )
      );
    }

    // For V1, auto-select primary calendar
    // V1.1 could add UI for calendar selection
    const primaryCalendar = data.items.find((cal) => cal.primary) || data.items[0];

    if (!primaryCalendar.id || !primaryCalendar.summary) {
      throw new Error("Invalid calendar data");
    }

    // Encrypt tokens
    const accessTokenData = encryptToken(tokens.access_token);
    const refreshTokenData = encryptToken(tokens.refresh_token);

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // Soft-delete existing connection (if any)
    await db
      .update(calendarConnections)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(calendarConnections.shopId, shopId),
          isNull(calendarConnections.deletedAt)
        )
      );

    // Store new connection
    await db.insert(calendarConnections).values({
      shopId,
      calendarId: primaryCalendar.id,
      calendarName: primaryCalendar.summary,
      accessTokenEncrypted: serializeEncryptedToken(accessTokenData),
      refreshTokenEncrypted: serializeEncryptedToken(refreshTokenData),
      tokenExpiresAt: expiresAt,
      encryptionKeyId: "default",
    });

    // Redirect to settings page with success message
    return NextResponse.redirect(
      new URL(
        `/app/settings/calendar?success=${encodeURIComponent("Calendar connected successfully")}`,
        request.url
      )
    );

  } catch (error) {
    console.error("[calendar/callback] Error processing callback:", error);
    return NextResponse.redirect(
      new URL(
        `/app/settings/calendar?error=${encodeURIComponent("Failed to connect calendar")}`,
        request.url
      )
    );
  }
}
```

---

### Step 4: Disconnect Route

**File:** `src/app/api/settings/calendar/disconnect/route.ts` (new file)

**Purpose:** Soft-delete calendar connection

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calendarConnections, shops } from "@/lib/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * POST /api/settings/calendar/disconnect
 *
 * Soft-deletes the shop's calendar connection.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate shop owner
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get shop owned by user
    const [shop] = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.ownerId, session.user.id))
      .limit(1);

    if (!shop) {
      return NextResponse.json(
        { error: "No shop found for user" },
        { status: 404 }
      );
    }

    // Soft-delete connection
    const result = await db
      .update(calendarConnections)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(calendarConnections.shopId, shop.id),
          isNull(calendarConnections.deletedAt)
        )
      )
      .returning({ id: calendarConnections.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "No active calendar connection found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Calendar disconnected successfully",
    });

  } catch (error) {
    console.error("[calendar/disconnect] Error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect calendar" },
      { status: 500 }
    );
  }
}
```

---

### Step 5: Calendar Settings Page UI

**File:** `src/app/app/settings/calendar/page.tsx` (new file)

**Purpose:** UI for connecting/disconnecting Google Calendar

```typescript
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calendarConnections, shops } from "@/lib/schema";
import { eq, and, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CalendarSettingsClient } from "@/components/settings/calendar-settings-client";

export const metadata = {
  title: "Calendar Settings",
};

async function getCalendarConnection(ownerId: string) {
  const [shop] = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.ownerId, ownerId))
    .limit(1);

  if (!shop) {
    return null;
  }

  const [connection] = await db
    .select({
      id: calendarConnections.id,
      calendarName: calendarConnections.calendarName,
      createdAt: calendarConnections.createdAt,
    })
    .from(calendarConnections)
    .where(
      and(
        eq(calendarConnections.shopId, shop.id),
        isNull(calendarConnections.deletedAt)
      )
    )
    .limit(1);

  return connection;
}

export default async function CalendarSettingsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const connection = await getCalendarConnection(session.user.id);

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Calendar Settings</h1>

      <Suspense fallback={<div>Loading...</div>}>
        <CalendarSettingsClient
          connection={connection}
          successMessage={searchParams.success}
          errorMessage={searchParams.error}
        />
      </Suspense>
    </div>
  );
}
```

---

### Step 6: Calendar Settings Client Component

**File:** `src/components/settings/calendar-settings-client.tsx` (new file)

**Purpose:** Client component for calendar connection UI

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CalendarConnection {
  id: string;
  calendarName: string;
  createdAt: Date;
}

interface CalendarSettingsClientProps {
  connection: CalendarConnection | null;
  successMessage?: string;
  errorMessage?: string;
}

export function CalendarSettingsClient({
  connection,
  successMessage,
  errorMessage,
}: CalendarSettingsClientProps) {
  const router = useRouter();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect your Google Calendar?")) {
      return;
    }

    setIsDisconnecting(true);

    try {
      const response = await fetch("/api/settings/calendar/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      router.push("/app/settings/calendar?success=Calendar disconnected");
      router.refresh();
    } catch (error) {
      console.error("Disconnect error:", error);
      alert("Failed to disconnect calendar. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {errorMessage}
        </div>
      )}

      {/* Connection Status Card */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Google Calendar Integration</h2>

        {connection ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="font-medium">Connected</span>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Calendar:</span> {connection.calendarName}
              </div>
              <div>
                <span className="font-medium">Connected on:</span>{" "}
                {new Date(connection.createdAt).toLocaleDateString()}
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect Calendar"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-300 rounded-full" />
              <span className="font-medium">Not Connected</span>
            </div>

            <p className="text-sm text-gray-600">
              Connect your Google Calendar to automatically sync appointments and prevent
              double-bookings.
            </p>

            <a
              href="/api/settings/calendar/connect"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Connect Google Calendar
            </a>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-2">What happens when you connect?</p>
        <ul className="list-disc list-inside space-y-1">
          <li>New bookings will create events in your Google Calendar</li>
          <li>Your calendar events will block booking slots</li>
          <li>Cancelled appointments will remove calendar events</li>
          <li>Your calendar data is encrypted and secure</li>
        </ul>
      </div>
    </div>
  );
}
```

---

### Step 7: Add Navigation Link

**File:** `src/app/app/layout.tsx` (update)

Add calendar settings link to dashboard navigation:

```typescript
// In dashboard navigation section
<nav className="space-y-1">
  <Link href="/app">Dashboard</Link>
  <Link href="/app/appointments">Appointments</Link>
  <Link href="/app/customers">Customers</Link>
  <Link href="/app/settings/payment-policy">Payment Policy</Link>
  <Link href="/app/settings/calendar">Calendar</Link> {/* NEW */}
</nav>
```

---

## Testing Plan

### Unit Tests

**File:** `src/lib/__tests__/google-calendar-encryption.test.ts` (new file)

```typescript
import { describe, it, expect } from "vitest";
import {
  encryptToken,
  decryptToken,
  serializeEncryptedToken,
  deserializeEncryptedToken,
} from "@/lib/google-calendar-encryption";

describe("Token Encryption", () => {
  it("should encrypt and decrypt tokens correctly", () => {
    const plaintext = "ya29.a0AfH6SMBxyz...";

    const encrypted = encryptToken(plaintext);
    expect(encrypted.encrypted).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();
    expect(encrypted.salt).toBeTruthy();

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertext for same plaintext", () => {
    const plaintext = "test_token";

    const encrypted1 = encryptToken(plaintext);
    const encrypted2 = encryptToken(plaintext);

    // Different IVs and salts should produce different ciphertext
    expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    expect(encrypted1.salt).not.toBe(encrypted2.salt);

    // But both should decrypt to same plaintext
    expect(decryptToken(encrypted1)).toBe(plaintext);
    expect(decryptToken(encrypted2)).toBe(plaintext);
  });

  it("should fail decryption with tampered ciphertext", () => {
    const plaintext = "secure_token";
    const encrypted = encryptToken(plaintext);

    // Tamper with ciphertext
    const tampered = {
      ...encrypted,
      encrypted: encrypted.encrypted.slice(0, -1) + "X",
    };

    expect(() => decryptToken(tampered)).toThrow();
  });

  it("should serialize and deserialize encrypted tokens", () => {
    const plaintext = "refresh_token_xyz";
    const encrypted = encryptToken(plaintext);

    const serialized = serializeEncryptedToken(encrypted);
    expect(typeof serialized).toBe("string");

    const deserialized = deserializeEncryptedToken(serialized);
    expect(deserialized).toEqual(encrypted);

    const decrypted = decryptToken(deserialized);
    expect(decrypted).toBe(plaintext);
  });

  it("should validate encrypted token structure on deserialization", () => {
    const invalid = JSON.stringify({ foo: "bar" });

    expect(() => deserializeEncryptedToken(invalid)).toThrow(
      "Invalid encrypted token format"
    );
  });
});
```

---

### Integration Tests

**File:** `src/app/api/settings/calendar/__tests__/connect.test.ts` (new file)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../connect/route";
import { NextRequest } from "next/server";
import * as authModule from "@/lib/auth";

vi.mock("@/lib/auth");
vi.mock("@/lib/db");

describe("GET /api/settings/calendar/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user not authenticated", async () => {
    vi.spyOn(authModule.auth.api, "getSession").mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/settings/calendar/connect");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("should generate OAuth URL with correct parameters", async () => {
    vi.spyOn(authModule.auth.api, "getSession").mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    // Mock database query
    const mockDb = await import("@/lib/db");
    vi.spyOn(mockDb.db, "select").mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: "shop-123" }]),
        }),
      }),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/settings/calendar/connect");
    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect

    const location = response.headers.get("location");
    expect(location).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(location).toContain("client_id=");
    expect(location).toContain("scope=https://www.googleapis.com/auth/calendar");
    expect(location).toContain("access_type=offline");
    expect(location).toContain("state=");
  });

  it("should return 404 if shop not found for user", async () => {
    vi.spyOn(authModule.auth.api, "getSession").mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const mockDb = await import("@/lib/db");
    vi.spyOn(mockDb.db, "select").mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // No shop found
        }),
      }),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/settings/calendar/connect");
    const response = await GET(request);

    expect(response.status).toBe(404);
  });
});
```

---

### Playwright E2E Tests

**File:** `tests/e2e/calendar-oauth.spec.ts` (new file)

```typescript
import { test, expect } from "@playwright/test";
import { db } from "@/lib/db";
import { shops, calendarConnections } from "@/lib/schema";
import { eq, and, isNull } from "drizzle-orm";

test.describe("Google Calendar OAuth Flow", () => {
  let testShopId: string;

  test.beforeEach(async () => {
    // Create test shop
    const [shop] = await db
      .insert(shops)
      .values({
        name: "OAuth Test Shop",
        slug: "oauth-test",
        currency: "USD",
        ownerId: "test-owner-oauth",
        status: "active",
      })
      .returning();

    testShopId = shop.id;
  });

  test.afterEach(async () => {
    // Cleanup
    await db.delete(calendarConnections).where(eq(calendarConnections.shopId, testShopId));
    await db.delete(shops).where(eq(shops.id, testShopId));
  });

  test("should navigate to calendar settings page", async ({ page }) => {
    // Login as shop owner (assuming auth helpers exist)
    await loginAsShopOwner(page, "test-owner-oauth");

    // Navigate to calendar settings
    await page.goto("/app/settings/calendar");

    // Verify page content
    await expect(page.locator("h1")).toContainText("Calendar Settings");
    await expect(page.locator("text=Not Connected")).toBeVisible();
    await expect(page.locator("text=Connect Google Calendar")).toBeVisible();
  });

  test("should initiate OAuth flow when clicking connect button", async ({ page, context }) => {
    await loginAsShopOwner(page, "test-owner-oauth");
    await page.goto("/app/settings/calendar");

    // Mock OAuth redirect (don't actually go to Google)
    await context.route("https://accounts.google.com/**", (route) => {
      route.fulfill({
        status: 200,
        body: "Mocked Google OAuth",
      });
    });

    // Click connect button
    await page.click("text=Connect Google Calendar");

    // Verify redirect to Google OAuth (mocked)
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });

  test("should display connection status after successful OAuth callback", async ({ page }) => {
    // Manually insert connection (simulating successful OAuth)
    await db.insert(calendarConnections).values({
      shopId: testShopId,
      calendarId: "primary",
      calendarName: "My Test Calendar",
      accessTokenEncrypted: JSON.stringify({
        encrypted: "mock",
        iv: "mock",
        authTag: "mock",
        salt: "mock",
      }),
      refreshTokenEncrypted: JSON.stringify({
        encrypted: "mock",
        iv: "mock",
        authTag: "mock",
        salt: "mock",
      }),
      tokenExpiresAt: new Date(Date.now() + 3600000),
      encryptionKeyId: "default",
    });

    await loginAsShopOwner(page, "test-owner-oauth");
    await page.goto("/app/settings/calendar");

    // Verify connection status
    await expect(page.locator("text=Connected")).toBeVisible();
    await expect(page.locator("text=My Test Calendar")).toBeVisible();
    await expect(page.locator("text=Disconnect Calendar")).toBeVisible();
  });

  test("should disconnect calendar when clicking disconnect button", async ({ page }) => {
    // Insert connection
    await db.insert(calendarConnections).values({
      shopId: testShopId,
      calendarId: "primary",
      calendarName: "Test Calendar",
      accessTokenEncrypted: JSON.stringify({
        encrypted: "mock",
        iv: "mock",
        authTag: "mock",
        salt: "mock",
      }),
      refreshTokenEncrypted: JSON.stringify({
        encrypted: "mock",
        iv: "mock",
        authTag: "mock",
        salt: "mock",
      }),
      tokenExpiresAt: new Date(Date.now() + 3600000),
      encryptionKeyId: "default",
    });

    await loginAsShopOwner(page, "test-owner-oauth");
    await page.goto("/app/settings/calendar");

    // Mock confirm dialog
    page.on("dialog", (dialog) => dialog.accept());

    // Click disconnect
    await page.click("text=Disconnect Calendar");

    // Wait for redirect and refresh
    await page.waitForURL(/success=Calendar%20disconnected/);

    // Verify disconnected state
    await expect(page.locator("text=Not Connected")).toBeVisible();
    await expect(page.locator("text=Connect Google Calendar")).toBeVisible();

    // Verify database state
    const [connection] = await db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.shopId, testShopId),
          isNull(calendarConnections.deletedAt)
        )
      );

    expect(connection).toBeUndefined();
  });
});

// Helper function (would be in tests/helpers/)
async function loginAsShopOwner(page: any, ownerId: string) {
  // Implementation depends on Better Auth setup
  // This is a placeholder
  await page.goto("/api/auth/signin");
  // ... perform login
}
```

---

## Regression Prevention

### Existing Tests to Monitor

Run these tests after implementing V1 to ensure no regression:

```bash
# Core booking flow
pnpm test src/lib/__tests__/booking.test.ts
pnpm test:e2e tests/e2e/booking.spec.ts

# Payment flow
pnpm test:e2e tests/e2e/payment-flow.spec.ts

# Settings pages
pnpm test:e2e tests/e2e/* # All E2E tests

# All unit tests
pnpm test
```

**Expected behavior:**
- All existing tests pass without modification
- No new dependencies break existing functionality
- Database migrations apply cleanly

---

## Implementation Checklist

### Database & Schema

- [ ] Create `drizzle/0016_calendar_connections.sql` migration
- [ ] Update `src/lib/schema.ts` with `calendarConnections` table
- [ ] Run `pnpm db:generate` to verify migration
- [ ] Run `pnpm db:migrate` to apply migration
- [ ] Verify schema with `pnpm db:studio`

### Environment Configuration

- [ ] Add Google OAuth variables to `env.example`
- [ ] Update `src/lib/env.ts` with new variables
- [ ] Generate encryption key: `openssl rand -base64 32`
- [ ] Create Google Cloud project and OAuth credentials
- [ ] Configure authorized redirect URI in Google Console
- [ ] Add variables to `.env.local` for local testing

### Core Services

- [ ] Create `src/lib/google-calendar-encryption.ts`
- [ ] Implement `encryptToken()` function
- [ ] Implement `decryptToken()` function
- [ ] Implement serialization helpers
- [ ] Write unit tests for encryption service

### API Routes

- [ ] Create `src/app/api/settings/calendar/connect/route.ts`
- [ ] Implement OAuth initiation with state parameter
- [ ] Create `src/app/api/settings/calendar/callback/route.ts`
- [ ] Implement token exchange and connection storage
- [ ] Create `src/app/api/settings/calendar/disconnect/route.ts`
- [ ] Implement soft-delete logic
- [ ] Write integration tests for all routes

### UI Components

- [ ] Create `src/app/app/settings/calendar/page.tsx`
- [ ] Create `src/components/settings/calendar-settings-client.tsx`
- [ ] Implement connection status display
- [ ] Implement connect/disconnect buttons
- [ ] Add navigation link in dashboard layout
- [ ] Test UI manually in browser

### Testing

- [ ] Write unit tests for encryption (`src/lib/__tests__/google-calendar-encryption.test.ts`)
- [ ] Write integration tests for connect route
- [ ] Write integration tests for callback route
- [ ] Write integration tests for disconnect route
- [ ] Write Playwright E2E tests (`tests/e2e/calendar-oauth.spec.ts`)
- [ ] Run all tests: `pnpm test && pnpm test:e2e`
- [ ] Verify no regression in existing tests

### Code Quality

- [ ] Run `pnpm lint` and fix all errors
- [ ] Run `pnpm typecheck` and fix all errors
- [ ] Review error handling in all routes
- [ ] Add logging for debugging OAuth flow
- [ ] Sanitize logs (no plaintext tokens)

### Documentation

- [ ] Update README.md with Google Calendar setup instructions
- [ ] Update CLAUDE.md with calendar-related commands
- [ ] Add inline comments to encryption logic
- [ ] Document OAuth callback flow
- [ ] Add troubleshooting section for common errors

### Manual Testing

- [ ] Test OAuth flow end-to-end in browser
- [ ] Test error handling (deny consent, invalid state)
- [ ] Test disconnect flow
- [ ] Test with multiple shops (data isolation)
- [ ] Test token encryption/decryption round-trip
- [ ] Verify no plaintext tokens in database
- [ ] Verify soft-delete preserves audit trail

---

## Dependencies

**NPM Packages to Install:**

```bash
pnpm add googleapis@^140.0.0
pnpm add -D @types/node
```

**googleapis** package provides Google Calendar API client and OAuth helpers.

---

## Demo Script

### Preparation

1. Start dev server: `pnpm dev`
2. Open browser to `http://localhost:3000`
3. Login as shop owner
4. Ensure Google OAuth credentials configured

### Demo Flow

1. **Navigate to Calendar Settings**
   - Click "Settings" in dashboard
   - Click "Calendar" submenu
   - Verify "Not Connected" status shown

2. **Initiate OAuth Connection**
   - Click "Connect Google Calendar" button
   - Redirected to Google consent screen
   - Grant calendar permissions
   - (Note: In demo, this can be mocked)

3. **View Connection Status**
   - After callback, redirected to settings page
   - See "Connected" status with green indicator
   - Calendar name displayed: "Primary"
   - Connection timestamp shown

4. **Disconnect Calendar**
   - Click "Disconnect Calendar" button
   - Confirm in dialog
   - Status changes to "Not Connected"
   - "Connect Google Calendar" button reappears

5. **Verify Database State**
   - Open Drizzle Studio: `pnpm db:studio`
   - Navigate to `calendar_connections` table
   - Verify connection has `deletedAt` timestamp
   - Verify tokens are encrypted (not plaintext)

---

## Security Considerations

### Token Storage

**Problem:** OAuth tokens are sensitive credentials
**Solution:** AES-256-GCM encryption with PBKDF2 key derivation
**Verification:** Check database - no plaintext tokens visible

### CSRF Protection

**Problem:** OAuth callback vulnerable to CSRF attacks
**Solution:** State parameter with shop ID binding
**Verification:** Callback validates state matches initiated request

### Log Sanitization

**Problem:** Tokens could leak in error logs
**Solution:** Never log tokens, only operation metadata
**Verification:** Review all console.error() calls - no token parameters

### Key Rotation

**Problem:** Long-term use of same encryption key
**Solution:** `encryptionKeyId` field supports key rotation
**Future Work:** Implement key rotation mechanism in V1.1

---

## Known Limitations (V1)

1. **Auto-selects primary calendar** - No UI for calendar selection (V1.1 feature)
2. **No token refresh logic** - Tokens expire after ~1 hour (V2 will add refresh)
3. **No revocation handling** - If user revokes access in Google, connection silently fails (V6 monitoring)
4. **Single calendar only** - Multi-calendar support deferred to future version
5. **No Google API error retry** - Network failures not retried (V2 enhancement)

---

## Next Steps After V1

**V2: Create Events on Booking**
- Use stored connection to create calendar events
- Implement token refresh logic
- Add `calendarEventId` column to appointments table
- Test event creation in booking flow

**Prerequisites from V1:**
- OAuth connection exists and is functional
- Tokens can be decrypted for API calls
- Connection query helper available

---

## Rollback Plan

If V1 needs to be rolled back:

1. **Database Rollback:**
   ```sql
   DROP TABLE calendar_connections;
   ```

2. **Code Rollback:**
   - Remove API routes: `src/app/api/settings/calendar/*`
   - Remove UI: `src/app/app/settings/calendar/*`
   - Remove components: `src/components/settings/calendar-settings-client.tsx`
   - Remove services: `src/lib/google-calendar-encryption.ts`

3. **Environment Cleanup:**
   - Remove Google OAuth variables from `.env`
   - Revoke OAuth credentials in Google Cloud Console

4. **Verify:**
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm test:e2e
   ```

All existing functionality should remain unchanged.

---

## Success Criteria

V1 is complete when:

✅ Shop owner can connect Google Calendar via OAuth
✅ Connection status displayed on settings page
✅ Shop owner can disconnect calendar
✅ Tokens encrypted in database (no plaintext)
✅ OAuth state parameter prevents CSRF
✅ All unit tests pass (encryption, serialization)
✅ All integration tests pass (connect, callback, disconnect)
✅ All Playwright E2E tests pass
✅ No regression in existing tests
✅ Code quality checks pass (lint, typecheck)
✅ Documentation updated (README, CLAUDE.md)

---

## Estimated Timeline

**Total: 2-3 days**

- **Day 1:** Database schema, encryption service, unit tests (6 hours)
- **Day 2:** API routes, integration tests, manual testing (8 hours)
- **Day 3:** UI components, E2E tests, documentation, polish (6 hours)

**Buffer:** 0.5 days for unexpected issues (Google OAuth setup, token encryption debugging)

---

## Questions for User

Before starting implementation:

1. **Google Cloud Project:** Do you have an existing Google Cloud project, or should we create a new one?
2. **OAuth Scopes:** Is read-only calendar access sufficient, or do we need write access in V1? (V1 only reads calendar list, V2 needs write)
3. **Multi-calendar:** Should V1 support selecting from multiple calendars, or is auto-selecting primary calendar acceptable?
4. **Token Refresh:** Should V1 include token refresh logic, or defer to V2? (V1 doesn't need refresh since no API calls yet)
5. **Testing:** Do you want manual testing with real Google OAuth, or is mocked testing sufficient for V1?

**Recommendation:** Keep V1 minimal (auto-select primary, defer refresh to V2) to ship quickly and validate OAuth flow.
