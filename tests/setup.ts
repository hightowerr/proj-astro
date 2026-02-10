/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    // Hide Next.js dev overlay to prevent it from blocking clicks
    await page.addInitScript(() => {
      // Hide the dev overlay portal
      const style = document.createElement("style");
      style.textContent = `
        nextjs-portal { display: none !important; }
        [data-nextjs-dev-overlay] { display: none !important; }
      `;
      document.head.appendChild(style);
    });

    await use(page);
  },
});

export { expect } from "@playwright/test";
