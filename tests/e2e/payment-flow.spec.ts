import { randomUUID } from "node:crypto";
import { test, expect } from "../setup";
import type { Page } from "@playwright/test";

const makeEmail = () => `shopper_${randomUUID()}@example.com`;
const strongPassword = "Password123!";

const nextWeekdayUtc = (): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  for (let i = 0; i < 7; i += 1) {
    const day = date.getUTCDay();
    if (day >= 1 && day <= 5) {
      return date.toISOString().slice(0, 10);
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date.toISOString().slice(0, 10);
};

const fillStripeCard = async (page: Page, card: string) => {
  // Wait for Payment Element to fully load
  await page.waitForTimeout(2000);

  // Find all Stripe iframes
  const frames = page.frames();
  const stripeFrame = frames.find(frame =>
    frame.url().includes('elements-inner-payment')
  );

  if (!stripeFrame) {
    throw new Error('Stripe payment frame not found');
  }

  // Wait for card number input to be ready
  const cardNumberInput = stripeFrame.locator('input[name="number"]');
  await cardNumberInput.waitFor({ state: 'visible', timeout: 15000 });

  // Fill in card details
  await cardNumberInput.fill(card);
  await stripeFrame.locator('input[name="expiry"]').fill("1234");
  await stripeFrame.locator('input[name="cvc"]').fill("123");

  // Fill postal code if visible (depends on Stripe configuration)
  const postalInput = stripeFrame.locator('input[name="postalCode"]');
  if (await postalInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await postalInput.fill("SW1A 1AA");
  }
};

const createShop = async (page: Page) => {
  const slug = `hello-shop-${randomUUID()}`;

  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/register");
  await page.getByLabel("Name").fill("Test User");
  await page.getByLabel("Email").fill(makeEmail());
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

test.describe("Payment Flow", () => {
  test("customer can book with payment", async ({ page }) => {
    const slug = await createShop(page);

    await page.goto(`/book/${slug}`);
    await expect(page.getByText(`Book with Hello Shop`)).toBeVisible();

    const dateStr = nextWeekdayUtc();
    await page.locator('#booking-date').fill(dateStr);

    const firstSlot = page.locator("[data-booking-slot]").first();
    await expect(firstSlot).toBeVisible();
    await firstSlot.click();

    await page.getByLabel("Full name").fill("Test Customer");
    await page.getByLabel("Phone").fill("+12025551234");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await page.waitForSelector('iframe[title="Secure payment input frame"]', {
      timeout: 15000,
    });

    await fillStripeCard(page, "4242424242424242");
    await page.getByRole("button", { name: "Pay now" }).click();

    await expect(
      page.getByRole("heading", { name: "Booking confirmed" })
    ).toBeVisible({ timeout: 20000 });

    await page.goto("/app/appointments");
    await expect(page.getByText("Test Customer")).toBeVisible();
  });

  test("handles payment failure gracefully", async ({ page }) => {
    const slug = await createShop(page);

    await page.goto(`/book/${slug}`);

    const dateStr = nextWeekdayUtc();
    await page.locator('#booking-date').fill(dateStr);

    const firstSlot = page.locator("[data-booking-slot]").first();
    await expect(firstSlot).toBeVisible();
    await firstSlot.click();

    await page.getByLabel("Full name").fill("Failing Customer");
    await page.getByLabel("Phone").fill("+12025551235");
    await page.getByLabel("Email").fill("fail@example.com");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await page.waitForSelector('iframe[title="Secure payment input frame"]', {
      timeout: 15000,
    });

    await fillStripeCard(page, "4000000000000002");
    await page.getByRole("button", { name: "Pay now" }).click();

    await expect(page.getByRole("button", { name: "Pay again" })).toBeVisible({
      timeout: 15000,
    });
  });
});
