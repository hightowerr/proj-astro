import { expect, type Page } from "@playwright/test";

type CompleteShopOnboardingInput = {
  slug: string;
  shopName?: string;
  businessTypeLabel?: string;
};

export async function completeShopOnboarding(
  page: Page,
  { slug, shopName = "Hello Shop", businessTypeLabel = "Hair" }: CompleteShopOnboardingInput
) {
  const businessTypeHeading = page.getByRole("heading", {
    name: /what type of business do you run/i,
  });

  if (await businessTypeHeading.isVisible().catch(() => false)) {
    const businessTypeButton = page.getByRole("button", { name: businessTypeLabel, exact: true });
    const nextButton = page.getByRole("button", { name: /^Next$/ });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await businessTypeButton.click();

      const pressed = await businessTypeButton.getAttribute("aria-pressed");
      if (pressed === "true") {
        break;
      }

      await page.waitForTimeout(250);
    }

    await expect(businessTypeButton).toHaveAttribute("aria-pressed", "true");
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
  }

  const shopNameInput = page.getByLabel("Shop name");
  if (await shopNameInput.isVisible().catch(() => false)) {
    await shopNameInput.fill(shopName);
    await page.getByLabel("Shop URL slug").fill(slug);
    await page.getByRole("button", { name: /Create( Shop)?/ }).click();
  }

  const addServiceHeading = page.getByRole("heading", {
    name: /add your first service/i,
  });
  const bookingLink = page.getByRole("link", { name: `/book/${slug}` });

  await expect(async () => {
    const step3Visible = await addServiceHeading.isVisible().catch(() => false);
    const bookingLinkVisible = await bookingLink.isVisible().catch(() => false);
    expect(step3Visible || bookingLinkVisible).toBe(true);
  }).toPass({ timeout: 15000 });

  if (await addServiceHeading.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /skip for now/i }).click();
  }

  await expect(page).toHaveURL(/\/app(\/dashboard)?/, { timeout: 15000 });
  await expect(bookingLink).toBeVisible({ timeout: 15000 });
}
