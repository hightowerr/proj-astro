import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { DashboardLogItem } from "@/types/dashboard";

interface DailyLogFeedProps {
  items: DashboardLogItem[];
}

export function DailyLogFeed({ items }: DailyLogFeedProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-al-on-surface-variant">
        No activity in the last 7 days.
      </p>
    );
  }

  const grouped = new Map<string, DashboardLogItem[]>();
  for (const item of items) {
    const key = format(item.occurredAt, "yyyy-MM-dd");
    const group = grouped.get(key) ?? [];
    group.push(item);
    grouped.set(key, group);
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([key, dayItems]) => (
        <div key={key}>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-al-on-surface-variant">
            {format(new Date(`${key}T00:00:00`), "MMM d, yyyy")}
          </p>
          <div className="rounded-lg bg-al-surface-lowest al-shadow-float">
            {dayItems.map((item, idx) => {
              const content = (
                <div
                  className={cn(
                    "flex items-start gap-3 px-3 py-3",
                    idx !== 0 && "border-t border-al-outline-variant/30"
                  )}
                >
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">{item.eventLabel}</span>
                      {item.channel ? (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                            item.channel === "sms"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-purple-50 text-purple-700"
                          )}
                        >
                          {item.channel}
                        </span>
                      ) : null}
                    </div>
                    {item.customerName ? (
                      <span className="text-xs text-al-on-surface-variant">
                        {item.customerName}
                      </span>
                    ) : null}
                  </div>
                  <time
                    dateTime={item.occurredAt.toISOString()}
                    className="shrink-0 text-xs text-al-on-surface-variant"
                  >
                    {format(item.occurredAt, "h:mm a")}
                  </time>
                </div>
              );

              return item.href ? (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block transition-colors hover:bg-al-surface-low"
                >
                  {content}
                </Link>
              ) : (
                <div key={item.id}>{content}</div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
