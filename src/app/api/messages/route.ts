import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { messageLog } from "@/lib/schema";
import { getOptionalSession } from "@/lib/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const appointmentId = searchParams.get("appointmentId");

  if (!appointmentId) {
    return Response.json(
      { error: "Missing appointmentId" },
      { status: 400 }
    );
  }

  const session = await getOptionalSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  const messages = await db
    .select({
      id: messageLog.id,
      purpose: messageLog.purpose,
      status: messageLog.status,
      providerMessageId: messageLog.providerMessageId,
      bodyHash: messageLog.bodyHash,
      templateKey: messageLog.templateKey,
      templateVersion: messageLog.templateVersion,
      renderedBody: messageLog.renderedBody,
      errorCode: messageLog.errorCode,
      errorMessage: messageLog.errorMessage,
      createdAt: messageLog.createdAt,
      sentAt: messageLog.sentAt,
    })
    .from(messageLog)
    .where(
      and(
        eq(messageLog.shopId, shop.id),
        eq(messageLog.appointmentId, appointmentId)
      )
    )
    .orderBy(desc(messageLog.createdAt));

  return Response.json({ messages });
}
