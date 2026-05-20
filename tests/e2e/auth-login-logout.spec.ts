import { randomUUID } from "node:crypto";
import { test, expect } from "../setup";

const strongPassword = "Password123!";

const registerUser = async (
  page: import("@playwright/test").Page,
  email: string
) => {
  await page.goto("/register");
  await page.getByLabel("Name").fill("Login Test User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(strongPassword);
  await page
    .getByLabel("Confirm Password", { exact: true })
    .fill(strongPassword);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
};

test.describe("Login and logout flow", () => {
  let email: string;

  test.beforeAll(async ({ browser }) => {
    email = `login_${randomUUID().slice(0, 8)}@example.com`;
    const context = await browser.newContext();
    const page = await context.newPage();
    await registerUser(page, email);
    await context.close();
  });

  test("logs in with valid credentials", async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto("/login");

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(strongPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
  });

  test("shows error for wrong password", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("WrongPassword123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
  });

  test("redirects already-authenticated user from /login to /app", async ({
    page,
  }) => {
    test.setTimeout(30_000);
    // First log in
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(strongPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

    // Visit /login again — should redirect
    await page.goto("/login");
    await expect(page).toHaveURL(/\/app/, { timeout: 10000 });
  });

  test("has a link to registration page", async ({ page }) => {
    await page.goto("/login");

    const registerLink = page.getByRole("link", { name: /create an account/i });
    await expect(registerLink).toBeVisible();
    await registerLink.click();

    await expect(page).toHaveURL(/\/register/);
  });

  test("has a link to forgot password page", async ({ page }) => {
    await page.goto("/login");

    const forgotLink = page.getByRole("link", { name: /forgot password/i });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();

    await expect(page).toHaveURL(/\/forgot-password/);
  });
});
