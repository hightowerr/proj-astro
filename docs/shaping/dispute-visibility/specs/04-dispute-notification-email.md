# Spec 04 — P3: Merchant notification email on dispute

## Priority

P3 — MEDIUM. Depends on P2.

## Summary

Send a notification email to the merchant via Resend when `charge.dispute.created` fires. Follows the `connect-reengagement` inline HTML email pattern. Email not SMS — SMS is too alarming; email provides space for context and a clickable Express Dashboard link.

## Changes

### 1. Extend the dispute handler (spec 02) with email send

- **File:** `src/app/api/stripe/connect-webhook/route.ts`
- **Location:** Inside the `charge.dispute.created` handler, after the `console.error` log and within the `if (payment)` block. The email send happens AFTER the DB transaction commits (same pattern as suspension sweep — external calls outside the transaction).

Add a `pendingDisputeEmail` variable at the top of the handler (alongside `pendingCancellations`):
```ts
let pendingDisputeEmail: {
  ownerEmail: string;
  shopName: string;
  disputeId: string;
  amount: number;
  currency: string;
  customerName: string | null;
  appointmentDate: string | null;
  stripeAccountId: string;
} | null = null;
```

Inside the `if (payment)` block, after setting `financialOutcome`, query the shop owner email and customer name:
```ts
const shop = await tx.query.shops.findFirst({
  where: (table, { eq: whereEq }) => whereEq(table.id, payment.shopId),
});
const appointment = await tx.query.appointments.findFirst({
  where: (table, { eq: whereEq }) => whereEq(table.id, payment.appointmentId),
  with: { customer: true },
});

if (shop?.stripeAccountId) {
  pendingDisputeEmail = {
    ownerEmail: shop.userEmail,
    shopName: shop.name ?? "your shop",
    disputeId: dispute.id,
    amount: dispute.amount,
    currency: dispute.currency,
    customerName: appointment?.customer?.name ?? null,
    appointmentDate: appointment?.startsAt?.toISOString() ?? null,
    stripeAccountId: shop.stripeAccountId,
  };
}
```

### 2. Send email after transaction commit

After the `try/catch` transaction block, before the `return Response.json`:
```ts
if (pendingDisputeEmail) {
  const { ownerEmail, shopName, disputeId, amount, currency, customerName, appointmentDate, stripeAccountId } = pendingDisputeEmail;

  const formattedAmount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  const customerLine = customerName ? `${customerName} has` : "A customer has";
  const dateLine = appointmentDate
    ? ` for the appointment on ${new Date(appointmentDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`
    : "";

  // Generate Express Dashboard login link
  let dashboardUrl = "";
  try {
    const stripe = getStripeClient();
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
    dashboardUrl = loginLink.url;
  } catch {
    dashboardUrl = "https://dashboard.stripe.com";
  }

  const html = `<!DOCTYPE html>...`; // Follow connect-reengagement pattern (see design notes)
  const text = `${customerLine} disputed their ${formattedAmount} deposit${dateLine}. Respond through your Stripe Dashboard: ${dashboardUrl}`;

  try {
    await sendEmail({
      to: ownerEmail,
      subject: `A customer has disputed a deposit`,
      html,
      text,
    });
  } catch (emailError) {
    console.error("Failed to send dispute notification email", {
      disputeId,
      ownerEmail,
      error: emailError instanceof Error ? emailError.message : String(emailError),
    });
  }
}
```

### 3. Import sendEmail

- **File:** `src/app/api/stripe/connect-webhook/route.ts`
- Add: `import { sendEmail } from "@/lib/email";`

## Design Notes (for designer — email template)

The email follows the `connect-reengagement` inline HTML pattern:

| Element | Value |
|---------|-------|
| Subject | "A customer has disputed a deposit" |
| Headline | "A deposit has been disputed" |
| Body | "{Customer name} has disputed their {amount} deposit for {date}. Respond through your Stripe Dashboard within the deadline shown there." |
| CTA button | "Open Stripe Dashboard →" → Express Dashboard login link |
| Footer | "SHOWUP · Stop losing money to no-shows." |
| Tone | Factual, not alarming. Provide context + action link. |

### Pages impacted

- None (email only — no UI pages changed)

## Acceptance Criteria

- [ ] Email sent to shop owner when `charge.dispute.created` resolves to a known payment
- [ ] Email includes customer name (if resolvable), dispute amount, appointment date (if resolvable)
- [ ] CTA links to Express Dashboard via `stripe.accounts.createLoginLink()`
- [ ] Email send happens AFTER DB transaction commit (external call pattern)
- [ ] Email failure does not block webhook response (try/catch with `console.error`)
- [ ] Plaintext fallback included
- [ ] `pnpm check` passes

## Prerequisites

- Spec 02 (the `charge.dispute.created` handler must exist — this extends it)

## Dependencies

Depends on: spec 02.
