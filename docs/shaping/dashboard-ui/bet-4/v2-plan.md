# V2 Plan — Full Three-Source Feed

**Slice:** V2 of 2  
**Bet:** Bet 4 — Daily Log Tab  
**Prerequisite:** V1 complete  
**Demo:** Daily Log shows items from all three sources merged newest-first: new bookings, cancellations, resolved outcomes (with financial outcome label), and sent/failed messages (with channel badge and purpose label). 50-item cap across the full merged set.

---

## Files in Scope

| File | Action |
|------|--------|
| `src/lib/queries/dashboard.ts` | Modify — extend `getDashboardDailyLog` with two more sub-queries |

---

## Steps

### 1. Extend getDashboardDailyLog (N3)

Replace the single `appointments.createdAt` query with a `Promise.all` of three sub-queries. The `inArray`, `ne`, `appointmentEvents`, and `messageLog` imports were added in V1.

```typescript
export async function getDashboardDailyLog(
  shopId: string,
  opts: { days?: number; limit?: number } = {}
): Promise<DashboardLogItem[]> {
  const { days = 7, limit = 50 } = opts;
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [createdRows, eventRows, messageRows] = await Promise.all([
    // Source 1: new bookings
    db
      .select({
        id: appointments.id,
        occurredAt: appointments.createdAt,
        appointmentId: appointments.id,
        customerName: customers.fullName,
      })
      .from(appointments)
      .innerJoin(customers, eq(customers.id, appointments.customerId))
      .where(
        and(
          eq(appointments.shopId, shopId),
          gte(appointments.createdAt, windowStart)
        )
      ),

    // Source 2: cancelled + outcome_resolved events
    db
      .select({
        id: appointmentEvents.id,
        occurredAt: appointmentEvents.occurredAt,
        type: appointmentEvents.type,
        appointmentId: appointmentEvents.appointmentId,
        financialOutcome: appointments.financialOutcome,
        customerName: customers.fullName,
      })
      .from(appointmentEvents)
      .innerJoin(appointments, eq(appointments.id, appointmentEvents.appointmentId))
      .innerJoin(customers, eq(customers.id, appointments.customerId))
      .where(
        and(
          eq(appointmentEvents.shopId, shopId),
          inArray(appointmentEvents.type, ["cancelled", "outcome_resolved"]),
          gte(appointmentEvents.occurredAt, windowStart)
        )
      ),

    // Source 3: sent/failed messages (exclude slot recovery offers)
    db
      .select({
        id: messageLog.id,
        createdAt: messageLog.createdAt,
        appointmentId: messageLog.appointmentId,
        customerName: customers.fullName,
        channel: messageLog.channel,
        purpose: messageLog.purpose,
        status: messageLog.status,
      })
      .from(messageLog)
      .innerJoin(customers, eq(customers.id, messageLog.customerId))
      .where(
        and(
          eq(messageLog.shopId, shopId),
          ne(messageLog.purpose, "slot_recovery_offer"),
          gte(messageLog.createdAt, windowStart)
        )
      ),
  ]);

  // Map source 1
  const created: DashboardLogItem[] = createdRows.map((row) => ({
    id: `created-${row.id}`,
    kind: "appointment_created",
    occurredAt: row.occurredAt,
    appointmentId: row.appointmentId,
    customerName: row.customerName,
    eventLabel: "New booking",
    channel: null,
    href: `/app/appointments/${row.appointmentId}`,
  }));

  // Map source 2
  const events: DashboardLogItem[] = eventRows.map((row) => {
    const eventLabel =
      row.type === "outcome_resolved"
        ? `Outcome: ${row.financialOutcome ?? "resolved"}`
        : "Cancelled";
    return {
      id: `event-${row.id}`,
      kind: row.type === "outcome_resolved" ? "outcome_resolved" : "appointment_cancelled",
      occurredAt: row.occurredAt,
      appointmentId: row.appointmentId,
      customerName: row.customerName,
      eventLabel,
      channel: null,
      href: `/app/appointments/${row.appointmentId}`,
    };
  });

  // Map source 3
  const purposeLabel: Record<string, string> = {
    booking_confirmation: "Booking confirmation",
    cancellation_confirmation: "Cancellation notice",
    appointment_confirmation_request: "Confirmation request",
  };

  const messages: DashboardLogItem[] = messageRows.map((row) => {
    const isFailed = row.status === "failed";
    const base = row.purpose.startsWith("appointment_reminder_")
      ? "Reminder"
      : (purposeLabel[row.purpose] ?? row.purpose);
    return {
      id: `msg-${row.id}`,
      kind: isFailed ? "message_failed" : "message_sent",
      occurredAt: row.createdAt,
      appointmentId: row.appointmentId,
      customerName: row.customerName,
      eventLabel: `${base} ${isFailed ? "failed" : "sent"}`,
      channel: row.channel,
      href: row.appointmentId ? `/app/appointments/${row.appointmentId}` : null,
    };
  });

  return [...created, ...events, ...messages]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limit);
}
```

---

## Definition of Done

**R2 — All three sources:**
- [ ] Log includes items from `appointments.createdAt` within last 7 days
- [ ] Log includes `cancelled` events from `appointment_events` within last 7 days
- [ ] Log includes `outcome_resolved` events from `appointment_events` within last 7 days
- [ ] Log includes `message_log` items (excluding `slot_recovery_offer`) within last 7 days
- [ ] Total items capped at 50
- [ ] Items sorted newest-first across all three sources

**R3 — Exclusions:**
- [ ] No `payment_succeeded`, `payment_failed`, `refund_issued`, `refund_failed`, or `dispute_opened` items appear — even if such rows exist in `appointment_events`
- [ ] No `slot_recovery_offer` message items appear

**R4 — Item labels:**
- [ ] `outcome_resolved` item label reflects the financial outcome (e.g., "Outcome: settled", "Outcome: refunded")
- [ ] Message item label reflects purpose and status (e.g., "Reminder sent", "Booking confirmation failed")

**R5 — Channel badge:**
- [ ] `sms` / `email` badge appears on message items

**Project rules:**
- [ ] `pnpm lint && pnpm typecheck` passes
