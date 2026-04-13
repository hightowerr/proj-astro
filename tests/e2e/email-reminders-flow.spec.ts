import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { createManageToken } from "../../src/lib/manage-tokens";
import {
  appointments,
  bookingSettings,
  customerContactPrefs,
  customers,
  policyVersions,
  shops,
  user,
} from "../../src/lib/schema";
import { test, expect } from "../setup";

const shouldRun =
  Boolean(process.env.POSTGRES_URL) && Boolean(process.env.CRON_SECRET);

type Fixture = {
  userId: string;
  token: string;
  customerId: string;
};

const createFixture = async (): Promise<Fixture> => {
  const userId = randomUUID();

  await db.insert(user).values({
    id: userId,
    name: "Email Reminder Flow User",
    email: `email-flow-${userId}@example.com`,
    emailVerified: true,
  });

  const [shop] = await db
    .insert(shops)
    .values({
      ownerUserId: userId,
      name: "Email Reminder Shop",
      slug: `email-reminder-shop-${randomUUID().slice(0, 8)}`,
      status: "active",
    })
    .returning();

  if (!shop) {
    throw new Error("Failed to create shop");
  }

  await db.insert(bookingSettings).values({
    shopId: shop.id,
    slotMinutes: 60,
    timezone: "America/New_York",
  });

  const [policy] = await db
    .insert(policyVersions)
    .values({
      shopId: shop.id,
      currency: "USD",
      paymentMode: "deposit",
      depositAmountCents: 2000,
      cancelCutoffMinutes: 1440,
      refundBeforeCutoff: true,
    })
    .returning();

  if (!policy) {
    throw new Error("Failed to create policy");
  }

  const [customer] = await db
    .insert(customers)
    .values({
      shopId: shop.id,
      fullName: "Email Reminder Customer",
      phone: "+12025550128",
      email: `email-reminder-${randomUUID()}@example.com`,
    })
    .returning();

  if (!customer) {
    throw new Error("Failed to create customer");
  }

  await db.insert(customerContactPrefs).values({
    customerId: customer.id,
    emailOptIn: true,
    smsOptIn: false,
  });

  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  const [appointment] = await db
    .insert(appointments)
    .values({
      shopId: shop.id,
      customerId: customer.id,
      policyVersionId: policy.id,
      startsAt,
      endsAt,
      status: "booked",
      paymentStatus: "unpaid",
      paymentRequired: false,
      bookingUrl: `https://example.com/manage/${randomUUID()}`,
    })
    .returning();

  if (!appointment) {
    throw new Error("Failed to create appointment");
  }

  const token = await createManageToken(appointment.id);
  return { userId, token, customerId: customer.id };
};

test.describe("Email reminders manage flow", () => {
  test.skip(!shouldRun, "POSTGRES_URL or CRON_SECRET not set");

  let fixture: Fixture;

  test.beforeEach(async () => {
    fixture = await createFixture();
  });

  test.afterEach(async () => {
    if (fixture?.userId) {
      await db.delete(user).where(eq(user.id, fixture.userId));
    }
  });

  test("customer can opt out from the manage page", async ({ page }) => {
    await page.goto(`/manage/${fixture.token}`);

    await expect(
      page.getByRole("heading", { name: /email preferences/i })
    ).toBeVisible();

    const checkbox = page.locator('input[id="emailOptIn"]');
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();

    await expect(checkbox).not.toBeDisabled({ timeout: 15000 });
    await expect(page.getByRole("status")).toHaveText(
      "Email reminders have been turned off.",
      { timeout: 15000 }
    );

    await expect
      .poll(
        async () => {
          const prefs = await db.query.customerContactPrefs.findFirst({
            where: (table, { eq }) => eq(table.customerId, fixture.customerId),
          });

          return prefs?.emailOptIn ?? null;
        },
        { timeout: 15000 }
      )
      .toBe(false);
  });
});
