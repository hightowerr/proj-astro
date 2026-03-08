import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { calendarConnections } from "@/lib/schema";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await getShopByOwnerId(session.user.id);
    if (!shop) {
      return NextResponse.json({ error: "No shop found for user" }, { status: 404 });
    }

    const now = new Date();
    const result = await db
      .update(calendarConnections)
      .set({ deletedAt: now, updatedAt: now })
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[calendar/disconnect] Failed to disconnect calendar", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to disconnect calendar" },
      { status: 500 }
    );
  }
}
