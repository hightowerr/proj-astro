import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/html";
import { messageDedup, shops, user, eventTypes, shopPolicies, appointments } from "@/lib/schema";

/**
 * Onboarding drip email definitions.
 *
 * Each drip fires on a specific trial day. Some are always sent;
 * others are skipped when the user has already completed that step.
 */

type DripKey =
  | "welcome"
  | "connect-stripe"
  | "create-services"
  | "set-policies"
  | "share-link"
  | "trial-warning-2d"
  | "trial-warning-1d"
  | "trial-expired";

interface DripDefinition {
  day: number;
  key: DripKey;
  subject: string;
  /** Return true to SKIP this drip (condition already met). */
  skipIf?: (ctx: ShopContext) => Promise<boolean>;
  body: (ctx: ShopContext) => string;
  ctaUrl: (appUrl: string) => string;
  ctaLabel: string;
}

interface ShopContext {
  shopId: string;
  shopName: string;
  firstName: string;
  email: string;
  stripeOnboardingStatus: string;
  slug: string;
}

const DRIP_SCHEDULE: DripDefinition[] = [
  {
    day: 1,
    key: "welcome",
    subject: "Welcome to ShowUp -- here's how to get started",
    ctaLabel: "Open your dashboard",
    ctaUrl: (appUrl) => `${appUrl}/app/dashboard`,
    body: (ctx) =>
      `Hi ${ctx.firstName},\n\nWelcome to ShowUp! You're on a 14-day free trial. Here's the quick path to start protecting your bookings:\n\n1. Connect Stripe so you can collect deposits\n2. Create your services (event types)\n3. Set your cancellation and deposit policies\n4. Share your booking link with clients\n\nYou can do all of this from your dashboard.\n\n-- ShowUp`,
  },
  {
    day: 3,
    key: "connect-stripe",
    subject: "Connect Stripe to start collecting deposits",
    ctaLabel: "Connect Stripe",
    ctaUrl: (appUrl) => `${appUrl}/api/settings/stripe-connect/refresh`,
    skipIf: async (ctx) => ctx.stripeOnboardingStatus === "complete",
    body: (ctx) =>
      `Hi ${ctx.firstName},\n\nDeposits are the #1 way to reduce no-shows. Connect your Stripe account (takes under 5 minutes) and you'll be ready to collect deposits on every booking.\n\n-- ShowUp`,
  },
  {
    day: 5,
    key: "create-services",
    subject: "Create your first service to start taking bookings",
    ctaLabel: "Create a service",
    ctaUrl: (appUrl) => `${appUrl}/app/settings/services`,
    skipIf: async (ctx) => {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventTypes)
        .where(eq(eventTypes.shopId, ctx.shopId));
      return (result[0]?.count ?? 0) > 0;
    },
    body: (ctx) =>
      `Hi ${ctx.firstName},\n\nYou haven't created any services yet. Services define what you offer -- name, duration, and deposit amount. Once you have at least one, your booking page goes live.\n\n-- ShowUp`,
  },
  {
    day: 7,
    key: "set-policies",
    subject: "Set your cancellation and deposit policies",
    ctaLabel: "Set policies",
    ctaUrl: (appUrl) => `${appUrl}/app/settings/payment-policy`,
    skipIf: async (ctx) => {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(shopPolicies)
        .where(eq(shopPolicies.shopId, ctx.shopId));
      return (result[0]?.count ?? 0) > 0;
    },
    body: (ctx) =>
      `Hi ${ctx.firstName},\n\nPolicies control how deposits and cancellations work for your shop. Set them up so clients know the rules before they book.\n\n-- ShowUp`,
  },
  {
    day: 10,
    key: "share-link",
    subject: "Share your booking link and get your first booking",
    ctaLabel: "View your booking page",
    ctaUrl: (appUrl) => `${appUrl}/app/dashboard`,
    skipIf: async (ctx) => {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(eq(appointments.shopId, ctx.shopId));
      return (result[0]?.count ?? 0) > 0;
    },
    body: (ctx) =>
      `Hi ${ctx.firstName},\n\nYour booking page is live at your unique link. Share it on social media, in your email signature, or send it directly to clients. The sooner you get bookings flowing, the sooner ShowUp starts protecting your revenue.\n\n-- ShowUp`,
  },
  {
    day: 12,
    key: "trial-warning-2d",
    subject: "Your ShowUp trial ends in 2 days",
    ctaLabel: "Subscribe now",
    ctaUrl: (appUrl) => `${appUrl}/app/billing/subscribe`,
    body: (ctx) =>
      `Hi ${ctx.firstName},\n\nYour 14-day ShowUp trial ends in 2 days. Subscribe now to keep your booking page live and continue collecting deposits.\n\nIf you don't subscribe, your shop will be paused and clients won't be able to book.\n\n-- ShowUp`,
  },
  {
    day: 13,
    key: "trial-warning-1d",
    subject: "Last day of your ShowUp trial -- subscribe to keep going",
    ctaLabel: "Subscribe now",
    ctaUrl: (appUrl) => `${appUrl}/app/billing/subscribe`,
    body: (ctx) =>
      `Hi ${ctx.firstName},\n\nThis is your last day on the ShowUp free trial. Subscribe today to keep your booking page, deposits, and no-show protection active.\n\n-- ShowUp`,
  },
  {
    day: 14,
    key: "trial-expired",
    subject: "Your ShowUp trial has ended",
    ctaLabel: "Reactivate now",
    ctaUrl: (appUrl) => `${appUrl}/app/billing/subscribe`,
    body: (ctx) =>
      `Hi ${ctx.firstName},\n\nYour ShowUp trial has ended and your shop has been paused. Reactivate any time by subscribing -- your data is still here and nothing has been deleted.\n\n-- ShowUp`,
  },
];

