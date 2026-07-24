import { Polar } from "@polar-sh/sdk"
import { getServerEnv } from "./env"

export const polarClient = new Polar({
  accessToken: getServerEnv().POLAR_ACCESS_TOKEN,
  ...(process.env.NODE_ENV !== "production" ? { server: "sandbox" } : {}),
})

/**
 * Check a customer's current subscription status via Polar API.
 * Returns the status string (e.g. "active", "canceled") of the first
 * active subscription, or null if none found or on API error.
 */
export async function getCustomerSubscriptionStatus(
  polarCustomerId: string,
): Promise<string | null> {
  try {
    const page = await polarClient.subscriptions.list({
      customerId: polarCustomerId,
      status: "active",
      limit: 1,
    })

    const first = page.result.items[0]
    if (first) {
      return first.status
    }
    return null
  } catch (error) {
    console.warn("[polar] getCustomerSubscriptionStatus failed:", error)
    return null
  }
}
