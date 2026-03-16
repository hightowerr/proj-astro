#!/usr/bin/env tsx
/**
 * Check message log for recent SMS attempts
 *
 * Usage:
 *   pnpm tsx --env-file=.env scripts/check-message-log.ts
 */

import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { messageLog } from "@/lib/schema";

async function main() {
  const recentMessages = await db
    .select({
      id: messageLog.id,
      purpose: messageLog.purpose,
      toPhone: messageLog.toPhone,
      status: messageLog.status,
      errorCode: messageLog.errorCode,
      errorMessage: messageLog.errorMessage,
      providerMessageId: messageLog.providerMessageId,
      createdAt: messageLog.createdAt,
      renderedBody: messageLog.renderedBody,
    })
    .from(messageLog)
    .orderBy(desc(messageLog.createdAt))
    .limit(10);

  if (recentMessages.length === 0) {
    console.log("📭 No messages found in log");
    return;
  }

  console.log(`\n📨 Recent ${recentMessages.length} messages:\n`);

  for (const msg of recentMessages) {
    const statusIcon = msg.status === "sent" ? "✅" : msg.status === "failed" ? "❌" : "⏳";
    console.log(`${statusIcon} ${msg.purpose} → ${msg.toPhone}`);
    console.log(`   Status: ${msg.status}`);
    if (msg.errorCode || msg.errorMessage) {
      console.log(`   Error: ${msg.errorCode || "unknown"} - ${msg.errorMessage || "no message"}`);
    }
    if (msg.providerMessageId) {
      console.log(`   Twilio SID: ${msg.providerMessageId}`);
    }
    if (msg.renderedBody) {
      console.log(`   Body: ${msg.renderedBody.substring(0, 80)}...`);
    }
    console.log(`   Time: ${msg.createdAt?.toISOString() || "unknown"}\n`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
