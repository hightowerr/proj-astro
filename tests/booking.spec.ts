import { randomUUID } from "node:crypto";
import { test, expect } from "./setup";
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

const nextUtcDate = (dateStr: string): string => {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

const findStripeCardFrame = async (
  page: Page,
  timeoutMs = 15000
) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
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

test("customer books a slot and business sees it", async ({ page }) => {
  test.setTimeout(60_000);
  const slug = `hello-shop-${randomUUID()}`;

  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/register");
  await page.getByLabel("Name").fill("Test User");
  await page.getByLabel("Email").fill(makeEmail());
  await page.getByLabel("Password", { exact: true }).fill(strongPassword);
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill(strongPassword);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

  await page.getByLabel("Shop name").fill("Hello Shop");
  await page.getByLabel("Shop URL slug").fill(slug);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText(slug).first()).toBeVisible({ timeout: 15000 });

  await page.goto(`/book/${slug}`);
  await expect(page.getByText(`Book with Hello Shop`)).toBeVisible();

  let dateStr = nextWeekdayUtc();
  const firstSlot = page.locator("[data-booking-slot]").first();
  let hasSlot = false;

  for (let attempt = 0; attempt < 7; attempt += 1) {
    await page.locator("#booking-date").fill(dateStr);

    await page
      .getByText("Loading slots...")
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => undefined);

    hasSlot = await firstSlot
      .isVisible({ timeout: 4000 })
      .catch(() => false);

    if (hasSlot) {
      break;
    }

    dateStr = nextUtcDate(dateStr);
  }

  if (!hasSlot) {
    throw new Error("No available slot found in the next 7 days");
  }

  await firstSlot.click();
  await expect(firstSlot).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Full name").fill("Jamie Customer");
  await page.getByLabel("Phone").fill("+12025550123");
  await page.getByLabel("Email").fill("jamie@example.com");
  await page.getByRole("button", { name: "Confirm booking" }).click();

  const stripeFrame = await findStripeCardFrame(page);

  // Wait for card number input to be ready
  const cardNumberInput = stripeFrame
    .locator('input[name="number"], input[autocomplete="cc-number"]')
    .first();
  await cardNumberInput.waitFor({ state: "visible", timeout: 15000 });

  // Fill in card details
  await cardNumberInput.fill("4242424242424242");
  await stripeFrame
    .locator('input[name="expiry"], input[autocomplete="cc-exp"]')
    .first()
    .fill("1234");
  await stripeFrame
    .locator('input[name="cvc"], input[autocomplete="cc-csc"]')
    .first()
    .fill("123");
  const countrySelect = stripeFrame.locator(
    'select[name="country"], select[autocomplete="country"]'
  );
  if (await countrySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    const optionLabels = await countrySelect
      .locator("option")
      .allTextContents();
    if (optionLabels.some((label) => label.includes("United States"))) {
      await countrySelect.selectOption({ label: "United States" });
    } else {
      await countrySelect.selectOption("US").catch(() => undefined);
    }
  }

  // Fill postal code if visible
  const postalInput = stripeFrame.locator(
    'input[name="postalCode"], input[autocomplete="postal-code"]'
  );
  if (await postalInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await postalInput.fill("10001");
  }

  await page.getByRole("button", { name: "Pay now" }).click();

  await expect(
    page.getByRole("heading", { name: "Booking confirmed" })
  ).toBeVisible({ timeout: 20000 });

  await page.goto("/app/appointments");
  await expect(page.getByText("Jamie Customer")).toBeVisible();
});
