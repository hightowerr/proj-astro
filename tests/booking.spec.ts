import { randomUUID } from "node:crypto";
import { test, expect } from "./setup";

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

test("customer books a slot and business sees it", async ({ page }) => {
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

  const dateStr = nextWeekdayUtc();
  await page.locator('#booking-date').fill(dateStr);

  const firstSlot = page.locator("[data-booking-slot]").first();
  await expect(firstSlot).toBeVisible();
  await firstSlot.click();
  await expect(firstSlot).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Full name").fill("Jamie Customer");
  await page.getByLabel("Phone").fill("+12025550123");
  await page.getByLabel("Email").fill("jamie@example.com");
  await page.getByRole("button", { name: "Confirm booking" }).click();

  // Wait for Payment Element to fully load
  await expect
    .poll(
      () =>
        page.frames().find((frame) => frame.url().includes("elements-inner-payment")),
      { timeout: 10000 }
    )
    .toBeTruthy();

  // Find the Stripe payment iframe
  const stripeFrame = page
    .frames()
    .find((frame) => frame.url().includes("elements-inner-payment"));

  if (!stripeFrame) {
    throw new Error("Stripe payment frame not found");
  }

  // Wait for card number input to be ready
  const cardNumberInput = stripeFrame.locator('input[name="number"]');
  await cardNumberInput.waitFor({ state: 'visible', timeout: 15000 });

  // Fill in card details
  await cardNumberInput.fill("4242424242424242");
  await stripeFrame.locator('input[name="expiry"]').fill("1234");
  await stripeFrame.locator('input[name="cvc"]').fill("123");

  // Fill postal code if visible
  const postalInput = stripeFrame.locator('input[name="postalCode"]');
  if (await postalInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await postalInput.fill("SW1A 1AA");
  }

  await page.getByRole("button", { name: "Pay now" }).click();

  await expect(
    page.getByRole("heading", { name: "Booking confirmed" })
  ).toBeVisible({ timeout: 20000 });

  await page.goto("/app/appointments");
  await expect(page.getByText("Jamie Customer")).toBeVisible();
});
