import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import {
  customerContactPrefs,
  messageOptOuts,
} from "@/lib/schema";

export const runtime = "nodejs";

const STOP_KEYWORDS = new Set([
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
]);

const START_KEYWORDS = new Set(["START", "UNSTOP", "YES"]);

const escapeXml = (input: string) =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const twimlResponse = (message?: string) => {
  if (!message) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response />`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
    message
  )}</Message></Response>`;
};

/**
 * Validates Twilio request signature to prevent unauthorized requests.
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 */
const validateTwilioSignature = (
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean => {
  // Build the data string: URL + sorted params
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((key) => `${key}${params[key]}`)
      .join("");

  // Compute HMAC-SHA1
  const hmac = createHmac("sha1", authToken);
  hmac.update(data);
  const expectedSignature = hmac.digest("base64");

  return signature === expectedSignature;
};

export async function POST(req: Request) {
  const body = await req.text();
  const params = new URLSearchParams(body);

  // Validate Twilio signature (skip in test mode)
  if (process.env.NODE_ENV !== "test") {
    const env = getServerEnv();
    const signature = req.headers.get("X-Twilio-Signature") ?? "";
    const url = req.url;

    if (!env.TWILIO_AUTH_TOKEN) {
      return new Response(twimlResponse(), {
        status: 401,
        headers: { "Content-Type": "text/xml" },
      });
    }

    const paramsObj: Record<string, string> = {};
    params.forEach((value, key) => {
      paramsObj[key] = value;
    });

    const isValid = validateTwilioSignature(
      env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      paramsObj
    );

    if (!isValid) {
      console.error("Invalid Twilio signature", { url, signature });
      return new Response(twimlResponse(), {
        status: 403,
        headers: { "Content-Type": "text/xml" },
      });
    }
  }

  const from = params.get("From")?.trim() ?? "";
  const message = params.get("Body")?.trim() ?? "";

  if (!from || !message) {
    return new Response(twimlResponse(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const normalized = message.toUpperCase().replace(/\s+/g, "");
  const isStop = Array.from(STOP_KEYWORDS).some((keyword) =>
    normalized.startsWith(keyword)
  );
  const isStart = Array.from(START_KEYWORDS).some((keyword) =>
    normalized.startsWith(keyword)
  );

  if (!isStop && !isStart) {
    return new Response(twimlResponse("Reply STOP to opt out."), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const matchedCustomers = await db.query.customers.findMany({
    where: (table, { eq }) => eq(table.phone, from),
  });

  if (matchedCustomers.length === 0) {
    const fallback = isStop
      ? "You are opted out."
      : "You are opted in.";
    return new Response(twimlResponse(fallback), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  if (isStop) {
    await db.transaction(async (tx) => {
      for (const customer of matchedCustomers) {
        await tx
          .insert(customerContactPrefs)
          .values({ customerId: customer.id, smsOptIn: false })
          .onConflictDoUpdate({
            target: customerContactPrefs.customerId,
            set: { smsOptIn: false, updatedAt: new Date() },
          });

        await tx.insert(messageOptOuts).values({
          customerId: customer.id,
          channel: "sms",
          reason: normalized,
        });
      }
    });

    return new Response(
      twimlResponse("You are opted out. Reply START to re-subscribe."),
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }

  await db.transaction(async (tx) => {
    for (const customer of matchedCustomers) {
      await tx
        .insert(customerContactPrefs)
        .values({ customerId: customer.id, smsOptIn: true })
        .onConflictDoUpdate({
          target: customerContactPrefs.customerId,
          set: { smsOptIn: true, updatedAt: new Date() },
        });
    }
  });

  return new Response(twimlResponse("You are opted in."), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
