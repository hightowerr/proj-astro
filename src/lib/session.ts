import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Protected routes that require authentication.
 * These are also configured in src/proxy.ts for optimistic redirects.
 */
export const protectedRoutes = ["/chat", "/dashboard", "/profile"];

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
