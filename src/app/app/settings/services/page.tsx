import { db } from "@/lib/db";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { getEventTypesForShop } from "@/lib/queries/event-types";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";
import { ServicesEditorShell } from "./services-editor-shell";
import type { ServiceRow, ShopContext } from "./types";

export default async function ServicesPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold text-al-primary font-manrope">
            Services
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Create your shop to manage services.
          </p>
        </div>
      </div>
    );
  }

  const [eventTypeRows, settings, policy] = await Promise.all([
    getEventTypesForShop(shop.id),
    getBookingSettingsForShop(shop.id),
    db.query.shopPolicies.findFirst({
      where: (table, { eq }) => eq(table.shopId, shop.id),
      columns: { depositAmountCents: true },
    }),
  ]);

  const shopContext: ShopContext = {
    slotMinutes: settings?.slotMinutes ?? 60,
    defaultBufferMinutes: (settings?.defaultBufferMinutes ?? 0) as 0 | 5 | 10,
    defaultDepositCents: policy?.depositAmountCents ?? null,
    bookingBaseUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/book/${shop.slug}`,
  };

  const services: ServiceRow[] = eventTypeRows.map((eventType) => ({
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12">
        <header className="mb-12 max-w-full">
          <div className="flex items-center gap-2 text-on-surface-variant text-[10px] font-extrabold uppercase tracking-[0.2em] mb-6 opacity-60">
            <span>Settings</span>
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[10px]"
            >
              chevron_right
            </span>
            <span style={{ color: "var(--al-primary)", opacity: 1 }}>Service Catalog</span>
          </div>
          <h1
            className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4 leading-[0.9] text-al-primary font-manrope"
          >
            Services Management
          </h1>
          <p
            className="text-on-surface-variant text-lg font-medium max-w-2xl leading-relaxed"
          >
            Define your craft. Configure service durations, buffers, and bespoke deposit
            requirements.
          </p>
        </header>

        <ServicesEditorShell services={services} shopContext={shopContext} />
      </div>
    </div>
  );
}
