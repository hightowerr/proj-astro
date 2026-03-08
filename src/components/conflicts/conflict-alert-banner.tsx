"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

type ConflictAlertBannerProps = {
  conflictCount: number;
  shopId: string;
};

const DISMISSED_CONFLICT_BANNER_KEY = "dismissedConflictBanners";

const readDismissedShops = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DISMISSED_CONFLICT_BANNER_KEY);
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

  window.localStorage.setItem(DISMISSED_CONFLICT_BANNER_KEY, JSON.stringify(shopIds));
};

export function ConflictAlertBanner({ conflictCount, shopId }: ConflictAlertBannerProps) {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [dismissedShopIds, setDismissedShopIds] = useState<string[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDismissedShopIds(readDismissedShops());
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const visible = hasHydrated && conflictCount > 0 && !dismissedShopIds.includes(shopId);

  const handleDismiss = () => {
    if (dismissedShopIds.includes(shopId)) {
      return;
    }

    const nextDismissed = [...dismissedShopIds, shopId];
    setDismissedShopIds(nextDismissed);
    writeDismissedShops(nextDismissed);
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-amber-900">
            Your Google Calendar conflicts with {conflictCount} {conflictCount === 1 ? "appointment" : "appointments"}.
          </p>
          <Link
            href="/app/conflicts"
            className="text-sm font-medium text-amber-700 underline-offset-4 hover:underline"
          >
            View conflicts →
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 text-amber-600 transition-colors duration-200 hover:text-amber-900"
        aria-label="Dismiss conflict banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
