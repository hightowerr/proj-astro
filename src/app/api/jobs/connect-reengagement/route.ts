import { sql, eq, and, between, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/html";
import { eventTypes, shopHours, shops, user } from "@/lib/schema";

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const LOCK_ID = 482181;

export async function POST(req: Request) {
  const startTime = Date.now();
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return Response.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const provided = req.headers.get(CRON_HEADER);
  if (!provided || provided !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lockResult = await db.execute(
    sql`select pg_try_advisory_lock(${LOCK_ID}) as locked`
  );
  const locked = lockResult[0]?.locked === true;

  if (!locked) {
    return Response.json({ skipped: true, reason: "locked" });
  }

  try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Query shops with pending onboarding, created 24-48h ago, joined with owner user
    const pendingShops = await db
      .select({
        shopId: shops.id,
        userName: user.name,
        userEmail: user.email,
      })
      .from(shops)
      .innerJoin(user, eq(shops.ownerUserId, user.id))
      .where(
        and(
          eq(shops.stripeOnboardingStatus, "pending"),
          isNull(shops.connectReengagementSentAt),
          between(
            shops.stripeAccountCreatedAt,
            fortyEightHoursAgo,
            twentyFourHoursAgo
          ),
          sql`exists (select 1 from ${eventTypes} where ${eventTypes.shopId} = ${shops.id} and ${eventTypes.isActive} = true)`,
          sql`exists (select 1 from ${shopHours} where ${shopHours.shopId} = ${shops.id})`
        )
      );

    let sent = 0;
    const errors: Array<{ shopId: string; error: string }> = [];

    for (const shop of pendingShops) {
      try {
        const firstName = (shop.userName ?? "").split(" ")[0] || "there";
        const firstNameHtml = escapeHtml(firstName);
        const setupUrl = `${appUrl}/api/settings/stripe-connect/refresh`;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      .em-body  { background-color: #0f1117 !important; }
      .em-wrap  { background-color: #0f1117 !important; }
      .em-logo  { color: #e8eaf0 !important; }
      .em-text  { color: #e8eaf0 !important; }
      .em-muted { color: #9ca3af !important; }
      .em-foot  { color: #6b7280 !important; }
      .em-hr    { border-top-color: #2d3748 !important; }
    }
    [data-ogsc] .em-body  { background-color: #0f1117 !important; }
    [data-ogsc] .em-wrap  { background-color: #0f1117 !important; }
    [data-ogsc] .em-logo  { color: #e8eaf0 !important; }
    [data-ogsc] .em-text  { color: #e8eaf0 !important; }
    [data-ogsc] .em-muted { color: #9ca3af !important; }
    [data-ogsc] .em-foot  { color: #6b7280 !important; }
    [data-ogsc] .em-hr    { border-top-color: #2d3748 !important; }
    @media (max-width: 600px) {
      .em-wrap { padding: 28px 24px !important; }
      .em-cta  { display: block !important; text-align: center !important; box-sizing: border-box !important; width: 100% !important; padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body class="em-body" style="margin:0;padding:16px 0;background-color:#ffffff">
  <div class="em-wrap" style="max-width:600px;margin:0 auto;padding:44px 56px;font-family:system-ui,sans-serif;background-color:#ffffff">
    <div style="margin-bottom:36px">
      <span class="em-logo" style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#001e40">ShowUp</span>
    </div>
    <p class="em-text" style="font-size:15.5px;line-height:1.65;color:#111827">Hi ${firstNameHtml},</p>
    <p class="em-text" style="font-size:21px;font-weight:800;line-height:1.3;letter-spacing:-0.015em;color:#111827">You began setting up deposits — finish in under 5 minutes.</p>
    <p class="em-text" style="font-size:15.5px;line-height:1.65;color:#111827;max-width:46ch">Once set up, customer deposits will go directly to your bank account on every booking.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="${setupUrl}" class="em-cta" style="display:inline-block;padding:14px 36px;background:#001e40;color:#fff;text-decoration:none;border-radius:12px;font-size:15.5px;font-weight:700;min-height:50px">Complete setup →</a>
    </div>
    <p class="em-muted" style="font-size:13px;color:#6b7280">This usually takes under 5 minutes.</p>
    <p class="em-text" style="font-size:15.5px;line-height:1.65;color:#111827">— ShowUp</p>
    <hr class="em-hr" style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
    <p class="em-foot" style="font-size:11.5px;color:#737780;line-height:1.6">You're receiving this because you began setting up deposit collection for your ShowUp account. This is a transactional account-setup message. If you've already completed setup, you can disregard this message.</p>
    <p style="font-size:11.5px;color:#737780;margin:0;padding:16px 0 0"><span style="font-weight:800;letter-spacing:.14em;text-transform:uppercase">SHOWUP</span><span style="padding:0 7px">·</span>Stop losing money to no-shows.</p>
  </div>
</body>
</html>`;

        const text = `Hi ${firstName},\n\nYou began setting up deposits — finish in under 5 minutes.\n\nOnce set up, customer deposits will go directly to your bank account on every booking.\n\nComplete setup (this usually takes under 5 minutes):\n${setupUrl}\n\n— ShowUp\n\n---\nYou're receiving this because you began setting up deposit collection for your ShowUp account. This is a transactional account-setup message.\n\nSHOWUP · Stop losing money to no-shows.`;

        const result = await sendEmail({
          to: shop.userEmail,
          subject: "You're one step away from collecting deposits",
          html,
          text,
        });

        if (result.success) {
          await db
            .update(shops)
            .set({ connectReengagementSentAt: new Date() })
            .where(eq(shops.id, shop.shopId));
          sent += 1;
        } else {
          errors.push({
            shopId: shop.shopId,
            error: result.error ?? "Unknown send failure",
          });
        }
      } catch (error) {
        errors.push({
          shopId: shop.shopId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return Response.json({
      total: pendingShops.length,
      sent,
      errors: errors.length,
      errorDetails: errors.slice(0, 10),
      durationMs: Date.now() - startTime,
    });
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${LOCK_ID})`);
  }
}
