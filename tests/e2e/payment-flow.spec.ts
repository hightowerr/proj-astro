import { randomUUID } from "node:crypto";
import { test, expect } from "../setup";
import type { Frame, Page } from "@playwright/test";

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

const findStripeCardFrame = async (
  page: Page,
  timeoutMs = 15000
) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const frames = page.frames();
    for (const frame of frames) {
      const cardNumberInput = frame
        .locator('input[name="number"], input[autocomplete="cc-number"]')
        .first();

      const visible = await cardNumberInput
        .isVisible({ timeout: 250 })
        .catch(() => false);
      if (visible) {
        return frame;
      }
    }

    await page.waitForTimeout(200);
  }

  throw new Error("Stripe payment frame not found");
};

const fillStripeBillingDetails = async (stripeFrame: Frame) => {
  const countrySelect = stripeFrame.locator(
    'select[name="country"], select[autocomplete="country"]'
  );

  if (await countrySelect.count()) {
    await countrySelect.first().waitFor({ state: "visible", timeout: 10000 });

    const optionLabels = await countrySelect.first().locator("option").allTextContents();
    const usLabel = optionLabels.find((label) => /united states/i.test(label));
    if (usLabel) {
      await countrySelect
        .first()
        .selectOption({ label: usLabel })
        .catch(() => undefined);
    } else {
      await countrySelect.first().selectOption("US").catch(() => undefined);
    }
  }

  const postalInput = stripeFrame.locator(
    'input[name="postalCode"], input[autocomplete="postal-code"]'
  );
  if (await postalInput.count()) {
    const field = postalInput.first();
    await field.waitFor({ state: "visible", timeout: 10000 }).catch(() => undefined);
    const visible = await field.isVisible().catch(() => false);
    if (visible) {
      await field.fill("10001");
    }
  }
};

const fillStripeCard = async (page: Page, card: string) => {
  const stripeFrame = await findStripeCardFrame(page);

  // Wait for card number input to be ready
  const cardNumberInput = stripeFrame
    .locator('input[name="number"], input[autocomplete="cc-number"]')
    .first();
  await cardNumberInput.waitFor({ state: "visible", timeout: 15000 });

  // Fill in card details
  await cardNumberInput.fill(card);
  await stripeFrame
    .locator('input[name="expiry"], input[autocomplete="cc-exp"]')
    .first()
    .fill("1234");
  await stripeFrame
    .locator('input[name="cvc"], input[autocomplete="cc-csc"]')
    .first()
    .fill("123");
  await fillStripeBillingDetails(stripeFrame);
};

const createShop = async (page: Page) => {
  const slug = `hello-shop-${randomUUID()}`;

  await page.context().clearCookies();
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

    await fillStripeCard(page, "4000000000000002");
    await page.getByRole("button", { name: "Pay now" }).click();

    await expect(async () => {
      const retryVisible = await page
        .getByRole("button", { name: "Pay again" })
        .isVisible()
        .catch(() => false);
      const paymentErrorVisible = await page
        .locator(
          "text=/Payment failed\\.|Payment requires additional confirmation\\.|declined/i"
        )
        .first()
        .isVisible()
        .catch(() => false);

      expect(retryVisible || paymentErrorVisible).toBe(true);
    }).toPass({ timeout: 20000 });
  });
});
