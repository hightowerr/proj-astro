import { randomUUID } from "node:crypto";
import { addHours, addMinutes } from "date-fns";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import {
  appointments,
  calendarConflictAlerts,
  customers,
  payments,
  policyVersions,
  user,
} from "../../src/lib/schema";
import { completeShopOnboarding } from "../helpers/shop-onboarding";
import { test, expect } from "../setup";
import type { Page } from "@playwright/test";

const shouldRun = Boolean(process.env.POSTGRES_URL);

type Fixture = {
  userId: string;
  shopId: string;
  appointmentId: string;
  alertId: string;
};

const createFixture = async (userId: string, shopId: string): Promise<Fixture> => {
  const [customer] = await db
    .insert(customers)
    .values({
      shopId,
      fullName: "Conflict Customer",
      phone: "+15559999999",
      email: "conflict@example.com",
    })
    .returning();

  if (!customer) {
    throw new Error("Failed to create customer");
  }

  const [policy] = await db
    .insert(policyVersions)
    .values({
      shopId,
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

  const startsAt = addHours(new Date(), 12);
  const endsAt = addMinutes(startsAt, 60);

  const [appointment] = await db
    .insert(appointments)
    .values({
      shopId,
      customerId: customer.id,
      startsAt,
      endsAt,
      status: "booked",
      paymentStatus: "paid",
      paymentRequired: true,
      policyVersionId: policy.id,
    })
    .returning();

  if (!appointment) {
    throw new Error("Failed to create appointment");
  }

  await db.insert(payments).values({
    shopId,
    appointmentId: appointment.id,
    provider: "stripe",
    amountCents: 2000,
    currency: "USD",
    status: "succeeded",
    stripePaymentIntentId: `pi_test_${appointment.id}`,
  });

  const [alert] = await db
    .insert(calendarConflictAlerts)
    .values({
      shopId,
      appointmentId: appointment.id,
      calendarEventId: `event-${randomUUID()}`,
      eventSummary: "Important Meeting",
      eventStart: startsAt,
      eventEnd: endsAt,
      severity: "high",
      status: "pending",
    })
    .returning();

  if (!alert) {
    throw new Error("Failed to create conflict alert");
  }

  return {
    userId,
    shopId,
    appointmentId: appointment.id,
    alertId: alert.id,
  };
};

const registerAndOnboard = async (page: Page) => {
  const email = `conflicts_${randomUUID()}@example.com`;
  const password = "Password123!";
  const slug = `conflicts-shop-${randomUUID()}`;

  await page.goto("/register");
  await page.getByLabel("Name").fill("Conflicts Test User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

  await completeShopOnboarding(page, {
    slug,
    shopName: "Conflicts Test Shop",
    businessTypeLabel: "Hair",
  });

  const shop = await db.query.shops.findFirst({
    where: (table, { eq: tableEq }) => tableEq(table.slug, slug),
  });

  if (!shop) {
    throw new Error("Failed to find onboarded shop");
  }

  return createFixture(shop.ownerUserId, shop.id);
};

test.describe("Conflicts Dashboard", () => {
  test.skip(!shouldRun, "POSTGRES_URL not set");

  let fixture: Fixture;

  test.beforeEach(async ({ page }) => {
    fixture = await registerAndOnboard(page);
  });

  test.afterEach(async () => {
    if (fixture?.userId) {
      await db.delete(user).where(eq(user.id, fixture.userId));
    }
  });

  test("shows conflict alert banner on appointments page", async ({ page }) => {
    await page.goto("/app/appointments");

    await expect(page.getByText(/Google Calendar conflicts with 1 appointment/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "View conflicts →" })).toBeVisible();
  });

  test("navigates to conflicts page from banner", async ({ page }) => {
    await page.goto("/app/appointments");

    await page.getByRole("link", { name: "View conflicts →" }).click();

    await expect(page).toHaveURL("/app/conflicts");
    await expect(page.getByRole("heading", { name: "Calendar Conflicts" })).toBeVisible();
  });

  test("displays conflicts in table", async ({ page }) => {
    await page.goto("/app/conflicts");

    await expect(page.getByText("Conflict Customer")).toBeVisible();
    await expect(page.getByText("Important Meeting")).toBeVisible();
    await expect(page.getByText("High Conflict")).toBeVisible();
  });

  test("dismisses conflict with Keep Appointment", async ({ page }) => {
    await page.goto("/app/conflicts");

    await page.getByRole("button", { name: "Keep Appointment" }).click();

    await expect(page.getByText("Conflict dismissed")).toBeVisible();
    await expect(page.getByText("No conflicts found")).toBeVisible();

    const alert = await db.query.calendarConflictAlerts.findFirst({
      where: (table, { eq: tableEq }) => tableEq(table.id, fixture.alertId),
    });

    expect(alert?.status).toBe("dismissed");
  });

  test("cancels appointment with confirmation", async ({ page }) => {
    await page.goto("/app/conflicts");

    await page.getByRole("button", { name: "Cancel Appointment" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: "Yes, Cancel Appointment" }).click();

    await expect(page.getByText("Appointment cancelled")).toBeVisible();
    await expect(page.getByText("No conflicts found")).toBeVisible();

    const appointment = await db.query.appointments.findFirst({
      where: (table, { eq: tableEq }) => tableEq(table.id, fixture.appointmentId),
    });

    const alert = await db.query.calendarConflictAlerts.findFirst({
      where: (table, { eq: tableEq }) => tableEq(table.id, fixture.alertId),
    });

    expect(appointment?.status).toBe("cancelled");
    expect(alert?.status).toBe("auto_resolved_cancelled");
  });

  test("shows empty state when no conflicts", async ({ page }) => {
    await db
      .delete(calendarConflictAlerts)
      .where(eq(calendarConflictAlerts.shopId, fixture.shopId));

    await page.goto("/app/conflicts");

    await expect(page.getByText("No conflicts found")).toBeVisible();
    await expect(page.getByText(/do not currently overlap/i)).toBeVisible();
  });
});
