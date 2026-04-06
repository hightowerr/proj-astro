"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, X } from "lucide-react";

type SuccessBannerProps = {
  businessTypeName: string;
  shopId: string;
};

const DISMISSED_BANNERS_KEY = "dismissedBanners";

const readDismissedShops = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DISMISSED_BANNERS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
};

const writeDismissedShops = (shopIds: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DISMISSED_BANNERS_KEY, JSON.stringify(shopIds));
};

export function SuccessBanner({ businessTypeName, shopId }: SuccessBannerProps) {
  const searchParams = useSearchParams();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [dismissedShopIds, setDismissedShopIds] = useState<string[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDismissedShopIds(readDismissedShops());
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const visible =
    hasHydrated &&
    searchParams.get("created") === "true" &&
    !dismissedShopIds.includes(shopId);

  const handleDismiss = () => {
    if (dismissedShopIds.includes(shopId)) {
      return;
    }

    const nextDismissedShopIds = [...dismissedShopIds, shopId];
    setDismissedShopIds(nextDismissedShopIds);
    writeDismissedShops(nextDismissedShopIds);
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className="mb-8 flex items-center justify-between gap-4 rounded-xl p-4"
      role="status"
      aria-live="polite"
      style={{ border: "1px solid var(--color-success-border)", background: "var(--color-success-subtle)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <CheckCircle className="h-5 w-5 shrink-0" style={{ color: "var(--color-success)" }} aria-hidden="true" />
        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          Your {businessTypeName} is ready to accept bookings!
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 transition-colors duration-200 hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]"
        style={{ color: "var(--color-text-tertiary)" }}
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
