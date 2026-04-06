import { db } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

async function verifyConfig() {
  console.log("🔍 Verifying SMS Configuration\n");

  // Check env vars
  const env = getServerEnv();
  console.log("Environment Variables:");
  console.log(`  TWILIO_ACCOUNT_SID: ${env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`);
  console.log(`  TWILIO_AUTH_TOKEN: ${env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`  TWILIO_PHONE_NUMBER: ${env.TWILIO_PHONE_NUMBER || '❌ Missing'}`);
  console.log(`  TWILIO_TEST_MODE: ${process.env.TWILIO_TEST_MODE || 'false'}`);
  console.log();

  // Check recent appointments for smsOptIn
  const recentAppointments = await db.query.appointments.findMany({
    limit: 5,
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  if (recentAppointments.length > 0) {
    console.log("Recent Appointments (Last 5):");
    for (const apt of recentAppointments) {
      const customer = await db.query.customers.findFirst({
        where: (table, { eq }) => eq(table.id, apt.customerId),
      });
      const customerPrefs = await db.query.customerContactPrefs.findFirst({
        where: (table, { eq }) => eq(table.customerId, apt.customerId),
      });
      const hasConsent = customerPrefs?.smsOptIn;
      const shortId = apt.id.slice(0, 8);
      const customerName = customer?.fullName || 'Unknown';
      console.log(`  ${shortId}... ${hasConsent ? '✅' : '❌'} smsOptIn=${hasConsent} (${customerName})`);
    }
    console.log();
  } else {
    console.log("No appointments found in database.\n");
  }

  // Check message log for recent failures
  const failedMessages = await db.query.messageLog.findMany({
    where: (table, { eq }) => eq(table.status, 'failed'),
    limit: 5,
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  if (failedMessages.length > 0) {
    console.log("Recent Failed Messages:");
    for (const msg of failedMessages) {
      const purpose = msg.purpose?.replace('appointment_', '') || 'unknown';
      console.log(`  ❌ ${purpose}: ${msg.errorCode} - ${msg.errorMessage}`);
    }
    console.log();
  } else {
    console.log("No failed messages found.\n");
  }

  // Check message log for recent successes
  const sentMessages = await db.query.messageLog.findMany({
    where: (table, { eq }) => eq(table.status, 'sent'),
    limit: 3,
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  if (sentMessages.length > 0) {
    console.log("Recent Sent Messages:");
    for (const msg of sentMessages) {
      const purpose = msg.purpose?.replace('appointment_', '') || 'unknown';
      const shortSid = msg.providerMessageId?.slice(0, 12) || 'no-sid';
      console.log(`  ✅ ${purpose}: ${shortSid}...`);
    }
    console.log();
  }

  console.log("💡 Tips:");
  console.log("  - Set TWILIO_TEST_MODE=true in .env for localhost testing");
  console.log("  - Include smsOptIn:true when creating test bookings");
  console.log("  - Check message_log table for delivery status:");
  console.log("    SELECT * FROM message_log ORDER BY created_at DESC LIMIT 10;");

  process.exit(0);
}

verifyConfig().catch((error) => {
  console.error("❌ Error verifying SMS config:", error);
  process.exit(1);
});
