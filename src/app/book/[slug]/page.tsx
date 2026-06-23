import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking/booking-form";
import { ServiceSelector } from "@/components/booking/service-selector";
import { formatDateInTimeZone } from "@/lib/booking";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { getEventTypeById, getEventTypesForShop } from "@/lib/queries/event-types";
import { getShopBySlug } from "@/lib/queries/shops";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function BookingHeader({
  shopName,
  subtitle,
}: {
  shopName: string;
  subtitle?: string;
}) {
  return (
    <div className="pt-12 px-16">
      <div className="al-eyebrow mb-3 opacity-55">Book an appointment</div>
      <h1 className="text-[2rem] font-extrabold tracking-tight text-al-primary mb-2">
        Book with {shopName}
      </h1>
      {subtitle && (
        <p className="text-base font-normal text-al-on-surface-variant">
          {subtitle}
        </p>
      )}
    </div>
  );
}

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
      <div className="bg-al-surface min-h-screen">
        <BookingHeader
          shopName={shop.name}
          subtitle={`${eventType.name} \u00b7 ${eventType.durationMinutes} minutes`}
        />
        <div className="px-16 pb-12 pt-6 max-w-[624px]">
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
      <div className="bg-al-surface min-h-screen">
        <BookingHeader
          shopName={shop.name}
          subtitle={`${only.name} \u00b7 ${only.durationMinutes} minutes`}
        />
        <div className="px-16 pb-12 pt-6 max-w-[624px]">
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

  if (eventTypes.length === 0) {
    return (
      <div className="bg-al-surface min-h-screen">
        <BookingHeader shopName={shop.name} />
        <div className="px-16 pb-12 pt-6 max-w-[624px]">
          <div className="rounded-2xl border border-al-outline-variant/20 bg-al-surface-lowest p-8 text-center">
            <p className="text-sm font-medium text-al-on-surface mb-1">No services available</p>
            <p className="text-sm text-al-on-surface-variant mb-4">
              This shop hasn&apos;t added any bookable services yet.
            </p>
            <a
              href="/app/settings/services"
              className="inline-flex items-center gap-1 text-sm font-medium text-al-primary underline underline-offset-4"
            >
              Add a service &rarr;
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-al-surface min-h-screen">
      <BookingHeader
        shopName={shop.name}
        subtitle="Pick a service, then choose a time that works for you."
      />
      <div className="px-16 pb-12 pt-6 max-w-[624px]">
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
    </div>
  );
}
