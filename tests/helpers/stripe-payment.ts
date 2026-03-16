import { expect, type Locator, type Page } from "@playwright/test";

const STRIPE_IFRAME_SELECTOR =
  'iframe[src*="js.stripe.com"], iframe[title*="Secure payment input frame"], iframe[name^="__privateStripeFrame"]';

const CARD_TAB_SELECTORS = ['[role="tab"]:has-text("Card")', 'button:has-text("Card")'];
const CARD_NUMBER_SELECTORS = [
  'input[name="number"]',
  'input[name="cardNumber"]',
  'input[autocomplete="cc-number"]',
  'input[data-elements-stable-field-name="cardNumber"]',
  'input[aria-label*="card number" i]',
  'input[placeholder*="1234"]',
];
const EXPIRY_SELECTORS = [
  'input[name="expiry"]',
  'input[name="cardExpiry"]',
  'input[autocomplete="cc-exp"]',
  'input[data-elements-stable-field-name="cardExpiry"]',
  'input[aria-label*="expiration" i]',
];
const CVC_SELECTORS = [
  'input[name="cvc"]',
  'input[name="cardCvc"]',
  'input[autocomplete="cc-csc"]',
  'input[data-elements-stable-field-name="cardCvc"]',
  'input[aria-label*="security code" i]',
  'input[aria-label*="cvc" i]',
];
const COUNTRY_SELECTORS = ['select[name="country"]', 'select[autocomplete="country"]'];
const POSTAL_SELECTORS = ['input[name="postalCode"]', 'input[autocomplete="postal-code"]'];

const isVisible = async (locator: Locator) => {
  return await locator.isVisible({ timeout: 250 }).catch(() => false);
};

async function findVisibleField(
  page: Page,
  selectors: string[],
  timeoutMs: number
): Promise<{ frameIndex: number; selector: string }> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const frames = page.frames();

    for (let index = 0; index < frames.length; index += 1) {
      const frame = frames[index];
      if (!frame) {
        continue;
      }

      for (const selector of selectors) {
        const locator = frame.locator(selector).first();
        if (await isVisible(locator)) {
          return { frameIndex: index, selector };
        }
      }
    }

    await page.waitForTimeout(200);
  }

  const frameDebug = page.frames().map((frame) => frame.url() || "about:blank").join("\n");
  throw new Error(`Stripe payment field not found for selectors: ${selectors.join(", ")}\n${frameDebug}`);
}

async function clickCardTabIfPresent(page: Page) {
  const frames = page.frames();
  for (const frame of frames) {
    for (const selector of CARD_TAB_SELECTORS) {
      const tab = frame.locator(selector).first();
      if (!(await isVisible(tab))) {
        continue;
      }

      const isSelected = await tab.getAttribute("aria-selected").catch(() => null);
      if (isSelected === "true") {
        return;
      }

      await tab.click().catch(() => undefined);
      return;
    }
  }
}

async function waitForStripeElement(page: Page, timeoutMs: number) {
  await expect(async () => {
    const unavailable = await page
      .getByRole("heading", { name: /payment unavailable/i })
      .isVisible()
      .catch(() => false);
    if (unavailable) {
      throw new Error("Stripe payment UI is unavailable (missing Stripe setup).");
    }

    const stripeFrameCount = await page.locator(STRIPE_IFRAME_SELECTOR).count();
    if (stripeFrameCount === 0) {
      throw new Error("Stripe iframe not mounted yet.");
    }
  }).toPass({ timeout: timeoutMs });
}

async function waitForPaymentUi(page: Page, timeoutMs: number): Promise<"mock" | "stripe"> {
  await expect(async () => {
    const unavailable = await page
      .getByRole("heading", { name: /payment unavailable/i })
      .isVisible()
      .catch(() => false);
    if (unavailable) {
      throw new Error("Stripe payment UI is unavailable (missing Stripe setup).");
    }

    const mockVisible = await page.locator("#playwright-card-number").isVisible().catch(() => false);
    if (mockVisible) {
      return;
    }

    const stripeFrameCount = await page.locator(STRIPE_IFRAME_SELECTOR).count();
    if (stripeFrameCount > 0) {
      return;
    }

    throw new Error("Payment UI not mounted yet.");
  }).toPass({ timeout: timeoutMs });

  const mockVisible = await page.locator("#playwright-card-number").isVisible().catch(() => false);
  return mockVisible ? "mock" : "stripe";
}

async function fillOptionalSelect(page: Page, selectors: string[], labelMatcher: RegExp, fallback: string) {
  try {
    const { frameIndex, selector } = await findVisibleField(page, selectors, 3000);
    const field = page.frames()[frameIndex]?.locator(selector).first();
    if (!field) return;

    const optionLabels = await field.locator("option").allTextContents();
    const matchedLabel = optionLabels.find((optionLabel) => labelMatcher.test(optionLabel));
    if (matchedLabel) {
      await field.selectOption({ label: matchedLabel }).catch(() => undefined);
    } else {
      await field.selectOption(fallback).catch(() => undefined);
    }
  } catch {
    // Optional for many Stripe test setups.
  }
}

async function fillOptionalInput(page: Page, selectors: string[], value: string) {
  try {
    const { frameIndex, selector } = await findVisibleField(page, selectors, 3000);
    const field = page.frames()[frameIndex]?.locator(selector).first();
    if (!field) return;
    await field.fill(value);
  } catch {
    // Optional for many Stripe test setups.
  }
}

export async function fillStripeCard(page: Page, cardNumber: string, timeoutMs = 45000) {
  const mode = await waitForPaymentUi(page, timeoutMs);

  if (mode === "mock") {
    const mockCardInput = page.locator("#playwright-card-number");
    await mockCardInput.fill(cardNumber);
    const mockExpiry = page.locator("#playwright-card-expiry");
    if (await mockExpiry.isVisible().catch(() => false)) {
      await mockExpiry.fill("12 / 34");
    }
    const mockCvc = page.locator("#playwright-card-cvc");
    if (await mockCvc.isVisible().catch(() => false)) {
      await mockCvc.fill("123");
    }
    await expect(page.getByRole("button", { name: /pay now|pay again/i })).toBeEnabled({
      timeout: 5000,
    });
    return;
  }

  await waitForStripeElement(page, timeoutMs);
  await clickCardTabIfPresent(page);

  const cardField = await findVisibleField(page, CARD_NUMBER_SELECTORS, timeoutMs);
  await page.frames()[cardField.frameIndex]?.locator(cardField.selector).first().fill(cardNumber);

  const expiryField = await findVisibleField(page, EXPIRY_SELECTORS, 15000);
  await page.frames()[expiryField.frameIndex]?.locator(expiryField.selector).first().fill("12 / 34");

  const cvcField = await findVisibleField(page, CVC_SELECTORS, 15000);
  await page.frames()[cvcField.frameIndex]?.locator(cvcField.selector).first().fill("123");

  await fillOptionalSelect(page, COUNTRY_SELECTORS, /united states/i, "US");
  await fillOptionalInput(page, POSTAL_SELECTORS, "10001");

  await expect(page.getByRole("button", { name: /pay now|pay again/i })).toBeEnabled({
    timeout: 15000,
  });
}
