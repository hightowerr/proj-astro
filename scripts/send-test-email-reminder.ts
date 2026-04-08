import { db } from "@/lib/db";
import { appointments, customers, shops, bookingSettings, customerContactPrefs } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sendAppointmentReminderEmail } from "@/lib/messages";

async function sendTestEmailReminder() {
  // Get appointment ID from command line or use first booked appointment
  const appointmentId = process.argv[2];

  if (!appointmentId) {
    console.error("Usage: pnpm tsx --env-file=.env scripts/send-test-email-reminder.ts <appointmentId>");
    console.log("\nFinding booked appointments with email opt-in...");

    const booked = await db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        customerName: customers.fullName,
        customerEmail: customers.email,
        emailOptIn: customerContactPrefs.emailOptIn,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .leftJoin(customerContactPrefs, eq(appointments.customerId, customerContactPrefs.customerId))
      .where(eq(appointments.status, "booked"))
      .limit(5);

    if (booked.length === 0) {
      console.log("No booked appointments found.");
      process.exit(1);
    }

    console.log("\nAvailable appointments:");
    for (const apt of booked) {
      console.log(`  ${apt.id}`);
      console.log(`    Customer: ${apt.customerName} (${apt.customerEmail || "NO EMAIL"})`);
      console.log(`    Starts: ${apt.startsAt.toISOString()}`);
      console.log(`    Email opt-in: ${apt.emailOptIn ?? "not set (defaults to true)"}`);
      console.log();
    }
    process.exit(0);
  }

  console.log(`Fetching appointment ${appointmentId}...`);

  const [row] = await db
    .select({
      appointmentId: appointments.id,
      shopId: appointments.shopId,
      customerId: appointments.customerId,
      customerName: customers.fullName,
      customerEmail: customers.email,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      bookingUrl: appointments.bookingUrl,
      shopName: shops.name,
      shopTimezone: bookingSettings.timezone,
      appointmentStatus: appointments.status,
      emailOptIn: customerContactPrefs.emailOptIn,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .innerJoin(shops, eq(appointments.shopId, shops.id))
    .leftJoin(
      customerContactPrefs,
      eq(appointments.customerId, customerContactPrefs.customerId)
    )
    .leftJoin(bookingSettings, eq(appointments.shopId, bookingSettings.shopId))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!row) {
    console.error("Appointment not found");
    process.exit(1);
  }

  console.log("Appointment found:");
  console.log(`  Customer: ${row.customerName}`);
  console.log(`  Email: ${row.customerEmail || "NONE"}`);
  console.log(`  Status: ${row.appointmentStatus}`);
  console.log(`  Starts: ${row.startsAt.toISOString()}`);
  console.log(`  Email opt-in: ${row.emailOptIn ?? "not set (defaults to true)"}`);
  console.log();

  // Validation
  if (row.appointmentStatus !== "booked") {
    console.error(`Error: Cannot send reminder for ${row.appointmentStatus} appointment`);
    process.exit(1);
  }

  if (!row.customerEmail) {
    console.error("Error: Customer does not have an email address");
    process.exit(1);
  }

  if (row.emailOptIn === false) {
    console.error("Error: Customer has opted out of email reminders");
    process.exit(1);
  }

  console.log("Sending email reminder...");

  try {
    const result = await sendAppointmentReminderEmail({
      appointmentId: row.appointmentId,
      shopId: row.shopId,
      customerId: row.customerId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      bookingUrl: row.bookingUrl,
      shopName: row.shopName,
      shopTimezone: row.shopTimezone ?? "UTC",
      reminderInterval: "24h",
    });

    if (result === "already_sent") {
      console.log("⚠️  Email reminder was already sent for this appointment");
    } else {
      console.log("✓ Email reminder sent successfully!");
      console.log(`  Recipient: ${row.customerEmail}`);
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    process.exit(1);
  }
}

sendTestEmailReminder().catch(console.error);
