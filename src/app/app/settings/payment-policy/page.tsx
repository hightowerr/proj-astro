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
      <div style={{ minHeight: '100vh', background: 'var(--al-surface)', fontFamily: 'var(--al-font)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 48px' }}>
          <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--al-primary)', lineHeight: 1.0, margin: '0 0 10px' }}>
            Payment policy
          </h1>
          <p style={{ fontSize: 14, color: 'var(--al-on-surface-variant)', lineHeight: 1.55, margin: 0 }}>
            Create your shop to configure payment policies.
          </p>
        </div>
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
    <div style={{ minHeight: '100vh', background: 'var(--al-surface)', fontFamily: 'var(--al-font)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 48px' }}>

        {/* Breadcrumb topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--al-on-surface-variant)', opacity: 0.65 }}>
            <span>Studio</span>
            <span style={{ opacity: 0.4 }}>/</span>
            <span>Settings</span>
            <span style={{ opacity: 0.4 }}>/</span>
            <span style={{ color: 'var(--al-primary)' }}>Payment Policy</span>
          </div>
          <button
            type="button"
            style={{
              padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(195,198,209,.4)',
              background: '#fff', fontFamily: 'var(--al-font)', fontWeight: 600, fontSize: 13,
              color: 'var(--al-on-surface-variant)', display: 'inline-flex', alignItems: 'center',
              gap: 6, cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>history</span>
            Audit log
          </button>
        </div>

        {/* Page header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--al-on-surface-variant)', opacity: 0.55, marginBottom: 8 }}>
            Settings &middot; /app/settings/payment-policy
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--al-primary)', lineHeight: 1.0, margin: '0 0 10px' }}>
            Payment policy
          </h1>
          <p style={{ fontSize: 14, color: 'var(--al-on-surface-variant)', maxWidth: '62ch', lineHeight: 1.55, margin: 0 }}>
            Control whether bookings require a deposit or full prepayment.
            Two sections, each saves independently — base policy first, tier-based overrides below.
          </p>
        </div>

        {/* Form sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
    bg: 'rgba(14,122,85,0.10)',
    fg: '#0e7a55',
    dot: '#0e7a55',
    title: 'Top tier',
    rule: 'Score \u2265 80 and no voids in 90 days',
    note: 'Reliable customers \u2014 bookings rarely require follow-up.',
  },
  {
    key: 'neutral',
    label: 'Neutral',
    bg: '#eeeeec',
    fg: '#43474f',
    dot: '#737780',
    title: 'Neutral tier',
    rule: 'Default tier for customers with moderate history',
    note: 'Mixed record; not enough signal to push to either edge.',
  },
  {
    key: 'risk',
    label: 'Risk',
    bg: 'rgba(168,41,74,0.10)',
    fg: '#a8294a',
    dot: '#a8294a',
    title: 'Risk tier',
    rule: 'Score < 40 or two or more voids in 90 days',
    note: 'Consider requiring a deposit before confirming bookings.',
  },
] as const;

function TiersExplainerCard() {
  return (
    <div style={{
      background: '#fff', borderRadius: 24, padding: '28px 28px 24px',
      boxShadow: '0 20px 40px rgba(26,28,27,0.04)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        gap: 16, flexWrap: 'wrap' as const,
        paddingBottom: 18, borderBottom: '1px solid rgba(195,198,209,.20)', marginBottom: 20,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#43474f', opacity: 0.55 }}>Reference</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#001e40', marginTop: 4 }}>How tiers work</div>
        </div>
        <Link href="/app/customers" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 12, fontWeight: 700, color: '#001e40', textDecoration: 'none',
          padding: '8px 12px', borderRadius: 9999,
          background: 'rgba(0,30,64,0.05)', border: '1px solid rgba(0,30,64,0.15)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>groups</span>
          See live distribution on the Customers page
          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>arrow_outward</span>
        </Link>
      </div>

      {/* 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {TIER_DEFINITIONS.map((t) => (
          <div key={t.key} style={{
            padding: '18px 18px', background: '#f9f9f7',
            border: '1px solid rgba(195,198,209,.30)', borderRadius: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              {/* Tier badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 11px', borderRadius: 9999,
                background: t.bg, color: t.fg,
                fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' as const, lineHeight: 1,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 9999, background: t.dot }} />
                {t.label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#001e40', letterSpacing: '-0.015em' }}>{t.title}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#43474f', lineHeight: 1.5, marginBottom: 6 }}>{t.rule}</div>
            <div style={{ fontSize: 12, color: '#43474f', opacity: 0.78, lineHeight: 1.5 }}>{t.note}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 18, paddingTop: 14,
        borderTop: '1px solid rgba(195,198,209,.20)',
        fontSize: 11, color: '#43474f', opacity: 0.75,
        display: 'inline-flex', alignItems: 'center', gap: 8,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>schedule</span>
        Tier assignments are recomputed nightly from booking outcomes over the last 180 days.
      </div>
    </div>
  );
}
