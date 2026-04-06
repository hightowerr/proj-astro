import { randomUUID } from "node:crypto";
import { completeShopOnboarding } from "../helpers/shop-onboarding";
import { fillStripeCard } from "../helpers/stripe-payment";
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

  await completeShopOnboarding(page, { slug });

  return slug;
};

test.describe("Payment Flow", () => {
  test.setTimeout(90_000);

  test("customer can book with payment", async ({ page }) => {
    const slug = await createShop(page);

    await page.goto(`/book/${slug}`);
    await expect(page.getByText(`Book with Hello Shop`)).toBeVisible();

    const dateStr = nextWeekdayUtc();
    await page.locator('#booking-date').evaluate((input, value) => {
      const element = input as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      valueSetter?.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, dateStr);

    const firstSlot = page.locator("[data-booking-slot]").first();
    await expect(firstSlot).toBeVisible();
    await firstSlot.click();

    await page.getByLabel("Full name").fill("Test Customer");
    await page.getByLabel("Phone").fill("+12025551234");
    await page.getByRole("textbox", { name: "Email" }).fill("test@example.com");
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
    await page.locator('#booking-date').evaluate((input, value) => {
      const element = input as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      valueSetter?.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, dateStr);

    const firstSlot = page.locator("[data-booking-slot]").first();
    await expect(firstSlot).toBeVisible();
    await firstSlot.click();

    await page.getByLabel("Full name").fill("Failing Customer");
    await page.getByLabel("Phone").fill("+12025551235");
    await page.getByRole("textbox", { name: "Email" }).fill("fail@example.com");
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
