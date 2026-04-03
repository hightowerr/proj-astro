import { EventTypeForm } from "@/components/services/event-type-form";
import { EventTypeList } from "@/components/services/event-type-list";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { getEventTypesForShop } from "@/lib/queries/event-types";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";
import { createEventType, updateEventType } from "./actions";

export default async function ServicesPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Services</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to manage services.
        </p>
      </div>
    );
  }

  const [eventTypeRows, settings] = await Promise.all([
    getEventTypesForShop(shop.id),
    getBookingSettingsForShop(shop.id),
  ]);

  const slotMinutes = settings?.slotMinutes ?? 60;
  const bookingBaseUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/book/${shop.slug}`;

  const eventTypes = eventTypeRows.map((eventType) => ({
    id: eventType.id,
    name: eventType.name,
    description: eventType.description,
    durationMinutes: eventType.durationMinutes,
    bufferMinutes: eventType.bufferMinutes as 0 | 5 | 10 | null,
    depositAmountCents: eventType.depositAmountCents,
    isHidden: eventType.isHidden,
    isActive: eventType.isActive,
    isDefault: eventType.isDefault,
  }));

  return (
    <div className="container mx-auto space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Services</h1>
        <p className="text-sm text-muted-foreground">
          Define the services customers can book. Each service has its own
          duration, buffer, and optional deposit.
        </p>
      </header>

      <EventTypeList
        eventTypes={eventTypes}
        bookingBaseUrl={bookingBaseUrl}
        slotMinutes={slotMinutes}
        updateAction={updateEventType}
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Add a service</h2>
        <EventTypeForm action={createEventType} slotMinutes={slotMinutes} />
      </section>
    </div>
  );
}
