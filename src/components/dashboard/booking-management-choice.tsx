import Link from "next/link";
import { ArrowRight, Calendar, ClipboardList } from "lucide-react";

export function BookingManagementChoice() {
  return (
    <section
      className="rounded-xl p-6 lg:p-8"
      style={{ border: "1px solid var(--color-border-default)", background: "var(--color-surface-raised)" }}
    >
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold text-balance" style={{ color: "var(--color-text-primary)" }}>
          How Do You Want to Manage Bookings?
        </h2>
        <p className="text-sm text-pretty" style={{ color: "var(--color-text-tertiary)" }}>
          Choose your preferred method to view and manage appointments
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/app/settings/calendar"
          className="group rounded-xl p-6 transition-[border-color,box-shadow] duration-200 hover:border-[var(--color-brand-border)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]"
          style={{ border: "1px solid var(--color-border-default)", background: "var(--color-surface-base)" }}
        >
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center gap-3">
              <Calendar className="h-6 w-6" style={{ color: "var(--color-brand)" }} aria-hidden="true" />
              <div>
                <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>Google Calendar</h3>
                <span className="text-xs font-medium" style={{ color: "var(--color-accent-amber)" }}>Recommended</span>
              </div>
            </div>

            <p className="mb-4 flex-grow text-sm text-pretty" style={{ color: "var(--color-text-tertiary)" }}>
              Auto-sync new bookings to your Google Calendar. Get notifications and manage
              appointments from one place.
            </p>

            <div className="flex items-center text-sm font-medium" style={{ color: "var(--color-brand)" }}>
              <span>Connect Calendar</span>
              <ArrowRight
                className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </div>
          </div>
        </Link>

        <Link
          href="/app/appointments"
          className="group rounded-xl p-6 transition-[border-color,box-shadow] duration-200 hover:border-[var(--color-brand-border)] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-base)]"
          style={{ border: "1px solid var(--color-border-default)", background: "var(--color-surface-base)" }}
        >
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center gap-3">
              <ClipboardList className="h-6 w-6" style={{ color: "var(--color-brand)" }} aria-hidden="true" />
              <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>Appointments List</h3>
            </div>

            <p className="mb-4 flex-grow text-sm text-pretty" style={{ color: "var(--color-text-tertiary)" }}>
              View all your bookings in a simple table. See customer details, appointment times,
              and payment status.
            </p>

            <div className="flex items-center text-sm font-medium" style={{ color: "var(--color-brand)" }}>
              <span>View Appointments</span>
              <ArrowRight
                className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </div>
          </div>
        </Link>
      </div>

      <p className="text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
        You can connect Google Calendar later in Settings
      </p>
    </section>
  );
}
