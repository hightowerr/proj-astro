import { randomUUID } from "node:crypto";
import { completeShopOnboarding } from "./helpers/shop-onboarding";
import { fillStripeCard } from "./helpers/stripe-payment";
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

const openBookingPage = async (page: Page, slug: string) => {
  const bookingHeading = page.getByRole("heading", {
    name: "Book with Hello Shop",
  });
  const errorHeading = page.getByRole("heading", {
    name: "Something went wrong",
  });

  await expect(async () => {
    await page.goto(`/book/${slug}`);

    const ready = await bookingHeading.isVisible().catch(() => false);
    if (ready) {
      return;
    }

    const hasError = await errorHeading.isVisible().catch(() => false);
    if (hasError) {
      const tryAgainButton = page.getByRole("button", { name: "Try again" });
      if (await tryAgainButton.isVisible().catch(() => false)) {
        await tryAgainButton.click();
      } else {
        await page.reload();
      }
    }

    expect(await bookingHeading.isVisible().catch(() => false)).toBe(true);
  }).toPass({ timeout: 20000 });
};

test("customer books a slot and business sees it", async ({ page }) => {
  test.setTimeout(60_000);
  const slug = `hello-shop-${randomUUID()}`;

  await page.context().clearCookies();
  await page.goto("/register");
  await page.getByLabel("Name").fill("Test User");
  await page.getByLabel("Email").fill(makeEmail());
  await page.getByLabel("Password", { exact: true }).fill(strongPassword);
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill(strongPassword);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

  await completeShopOnboarding(page, { slug });

  await openBookingPage(page, slug);

  let dateStr = nextWeekdayUtc();
  const firstSlot = page.locator("[data-booking-slot]").first();
  let hasSlot = false;

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const availabilityResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === "GET" &&
        url.pathname === "/api/availability" &&
        url.searchParams.get("shop") === slug &&
        url.searchParams.get("date") === dateStr
      );
    });

    await page.locator("#booking-date").fill(dateStr);
    await availabilityResponse;

    await page
      .getByText(/^Loading slots/)
      .waitFor({ state: "hidden", timeout: 10000 })
      .catch(() => undefined);

    hasSlot = await firstSlot
      .isVisible({ timeout: 8000 })
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
  await page.getByRole("textbox", { name: "Email" }).fill("jamie@example.com");
  await page.getByRole("button", { name: "Confirm booking" }).click();

  await fillStripeCard(page, "4242424242424242");

  await page.getByRole("button", { name: "Pay now" }).click();

  await expect(async () => {
    const bookingConfirmedVisible = await page
      .getByRole("heading", { name: "Booking confirmed" })
      .isVisible()
      .catch(() => false);
    const payAgainVisible = await page
      .getByRole("button", { name: "Pay again" })
      .isVisible()
      .catch(() => false);

    expect(bookingConfirmedVisible || payAgainVisible).toBe(true);
  }).toPass({ timeout: 20000 });

  await page.goto("/app/appointments");
  await expect(page.getByText("Jamie Customer")).toBeVisible();
});
