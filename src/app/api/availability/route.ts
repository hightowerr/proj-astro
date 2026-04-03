import { z } from "zod";
import { getAvailabilityForDate } from "@/lib/queries/appointments";
import { getEventTypeById } from "@/lib/queries/event-types";
import { getShopBySlug } from "@/lib/queries/shops";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const querySchema = z.object({
  shop: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  service: z.string().optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    shop: searchParams.get("shop") ?? "",
    date: searchParams.get("date") ?? "",
    service: searchParams.get("service")?.trim() || undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const shop = await getShopBySlug(parsed.data.shop);
  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }

  let durationMinutes: number | undefined;
  let bufferAfterMinutes: number | null | undefined;
  if (parsed.data.service && UUID_RE.test(parsed.data.service)) {
    const eventType = await getEventTypeById(parsed.data.service);
    if (eventType && eventType.shopId === shop.id && eventType.isActive) {
      durationMinutes = eventType.durationMinutes;
      bufferAfterMinutes = eventType.bufferMinutes;
    }
  }

  try {
    const availability = await getAvailabilityForDate(
      shop.id,
      parsed.data.date,
      durationMinutes,
      bufferAfterMinutes
    );

    return Response.json({
      date: availability.date,
      timezone: availability.timezone,
      slotMinutes: availability.slotMinutes,
      durationMinutes: availability.durationMinutes,
      slots: availability.slots.map((slot) => ({
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
      })),
    });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message ?? "Failed to load availability" },
      { status: 500 }
    );
  }
}
