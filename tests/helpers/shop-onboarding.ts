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
    await page.getByRole("button", { name: businessTypeLabel }).click();
    await page.getByRole("button", { name: /^Next$/ }).click();
  }

  await page.getByLabel("Shop name").fill(shopName);
  await page.getByLabel("Shop URL slug").fill(slug);
  await page.getByRole("button", { name: /Create( Shop)?/ }).click();

  await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
  await expect(page.getByRole("link", { name: `/book/${slug}` })).toBeVisible({
    timeout: 15000,
  });
}
