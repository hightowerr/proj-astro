"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  createShop as createShopRecord,
  getShopByOwnerId,
  getShopBySlug,
} from "@/lib/queries/shops";

const businessTypeSchema = z.enum([
  "beauty",
  "hair",
  "spa-massage",
  "health-clinic",
  "personal-trainer",
  "general-services",
]);

const createShopPayloadSchema = z.object({
  businessType: businessTypeSchema,
  shopName: z.string().trim().min(2, "Shop name must be at least 2 characters"),
  shopSlug: z.string().trim().min(3, "Shop URL slug must be at least 3 characters"),
});

const normalizeSlug = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
};

export async function createShop(input: {
  businessType: string;
  shopName: string;
  shopSlug: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const parsed = createShopPayloadSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid shop setup details");
  }

  const normalizedSlug = normalizeSlug(parsed.data.shopSlug);
  if (normalizedSlug.length < 3) {
    throw new Error("Shop URL slug must include at least 3 valid characters");
  }

  const existingShop = await getShopByOwnerId(session.user.id);
  if (existingShop) {
    return { shopId: existingShop.id };
  }

  const slugConflict = await getShopBySlug(normalizedSlug);
  if (slugConflict && slugConflict.ownerUserId !== session.user.id) {
    throw new Error("This shop URL is already taken");
  }

  const shop = await createShopRecord({
    ownerUserId: session.user.id,
    name: parsed.data.shopName,
    slug: normalizedSlug,
    businessType: parsed.data.businessType,
  });

  return { shopId: shop.id };
}
