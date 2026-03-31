import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking/booking-form";
import { ServiceSelector } from "@/components/booking/service-selector";
import { formatDateInTimeZone } from "@/lib/booking";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { getEventTypeById, getEventTypesForShop } from "@/lib/queries/event-types";
import { getShopBySlug } from "@/lib/queries/shops";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { slug } = await params;
  const { service: serviceParam } = await searchParams;
  console.warn("[booking-page] loading", { slug, serviceParam: serviceParam ?? null });

  const shop = await getShopBySlug(slug);
  if (!shop) {
    console.warn("[booking-page] shop not found", { slug });
    notFound();
  }

  const settings = await getBookingSettingsForShop(shop.id);
  const timezone = settings?.timezone ?? "UTC";
  const slotMinutes = settings?.slotMinutes ?? 60;
  const defaultDate = formatDateInTimeZone(new Date(), timezone);

  if (serviceParam) {
    if (!UUID_RE.test(serviceParam)) {
      notFound();
    }

    const eventType = await getEventTypeById(serviceParam);
    if (!eventType || eventType.shopId !== shop.id || !eventType.isActive) {
      notFound();
    }

    return (
      <div className="container mx-auto space-y-6 px-4 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Book with {shop.name}</h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{eventType.name}</p>
        </div>

        <div className="max-w-xl p-6" style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--color-border-default)", background: "var(--color-surface-raised)" }}>
          <BookingForm
            shopSlug={shop.slug}
            shopName={shop.name}
            timezone={timezone}
            slotMinutes={slotMinutes}
            defaultDate={defaultDate}
            paymentsEnabled={true}
            forcePaymentSimulator={process.env.PLAYWRIGHT === "true"}
            selectedEventTypeId={eventType.id}
            selectedEventTypeName={eventType.name}
            selectedDurationMinutes={eventType.durationMinutes}
          />
        </div>
      </div>
    );
  }

  const eventTypes = await getEventTypesForShop(shop.id, {
    isActive: true,
    isHidden: false,
  });

  if (eventTypes.length === 1) {
    const only = eventTypes[0]!;

    return (
      <div className="container mx-auto space-y-6 px-4 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Book with {shop.name}</h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{only.name}</p>
        </div>

        <div className="max-w-xl p-6" style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--color-border-default)", background: "var(--color-surface-raised)" }}>
          <BookingForm
            shopSlug={shop.slug}
            shopName={shop.name}
            timezone={timezone}
            slotMinutes={slotMinutes}
            defaultDate={defaultDate}
            paymentsEnabled={true}
            forcePaymentSimulator={process.env.PLAYWRIGHT === "true"}
            selectedEventTypeId={only.id}
            selectedEventTypeName={only.name}
            selectedDurationMinutes={only.durationMinutes}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Book with {shop.name}</h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Pick a service, then choose a time that works for you.
        </p>
      </div>

      <ServiceSelector
        eventTypes={eventTypes}
        shopSlug={shop.slug}
        shopName={shop.name}
        timezone={timezone}
        slotMinutes={slotMinutes}
        defaultDate={defaultDate}
        paymentsEnabled={true}
        forcePaymentSimulator={process.env.PLAYWRIGHT === "true"}
      />
    </div>
  );
}
