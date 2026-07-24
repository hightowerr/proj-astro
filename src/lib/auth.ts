import { polar } from "@polar-sh/better-auth"
import { checkout, webhooks } from "@polar-sh/better-auth"
import { Redis } from "@upstash/redis"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq } from "drizzle-orm"
import { getTrustedAuthOrigins } from "./auth-origins"
import { db } from "./db"
import { sendEmail } from "./email"
import { polarClient } from "./polar"
import { messageDedup, processedPolarEvents, shops, user } from "./schema"

const isPlaywrightE2E = process.env.PLAYWRIGHT === "true"
const trustedOrigins = getTrustedAuthOrigins()

// Build a secondaryStorage adapter from Upstash Redis when credentials are
// present. Better Auth uses this for session caching and rate-limit counters,
// making limits shared across all serverless instances instead of per-process.
function buildRedisStorage() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return undefined

  const redis = new Redis({ url, token })
  return {
    get: (key: string) => redis.get<string>(key),
    set: (key: string, value: string, ttl?: number) =>
      ttl ? redis.setex(key, ttl, value).then(() => undefined) : redis.set(key, value).then(() => undefined),
    delete: (key: string) => redis.del(key).then(() => undefined),
  }
}

const secondaryStorage = buildRedisStorage()

// ---------------------------------------------------------------------------
// Grace-period billing email helpers (spec 14)
// ---------------------------------------------------------------------------

interface BillingEmailDef {
  dedupKey: string
  subject: string
  bodyText: string
  ctaLabel: string
  ctaPath: string
}

/**
 * Send a billing lifecycle email OUTSIDE the DB transaction.
 * Failures are logged but never propagated — webhook processing must not break.
 */
