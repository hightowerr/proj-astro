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
      style={{ border: "1px solid var(--color-border-default)", background: "var(--color-surface-raised)" }}
    >
      <h2 className="mb-6 text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>Your Shop Details</h2>

      <div className="mb-6 space-y-4">
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="h-5 w-5" style={{ color: "var(--color-brand)" }} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Business Type</p>
            <p className="text-sm font-medium break-words" style={{ color: "var(--color-text-primary)" }}>{label}</p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>Shop Name</p>
          <p className="text-sm font-medium break-words" style={{ color: "var(--color-text-primary)" }}>{shopName}</p>
        </div>

        <div>
          <p className="mb-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>Booking Page</p>
          <a
            href={`/book/${shopSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-mono text-sm underline underline-offset-4 transition-colors hover:text-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]"
            style={{ color: "var(--color-text-primary)", textDecorationColor: "var(--color-border-default)" }}
          >
            /book/{shopSlug}
          </a>
        </div>

        <div>
          <p className="mb-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>Default Hours</p>
          <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>Mon-Fri 9:00 AM - 5:00 PM</p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>Customize hours in Settings</p>
        </div>

        <div>
          <p className="mb-1 text-xs" style={{ color: "var(--color-text-tertiary)" }}>Appointment Duration</p>
          <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>60 minutes</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={`/book/${shopSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-[var(--color-brand-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]"
          style={{ background: "var(--color-brand)", color: "var(--color-text-inverse)" }}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          <span>Test Booking Page</span>
        </a>
        <CopyButton text={bookingUrl} label="Copy Link" />
      </div>
    </section>
  );
}
