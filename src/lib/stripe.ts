import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export const stripeIsMocked = () => {
  return process.env.STRIPE_MOCKED === "true" || process.env.NODE_ENV === "test";
};

export const getStripeClient = () => {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing");
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
  });

  return stripeClient;
};

export const getStripeWebhookSecret = () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is missing");
  }
  return secret;
};

export const normalizeStripePaymentStatus = (
  status: Stripe.PaymentIntent.Status
) => {
  switch (status) {
    case "requires_payment_method":
    case "requires_action":
    case "processing":
    case "succeeded":
    case "canceled":
      return status;
    case "requires_capture":
    case "requires_confirmation":
      return "processing";
    default:
      return "processing";
  }
};
