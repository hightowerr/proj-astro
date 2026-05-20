import { randomUUID } from "node:crypto";
import { test, expect } from "../setup";

test.describe("Password reset flow", () => {
  test("forgot password form accepts email and shows success", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await expect(
      page.getByRole("heading", { name: /reset your password/i })
    ).toBeVisible();

    await page
      .getByLabel("Email")
      .fill(`reset_${randomUUID().slice(0, 8)}@example.com`);
    await page.getByRole("button", { name: /send|reset|submit/i }).click();

    // Should show a success message or confirmation
    await expect(
      page.getByText(/sent|check your (email|inbox)|reset link/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test("reset-password page shows error for missing token", async ({
    page,
  }) => {
    // Visit reset-password without a token
    await page.goto("/reset-password");

    // Should show an error or redirect since there's no token
    await expect(
      page
        .getByText(/invalid|expired|missing|token/i)
        .or(page.locator("text=/login/i"))
    ).toBeVisible({ timeout: 10000 });
  });
});
