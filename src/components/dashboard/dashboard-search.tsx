"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerSearchResult, SearchResponse } from "@/types/search";

export function DashboardSearch() {
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

  const items: CustomerSearchResult[] = results?.customers ?? [];
  const hasResults = items.length > 0;
  const isEmptyState = open && results !== null && !hasResults;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((previousIndex) => Math.min(previousIndex + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((previousIndex) => Math.max(previousIndex - 1, -1));
    } else if (event.key === "Enter") {
      const item = items[activeIndex];
      if (item) {
        router.push(item.href);
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
        className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-text-light-muted outline-none ring-primary focus:ring-2"
      />

      {open && (hasResults || isEmptyState) ? (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 top-full z-30 mt-1.5 w-full rounded-xl border border-white/10 bg-bg-dark p-2 shadow-2xl shadow-black/40"
        >
          {hasResults ? (
            <>
              <p className="px-2 pb-1.5 pt-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-text-light-muted">
                Customers
              </p>
              {items.map((customer, index) => (
                <button
                  key={customer.id}
                  role="option"
                  aria-selected={activeIndex === index}
                  type="button"
                  onClick={() => handleSelect(customer.href)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm transition-colors ${
                    activeIndex === index ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-white">
                      {customer.fullName}
                    </span>
                    <span className="block truncate text-xs text-text-light-muted">
                      {customer.email}
                    </span>
                  </span>
                  {customer.tier !== null ? (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        customer.tier === "top"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : customer.tier === "risk"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-white/10 text-text-light-muted"
                      }`}
                    >
                      {customer.tier}
                    </span>
                  ) : null}
                </button>
              ))}
            </>
          ) : null}

          {isEmptyState ? (
            <p className="px-2 py-3 text-sm text-text-light-muted">
              No results for &ldquo;{query.trim()}&rdquo;
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
