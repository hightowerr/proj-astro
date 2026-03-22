import { db } from "@/lib/db";
import { appointments, customers, customerContactPrefs } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";

async function diagnose() {
  console.log("\n=== EMAIL REMINDER DIAGNOSTIC ===\n");

  // Current time and window
  const now = Date.now();
  const windowStart = new Date(now + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now + 25 * 60 * 60 * 1000);

  console.log("Current time:", new Date(now).toISOString());
  console.log("Window start (23h from now):", windowStart.toISOString());
  console.log("Window end (25h from now):", windowEnd.toISOString());
  console.log();

  // Get all booked appointments
  const allBooked = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      startsAt: appointments.startsAt,
      customerId: appointments.customerId,
      customerEmail: customers.email,
      customerName: customers.fullName,
      emailOptIn: customerContactPrefs.emailOptIn,
      hasContactPrefs: customerContactPrefs.customerId,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(
      customerContactPrefs,
      eq(appointments.customerId, customerContactPrefs.customerId)
    )
    .where(eq(appointments.status, "booked"))
    .orderBy(asc(appointments.startsAt));

  console.log(`Found ${allBooked.length} booked appointments:\n`);

  for (const apt of allBooked) {
    const hoursFromNow = (apt.startsAt.getTime() - now) / (1000 * 60 * 60);
    const inWindow = apt.startsAt >= windowStart && apt.startsAt <= windowEnd;
    const hasEmail = Boolean(apt.customerEmail);
    const emailOptInOk = apt.emailOptIn === true || apt.hasContactPrefs === null;
    const matchesAll = inWindow && hasEmail && emailOptInOk;

    console.log(`Appointment ${apt.id.slice(0, 8)}...`);
    console.log(`  Customer: ${apt.customerName} (${apt.customerEmail || "NO EMAIL"})`);
    console.log(`  Starts at: ${apt.startsAt.toISOString()}`);
    console.log(`  Hours from now: ${hoursFromNow.toFixed(1)}h`);
    console.log(`  ✓ In 23-25h window: ${inWindow ? "YES" : "NO"}`);
    console.log(`  ✓ Has email: ${hasEmail ? "YES" : "NO"}`);
    console.log(`  ✓ Email opt-in OK: ${emailOptInOk ? "YES" : "NO"} (optIn=${apt.emailOptIn}, hasPrefs=${apt.hasContactPrefs !== null})`);
    console.log(`  → MATCHES QUERY: ${matchesAll ? "YES ✓" : "NO ✗"}`);
    console.log();
  }

  if (allBooked.length === 0) {
    console.log("  No booked appointments found!");
    console.log("\n  Checking all appointments (any status)...\n");

    const allApts = await db
      .select({
        id: appointments.id,
        status: appointments.status,
        startsAt: appointments.startsAt,
        customerName: customers.fullName,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .orderBy(asc(appointments.startsAt));

    console.log(`  Found ${allApts.length} total appointments:`);
    for (const apt of allApts) {
      console.log(`    - ${apt.id.slice(0, 8)}... (${apt.status}) starts ${apt.startsAt.toISOString()}`);
    }
  }

  console.log("\n=== END DIAGNOSTIC ===\n");
}

diagnose().catch(console.error);
