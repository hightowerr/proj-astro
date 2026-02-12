import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookingManageTokens } from "@/lib/schema";

/**
 * Generate a secure random token (32 bytes = 64 hex characters)
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash a token using SHA256
 * We use SHA256 (not bcrypt) because:
 * 1. Tokens are 32+ bytes of random data (not user passwords)
 * 2. Fast hashing is acceptable for high-entropy random tokens
 * 3. SHA256 is sufficient for preventing token leakage in DB dumps
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create a manage token for an appointment
 * Returns the raw token (only time it's visible)
 */
export async function createManageToken(
  appointmentId: string,
  expiryDays: number = 90
): Promise<string> {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  await db.insert(bookingManageTokens).values({
    appointmentId,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

/**
 * Validate a manage token and return the appointment ID
 * Returns null if token is invalid or expired
 */
export async function validateToken(
  rawToken: string
): Promise<string | null> {
  const tokenHash = hashToken(rawToken);

  const [tokenRecord] = await db
    .select()
    .from(bookingManageTokens)
    .where(eq(bookingManageTokens.tokenHash, tokenHash))
    .limit(1);

  if (!tokenRecord) {
    return null;
  }

  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
    return null;
  }

  return tokenRecord.appointmentId;
}
