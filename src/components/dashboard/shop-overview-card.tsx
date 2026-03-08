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
    <section className="rounded-xl border border-white/10 bg-bg-dark-secondary p-6 lg:p-8">
      <h2 className="mb-6 text-xl font-semibold text-white">Your Shop Details</h2>

      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="text-xs text-text-muted">Business Type</p>
            <p className="text-sm font-medium text-white">{label}</p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs text-text-muted">Shop Name</p>
          <p className="text-sm font-medium text-white">{shopName}</p>
        </div>

        <div>
          <p className="mb-1 text-xs text-text-muted">Booking Page</p>
          <a
            href={`/book/${shopSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-mono text-sm text-white underline decoration-white/20 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary/60"
          >
            /book/{shopSlug}
          </a>
        </div>

        <div>
          <p className="mb-1 text-xs text-text-muted">Default Hours</p>
          <p className="text-sm text-white">Mon-Fri 9:00 AM - 5:00 PM</p>
          <p className="mt-1 text-xs text-text-light-muted">Customize hours in Settings</p>
        </div>

        <div>
          <p className="mb-1 text-xs text-text-muted">Appointment Duration</p>
          <p className="text-sm text-white">60 minutes</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={`/book/${shopSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-light"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Test Booking Page</span>
        </a>
        <CopyButton text={bookingUrl} label="Copy Link" />
      </div>
    </section>
  );
}
