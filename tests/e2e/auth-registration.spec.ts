import { randomUUID } from "node:crypto";
import { test, expect } from "../setup";

const makeEmail = () => `reg_${randomUUID().slice(0, 8)}@example.com`;
const strongPassword = "Password123!";

test.describe("Registration flow", () => {
  test("registers a new account and lands on /app", async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto("/register");

    await page.getByLabel("Name").fill("New User");
    await page.getByLabel("Email").fill(makeEmail());
    await page.getByLabel("Password", { exact: true }).fill(strongPassword);
    await page
      .getByLabel("Confirm Password", { exact: true })
      .fill(strongPassword);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
  });

  test("shows error for mismatched passwords", async ({ page }) => {
    await page.goto("/register");

    await page.getByLabel("Name").fill("New User");
    await page.getByLabel("Email").fill(makeEmail());
    await page.getByLabel("Password", { exact: true }).fill(strongPassword);
    await page
      .getByLabel("Confirm Password", { exact: true })
      .fill("Different123!");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText(/passwords? (don't|do not) match/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("has a link to sign in page", async ({ page }) => {
    await page.goto("/register");

    const signInLink = page.getByRole("link", { name: /sign in|log in/i });
    await expect(signInLink).toBeVisible();
    await signInLink.click();

    await expect(page).toHaveURL(/\/login/);
  });
});
