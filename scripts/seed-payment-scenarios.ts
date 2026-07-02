#!/usr/bin/env tsx

/**
 * Seed script: creates 8 appointments exercising all 5 PaymentCard fee states
 * + the refund modifier. Idempotent — safe to re-run.
 *
 * Usage: pnpm seed:payments
 * Login: seed@example.com / SeedTest123!
 */

import "dotenv/config";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  user,
  account,
  shops,
  bookingSettings,
  shopHours,
  shopPolicies,
  eventTypes,
  policyVersions,
  customers,
  appointments,
  payments,
} from "@/lib/schema";

// ─── Deterministic IDs ──────────────────────────────────────────────────────

const USER_ID = "seed-payment-user";
const ACCOUNT_ID = "seed-payment-account";
const SHOP_ID = "10000000-0000-4000-a000-000000000000";
const EVENT_TYPE_ID = "10000000-0000-4000-a000-00000000ee01";
const POLICY_VERSION_ID = "10000000-0000-4000-a000-00000000ff01";
const SHOP_POLICY_ID = "10000000-0000-4000-a000-00000000dd01";

const CUSTOMER_IDS = Array.from({ length: 8 }, (_, i) =>
  `10000000-0000-4000-a000-00000000c${String(i + 1).padStart(3, "0")}`
);

const APPOINTMENT_IDS = Array.from({ length: 8 }, (_, i) =>
  `10000000-0000-4000-a000-00000000a${String(i + 1).padStart(3, "0")}`
);

const PAYMENT_IDS = Array.from({ length: 6 }, (_, i) =>
  `10000000-0000-4000-a000-000000000${String(i + 1).padStart(3, "0")}`
);

// ─── Scenario definitions ───────────────────────────────────────────────────

