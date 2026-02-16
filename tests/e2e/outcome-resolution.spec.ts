import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import {
  appointments,
  customers,
  payments,
  shopPolicies,
  shops,
  user,
} from "../../src/lib/schema";
import { test, expect } from "../setup";
import type { Page } from "@playwright/test";

const shouldRun = Boolean(process.env.POSTGRES_URL && process.env.CRON_SECRET);

test.describe("Outcome Resolution", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!shouldRun, "POSTGRES_URL or CRON_SECRET not set");

  const testLockId = String(900001 + Math.floor(Math.random() * 100000));
  const makeEmail = () => `shopper_${randomUUID()}@example.com`;
  const strongPassword = "Password123!";
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runResolveOutcomesOnce = async (page: Page) => {
    const response = await page.request.post(
      `/api/jobs/resolve-outcomes?lockId=${testLockId}`,
      {
        headers: { "x-cron-secret": process.env.CRON_SECRET ?? "" },
      }
    );
    expect(response.ok()).toBeTruthy();
    return await response.json().catch(() => null);
  };

  const runResolveOutcomesWithRetry = async (page: Page, attempts = 4) => {
    let lastBody: unknown = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      lastBody = await runResolveOutcomesOnce(page);

      if (!lastBody || typeof lastBody !== "object" || !("skipped" in lastBody)) {
        return lastBody;
      }

      const maybeSkipped = lastBody as { skipped?: boolean };
      if (!maybeSkipped.skipped) {
        return lastBody;
      }

      await sleep(250);
    }

    return lastBody;
  };

  const createShop = async (page: Page, email: string) => {
    const slug = `hello-shop-${randomUUID()}`;

    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/register");
    await page.getByLabel("Name").fill("Test User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(strongPassword);
    await page.getByLabel("Confirm Password", { exact: true }).fill(strongPassword);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

    await page.getByLabel("Shop name").fill("Hello Shop");
    await page.getByLabel("Shop URL slug").fill(slug);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText(slug).first()).toBeVisible({ timeout: 15000 });

    return slug;
  };

  test("ended appointment resolves to settled", async ({ page }) => {
    const waitForOutcome = async (appointmentId: string, timeoutMs = 12000) => {
      const deadline = Date.now() + timeoutMs;
      let attempts = 0;
      while (Date.now() < deadline) {
        const row = await db.query.appointments.findFirst({
          where: (table, { eq }) => eq(table.id, appointmentId),
        });
        if (row?.financialOutcome === "settled") {
          return true;
        }

        if (attempts % 2 === 0) {
          await runResolveOutcomesOnce(page);
        }
        attempts += 1;

        await sleep(250);
      }
      return false;
    };

    const email = makeEmail();
    const slug = await createShop(page, email);

    const shop = await db.query.shops.findFirst({
      where: (table, { eq }) => eq(table.slug, slug),
    });
    if (!shop) {
      throw new Error("Shop not found in DB");
    }

    await db
      .insert(shopPolicies)
      .values({
        shopId: shop.id,
        currency: "USD",
        paymentMode: "deposit",
        depositAmountCents: 2000,
        resolutionGraceMinutes: 0,
      })
      .onConflictDoNothing();

    const customerId = randomUUID();
    await db.insert(customers).values({
      id: customerId,
      shopId: shop.id,
      fullName: "Resolved Customer",
      phone: "+12025550199",
      email: "resolved@example.com",
    });

    const now = new Date();
    const startsAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const endsAt = new Date(now.getTime() - 60 * 60 * 1000);

    const [appointment] = await db
      .insert(appointments)
      .values({
        shopId: shop.id,
        customerId,
        startsAt,
        endsAt,
        status: "booked",
        paymentStatus: "paid",
        paymentRequired: true,
        financialOutcome: "unresolved",
      })
      .returning();

    if (!appointment) {
      throw new Error("Failed to insert appointment");
    }

    await db.insert(payments).values({
      shopId: shop.id,
      appointmentId: appointment.id,
      provider: "stripe",
      amountCents: 2000,
      currency: "USD",
      status: "succeeded",
      attempts: 0,
    });

    const outcomeBody = await runResolveOutcomesWithRetry(page, 12);

    const resolved = await waitForOutcome(appointment.id);
    if (!resolved) {
      throw new Error(
        `Outcome did not settle in time. Last response: ${JSON.stringify(outcomeBody)}`
      );
    }

    await page.goto("/app/appointments");
    await expect(page.getByText("Resolved Customer")).toBeVisible();
    await expect(page.locator("tbody").getByText("settled")).toBeVisible();

    const userRow = await db.query.user.findFirst({
      where: (table, { eq }) => eq(table.email, email),
    });

    await db.delete(payments).where(eq(payments.appointmentId, appointment.id));
    await db.delete(appointments).where(eq(appointments.id, appointment.id));
    await db.delete(customers).where(eq(customers.id, customerId));
    await db.delete(shopPolicies).where(eq(shopPolicies.shopId, shop.id));
    await db.delete(shops).where(eq(shops.id, shop.id));
    if (userRow) {
      await db.delete(user).where(eq(user.id, userRow.id));
    }
  });

  test("backfills orphaned cancelled appointment as refunded", async ({ page }) => {
    const waitForOutcome = async (
      appointmentId: string,
      expectedOutcome: "refunded",
      timeoutMs = 12000
    ) => {
      const deadline = Date.now() + timeoutMs;
      let attempts = 0;
      while (Date.now() < deadline) {
        const row = await db.query.appointments.findFirst({
          where: (table, { eq }) => eq(table.id, appointmentId),
        });
        if (
          row?.financialOutcome === expectedOutcome &&
          row.resolutionReason === "cancelled_refunded_before_cutoff"
        ) {
          return true;
        }

        if (attempts % 2 === 0) {
          await runResolveOutcomesOnce(page);
        }
        attempts += 1;

        await sleep(250);
      }
      return false;
    };

    const email = makeEmail();
    const slug = await createShop(page, email);

    const shop = await db.query.shops.findFirst({
      where: (table, { eq }) => eq(table.slug, slug),
    });
    if (!shop) {
      throw new Error("Shop not found in DB");
    }

    await db
      .insert(shopPolicies)
      .values({
        shopId: shop.id,
        currency: "USD",
        paymentMode: "deposit",
        depositAmountCents: 2000,
        resolutionGraceMinutes: 0,
      })
      .onConflictDoNothing();

    const customerId = randomUUID();
    await db.insert(customers).values({
      id: customerId,
      shopId: shop.id,
      fullName: "Backfill Customer",
      phone: "+12025550200",
      email: "backfill@example.com",
    });

    const now = new Date();
    const startsAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const endsAt = new Date(now.getTime() - 60 * 60 * 1000);

    const [appointment] = await db
      .insert(appointments)
      .values({
        shopId: shop.id,
        customerId,
        startsAt,
        endsAt,
        status: "cancelled",
        cancelledAt: now,
        cancellationSource: "customer",
        paymentStatus: "paid",
        paymentRequired: true,
        financialOutcome: "unresolved",
      })
      .returning();

    if (!appointment) {
      throw new Error("Failed to insert appointment");
    }

    await db.insert(payments).values({
      shopId: shop.id,
      appointmentId: appointment.id,
      provider: "stripe",
      amountCents: 2000,
      currency: "USD",
      status: "succeeded",
      refundedAmountCents: 2000,
      stripeRefundId: "re_test_backfill",
      attempts: 0,
    });

    const outcomeBody = await runResolveOutcomesWithRetry(page, 12);

    const backfilled = await waitForOutcome(appointment.id, "refunded");
    if (!backfilled) {
      throw new Error(
        `Backfill did not complete in time. Last response: ${JSON.stringify(outcomeBody)}`
      );
    }

    const userRow = await db.query.user.findFirst({
      where: (table, { eq }) => eq(table.email, email),
    });

    await db.delete(payments).where(eq(payments.appointmentId, appointment.id));
    await db.delete(appointments).where(eq(appointments.id, appointment.id));
    await db.delete(customers).where(eq(customers.id, customerId));
    await db.delete(shopPolicies).where(eq(shopPolicies.shopId, shop.id));
    await db.delete(shops).where(eq(shops.id, shop.id));
    if (userRow) {
      await db.delete(user).where(eq(user.id, userRow.id));
    }
  });
});
