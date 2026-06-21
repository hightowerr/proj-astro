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
      <div style={{ background: 'var(--al-background)', minHeight: '100vh' }}>
        <div style={{ padding: '48px 64px 0' }}>
          <div style={{
            fontSize: '11px', fontWeight: 800, letterSpacing: '0.2em',
            textTransform: 'uppercase' as const, color: 'var(--al-on-surface-variant)',
            opacity: 0.55, marginBottom: '12px',
          }}>Book an appointment</div>
          <h1 style={{
            fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em',
            color: 'var(--al-primary)', marginBottom: '8px',
          }}>Book with {shop.name}</h1>
          <p style={{ fontSize: '16px', fontWeight: 400, color: 'var(--al-on-surface-variant)' }}>
            {eventType.name} {'\u00b7'} {eventType.durationMinutes} minutes
          </p>
        </div>
        <div style={{ padding: '24px 64px 48px', maxWidth: '624px' }}>
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
      <div style={{ background: 'var(--al-background)', minHeight: '100vh' }}>
        <div style={{ padding: '48px 64px 0' }}>
          <div style={{
            fontSize: '11px', fontWeight: 800, letterSpacing: '0.2em',
            textTransform: 'uppercase' as const, color: 'var(--al-on-surface-variant)',
            opacity: 0.55, marginBottom: '12px',
          }}>Book an appointment</div>
          <h1 style={{
            fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em',
            color: 'var(--al-primary)', marginBottom: '8px',
          }}>Book with {shop.name}</h1>
          <p style={{ fontSize: '16px', fontWeight: 400, color: 'var(--al-on-surface-variant)' }}>
            {only.name} {'\u00b7'} {only.durationMinutes} minutes
          </p>
        </div>
        <div style={{ padding: '24px 64px 48px', maxWidth: '624px' }}>
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
      <div style={{ background: 'var(--al-background)', minHeight: '100vh' }}>
        <div style={{ padding: '48px 64px 0' }}>
          <div style={{
            fontSize: '11px', fontWeight: 800, letterSpacing: '0.2em',
            textTransform: 'uppercase' as const, color: 'var(--al-on-surface-variant)',
            opacity: 0.55, marginBottom: '12px',
          }}>Book an appointment</div>
          <h1 style={{
            fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em',
            color: 'var(--al-primary)', marginBottom: '8px',
          }}>Book with {shop.name}</h1>
        </div>
        <div style={{ padding: '24px 64px 48px', maxWidth: '624px' }}>
          <div
            style={{
              borderRadius: '16px',
              border: '1px solid rgba(195,198,209,0.20)',
              background: 'var(--al-surface-container-lowest)',
              padding: '32px',
              textAlign: 'center' as const,
            }}
          >
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--al-on-surface)', marginBottom: '4px' }}>No services available</p>
            <p style={{ fontSize: '14px', color: 'var(--al-on-surface-variant)', marginBottom: '16px' }}>
              This shop hasn&apos;t added any bookable services yet.
            </p>
            <a
              href="/app/settings/services"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '14px', fontWeight: 500, color: 'var(--al-primary)',
                textDecoration: 'underline', textUnderlineOffset: '4px',
              }}
            >
              Add a service &rarr;
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--al-background)', minHeight: '100vh' }}>
      <div style={{ padding: '48px 64px 0' }}>
        <div style={{
          fontSize: '11px', fontWeight: 800, letterSpacing: '0.2em',
          textTransform: 'uppercase' as const, color: 'var(--al-on-surface-variant)',
          opacity: 0.55, marginBottom: '12px',
        }}>Book an appointment</div>
        <h1 style={{
          fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em',
          color: 'var(--al-primary)', marginBottom: '8px',
        }}>Book with {shop.name}</h1>
        <p style={{ fontSize: '16px', fontWeight: 400, color: 'var(--al-on-surface-variant)' }}>
          Pick a service, then choose a time that works for you.
        </p>
      </div>
      <div style={{ padding: '24px 64px 48px', maxWidth: '624px' }}>
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
