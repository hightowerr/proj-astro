import { db } from "@/lib/db";
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

export async function POST(req: Request) {
  const body = await req.text();
  const params = new URLSearchParams(body);
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
