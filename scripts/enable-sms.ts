#!/usr/bin/env tsx
/**
 * Enable SMS opt-in for customers
 *
 * Usage:
 *   pnpm tsx --env-file=.env scripts/enable-sms.ts +1234567890
 *   pnpm tsx --env-file=.env scripts/enable-sms.ts +1234567890 +9876543210
 *   pnpm tsx --env-file=.env scripts/enable-sms.ts --all  # Enable for all customers (use with caution!)
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customerContactPrefs, customers } from "@/lib/schema";

async function enableSmsForPhone(phone: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);

  if (!customer) {
    console.error(`❌ Customer not found: ${phone}`);
    return false;
  }

  await db
    .insert(customerContactPrefs)
    .values({
      customerId: customer.id,
      smsOptIn: true,
    })
    .onConflictDoUpdate({
      target: customerContactPrefs.customerId,
      set: { smsOptIn: true, updatedAt: new Date() },
    });

  console.log(`✅ SMS enabled for ${customer.fullName} (${phone})`);
  return true;
}

async function enableSmsForAll() {
  const allCustomers = await db.select().from(customers);

  console.log(`⚠️  Enabling SMS for ${allCustomers.length} customers...`);

  for (const customer of allCustomers) {
    await db
      .insert(customerContactPrefs)
      .values({
        customerId: customer.id,
        smsOptIn: true,
      })
      .onConflictDoUpdate({
        target: customerContactPrefs.customerId,
        set: { smsOptIn: true, updatedAt: new Date() },
      });
  }

  console.log(`✅ SMS enabled for all ${allCustomers.length} customers`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: pnpm tsx scripts/enable-sms.ts <phone1> [phone2] ...");
    console.error("       pnpm tsx scripts/enable-sms.ts --all");
    process.exit(1);
  }

  if (args[0] === "--all") {
    await enableSmsForAll();
  } else {
    let successCount = 0;
    for (const phone of args) {
      const success = await enableSmsForPhone(phone);
      if (success) successCount++;
    }
    console.log(`\n✅ ${successCount}/${args.length} customers updated`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