const SCENARIOS = [
  { label: "connect",          amountCents: 1000, isConnect: true,  depositSkipped: null,                   financialOutcome: "settled"    as const, refunded: false },
  { label: "connect+refunded", amountCents: 1000, isConnect: true,  depositSkipped: null,                   financialOutcome: "refunded"   as const, refunded: true  },
  { label: "waived",           amountCents: 50,   isConnect: true,  depositSkipped: null,                   financialOutcome: "settled"    as const, refunded: false },
  { label: "waived+refunded",  amountCents: 50,   isConnect: true,  depositSkipped: null,                   financialOutcome: "refunded"   as const, refunded: true  },
  { label: "legacy",           amountCents: 1000, isConnect: false, depositSkipped: null,                   financialOutcome: "settled"    as const, refunded: false },
  { label: "legacy+refunded",  amountCents: 1000, isConnect: false, depositSkipped: null,                   financialOutcome: "refunded"   as const, refunded: true  },
  { label: "skipped",          amountCents: null,  isConnect: false, depositSkipped: "connect_not_complete" as const, financialOutcome: "unresolved" as const, refunded: false },
  { label: "policy",           amountCents: null,  isConnect: false, depositSkipped: "policy_none"          as const, financialOutcome: "unresolved" as const, refunded: false },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function hashPasswordForAuth(password: string): Promise<string> {
  const { hashPassword } = await import("better-auth/crypto");
  return hashPassword(password);
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

async function cleanup() {
  // Deleting the user cascades to: account, shops → (bookingSettings, shopHours,
  // shopPolicies, eventTypes, policyVersions, customers, appointments → payments)
  await db.delete(user).where(eq(user.id, USER_ID));
  console.log("Cleaned up existing seed data.");
}

// ─── Seed ───────────────────────────────────────────────────────────────────

async function seed() {
  const password = "SeedTest123!";
  const hashedPassword = await hashPasswordForAuth(password);
  const now = new Date();

  // 1. User + account
  await db.insert(user).values({
    id: USER_ID,
    name: "Seed User",
    email: "seed@example.com",
    emailVerified: true,
  });

  await db.insert(account).values({
    id: ACCOUNT_ID,
    accountId: USER_ID,
    providerId: "credential",
    userId: USER_ID,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });

  // 2. Shop (Connect complete, so badge shows for connect/waived scenarios)
  await db.insert(shops).values({
    id: SHOP_ID,
    ownerUserId: USER_ID,
    name: "Seed Payment Shop",
    slug: "seed-payment-shop",
    businessType: "hair",
    status: "active",
    stripeAccountId: "acct_seed_payment_shop",
    stripeOnboardingStatus: "complete",
    stripeAccountCreatedAt: daysAgo(30),
  });

  // 3. Booking settings
  await db.insert(bookingSettings).values({
    shopId: SHOP_ID,
    slotMinutes: 60,
    timezone: "Europe/London",
  });

  // 4. Shop hours (Mon–Fri)
  for (let day = 1; day <= 5; day++) {
    await db.insert(shopHours).values({
      shopId: SHOP_ID,
      dayOfWeek: day,
      openTime: "09:00",
      closeTime: "17:00",
    });
  }

  // 5. Shop policy
  await db.insert(shopPolicies).values({
    id: SHOP_POLICY_ID,
    shopId: SHOP_ID,
    currency: "GBP",
    paymentMode: "deposit",
    depositAmountCents: 1000,
  });

  // 6. Event type
  await db.insert(eventTypes).values({
    id: EVENT_TYPE_ID,
    shopId: SHOP_ID,
    name: "Full Colour & Gloss",
    durationMinutes: 60,
    isDefault: true,
  });

  // 7. Policy version (snapshot for paid appointments)
  await db.insert(policyVersions).values({
    id: POLICY_VERSION_ID,
    shopId: SHOP_ID,
    currency: "GBP",
    paymentMode: "deposit",
    depositAmountCents: 1000,
  });

  // 8. Customers (one per scenario)
  for (let i = 0; i < 8; i++) {
    const scenario = SCENARIOS[i]!;
    await db.insert(customers).values({
      id: CUSTOMER_IDS[i]!,
      shopId: SHOP_ID,
      fullName: `Customer ${scenario.label}`,
      phone: `+4470000000${String(i + 1).padStart(2, "0")}`,
      email: `scenario-${i + 1}@seed.test`,
    });
  }

  // 9. Appointments (8 scenarios, distinct dates)
  for (let i = 0; i < 8; i++) {
    const s = SCENARIOS[i]!;
    const startsAt = daysAgo(10 + i);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const hasPayment = s.amountCents !== null;

    await db.insert(appointments).values({
      id: APPOINTMENT_IDS[i]!,
      shopId: SHOP_ID,
      customerId: CUSTOMER_IDS[i]!,
      startsAt,
      endsAt,
      status: hasPayment ? "ended" : "booked",
      paymentStatus: hasPayment ? "paid" : "unpaid",
      paymentRequired: s.depositSkipped !== "policy_none",
      financialOutcome: s.financialOutcome,
      resolvedAt: hasPayment ? daysAgo(9 + i) : null,
      depositSkipped: s.depositSkipped,
      eventTypeId: EVENT_TYPE_ID,
      policyVersionId: hasPayment ? POLICY_VERSION_ID : null,
      source: "web",
    });
  }

  // 10. Payments (scenarios 1–6 only; 7–8 have no payment)
  for (let i = 0; i < 6; i++) {
    const s = SCENARIOS[i]!;
    const metadata: Record<string, string> = {};
    if (s.isConnect) {
      metadata.connectedAccountId = "acct_seed_001";
    }

    await db.insert(payments).values({
      id: PAYMENT_IDS[i]!,
      shopId: SHOP_ID,
      appointmentId: APPOINTMENT_IDS[i]!,
      provider: "stripe",
      amountCents: s.amountCents!,
      currency: "GBP",
      status: "succeeded",
      stripePaymentIntentId: `pi_seed_${String(i + 1).padStart(3, "0")}`,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
      refundedAmountCents: s.refunded ? s.amountCents! : 0,
      stripeRefundId: s.refunded ? `re_seed_${String(i + 1).padStart(3, "0")}` : null,
      refundedAt: s.refunded ? daysAgo(8 + i) : null,
    });
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding payment card scenarios...\n");

  await cleanup();
  await seed();

  console.log("\nSeed data created:");
  console.log(`  User: ${USER_ID} (seed@example.com / SeedTest123!)`);
  console.log(`  Shop: seed-payment-shop\n`);
  console.log("  Appointments:");
  for (let i = 0; i < 8; i++) {
    const label = SCENARIOS[i]!.label.padEnd(18);
    console.log(`  #${i + 1} ${label} → /app/appointments/${APPOINTMENT_IDS[i]}`);
  }
  console.log();

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
