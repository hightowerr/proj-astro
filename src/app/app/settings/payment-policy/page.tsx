import { revalidatePath } from "next/cache";
import Link from "next/link";
import { z } from "zod";
import { PaymentPolicyForm } from "@/components/payments/payment-policy-form";
import { TierPolicyForm } from "@/components/payments/tier-policy-form";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { shopPolicies } from "@/lib/schema";
import { requireAuth } from "@/lib/session";
import { updateShopPolicyTierSettings } from "./actions";

const policySchema = z.object({
  currency: z.string().trim().length(3),
  paymentMode: z.enum(["deposit", "full_prepay", "none"]),
  depositAmount: z.string().optional(),
});

const DEFAULT_POLICY = {
  currency: "USD",
  paymentMode: "deposit" as const,
  depositAmountCents: 2000,
};

export default async function PaymentPolicyPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Payment policy</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to configure payment policies.
        </p>
      </div>
    );
  }

  let policy = await db.query.shopPolicies.findFirst({
    where: (table, { eq }) => eq(table.shopId, shop.id),
  });

  if (!policy) {
    const [created] = await db
      .insert(shopPolicies)
      .values({
        shopId: shop.id,
        currency: DEFAULT_POLICY.currency,
        paymentMode: DEFAULT_POLICY.paymentMode,
        depositAmountCents: DEFAULT_POLICY.depositAmountCents,
      })
      .onConflictDoNothing()
      .returning();

    if (created) {
      policy = created;
    } else {
      policy = await db.query.shopPolicies.findFirst({
        where: (table, { eq }) => eq(table.shopId, shop.id),
      });
    }
  }

  const updatePolicy = async (formData: FormData) => {
    "use server";

    const parsed = policySchema.safeParse({
      currency: formData.get("currency"),
      paymentMode: formData.get("paymentMode"),
      depositAmount: formData.get("depositAmount"),
    });

    if (!parsed.success) {
      throw new Error("Invalid policy data");
    }

    const currency = parsed.data.currency.toUpperCase();
    const paymentMode = parsed.data.paymentMode;
    let depositAmountCents: number | null = null;

    if (paymentMode !== "none") {
      const amount = Number.parseFloat(parsed.data.depositAmount ?? "");
      if (Number.isNaN(amount) || amount <= 0) {
        throw new Error("Deposit amount must be greater than 0");
      }
      depositAmountCents = Math.round(amount * 100);
    }

    await db
      .insert(shopPolicies)
      .values({
        shopId: shop.id,
        currency,
        paymentMode,
        depositAmountCents,
      })
      .onConflictDoUpdate({
        target: shopPolicies.shopId,
        set: {
          currency,
          paymentMode,
          depositAmountCents,
        },
      });

    revalidatePath("/app/settings/payment-policy");
  };

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Payment policy</h1>
        <p className="text-sm text-muted-foreground">
          Control whether bookings require a deposit or full prepay.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Base policy</h2>
        <PaymentPolicyForm
          action={updatePolicy}
          initial={{
            currency: policy?.currency ?? DEFAULT_POLICY.currency,
            paymentMode: policy?.paymentMode ?? DEFAULT_POLICY.paymentMode,
            depositAmountCents:
              policy?.depositAmountCents ?? DEFAULT_POLICY.depositAmountCents,
          }}
        />
      </section>

      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Tier-based overrides</h2>
          <p className="text-sm text-muted-foreground">
            Configure optional deposit and offer behavior overrides per reliability tier.
          </p>
        </div>

        <TierPolicyForm
          action={updateShopPolicyTierSettings.bind(null, shop.id)}
          initial={{
            riskDepositAmountCents: policy?.riskDepositAmountCents ?? null,
            topDepositWaived: policy?.topDepositWaived ?? false,
            topDepositAmountCents: policy?.topDepositAmountCents ?? null,
            excludeRiskFromOffers: policy?.excludeRiskFromOffers ?? false,
            excludeHighNoShowFromOffers:
              policy?.excludeHighNoShowFromOffers ?? false,
            baseDepositAmountCents: policy?.depositAmountCents ?? null,
          }}
        />
      </section>

      <section className="max-w-xl rounded-lg border bg-muted/30 p-4">
        <h2 className="text-sm font-medium">How tiers work</h2>
        <div className="mt-2 space-y-2 text-xs text-muted-foreground">
          <p>
            <strong>Top tier:</strong> score &ge;80 and no recent voids.
          </p>
          <p>
            <strong>Neutral tier:</strong> default tier for most customers.
          </p>
          <p>
            <strong>Risk tier:</strong> score &lt;40 or repeated recent voids.
          </p>
          <p>
            Tier assignments are computed automatically. Review customer tier distribution on the{" "}
            <Link href="/app/customers" className="underline">
              customers page
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
