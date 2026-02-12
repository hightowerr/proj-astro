import { z } from "zod";
import { getAvailabilityForDate } from "@/lib/queries/appointments";
import { getShopBySlug } from "@/lib/queries/shops";

const querySchema = z.object({
  shop: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    shop: searchParams.get("shop") ?? "",
    date: searchParams.get("date") ?? "",
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

  try {
    const availability = await getAvailabilityForDate(
      shop.id,
      parsed.data.date
    );

    return Response.json({
      date: availability.date,
      timezone: availability.timezone,
      slotMinutes: availability.slotMinutes,
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
