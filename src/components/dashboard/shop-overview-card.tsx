import { ExternalLink } from "lucide-react";
import { CopyButton } from "@/components/dashboard/copy-button";
import { getBusinessTypeInfo } from "@/lib/business-types";

type ShopOverviewCardProps = {
  shopName: string;
  shopSlug: string;
  businessType: string | null;
};

const appOrigin = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function ShopOverviewCard({ shopName, shopSlug, businessType }: ShopOverviewCardProps) {
  const { label, icon: Icon } = getBusinessTypeInfo(businessType);
  const bookingUrl = `${appOrigin}/book/${shopSlug}`;

  return (
    <section
      className="rounded-xl p-6 lg:p-8"
      style={{ border: "1px solid var(--al-outline-variant)", background: "var(--al-surface-container-lowest)" }}
    >
      <h2 className="mb-6 text-xl font-semibold" style={{ color: "var(--al-on-surface)" }}>Your Shop Details</h2>

      <div className="mb-6 space-y-4">
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="h-5 w-5" style={{ color: "var(--al-primary)" }} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs" style={{ color: "var(--al-on-surface-variant)" }}>Business Type</p>
            <p className="text-sm font-medium break-words" style={{ color: "var(--al-on-surface)" }}>{label}</p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs" style={{ color: "var(--al-on-surface-variant)" }}>Shop Name</p>
          <p className="text-sm font-medium break-words" style={{ color: "var(--al-on-surface)" }}>{shopName}</p>
        </div>

        <div>
          <p className="mb-1 text-xs" style={{ color: "var(--al-on-surface-variant)" }}>Booking Page</p>
          <a
            href={`/book/${shopSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-mono text-sm underline underline-offset-4 transition-colors hover:text-[var(--al-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--al-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--al-background)]"
            style={{ color: "var(--al-on-surface)", textDecorationColor: "var(--al-outline-variant)" }}
          >
            /book/{shopSlug}
          </a>
        </div>

        <div>
          <p className="mb-1 text-xs" style={{ color: "var(--al-on-surface-variant)" }}>Default Hours</p>
          <p className="text-sm" style={{ color: "var(--al-on-surface)" }}>Mon-Fri 9:00 AM - 5:00 PM</p>
          <p className="mt-1 text-xs" style={{ color: "var(--al-on-surface-variant)" }}>Customize hours in Settings</p>
        </div>

        <div>
          <p className="mb-1 text-xs" style={{ color: "var(--al-on-surface-variant)" }}>Appointment Duration</p>
          <p className="text-sm" style={{ color: "var(--al-on-surface)" }}>60 minutes</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={`/book/${shopSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-[var(--al-primary-container)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--al-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--al-background)]"
          style={{ background: "var(--al-primary)", color: "var(--al-on-primary)" }}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          <span>Test Booking Page</span>
        </a>
        <CopyButton text={bookingUrl} label="Copy Link" />
      </div>
    </section>
  );
}
