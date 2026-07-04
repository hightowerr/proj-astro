import Link from "next/link";

interface TransferHeldCardProps {
  count: number;
  /** When count === 1, link directly to the appointment detail page. */
  appointmentId?: string;
}

export function TransferHeldCard({ count, appointmentId }: TransferHeldCardProps) {
  if (count === 0) return null;

  const isSingular = count === 1;
  const title = isSingular
    ? "1 payment with held transfer"
    : `${count} payments with held transfers`;
  const ctaLabel = isSingular ? "View appointment" : "View held payments";
  const ctaHref =
    isSingular && appointmentId
      ? `/app/appointments/${appointmentId}`
      : "/app/appointments";

  return (
    <article
      role="region"
      aria-label="Held transfers"
      className="relative overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-b from-amber-50 to-amber-50/60 p-6"
    >
      <span
        className="material-symbols-outlined absolute -top-4 -right-4 text-[150px] text-amber-700/[0.06] pointer-events-none select-none"
        aria-hidden="true"
      >
        warning
      </span>

      <div className="relative space-y-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex shrink-0 items-center justify-center w-[46px] h-[46px] rounded-xl bg-amber-100">
            <span
              className="material-symbols-outlined text-2xl text-amber-700"
              aria-hidden="true"
            >
              warning
            </span>
          </span>

          <h2 className="text-lg font-extrabold text-amber-900">{title}</h2>
        </div>

        <p className="text-sm text-amber-800/80">
          Stripe is reviewing your account. Transfers will resume automatically
          once your account is restored. Contact Stripe support if this persists.
        </p>

        <Link
          href={ctaHref}
          className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors"
        >
          {ctaLabel}
          <span className="material-symbols-outlined text-[18px]">
            arrow_forward
          </span>
        </Link>
      </div>
    </article>
  );
}
