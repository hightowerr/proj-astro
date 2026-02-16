"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { shopPolicies } from "@/lib/schema";
import { requireAuth } from "@/lib/session";

const tierSettingsSchema = z.object({
  shopId: z.string().uuid(),
  riskDepositAmountCents: z.number().int().positive().nullable(),
  topDepositWaived: z.boolean(),
  topDepositAmountCents: z.number().int().positive().nullable(),
  excludeRiskFromOffers: z.boolean(),
});

const parseNullablePositiveCents = (
  value: FormDataEntryValue | null,
  fieldLabel: string
) => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldLabel} must be a positive whole number`);
  }

  return parsed;
};

export async function updateShopPolicyTierSettings(
  shopId: string,
  formData: FormData
) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop || shop.id !== shopId) {
    throw new Error("Unauthorized");
  }

  const policy = await db.query.shopPolicies.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.shopId, shopId),
  });

  if (!policy) {
    throw new Error("Policy not found");
  }

  const riskDepositAmountCents = parseNullablePositiveCents(
    formData.get("riskDepositAmountCents"),
    "Risk deposit amount"
  );
  const topDepositAmountCents = parseNullablePositiveCents(
    formData.get("topDepositAmountCents"),
    "Top tier deposit amount"
  );
  const topDepositWaived = formData.get("topDepositWaived") === "on";
  const excludeRiskFromOffers = formData.get("excludeRiskFromOffers") === "on";

  if (
    !topDepositWaived &&
    topDepositAmountCents !== null &&
    policy.depositAmountCents !== null &&
    topDepositAmountCents >= policy.depositAmountCents
  ) {
    throw new Error("Top tier deposit amount must be less than the base deposit amount");
  }

  const parsed = tierSettingsSchema.safeParse({
    shopId,
    riskDepositAmountCents,
    topDepositWaived,
    topDepositAmountCents,
    excludeRiskFromOffers,
  });

  if (!parsed.success) {
    throw new Error("Invalid tier settings");
  }

  await db
    .update(shopPolicies)
    .set({
      riskDepositAmountCents: parsed.data.riskDepositAmountCents,
      topDepositWaived: parsed.data.topDepositWaived,
      topDepositAmountCents: parsed.data.topDepositWaived
        ? null
        : parsed.data.topDepositAmountCents,
      excludeRiskFromOffers: parsed.data.excludeRiskFromOffers,
    })
    .where(eq(shopPolicies.shopId, parsed.data.shopId));

  revalidatePath("/app/settings/payment-policy");
}
