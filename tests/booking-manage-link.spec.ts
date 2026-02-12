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

const shouldRun = Boolean(process.env.POSTGRES_URL);

test.describe("Booking manage link", () => {
  test.skip(!shouldRun, "POSTGRES_URL not set");

  test("booking confirmation shows manage link", async ({ page }) => {
    const { db } = await import("../src/lib/db");
    const { shopPolicies } = await import("../src/lib/schema");

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
        paymentMode: "none",
        depositAmountCents: null,
      })
      .onConflictDoUpdate({
        target: shopPolicies.shopId,
        set: {
          currency: "USD",
          paymentMode: "none",
          depositAmountCents: null,
        },
      });

    await page.goto(`/book/${slug}`);
    await expect(page.getByText("Book with Hello Shop")).toBeVisible();

    const dateStr = nextWeekdayUtc();
    await page.locator("#booking-date").fill(dateStr);

    const firstSlot = page.locator("[data-booking-slot]").first();
    await expect(firstSlot).toBeVisible();
    await firstSlot.click();
    await expect(firstSlot).toHaveAttribute("aria-pressed", "true");

    await page.getByLabel("Full name").fill("Jamie Customer");
    await page.getByLabel("Phone").fill("+12025550123");
    await page.getByLabel("Email").fill("jamie@example.com");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(
      page.getByRole("heading", { name: "Booking confirmed" })
    ).toBeVisible({ timeout: 20000 });

    const manageHeading = page.getByRole("heading", {
      name: /manage your booking/i,
    });
    await expect(manageHeading).toBeVisible();

    const manageLink = page.getByRole("link", { name: "Manage booking" });
    await expect(manageLink).toBeVisible();
    const href = await manageLink.getAttribute("href");
    expect(href).toMatch(/^\/manage\/[0-9a-f]{64}$/);

    await expect(
      page.getByText("Save this link", { exact: false })
    ).toBeVisible();
  });
});
