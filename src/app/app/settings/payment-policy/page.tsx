import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PaymentPolicyForm } from "@/components/payments/payment-policy-form";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { shopPolicies } from "@/lib/schema";
import { requireAuth } from "@/lib/session";

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
    <div className="container mx-auto px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Payment policy</h1>
        <p className="text-sm text-muted-foreground">
          Control whether bookings require a deposit or full prepay.
        </p>
      </header>

      <PaymentPolicyForm
        action={updatePolicy}
        initial={{
          currency: policy?.currency ?? DEFAULT_POLICY.currency,
          paymentMode: policy?.paymentMode ?? DEFAULT_POLICY.paymentMode,
          depositAmountCents:
            policy?.depositAmountCents ?? DEFAULT_POLICY.depositAmountCents,
        }}
      />
    </div>
  );
}
