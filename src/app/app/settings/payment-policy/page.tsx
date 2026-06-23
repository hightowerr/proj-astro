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

const getFormString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
};

export default async function PaymentPolicyPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="al-page max-w-5xl mx-auto">
        <h1 className="al-page-title">
          Payment policy
        </h1>
        <p className="al-lede">
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
      currency: getFormString(formData, "currency"),
      paymentMode: getFormString(formData, "paymentMode"),
      depositAmount: getFormString(formData, "depositAmount"),
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
    <div className="al-page">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 w-full">

        {/* Breadcrumb topbar */}
        <div className="flex items-center justify-between mb-2">
          <div className="al-eyebrow flex items-center gap-2.5 opacity-65">
            <span>Studio</span>
            <span className="opacity-40">/</span>
            <span>Settings</span>
            <span className="opacity-40">/</span>
            <span className="text-al-primary opacity-100">Payment Policy</span>
          </div>
          <button
            type="button"
            className="px-3.5 py-2.5 rounded-[10px] border border-al-outline-variant/40 bg-white font-semibold text-[13px] text-al-on-surface-variant inline-flex items-center gap-1.5 cursor-pointer font-[inherit]"
          >
            <span className="material-symbols-outlined text-[15px]">history</span>
            Audit log
          </button>
        </div>

        {/* Page header */}
        <div className="mb-3">
          <div className="al-eyebrow opacity-55 mb-2">
            Settings &middot; /app/settings/payment-policy
          </div>
          <h1 className="al-page-title mb-2.5">
            Payment policy
          </h1>
          <p className="al-lede max-w-[62ch]">
            Control whether bookings require a deposit or full prepayment.
            Two sections, each saves independently — base policy first, tier-based overrides below.
          </p>
        </div>

        {/* Form sections */}
        <div className="flex flex-col gap-6">
          <PaymentPolicyForm
            action={updatePolicy}
            initial={{
              currency: policy?.currency ?? DEFAULT_POLICY.currency,
              paymentMode: policy?.paymentMode ?? DEFAULT_POLICY.paymentMode,
              depositAmountCents:
                policy?.depositAmountCents ?? DEFAULT_POLICY.depositAmountCents,
            }}
          />
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
              currency: policy?.currency ?? 'USD',
              basePaymentMode: policy?.paymentMode ?? 'deposit',
            }}
          />

          {/* Tiers explainer card */}
          <TiersExplainerCard />
        </div>

      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tiers explainer — inline server component                                 */
/* -------------------------------------------------------------------------- */

const TIER_DEFINITIONS = [
  {
    key: 'top',
    label: 'Top',
    bg: 'var(--al-status-positive-bg)',
    fg: 'var(--al-status-positive)',
    dot: 'var(--al-status-positive)',
    title: 'Top tier',
    rule: 'Score \u2265 80 and no voids in 90 days',
    note: 'Reliable customers \u2014 bookings rarely require follow-up.',
  },
  {
    key: 'neutral',
    label: 'Neutral',
    bg: 'var(--al-surface-container)',
    fg: 'var(--al-on-surface-variant)',
    dot: 'var(--al-on-surface-variant)',
    title: 'Neutral tier',
    rule: 'Default tier for customers with moderate history',
    note: 'Mixed record; not enough signal to push to either edge.',
  },
  {
    key: 'risk',
    label: 'Risk',
    bg: 'var(--al-status-negative-bg)',
    fg: 'var(--al-status-negative)',
    dot: 'var(--al-status-negative)',
    title: 'Risk tier',
    rule: 'Score < 40 or two or more voids in 90 days',
    note: 'Consider requiring a deposit before confirming bookings.',
  },
] as const;

function TiersExplainerCard() {
  return (
    <div className="al-card p-7">
      {/* Header */}
      <div className="flex justify-between items-end gap-4 flex-wrap pb-[18px] border-b border-al-outline-variant/20 mb-5">
        <div>
          <div className="al-eyebrow opacity-55">Reference</div>
          <div className="al-section-title mt-1">How tiers work</div>
        </div>
        <Link
          href="/app/customers"
          className="inline-flex items-center gap-2 text-xs font-bold text-al-primary no-underline px-3 py-2 rounded-full bg-al-primary/5 border border-al-primary/15"
        >
          <span className="material-symbols-outlined text-[15px]">groups</span>
          See live distribution on the Customers page
          <span className="material-symbols-outlined text-sm">arrow_outward</span>
        </Link>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-[18px]">
        {TIER_DEFINITIONS.map((t) => (
          <div key={t.key} className="p-[18px] bg-al-surface border border-al-outline-variant/30 rounded-[14px]">
            <div className="flex items-center gap-3 mb-2.5">
              {/* Tier badge */}
              <span
                className="inline-flex items-center gap-1.5 px-[11px] py-1 rounded-full text-[10px] font-extrabold tracking-[0.18em] uppercase leading-none"
                style={{ background: t.bg, color: t.fg }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.dot }} />
                {t.label}
              </span>
              <span className="text-sm font-extrabold text-al-primary tracking-tight">{t.title}</span>
            </div>
            <div className="text-xs font-bold text-al-on-surface-variant leading-relaxed mb-1.5">{t.rule}</div>
            <div className="text-xs text-al-on-surface-variant opacity-[0.78] leading-relaxed">{t.note}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-[18px] pt-3.5 border-t border-al-outline-variant/20 text-[11px] text-al-on-surface-variant opacity-75 inline-flex items-center gap-2">
        <span className="material-symbols-outlined text-[13px]">schedule</span>
        Tier assignments are recomputed nightly from booking outcomes over the last 180 days.
      </div>
    </div>
  );
}