async function sendBillingEmail(
  shopId: string,
  ownerUserId: string,
  def: BillingEmailDef,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const ctaUrl = `${appUrl}${def.ctaPath}`

  try {
    // Dedup: skip if this email was already sent for this shop
    const inserted = await db
      .insert(messageDedup)
      .values({ dedupKey: def.dedupKey })
      .onConflictDoNothing()
      .returning({ dedupKey: messageDedup.dedupKey })
    if (inserted.length === 0) return

    // Load owner email
    const [owner] = await db
      .select({ email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, ownerUserId))
      .limit(1)
    if (!owner) {
      console.error("[polar-billing-email] owner not found", { ownerUserId, shopId })
      return
    }

    const firstName = (owner.name ?? "").split(" ")[0] || "there"

    const text = `Hi ${firstName},\n\n${def.bodyText}\n\n${def.ctaLabel}: ${ctaUrl}\n\n— ShowUp`
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
    <p class="em-text" style="font-size:15.5px;line-height:1.65;color:#111827">Hi ${firstName},</p>
    ${def.bodyText
      .split("\n\n")
      .map((p) => `<p class="em-text" style="font-size:15.5px;line-height:1.65;color:#111827">${p.replace(/\n/g, "<br>")}</p>`)
      .join("\n    ")}
    <div style="text-align:center;margin:32px 0">
      <a href="${ctaUrl}" class="em-cta" style="display:inline-block;padding:14px 36px;background:#001e40;color:#fff;text-decoration:none;border-radius:12px;font-size:15.5px;font-weight:700;min-height:50px">${def.ctaLabel} &rarr;</a>
    </div>
    <p class="em-text" style="font-size:15.5px;line-height:1.65;color:#111827">&mdash; ShowUp</p>
    <hr class="em-hr" style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
    <p class="em-foot" style="font-size:11.5px;color:#737780;line-height:1.6">You&rsquo;re receiving this because you have a ShowUp Pro subscription. This is a transactional billing notification.</p>
    <p style="font-size:11.5px;color:#737780;margin:0;padding:16px 0 0"><span style="font-weight:800;letter-spacing:.14em;text-transform:uppercase">SHOWUP</span><span style="padding:0 7px">&middot;</span>Stop losing money to no-shows.</p>
  </div>
</body>
</html>`

    const result = await sendEmail({
      to: owner.email,
      subject: def.subject,
      html,
      text,
    })

    if (result.success) {
      // eslint-disable-next-line no-console
      console.info(`[polar-billing-email] sent "${def.subject}" to shop ${shopId}`)
    } else {
      console.error("[polar-billing-email] send failed", {
        shopId,
        subject: def.subject,
        error: result.error,
      })
    }
  } catch (emailError) {
    console.error("[polar-billing-email] exception", {
      shopId,
      subject: def.subject,
      error: emailError instanceof Error ? emailError.message : String(emailError),
    })
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  ...(trustedOrigins ? { trustedOrigins } : {}),
  ...(secondaryStorage ? { secondaryStorage } : {}),
  // Rate limiting is built into Better Auth core (IP-based, per-endpoint).
  // Enabled in all environments so dev/staging behave consistently with prod.
  // Storage is auto-selected as "secondary-storage" (Redis) when secondaryStorage
  // is configured above, falling back to in-process memory if Redis is absent.
  // Built-in special rules already apply 3 req/10 s to /sign-in and /sign-up.
  // Custom rules below tighten /request-password-reset and /reset-password.
  rateLimit: {
    enabled: !isPlaywrightE2E,
    customRules: {
      "/request-password-reset": { window: 60, max: 5 },
      "/reset-password":         { window: 60, max: 5 },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Invalidate all existing sessions when a password is reset so a
    // compromised-email attacker cannot hold a parallel live session.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Log password reset URL to terminal (no email integration yet)
      // eslint-disable-next-line no-console
      console.log(`\n${"=".repeat(60)}\nPASSWORD RESET REQUEST\nUser: ${user.email}\nReset URL: ${url}\n${"=".repeat(60)}\n`)
    },
  },
  emailVerification: {
    // E2E tests use a dev server and expect immediate post-signup access.
    sendOnSignUp: !isPlaywrightE2E,
    sendVerificationEmail: async ({ user, url }) => {
      // Log verification URL to terminal (no email integration yet)
      // eslint-disable-next-line no-console
      console.log(`\n${"=".repeat(60)}\nEMAIL VERIFICATION\nUser: ${user.email}\nVerification URL: ${url}\n${"=".repeat(60)}\n`)
    },
  },
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: process.env.POLAR_PRODUCT_ID_MONTHLY!,
              slug: "showup-pro-monthly",
            },
            {
              productId: process.env.POLAR_PRODUCT_ID_ANNUAL!,
              slug: "showup-pro-annual",
            },
          ],
          authenticatedUsersOnly: true,
          successUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/app/billing/processing`,
        }),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET ?? "",
          onSubscriptionActive: async (payload) => {
            const sub = payload.data
            const eventTimestamp = payload.timestamp
            // eslint-disable-next-line no-console
            console.info("[Polar] onSubscriptionActive", sub.id)

            // Capture shop info for deferred email after commit
            let pendingRecoveryEmail: { shopId: string; ownerUserId: string } | null = null

            await db.transaction(async (tx) => {
              // Dedup: skip if this subscription event was already processed
              const inserted = await tx
                .insert(processedPolarEvents)
                .values({ id: `${payload.type}:${sub.id}:${eventTimestamp.toISOString()}` })
                .onConflictDoNothing()
                .returning()
              if (inserted.length === 0) return

              // Find shop by polarCustomerId first, fall back to externalId → ownerUserId
              let [shop] = await tx
                .select()
                .from(shops)
                .where(eq(shops.polarCustomerId, sub.customerId))
                .limit(1)

              if (!shop && sub.customer.externalId) {
                ;[shop] = await tx
                  .select()
                  .from(shops)
                  .where(eq(shops.ownerUserId, sub.customer.externalId))
                  .limit(1)
              }

              if (!shop) {
                console.warn("[Polar] onSubscriptionActive: no shop found for customer", sub.customerId)
                return
              }

              // Timestamp guard: skip if event is older than last processed webhook
              if (shop.lastWebhookEventAt && eventTimestamp <= shop.lastWebhookEventAt) return

              // Detect past_due → active recovery before the UPDATE
              const wasPastDue = shop.subscriptionStatus === "past_due"

              await tx
                .update(shops)
                .set({
                  subscriptionStatus: "active",
                  polarCustomerId: sub.customerId,
                  lastWebhookEventAt: eventTimestamp,
                })
                .where(eq(shops.id, shop.id))

              if (wasPastDue) {
                pendingRecoveryEmail = { shopId: shop.id, ownerUserId: shop.ownerUserId }
              }
            })

            // Send "Payment recovered" email AFTER commit (deferred call pattern)
            if (pendingRecoveryEmail) {
              const { shopId, ownerUserId } = pendingRecoveryEmail
              await sendBillingEmail(shopId, ownerUserId, {
                dedupKey: `polar-billing:payment-recovered:${shopId}:${eventTimestamp.toISOString()}`,
                subject: "Payment recovered",
                bodyText:
                  "Your payment was processed successfully and your ShowUp Pro subscription is active. Deposits, reminders, and slot recovery are running as normal \u2014 nothing to do.",
                ctaLabel: "Go to your dashboard",
                ctaPath: "/app/dashboard",
              })
            }
          },
          onSubscriptionUpdated: async (payload) => {
            const sub = payload.data
            const eventTimestamp = payload.timestamp
            // eslint-disable-next-line no-console
            console.info("[Polar] onSubscriptionUpdated", sub.id)

            // Only act on statuses we map to our enum
            const statusMap: Record<string, "active" | "past_due"> = {
              active: "active",
              past_due: "past_due",
            }
            const mappedStatus = statusMap[sub.status]
            if (!mappedStatus) {
              console.warn("[Polar] onSubscriptionUpdated: unmapped status", sub.status)
              return
            }

            // Capture shop info for deferred email after commit
            let pendingPastDueEmail: { shopId: string; ownerUserId: string } | null = null
            let pendingRecoveryEmail: { shopId: string; ownerUserId: string } | null = null

            await db.transaction(async (tx) => {
              const inserted = await tx
                .insert(processedPolarEvents)
                .values({ id: `${payload.type}:${sub.id}:${eventTimestamp.toISOString()}` })
                .onConflictDoNothing()
                .returning()
              if (inserted.length === 0) return

              let [shop] = await tx
                .select()
                .from(shops)
                .where(eq(shops.polarCustomerId, sub.customerId))
                .limit(1)

              if (!shop && sub.customer.externalId) {
                ;[shop] = await tx
                  .select()
                  .from(shops)
                  .where(eq(shops.ownerUserId, sub.customer.externalId))
                  .limit(1)
              }

              if (!shop) {
                console.warn("[Polar] onSubscriptionUpdated: no shop found for customer", sub.customerId)
                return
              }

              if (shop.lastWebhookEventAt && eventTimestamp <= shop.lastWebhookEventAt) return

              // Detect transitions for email before the UPDATE
              const previousStatus = shop.subscriptionStatus

              await tx
                .update(shops)
                .set({
                  subscriptionStatus: mappedStatus,
                  polarCustomerId: sub.customerId,
                  lastWebhookEventAt: eventTimestamp,
                })
                .where(eq(shops.id, shop.id))

              if (mappedStatus === "past_due") {
                pendingPastDueEmail = { shopId: shop.id, ownerUserId: shop.ownerUserId }
              } else if (mappedStatus === "active" && previousStatus === "past_due") {
                pendingRecoveryEmail = { shopId: shop.id, ownerUserId: shop.ownerUserId }
              }
            })

            // Send billing emails AFTER commit (deferred call pattern)
            if (pendingPastDueEmail) {
              const { shopId, ownerUserId } = pendingPastDueEmail
              await sendBillingEmail(shopId, ownerUserId, {
                dedupKey: `polar-billing:payment-failed:${shopId}:${eventTimestamp.toISOString()}`,
                subject: "Payment failed",
                bodyText:
                  "We tried to charge your card for ShowUp Pro and the payment failed. Polar will retry automatically over the next few days \u2014 nothing is paused yet. To avoid losing access, update your card now.",
                ctaLabel: "Update your card",
                ctaPath: "/app/settings/billing",
              })
            }
            if (pendingRecoveryEmail) {
              const { shopId, ownerUserId } = pendingRecoveryEmail
              await sendBillingEmail(shopId, ownerUserId, {
                dedupKey: `polar-billing:payment-recovered:${shopId}:${eventTimestamp.toISOString()}`,
                subject: "Payment recovered",
                bodyText:
                  "Your payment was processed successfully and your ShowUp Pro subscription is active. Deposits, reminders, and slot recovery are running as normal \u2014 nothing to do.",
                ctaLabel: "Go to your dashboard",
                ctaPath: "/app/dashboard",
              })
            }
          },
          onSubscriptionRevoked: async (payload) => {
            const sub = payload.data
            const eventTimestamp = payload.timestamp
            // eslint-disable-next-line no-console
            console.info("[Polar] onSubscriptionRevoked", sub.id)

            // Capture shop info for deferred email after commit
            let pendingCanceledEmail: { shopId: string; ownerUserId: string } | null = null

            await db.transaction(async (tx) => {
              const inserted = await tx
                .insert(processedPolarEvents)
                .values({ id: `${payload.type}:${sub.id}:${eventTimestamp.toISOString()}` })
                .onConflictDoNothing()
                .returning()
              if (inserted.length === 0) return

              let [shop] = await tx
                .select()
                .from(shops)
                .where(eq(shops.polarCustomerId, sub.customerId))
                .limit(1)

              if (!shop && sub.customer.externalId) {
                ;[shop] = await tx
                  .select()
                  .from(shops)
                  .where(eq(shops.ownerUserId, sub.customer.externalId))
                  .limit(1)
              }

              if (!shop) {
                console.warn("[Polar] onSubscriptionRevoked: no shop found for customer", sub.customerId)
                return
              }

              if (shop.lastWebhookEventAt && eventTimestamp <= shop.lastWebhookEventAt) return

              await tx
                .update(shops)
                .set({
                  subscriptionStatus: "canceled",
                  polarCustomerId: sub.customerId,
                  lastWebhookEventAt: eventTimestamp,
                })
                .where(eq(shops.id, shop.id))

              pendingCanceledEmail = { shopId: shop.id, ownerUserId: shop.ownerUserId }
            })

            // Send "Subscription ended" email AFTER commit (deferred call pattern)
            if (pendingCanceledEmail) {
              const { shopId, ownerUserId } = pendingCanceledEmail
              await sendBillingEmail(shopId, ownerUserId, {
                dedupKey: `polar-billing:subscription-ended:${shopId}:${eventTimestamp.toISOString()}`,
                subject: "Subscription ended",
                bodyText:
                  "Your ShowUp Pro subscription is no longer active. Existing appointments will be honored \u2014 but your booking page is paused and no new bookings are coming in.\n\nYour services, policies, and customer scores are saved. Resubscribe and you\u2019re live again in under a minute.",
                ctaLabel: "Resubscribe to ShowUp Pro",
                ctaPath: "/app/billing/subscribe",
              })
            }
          },
          onSubscriptionCreated: async (payload) => {
            // eslint-disable-next-line no-console
            console.info("[Polar] onSubscriptionCreated", payload.data.id)
          },
          onSubscriptionCanceled: async (payload) => {
            // eslint-disable-next-line no-console
            console.info("[Polar] onSubscriptionCanceled", payload.data.id)
          },
          onSubscriptionUncanceled: async (payload) => {
            // eslint-disable-next-line no-console
            console.info("[Polar] onSubscriptionUncanceled", payload.data.id)
          },
        }),
      ],
    }),
  ],
})
