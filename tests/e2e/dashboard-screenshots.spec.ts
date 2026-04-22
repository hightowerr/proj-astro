import { randomUUID } from "node:crypto";
import { db } from "../../src/lib/db";
import { account, bookingSettings, shops, user } from "../../src/lib/schema";
import { eq } from "drizzle-orm";
import { test, expect } from "../setup";

const shouldRun = Boolean(process.env.POSTGRES_URL);

async function hashPasswordForAuth(password: string): Promise<string> {
  const { hashPassword } = await import("better-auth/crypto");
  return hashPassword(password);
}

test.describe("Dashboard design screenshots", () => {
  test.skip(!shouldRun, "Requires POSTGRES_URL");
  test.setTimeout(120_000);

  test("app/dashboard — authenticated with shop", async ({ page }) => {
    const userId = randomUUID();
    const email = `screenshot_${randomUUID()}@example.com`;
    const password = "Screenshot123!";
    const hashedPassword = await hashPasswordForAuth(password);

    await db.insert(user).values({
      id: userId,
      name: "OO",
      email,
      emailVerified: true,
    });

    await db.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [shop] = await db
      .insert(shops)
      .values({
        ownerUserId: userId,
        name: "CUTO",
        slug: `cuto-${randomUUID()}`,
        status: "active",
      })
      .returning();

    if (!shop) throw new Error("Failed to create shop");

    await db.insert(bookingSettings).values({
      shopId: shop.id,
      slotMinutes: 60,
      timezone: "Europe/London",
    });

    try {
      const response = await page.request.post("/api/auth/sign-in/email", {
        data: { email, password, callbackURL: "/app/dashboard" },
        headers: { "Content-Type": "application/json" },
      });
      expect(response.ok()).toBeTruthy();

      await page.goto("/app/dashboard");
      await expect(
        page.getByRole("heading", { name: /^dashboard$/i })
      ).toBeVisible({ timeout: 30_000 });

      // Full page screenshot
      await page.screenshot({
        path: "screenshots/app-dashboard-current.png",
        fullPage: true,
      });

      // Also capture just the viewport (sidebar + above fold)
      await page.screenshot({
        path: "screenshots/app-dashboard-viewport.png",
        fullPage: false,
      });
    } finally {
      await db.delete(account).where(eq(account.userId, userId));
      await db.delete(bookingSettings).where(eq(bookingSettings.shopId, shop.id));
      await db.delete(shops).where(eq(shops.id, shop.id));
      await db.delete(user).where(eq(user.id, userId));
    }
  });
});
