# F2 — Branch recovery SMS on paymentRequired

## Classification
**Type:** UX fix — incorrect SMS copy for free bookings
**Risk:** Low — text change, no financial impact
**File:** `src/lib/slot-recovery.ts`

## Problem
After `createAppointment()` returns at line ~579, the SMS always sends "Complete payment: {url}" regardless of whether payment is actually required. When a booking is free (Connect incomplete, or zero-deposit event type), the customer receives a confusing payment link.

## Change
At lines ~579-592, replace the unconditional SMS with branched logic:

```typescript
const date = slotOpening.startsAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const time = slotOpening.startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const name = shop.name ?? shop.slug;

const smsBody = booking.paymentRequired
  ? `Booked with ${name}: ${date} at ${time}. Deposit: ${paymentUrl} Reply STOP to opt out.`
  : `Booked with ${name}: ${date} at ${time}. Reply STOP to opt out.`;

await sendTwilioSms({ to: customer.phone, body: smsBody });
```

**Key:** `booking.paymentRequired` is already returned by `createAppointment()`. No new data needed.

## Dependencies
- **Requires:** nothing (works with current hardcoded `paymentsEnabled: true` — it just won't ever hit the free branch until F1 ships, which is fine)
- **Blocks:** F3 (SMS cross-dependency needs F2 shipped first)
- **Independent of:** F1, P0

## Verification
- `pnpm check` passes
- Unit test: mock `createAppointment` returning `paymentRequired: false` — assert SMS body contains "Booked with" and "Reply STOP" and does NOT contain a URL
- Unit test: mock `createAppointment` returning `paymentRequired: true` — assert SMS body contains payment URL

## Design impact
**SMS copy change — designer review needed:**
- **Paid path:** "Booked with {shop}: {date} at {time}. Deposit: {url} Reply STOP to opt out."
- **Free path (new):** "Booked with {shop}: {date} at {time}. Reply STOP to opt out."
- Grammar aligned with confirmation SMS template (`messages.ts`): `Booked with` opening, factual tone, no exclamation marks, compliance suffix. Free path omits deposit language entirely (per confirmation-SMS design brief: absence of "Paid" is sufficient).
