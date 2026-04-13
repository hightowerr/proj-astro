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
  const businessTypeButton = page.getByRole("button", {
    name: businessTypeLabel,
    exact: true,
  });
  const nextButton = page.getByRole("button", { name: /^(Next|Continue)$/i });
  const shopNameInput = page.getByLabel("Shop name");
  const shopSlugInput = page.getByLabel("Shop URL slug");
  const createShopButton = page.getByRole("button", { name: /Create( Shop)?/ });
  const addServiceHeading = page.getByRole("heading", {
    name: /add your first service/i,
  });
  const skipForNowButton = page.getByRole("button", { name: /skip for now/i });
  const publicBookingLinkLabel = page.getByText(/public booking link/i);
  const openBookingPageLink = page.getByRole("link", { name: /open booking page/i });

  await expect(async () => {
    const visibleStates = await Promise.all([
      businessTypeHeading.isVisible(),
      shopNameInput.isVisible(),
      addServiceHeading.isVisible(),
      publicBookingLinkLabel.isVisible(),
      openBookingPageLink.isVisible(),
    ]);
    expect(visibleStates.some(Boolean)).toBe(true);
  }).toPass({ timeout: 15000 });

  if (await businessTypeHeading.isVisible().catch(() => false)) {
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
    await expect(shopNameInput).toBeVisible({ timeout: 15000 });
  }

  if (await shopNameInput.isVisible().catch(() => false)) {
    await shopNameInput.fill(shopName);
    await shopSlugInput.fill(slug);
    await createShopButton.click();
    await expect(addServiceHeading).toBeVisible({ timeout: 15000 });
  }

  if (await addServiceHeading.isVisible().catch(() => false)) {
    await skipForNowButton.click();
  }

  await expect(page).toHaveURL(/\/app(\/dashboard)?/, { timeout: 15000 });
  await expect(async () => {
    const bookingUrlVisible = await publicBookingLinkLabel.isVisible().catch(() => false);
    const openBookingPageVisible = await openBookingPageLink.isVisible().catch(() => false);
    expect(bookingUrlVisible || openBookingPageVisible).toBe(true);
  }).toPass({ timeout: 15000 });
}
