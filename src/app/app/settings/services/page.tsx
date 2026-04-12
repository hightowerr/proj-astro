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
      <div className="min-h-screen" style={{ background: "var(--al-background)" }}>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h1
            className="text-3xl font-extrabold"
            style={{ color: "var(--al-primary)", fontFamily: "var(--al-font-headline)" }}
          >
            Services
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
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
    <div className="min-h-screen" style={{ background: "var(--al-background)" }}>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <div
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest opacity-60"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            <span>Settings</span>
            <span
              aria-hidden="true"
              className="material-symbols-outlined"
              style={{ fontSize: "14px" }}
            >
              chevron_right
            </span>
            <span style={{ color: "var(--al-primary)", opacity: 1 }}>Service Catalog</span>
          </div>
          <div className="space-y-2">
            <h1
              className="font-[family-name:var(--al-font-headline)] text-3xl font-extrabold tracking-tight text-balance sm:text-5xl"
              style={{ color: "var(--al-primary)" }}
            >
              Services Management
            </h1>
            <p
              className="max-w-2xl text-base font-medium text-pretty leading-relaxed"
              style={{ color: "var(--al-on-surface-variant)" }}
            >
              Define your craft. Configure service durations, buffers, and bespoke deposit
              requirements.
            </p>
          </div>
        </header>

        <ServicesEditorShell services={services} shopContext={shopContext} />
      </div>
    </div>
  );
}
