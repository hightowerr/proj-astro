import { randomUUID } from "node:crypto";
import { addDays, addHours, addMinutes } from "date-fns";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { createManageToken } from "../../src/lib/manage-tokens";
import {
  appointments,
  bookingSettings,
  customers,
  payments,
  policyVersions,
  shops,
  user,
} from "../../src/lib/schema";
import { test, expect } from "../setup";
import type { Page } from "@playwright/test";

const shouldRun = Boolean(process.env.POSTGRES_URL);

type Fixture = {
  userId: string;
  shopId: string;
  appointmentId: string;
  token: string;
};

const createFixture = async (): Promise<Fixture> => {
  const userId = randomUUID();
  const slug = `manage-shop-${randomUUID()}`;
  const email = `manage_${randomUUID()}@example.com`;

  await db.insert(user).values({
    id: userId,
    name: "Manage Test User",
    email,
    emailVerified: true,
  });

  const [shop] = await db
    .insert(shops)
    .values({
      ownerUserId: userId,
      name: "Test Barbershop",
      slug,
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
      depositAmountCents: 5000,
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
      fullName: "John Doe",
      phone: "+12025550123",
      email: "john@example.com",
    })
    .returning();

  if (!customer) {
    throw new Error("Failed to create customer");
  }

  const startsAt = addDays(new Date(), 7);
  const endsAt = addMinutes(startsAt, 60);

  const [appointment] = await db
    .insert(appointments)
    .values({
      shopId: shop.id,
      customerId: customer.id,
      policyVersionId: policy.id,
      startsAt,
      endsAt,
      status: "booked",
      paymentStatus: "paid",
      paymentRequired: true,
    })
    .returning();

  if (!appointment) {
    throw new Error("Failed to create appointment");
  }

  await db.insert(payments).values({
    shopId: shop.id,
    appointmentId: appointment.id,
    provider: "stripe",
    amountCents: 5000,
    currency: "USD",
    status: "succeeded",
    stripePaymentIntentId: `pi_test_${appointment.id}`,
  });

  const token = await createManageToken(appointment.id);

  return { userId, shopId: shop.id, appointmentId: appointment.id, token };
};

const goToManagePage = async (page: Page, token: string) => {
  await page.goto(`/manage/${token}`);
  await expect(
    page.getByRole("heading", { name: /manage your booking/i })
  ).toBeVisible();
};

