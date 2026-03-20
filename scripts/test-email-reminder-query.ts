import { findAppointmentsForEmailReminder } from "@/lib/queries/appointments";

async function testQuery() {
  const results = await findAppointmentsForEmailReminder();
  console.log(`Found ${results.length} appointments needing reminders:`);
  console.log(JSON.stringify(results, null, 2));
}

testQuery();