import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { appointments, customers, messageLog, payments } from "@/lib/schema";
import { requireAuth } from "@/lib/session";

const formatCurrency = (amountCents?: number | null, currency?: string | null) => {
  if (amountCents == null || !currency) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
};

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Appointment</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to view appointment details.
        </p>
      </div>
    );
  }

  const { id } = await params;

  const appointmentRows = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      paymentStatus: appointments.paymentStatus,
      paymentRequired: appointments.paymentRequired,
      financialOutcome: appointments.financialOutcome,
      resolvedAt: appointments.resolvedAt,
      resolutionReason: appointments.resolutionReason,
      bookingUrl: appointments.bookingUrl,
      createdAt: appointments.createdAt,
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      amountCents: payments.amountCents,
      currency: payments.currency,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(payments, eq(payments.appointmentId, appointments.id))
    .where(and(eq(appointments.id, id), eq(appointments.shopId, shop.id)))
    .limit(1);

  if (appointmentRows.length === 0 || !appointmentRows[0]) {
    notFound();
  }

  const appointment = appointmentRows[0];
  const [settings, messages] = await Promise.all([
    getBookingSettingsForShop(shop.id),
    db
      .select({
        id: messageLog.id,
        purpose: messageLog.purpose,
        status: messageLog.status,
        providerMessageId: messageLog.providerMessageId,
        bodyHash: messageLog.bodyHash,
        templateKey: messageLog.templateKey,
        templateVersion: messageLog.templateVersion,
        renderedBody: messageLog.renderedBody,
        errorCode: messageLog.errorCode,
        errorMessage: messageLog.errorMessage,
        createdAt: messageLog.createdAt,
        sentAt: messageLog.sentAt,
      })
      .from(messageLog)
      .where(
        and(eq(messageLog.shopId, shop.id), eq(messageLog.appointmentId, id))
      )
      .orderBy(desc(messageLog.createdAt)),
  ]);
  const timezone = settings?.timezone ?? "UTC";

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/app/appointments"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to appointments
        </Link>
        <h1 className="text-3xl font-semibold">Appointment</h1>
        <p className="text-sm text-muted-foreground">
          {appointment.customerName}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Details</h2>
          <p className="text-lg font-semibold">
            {formatter.format(new Date(appointment.startsAt))}
          </p>
          <p className="text-sm text-muted-foreground">
            Ends {formatter.format(new Date(appointment.endsAt))} ({timezone})
          </p>
          <p className="text-sm">
            Status: <span className="capitalize">{appointment.status}</span>
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Payment</h2>
          <p className="text-lg font-semibold">
            {formatCurrency(appointment.amountCents, appointment.currency)}
          </p>
          <p className="text-sm">
            Payment status:{" "}
            <span className="capitalize">{appointment.paymentStatus}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {appointment.paymentRequired ? "Payment required" : "No charge"}
          </p>
          <p className="text-sm">
            Outcome:{" "}
            <span className="capitalize">{appointment.financialOutcome}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Resolved at:{" "}
            {appointment.resolvedAt
              ? formatter.format(new Date(appointment.resolvedAt))
              : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Customer</h2>
        <p className="text-base font-medium">{appointment.customerName}</p>
        <p className="text-sm text-muted-foreground">
          {appointment.customerEmail ?? appointment.customerPhone}
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Messages</h2>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages logged for this appointment.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Purpose</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Sent</th>
                  <th className="px-4 py-2 font-medium">Provider ID</th>
                  <th className="px-4 py-2 font-medium">Template</th>
                  <th className="px-4 py-2 font-medium">Body hash</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message.id} className="border-t align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium capitalize">
                        {message.purpose.split("_").join(" ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatter.format(new Date(message.createdAt))}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{message.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {message.sentAt
                        ? formatter.format(new Date(message.sentAt))
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {message.providerMessageId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {message.templateKey} v{message.templateVersion}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {message.bodyHash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {messages.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Rendered Bodies</h2>
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={`${message.id}-body`} className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">
                  {message.templateKey} v{message.templateVersion} •{" "}
                  {message.status}
                </div>
                <p className="text-sm">{message.renderedBody}</p>
                {message.errorMessage ? (
                  <p className="mt-2 text-xs text-destructive">
                    {message.errorCode ? `${message.errorCode}: ` : ""}
                    {message.errorMessage}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
