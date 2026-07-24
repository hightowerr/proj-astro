/**
 * Shared subscription/trial-status checks used by both the public booking page
 * and the booking-create API route.
 */

type ShopSubscriptionFields = {
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled";
  trialEndsAt: Date | null;
  createdAt: Date;
};

/**
 * Returns `true` when the merchant's subscription does NOT allow accepting
 * bookings — i.e. the subscription is canceled, or the trial has expired.
 */
export function isBookingBlocked(shop: ShopSubscriptionFields): boolean {
  const status = shop.subscriptionStatus;

  if (status === "canceled") return true;

  if (status === "trialing") {
    const trialEnd =
      shop.trialEndsAt ??
      new Date(shop.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    if (new Date() > trialEnd) return true;
  }

  // "active" and "past_due" are allowed — past_due merchants can still
  // accept bookings (they see a banner in their dashboard).
  return false;
}
