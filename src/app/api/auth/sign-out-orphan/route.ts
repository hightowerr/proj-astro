import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/auth/sign-out-orphan
 *
 * Called by requireAuth() when a valid session cookie exists but the
 * corresponding user row is missing from the database (e.g. after a DB
 * wipe while Redis session cache retained the token). Clears the stale
 * session and redirects to the home page.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await auth.api.signOut({ headers: request.headers });
  } catch {
    // If sign-out fails (e.g. session already gone), proceed anyway.
  }

  const response = NextResponse.redirect(new URL("/", request.url));

  // Belt-and-suspenders: also clear the cookie header directly in case
  // Better Auth's signOut didn't set it (e.g. session wasn't in the DB).
  response.cookies.delete("better-auth.session_token");

  return response;
}