/**
 * Process onboarding drip emails for all trialing shops.
 *
 * Called from the resolve-outcomes cron AFTER the advisory lock is released,
 * so failures here never block outcome resolution.
 */
export async function processOnboardingDrips(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  errors: Array<{ shopId: string; error: string }>;
}> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Fetch all trialing shops with their owner email
  const trialingShops = await db
    .select({
      shopId: shops.id,
      shopName: shops.name,
      shopSlug: shops.slug,
      ownerName: user.name,
      ownerEmail: user.email,
      createdAt: shops.createdAt,
      stripeOnboardingStatus: shops.stripeOnboardingStatus,
    })
    .from(shops)
    .innerJoin(user, eq(shops.ownerUserId, user.id))
    .where(eq(shops.subscriptionStatus, "trialing"));

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ shopId: string; error: string }> = [];

  for (const shop of trialingShops) {
    try {
      // Use UTC calendar days, not elapsed milliseconds, so the result
      // is independent of what time of day the shop was created or the
      // cron fires.
      const nowUTC = new Date();
      const todayUTC = Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate());
      const createdUTC = Date.UTC(shop.createdAt.getUTCFullYear(), shop.createdAt.getUTCMonth(), shop.createdAt.getUTCDate());
      const trialDay = Math.round((todayUTC - createdUTC) / (24 * 60 * 60 * 1000));

      // Find the drip that matches this trial day
      const drip = DRIP_SCHEDULE.find((d) => d.day === trialDay);
      if (!drip) {
        continue; // No drip for this day
      }

      const ctx: ShopContext = {
        shopId: shop.shopId,
        shopName: shop.shopName,
        firstName: (shop.ownerName ?? "").split(" ")[0] || "there",
        email: shop.ownerEmail,
        stripeOnboardingStatus: shop.stripeOnboardingStatus,
        slug: shop.shopSlug,
      };

      // Check skip condition
      if (drip.skipIf) {
        const shouldSkip = await drip.skipIf(ctx);
        if (shouldSkip) {
          skipped += 1;
          continue;
        }
      }

      // Dedup: has this drip already been sent for this shop?
      const dedupKey = `onboarding-drip:${drip.key}:${shop.shopId}`;
      const inserted = await db
        .insert(messageDedup)
        .values({ dedupKey })
        .onConflictDoNothing()
        .returning({ dedupKey: messageDedup.dedupKey });

      if (inserted.length === 0) {
        // Already sent
        skipped += 1;
        continue;
      }

      // Build email body
      const bodyText = drip.body(ctx);
      const ctaUrl = drip.ctaUrl(appUrl);

      const text = `${bodyText}\n\n${drip.ctaLabel}: ${ctaUrl}`;
      const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:16px 0;background-color:#ffffff;font-family:system-ui,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:44px 56px">
    <div style="margin-bottom:36px">
      <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#001e40">ShowUp</span>
    </div>
    ${escapeHtml(bodyText)
      .split("\n\n")
      .map((p) => `<p style="font-size:15.5px;line-height:1.65;color:#111827">${p.replace(/\n/g, "<br>")}</p>`)
      .join("\n    ")}
    <div style="text-align:center;margin:32px 0">
      <a href="${ctaUrl}" style="display:inline-block;padding:14px 36px;background:#001e40;color:#fff;text-decoration:none;border-radius:12px;font-size:15.5px;font-weight:700">${drip.ctaLabel} &rarr;</a>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
    <p style="font-size:11.5px;color:#737780;line-height:1.6">You're receiving this because you signed up for ShowUp. This is a transactional onboarding message.</p>
    <p style="font-size:11.5px;color:#737780;margin:0;padding:16px 0 0"><span style="font-weight:800;letter-spacing:.14em;text-transform:uppercase">SHOWUP</span><span style="padding:0 7px">&middot;</span>Stop losing money to no-shows.</p>
  </div>
</body>
</html>`;

      const result = await sendEmail({
        to: shop.ownerEmail,
        subject: drip.subject,
        html,
        text,
      });

      if (result.success) {
        sent += 1;
        console.warn(
          `[onboarding-drips] sent ${drip.key} to shop ${shop.shopId}`
        );
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

  return {
    processed: trialingShops.length,
    sent,
    skipped,
    errors,
  };
}
