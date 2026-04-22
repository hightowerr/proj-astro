"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AppointmentSearchResult,
  CustomerSearchResult,
  SearchResponse,
} from "@/types/search";

export function DashboardSearch() {
  type SearchItem =
    | { type: "customer"; data: CustomerSearchResult }
    | { type: "appointment"; data: AppointmentSearchResult };

  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    const nonSpaceLen = trimmed.replace(/\s/g, "").length;

    if (nonSpaceLen < 2) {
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = (await response.json()) as SearchResponse;
        setResults(data);
        setOpen(true);
        setActiveIndex(-1);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const customers = results?.customers ?? [];
  const appointments = results?.appointments ?? [];
  const allItems: SearchItem[] = [
    ...customers.map((customer): SearchItem => ({
      type: "customer",
      data: customer,
    })),
    ...appointments.map((appointment): SearchItem => ({
      type: "appointment",
      data: appointment,
    })),
  ];
  const hasResults = allItems.length > 0;
  const isEmptyState = open && results !== null && !hasResults;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((previousIndex) =>
        Math.min(previousIndex + 1, allItems.length - 1)
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((previousIndex) => Math.max(previousIndex - 1, -1));
    } else if (event.key === "Enter") {
      const item = allItems[activeIndex];
      if (item) {
        router.push(item.data.href);
        setOpen(false);
        setQuery("");
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const handleSelect = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);

    const nonSpaceLen = value.trim().replace(/\s/g, "").length;
    if (nonSpaceLen < 2) {
      setResults(null);
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <input
        type="search"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search appointments or clients"
        aria-label="Quick search"
        autoComplete="off"
        className="w-full rounded-md border border-al-outline-variant bg-al-surface-low px-3 py-2 text-sm text-foreground placeholder:text-al-on-surface-variant outline-none ring-primary focus:ring-2"
      />

      {open && (hasResults || isEmptyState) ? (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 top-full z-30 mt-1.5 w-full rounded-lg bg-al-surface-lowest p-2 al-shadow-float"
        >
          {hasResults ? (
            <>
              {customers.length > 0 ? (
                <>
                  <p className="px-2 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-al-on-surface-variant">
                    Customers
                  </p>
                  {customers.map((customer, index) => (
                    <button
                      key={customer.id}
                      role="option"
                      aria-selected={activeIndex === index}
                      type="button"
                      onClick={() => handleSelect(customer.href)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors ${
                        activeIndex === index ? "bg-al-surface-low" : "hover:bg-al-surface-low"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground">
                          {customer.fullName}
                        </span>
                        <span className="block truncate text-xs text-al-on-surface-variant">
                          {customer.email}
                        </span>
                      </span>
                      {customer.tier !== null ? (
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            customer.tier === "top"
                              ? "bg-emerald-50 text-emerald-700"
                              : customer.tier === "risk"
                                ? "bg-red-50 text-red-700"
                                : "bg-al-surface-container text-al-on-surface-variant"
                          }`}
                        >
                          {customer.tier}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </>
              ) : null}
              {appointments.length > 0 ? (
                <>
                  <p className="mt-2 px-2 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-al-on-surface-variant">
                    Appointments
                  </p>
                  {appointments.map((appointment, index) => {
                    const itemIndex = customers.length + index;
                    const date = new Date(appointment.startsAt).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                      }
                    );

                    return (
                      <button
                        key={appointment.id}
                        role="option"
                        aria-selected={activeIndex === itemIndex}
                        type="button"
                        onClick={() => handleSelect(appointment.href)}
                        className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors ${
                          activeIndex === itemIndex
                            ? "bg-al-surface-low"
                            : "hover:bg-al-surface-low"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">
                            {appointment.customerName}
                          </span>
                          <span className="block truncate text-xs text-al-on-surface-variant">
                            {appointment.eventTypeName ?? "No service"} · {date} ·{" "}
                            {appointment.status}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </>
              ) : null}
            </>
          ) : null}

          {isEmptyState ? (
            <p className="px-2 py-3 text-sm text-al-on-surface-variant">
              No results for &ldquo;{query.trim()}&rdquo;
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
