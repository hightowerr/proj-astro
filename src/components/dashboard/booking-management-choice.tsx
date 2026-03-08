import Link from "next/link";
import { ArrowRight, Calendar, ClipboardList } from "lucide-react";

export function BookingManagementChoice() {
  return (
    <section className="rounded-xl border border-white/10 bg-bg-dark-secondary p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold text-white">
          How do you want to manage bookings?
        </h2>
        <p className="text-sm text-text-muted">
          Choose your preferred method to view and manage appointments
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/app/settings/calendar"
          className="group rounded-xl border border-white/10 bg-bg-dark p-6 transition-all duration-200 hover:border-primary-light/50 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center gap-3">
              <Calendar className="h-6 w-6 text-primary" />
              <div>
                <h3 className="text-base font-semibold text-white">Google Calendar</h3>
                <span className="text-xs font-medium text-accent-peach">Recommended</span>
              </div>
            </div>

            <p className="mb-4 flex-grow text-sm text-text-muted">
              Auto-sync new bookings to your Google Calendar. Get notifications and manage
              appointments from one place.
            </p>

            <div className="flex items-center text-sm font-medium text-primary transition-all duration-200 group-hover:gap-2">
              <span>Connect Calendar</span>
              <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        <Link
          href="/app/appointments"
          className="group rounded-xl border border-white/10 bg-bg-dark p-6 transition-all duration-200 hover:border-primary-light/50 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-primary" />
              <h3 className="text-base font-semibold text-white">Appointments List</h3>
            </div>

            <p className="mb-4 flex-grow text-sm text-text-muted">
              View all your bookings in a simple table. See customer details, appointment times,
              and payment status.
            </p>

            <div className="flex items-center text-sm font-medium text-primary transition-all duration-200 group-hover:gap-2">
              <span>View Appointments</span>
              <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
      </div>

      <p className="text-center text-xs text-text-light-muted">
        You can connect Google Calendar later in Settings
      </p>
    </section>
  );
}