test.describe("Manage Booking Page", () => {
  test.skip(!shouldRun, "POSTGRES_URL not set");

  let fixture: Fixture;

  test.beforeEach(async () => {
    fixture = await createFixture();
  });

  test.afterEach(async () => {
    if (fixture?.userId) {
      await db.delete(user).where(eq(user.id, fixture.userId));
    }
  });

  test("displays appointment details correctly", async ({ page }) => {
    await goToManagePage(page, fixture.token);

    await expect(
      page.getByRole("heading", { name: "Appointment details" })
    ).toBeVisible();
    await expect(page.getByText("Test Barbershop")).toBeVisible();
    await expect(page.getByText("John Doe")).toBeVisible();
    await expect(page.getByText("john@example.com")).toBeVisible();
    await expect(page.getByText("+12025550123")).toBeVisible();
    await expect(page.getByText("$50.00", { exact: true })).toBeVisible();
    await expect(page.getByText("Duration: 60 minutes")).toBeVisible();
  });

  test("shows confirmed status badge for booked appointments", async ({
    page,
  }) => {
    await goToManagePage(page, fixture.token);
    await expect(
      page.getByText("Confirmed", { exact: true })
    ).toBeVisible();
  });

  test("displays cancellation policy section", async ({ page }) => {
    await goToManagePage(page, fixture.token);
    await expect(page.getByText("Cancellation policy")).toBeVisible();
    await expect(page.getByText("Cancellation deadline")).toBeVisible();
    await expect(page.getByText("24 hours before appointment")).toBeVisible();
  });

  test("shows full refund available when before cutoff", async ({ page }) => {
    await goToManagePage(page, fixture.token);
    await expect(page.getByText("Full refund available")).toBeVisible();
    await expect(page.getByText(/receive a full refund of/i)).toBeVisible();
  });

  test("displays cancel button for booked appointments", async ({ page }) => {
    await goToManagePage(page, fixture.token);
    const cancelButton = page.getByRole("button", {
      name: "Cancel appointment",
    });
    await expect(cancelButton).toBeVisible();
    await expect(cancelButton).toBeEnabled();
  });

  test("cancels appointment before cutoff with refund", async ({
    page,
  }) => {
    await goToManagePage(page, fixture.token);

    await page.getByRole("button", { name: "Cancel appointment" }).click();
    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog).toBeVisible();
    await confirmDialog
      .getByRole("button", { name: "Cancel appointment" })
      .click();

    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Refund Processed")).toBeVisible();
    await expect(page.getByText("$50.00", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/has been issued to your original payment method/i)
    ).toBeVisible();
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancel appointment" })
    ).toHaveCount(0);

    const [updatedPayment] = await db
      .select({
        stripeRefundId: payments.stripeRefundId,
        refundedAmountCents: payments.refundedAmountCents,
      })
      .from(payments)
      .where(eq(payments.appointmentId, fixture.appointmentId))
      .limit(1);

    expect(updatedPayment?.stripeRefundId).toMatch(/^re_test_/);
    expect(updatedPayment?.refundedAmountCents).toBe(5000);
  });

  test("shows not found page for invalid token", async ({ page }) => {
    await page.goto("/manage/invalid-token-xyz");
    await expect(
      page.getByRole("heading", { name: /booking not found/i })
    ).toBeVisible();
    await expect(page.getByText("This booking link is invalid")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /return home/i })
    ).toBeVisible();
  });

  test("shows no refund available when past cutoff", async ({ page }) => {
    const updatedStart = addHours(new Date(), 12);
    const updatedEnd = addMinutes(updatedStart, 60);

    await db
      .update(appointments)
      .set({ startsAt: updatedStart, endsAt: updatedEnd })
      .where(eq(appointments.id, fixture.appointmentId));

    await goToManagePage(page, fixture.token);
    await expect(page.getByText("No refund available")).toBeVisible();
    await expect(
      page.getByText(/cancellation deadline has passed/i)
    ).toBeVisible();
  });

  test("cancels appointment after cutoff without refund", async ({ page }) => {
    const updatedStart = addHours(new Date(), 12);
    const updatedEnd = addMinutes(updatedStart, 60);

    await db
      .update(appointments)
      .set({ startsAt: updatedStart, endsAt: updatedEnd })
      .where(eq(appointments.id, fixture.appointmentId));

    await goToManagePage(page, fixture.token);

    await page.getByRole("button", { name: "Cancel appointment" }).click();
    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog).toBeVisible();
    await confirmDialog
      .getByRole("button", { name: "Cancel appointment" })
      .click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Appointment Cancelled")).toBeVisible();
    await expect(page.getByText(/deposit has been retained/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancel appointment" })
    ).toHaveCount(0);

    const [updatedAppointment] = await db
      .select({
        status: appointments.status,
        financialOutcome: appointments.financialOutcome,
        resolutionReason: appointments.resolutionReason,
      })
      .from(appointments)
      .where(eq(appointments.id, fixture.appointmentId))
      .limit(1);

    expect(updatedAppointment?.status).toBe("cancelled");
    expect(updatedAppointment?.financialOutcome).toBe("settled");
    expect(updatedAppointment?.resolutionReason).toBe(
      "cancelled_no_refund_after_cutoff"
    );
  });

  test("hides cancellation section for cancelled appointments", async ({
    page,
  }) => {
    await db
      .update(appointments)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        financialOutcome: "settled",
      })
      .where(eq(appointments.id, fixture.appointmentId));

    await goToManagePage(page, fixture.token);

    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(page.getByText("Appointment Cancelled")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Cancellation policy" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Cancel appointment" })
    ).toHaveCount(0);
  });

  test("displays times in correct shop timezone", async ({ page }) => {
    await goToManagePage(page, fixture.token);
    const pageContent = await page.content();
    expect(pageContent).toMatch(/EST|EDT/);
  });

  test("is responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await goToManagePage(page, fixture.token);

    await expect(
      page.getByRole("heading", { name: /manage your booking/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Appointment details" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancel appointment" })
    ).toBeVisible();

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );
    expect(scrollWidth).toBe(clientWidth);
  });
});
