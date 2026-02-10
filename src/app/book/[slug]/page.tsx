import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking/booking-form";
import { formatDateInTimeZone } from "@/lib/booking";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { getShopBySlug } from "@/lib/queries/shops";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);

  if (!shop) {
    notFound();
  }

  const settings = await getBookingSettingsForShop(shop.id);
  const timezone = settings?.timezone ?? "UTC";
  const slotMinutes = settings?.slotMinutes ?? 60;
  const defaultDate = formatDateInTimeZone(new Date(), timezone);

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Book with {shop.name}</h1>
        <p className="text-sm text-muted-foreground">
          Pick a time that works for you.
        </p>
      </div>

      <div className="max-w-xl rounded-lg border p-6">
        <BookingForm
          shopSlug={shop.slug}
          shopName={shop.name}
          timezone={timezone}
          slotMinutes={slotMinutes}
          defaultDate={defaultDate}
          paymentsEnabled={true}
        />
      </div>
    </div>
  );
}
