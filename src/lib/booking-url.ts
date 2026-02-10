const fallbackOrigin =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const normalizeOrigin = (origin: string) => origin.replace(/\/$/, "");

export const buildBookingBaseUrl = (req: Request, shopSlug: string) => {
  let origin = fallbackOrigin;

  try {
    const url = new URL(req.url);
    const forwardedHost = req.headers.get("x-forwarded-host");
    if (forwardedHost) {
      const forwardedProto =
        req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
      origin = `${forwardedProto}://${forwardedHost}`;
    } else if (url.origin) {
      origin = url.origin;
    }
  } catch {
    origin = fallbackOrigin;
  }

  return `${normalizeOrigin(origin)}/book/${shopSlug}`;
};
