import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Protected routes that require authentication.
 * These are also configured in src/proxy.ts for optimistic redirects.
 */
export const protectedRoutes = ["/chat", "/dev", "/profile"];

/**
 * Checks if the current request is authenticated.
 * Should be called in Server Components for protected routes.
 *
 * @returns The session object if authenticated
 * @throws Redirects to home page if not authenticated
 */
export async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/");
  }

  // Guard against stale Redis-cached sessions whose user row no longer exists
  // in the database (e.g. after a DB wipe while the Redis session cache was
  // retained). Better Auth returns the session from Redis without verifying
  // the user table, so we must check explicitly before using session.user.id
  // as a FK in any write.
  const userExists = await db.query.user.findFirst({
    where: (table, { eq }) => eq(table.id, session.user.id),
    columns: { id: true },
  });

  if (!userExists) {
    redirect("/api/auth/sign-out-orphan");
  }

  return session;
}

/**
 * Protected route gate that requires both authentication AND an active/trialing
 * shop subscription.  Returns `{ session, shop, isPastDue }`.
 *
 * Redirect rules:
 *  - No shop → /app  (onboarding)
 *  - Expired trial or canceled → /app/billing/subscribe  (paywall)
 *  - past_due → lets merchant through with `isPastDue: true`
 *  - active / valid trial → normal access
 *
 * On DB errors the function **fails open** — the merchant keeps access.
 */
export async function requireShopAuth() {
  const session = await requireAuth();

  try {
    const shop = await db.query.shops.findFirst({
      where: (table, { eq }) => eq(table.ownerUserId, session.user.id),
    });

    if (!shop) {
      redirect("/app");
    }

    const now = new Date();
    const status = shop.subscriptionStatus;

    // NULL status fallback: treat as trialing with trialEndsAt = createdAt + 14d
    const effectiveStatus = status ?? "trialing";
    const effectiveTrialEndsAt =
      shop.trialEndsAt ??
      new Date(shop.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);

    switch (effectiveStatus) {
      case "active":
        return { session, shop, isPastDue: false };
      case "trialing":
        if (now <= effectiveTrialEndsAt) {
          return { session, shop, isPastDue: false };
        }
        // Trial expired — redirect to paywall
        redirect("/app/billing/subscribe");
        break; // unreachable but satisfies TS
      case "past_due":
        return { session, shop, isPastDue: true };
      case "canceled":
        redirect("/app/billing/subscribe");
        break; // unreachable
    }
  } catch (error) {
    // Next.js redirects throw a special error with a `digest` property — re-throw
    if (
      error instanceof Error &&
      "digest" in error &&
      typeof (error as any).digest === "string"
    ) {
      throw error;
    }
    // DB error — fail open, let merchant in
    console.error("[requireShopAuth] DB error, failing open:", error);
    const shop = null as any; // This path should be extremely rare
    return { session, shop, isPastDue: false };
  }

  // TypeScript exhaustiveness — should never reach here
  throw new Error("Unexpected subscription status");
}

/**
 * Gets the current session without requiring authentication.
 * Returns null if not authenticated.
 *
 * @returns The session object or null
 */
export async function getOptionalSession() {
  return await auth.api.getSession({ headers: await headers() });
}

/**
 * Checks if a given path is a protected route.
 *
 * @param path - The path to check
 * @returns True if the path requires authentication
 */
export function isProtectedRoute(path: string): boolean {
  return protectedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );
}
