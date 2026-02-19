import { toZonedTime } from "date-fns-tz";
import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import {
  computeEndsAt,
  formatDateInTimeZone,
  generateSlotsForDate,
  getDayStartEndUtc,
  isValidSlotStart,
  parseTimeToMinutes,
} from "@/lib/booking";
import { db } from "@/lib/db";
import {
  assignNoShowRisk,
  calculateNoShowScore,
  countNoShowsLast90Days,
} from "@/lib/no-show-scoring";
import { getNoShowStats, scanAppointmentsByOutcome } from "@/lib/queries/no-show-scoring";
import { loadCustomerScoreTx } from "@/lib/queries/scoring";
import {
  appointments,
  bookingSettings,
  customerContactPrefs,
  customerNoShowStats,
  customers,
  payments,
  policyVersions,
  shopPolicies,
  shops,
  slotOpenings,
} from "@/lib/schema";
import { getStripeClient, normalizeStripePaymentStatus, stripeIsMocked } from "@/lib/stripe";
import { applyTierPricingOverride, derivePaymentRequirement } from "@/lib/tier-pricing";

const DEFAULT_PAYMENT_POLICY = {
  currency: "USD",
  paymentMode: "deposit" as const,
  depositAmountCents: 2000,
};
const DEFAULT_BOOKING_SETTINGS = {
  timezone: "UTC",
  slotMinutes: 60,
} as const;

export class SlotTakenError extends Error {
  constructor() {
    super("Slot already taken");
    this.name = "SlotTakenError";
  }
}

export class InvalidSlotError extends Error {
  constructor(message = "Invalid slot") {
    super(message);
    this.name = "InvalidSlotError";
  }
}

export class ShopClosedError extends Error {
  constructor() {
    super("Shop is closed for the selected date");
    this.name = "ShopClosedError";
  }
}

const getErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const direct = (error as { code?: string }).code;
  if (direct) return direct;
  const cause = (error as { cause?: unknown }).cause;
  return getErrorCode(cause);
};

const isUniqueViolation = (error: unknown): boolean => {
  return getErrorCode(error) === "23505";
};

export type Availability = {
  date: string;
  timezone: string;
  slotMinutes: number;
  slots: { startsAt: Date; endsAt: Date }[];
};

export type CustomerAppointmentHistoryItem = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: typeof appointments.$inferSelect.status;
  financialOutcome: typeof appointments.$inferSelect.financialOutcome;
  resolutionReason: string | null;
  createdAt: Date;
};

type BookingSettingsTx = Pick<typeof db, "query" | "insert">;

const ensureBookingSettings = async (tx: BookingSettingsTx, shopId: string) => {
  const existing = await tx.query.bookingSettings.findFirst({
    where: (table, { eq }) => eq(table.shopId, shopId),
  });
  if (existing) {
    return existing;
  }

  await tx
    .insert(bookingSettings)
    .values({
      shopId,
      timezone: DEFAULT_BOOKING_SETTINGS.timezone,
      slotMinutes: DEFAULT_BOOKING_SETTINGS.slotMinutes,
    })
    .onConflictDoNothing();

  return await tx.query.bookingSettings.findFirst({
    where: (table, { eq }) => eq(table.shopId, shopId),
  });
};

export const getBookingSettingsForShop = async (shopId: string) => {
  return await ensureBookingSettings(db, shopId);
};

export const getAvailabilityForDate = async (
  shopId: string,
  dateStr: string
): Promise<Availability> => {
  const settings = await getBookingSettingsForShop(shopId);
  if (!settings) {
    throw new Error("Booking settings not found");
  }

  const todayStr = formatDateInTimeZone(new Date(), settings.timezone);
  if (dateStr < todayStr) {
    return {
      date: dateStr,
      timezone: settings.timezone,
      slotMinutes: settings.slotMinutes,
      slots: [],
    };
  }

  const dayStartUtc = getDayStartEndUtc(dateStr, settings.timezone).start;
  const dayOfWeek = toZonedTime(dayStartUtc, settings.timezone).getDay();
  const hours = await db.query.shopHours.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.shopId, shopId), eq(table.dayOfWeek, dayOfWeek)),
  });

  if (!hours) {
    return {
      date: dateStr,
      timezone: settings.timezone,
      slotMinutes: settings.slotMinutes,
      slots: [],
    };
  }

  const slots = generateSlotsForDate({
    dateStr,
    timeZone: settings.timezone,
    slotMinutes: settings.slotMinutes,
    openTime: hours.openTime,
    closeTime: hours.closeTime,
  });

  const { start, end } = getDayStartEndUtc(dateStr, settings.timezone);
  const bookedSlots = await db
    .select({ startsAt: appointments.startsAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.shopId, shopId),
        gte(appointments.startsAt, start),
        lt(appointments.startsAt, end),
        inArray(appointments.status, ["booked", "pending"])
      )
    );

  const bookedTimes = new Set(
    bookedSlots.map((slot) => slot.startsAt.getTime())
  );

  const now = new Date();
  const isToday = dateStr === todayStr;

  return {
    date: dateStr,
    timezone: settings.timezone,
    slotMinutes: settings.slotMinutes,
    slots: slots.filter((slot) => {
      if (bookedTimes.has(slot.startsAt.getTime())) return false;
      if (!isToday) return true;
      return slot.startsAt.getTime() > now.getTime();
    }),
  };
};

/**
 * Returns a customer's recent appointments at a given shop.
 * Used on appointment detail page for risk-score explainability.
 */
export const getCustomerAppointmentHistory = async (
  customerId: string,
  shopId: string,
  limit: number = 5
): Promise<CustomerAppointmentHistoryItem[]> => {
  const boundedLimit = Math.max(1, Math.min(25, Math.floor(limit)));

  return await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      financialOutcome: appointments.financialOutcome,
      resolutionReason: appointments.resolutionReason,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.customerId, customerId),
        eq(appointments.shopId, shopId)
      )
    )
    .orderBy(desc(appointments.startsAt))
    .limit(boundedLimit);
};

export type HighRiskReminderCandidate = {
  appointmentId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  startsAt: Date;
  endsAt: Date;
  bookingUrl: string | null;
  shopName: string;
  shopTimezone: string;
};

/**
 * Finds booked high-risk appointments in the reminder window (23h..25h).
 */
export const findHighRiskAppointments = async (): Promise<
  HighRiskReminderCandidate[]
> => {
  const now = Date.now();
  const windowStart = new Date(now + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now + 25 * 60 * 60 * 1000);

  const rows = await db
    .select({
      appointmentId: appointments.id,
      shopId: appointments.shopId,
      customerId: appointments.customerId,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      bookingUrl: appointments.bookingUrl,
      shopName: shops.name,
      shopTimezone: bookingSettings.timezone,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .innerJoin(
      customerContactPrefs,
      eq(appointments.customerId, customerContactPrefs.customerId)
    )
    .innerJoin(shops, eq(appointments.shopId, shops.id))
    .leftJoin(bookingSettings, eq(appointments.shopId, bookingSettings.shopId))
    .where(
      and(
        eq(appointments.status, "booked"),
        eq(appointments.noShowRisk, "high"),
        gte(appointments.startsAt, windowStart),
        lte(appointments.startsAt, windowEnd),
        eq(customerContactPrefs.smsOptIn, true)
      )
    );

  return rows.map((row) => ({
    ...row,
    shopTimezone: row.shopTimezone ?? "UTC",
  }));
};

type DbLike = Pick<typeof db, "query" | "insert" | "update">;

const upsertCustomer = async (
  tx: DbLike,
  input: {
    shopId: string;
    fullName: string;
    phone: string;
    email: string;
  }
): Promise<typeof customers.$inferSelect> => {
  const byPhone = await tx.query.customers.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.shopId, input.shopId), eq(table.phone, input.phone)),
  });

  if (byPhone) {
    const updates: Partial<typeof customers.$inferInsert> = {};
    if (byPhone.fullName !== input.fullName) updates.fullName = input.fullName;
    if (!byPhone.email && input.email) updates.email = input.email;
    if (!byPhone.phone && input.phone) updates.phone = input.phone;

    if (Object.keys(updates).length > 0) {
      await tx.update(customers).set(updates).where(eq(customers.id, byPhone.id));
      return {
        ...byPhone,
        fullName: updates.fullName ?? byPhone.fullName,
        email: updates.email ?? byPhone.email,
        phone: updates.phone ?? byPhone.phone,
      };
    }

    return byPhone;
  }

  const byEmail = await tx.query.customers.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.shopId, input.shopId), eq(table.email, input.email)),
  });

  if (byEmail) {
    const updates: Partial<typeof customers.$inferInsert> = {};
    if (byEmail.fullName !== input.fullName) updates.fullName = input.fullName;
    if (!byEmail.email && input.email) updates.email = input.email;
    if (!byEmail.phone && input.phone) updates.phone = input.phone;

    if (Object.keys(updates).length > 0) {
      await tx.update(customers).set(updates).where(eq(customers.id, byEmail.id));
      return {
        ...byEmail,
        fullName: updates.fullName ?? byEmail.fullName,
        email: updates.email ?? byEmail.email,
        phone: updates.phone ?? byEmail.phone,
      };
    }

    return byEmail;
  }

  const [created] = await tx
    .insert(customers)
    .values({
      shopId: input.shopId,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create customer");
  }

  return created;
};

const upsertCustomerContactPrefs = async (
  tx: DbLike,
  input: {
    customerId: string;
    smsOptIn?: boolean;
  }
) => {
  if (typeof input.smsOptIn !== "boolean") {
    return null;
  }

  const existing = await tx.query.customerContactPrefs.findFirst({
    where: (table, { eq }) => eq(table.customerId, input.customerId),
  });

  if (existing) {
    await tx
      .update(customerContactPrefs)
      .set({ smsOptIn: input.smsOptIn, updatedAt: new Date() })
      .where(eq(customerContactPrefs.customerId, input.customerId));
    return { ...existing, smsOptIn: input.smsOptIn };
  }

  const [created] = await tx
    .insert(customerContactPrefs)
    .values({
      customerId: input.customerId,
      smsOptIn: input.smsOptIn,
    })
    .returning();

  return created ?? null;
};

const ensureShopPolicy = async (tx: DbLike, shopId: string) => {
  const existing = await tx.query.shopPolicies.findFirst({
    where: (table, { eq }) => eq(table.shopId, shopId),
  });

  if (existing) {
    return existing;
  }

  const [created] = await tx
    .insert(shopPolicies)
    .values({
      shopId,
      currency: DEFAULT_PAYMENT_POLICY.currency,
      paymentMode: DEFAULT_PAYMENT_POLICY.paymentMode,
      depositAmountCents: DEFAULT_PAYMENT_POLICY.depositAmountCents,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  const retry = await tx.query.shopPolicies.findFirst({
    where: (table, { eq }) => eq(table.shopId, shopId),
  });

  if (!retry) {
    throw new Error("Payment policy not found");
  }

  return retry;
};

export const updateNoShowScoreAtBooking = async (input: {
  appointmentId: string;
  customerId: string;
  shopId: string;
  startsAt: Date;
  shopTimezone: string;
  paymentRequired: boolean;
}): Promise<void> => {
  const { appointmentId, customerId, shopId, startsAt, shopTimezone, paymentRequired } = input;
  const stats = await getNoShowStats(customerId, shopId);

  if (!stats || stats.totalAppointments === 0) {
    await db
      .update(appointments)
      .set({
        noShowScore: 50,
        noShowRisk: "medium",
        noShowComputedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));
    return;
  }

  const { recencyBuckets } = await scanAppointmentsByOutcome(customerId, shopId, 180);
  const leadTimeHours = (startsAt.getTime() - Date.now()) / (1000 * 60 * 60);
  const appointmentHour = toZonedTime(startsAt, shopTimezone).getHours();

  const score = calculateNoShowScore(recencyBuckets, {
    leadTimeHours,
    appointmentHour,
    paymentRequired,
  });
  const noShowsLast90Days = countNoShowsLast90Days(recencyBuckets);
  const risk = assignNoShowRisk(score, noShowsLast90Days);

  await db
    .update(appointments)
    .set({
      noShowScore: score,
      noShowRisk: risk,
      noShowComputedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId));
};

export const createAppointment = async (input: {
  shopId: string;
  startsAt: Date;
  customer: {
    fullName: string;
    phone: string;
    email: string;
    smsOptIn?: boolean;
  };
  paymentsEnabled?: boolean;
  bookingBaseUrl?: string | null;
  source?: "web" | "slot_recovery";
  sourceSlotOpeningId?: string | null;
}) => {
  try {
    const created = await db.transaction(async (tx) => {
      if (input.startsAt.getTime() <= Date.now()) {
        throw new InvalidSlotError("Cannot book appointments in the past.");
      }

      const settings = await ensureBookingSettings(tx, input.shopId);

      if (!settings) {
        throw new Error("Booking settings not found");
      }

      const localStart = toZonedTime(input.startsAt, settings.timezone);
      const dayOfWeek = localStart.getDay();
      const hours = await tx.query.shopHours.findFirst({
        where: (table, { and, eq }) =>
          and(eq(table.shopId, input.shopId), eq(table.dayOfWeek, dayOfWeek)),
      });

      if (!hours) {
        throw new ShopClosedError();
      }

      if (settings.slotMinutes <= 0) {
        throw new InvalidSlotError("Invalid slot length");
      }

      if (
        !isValidSlotStart({
          startsAt: input.startsAt,
          timeZone: settings.timezone,
          slotMinutes: settings.slotMinutes,
          openTime: hours.openTime,
          closeTime: hours.closeTime,
        })
      ) {
        throw new InvalidSlotError();
      }

      const openMinutes = parseTimeToMinutes(hours.openTime);
      const closeMinutes = parseTimeToMinutes(hours.closeTime);
      if (openMinutes >= closeMinutes) {
        throw new InvalidSlotError("Invalid shop hours");
      }

      const customer = await upsertCustomer(tx, {
        shopId: input.shopId,
        fullName: input.customer.fullName,
        phone: input.customer.phone,
        email: input.customer.email,
      });

      const contactPrefsInput: { customerId: string; smsOptIn?: boolean } = {
        customerId: customer.id,
      };
      if (typeof input.customer.smsOptIn === "boolean") {
        contactPrefsInput.smsOptIn = input.customer.smsOptIn;
      }
      await upsertCustomerContactPrefs(tx, contactPrefsInput);

      const paymentsEnabled = input.paymentsEnabled ?? true;
      let policyVersion: typeof policyVersions.$inferSelect | null = null;
      let paymentRequired = false;
      let amountCents = 0;
      let currency = "USD";
      const bookingUrl = input.bookingBaseUrl
        ? `${input.bookingBaseUrl}?appointment=pending`
        : undefined;

      if (paymentsEnabled) {
        const policy = await ensureShopPolicy(tx, input.shopId);
        const customerScore = await loadCustomerScoreTx(
          tx,
          customer.id,
          input.shopId
        );
        const tierPricing = applyTierPricingOverride(
          customerScore?.tier ?? null,
          {
            paymentMode: policy.paymentMode,
            depositAmountCents: policy.depositAmountCents,
          },
          {
            riskPaymentMode: policy.riskPaymentMode,
            riskDepositAmountCents: policy.riskDepositAmountCents,
            topDepositWaived: policy.topDepositWaived,
            topDepositAmountCents: policy.topDepositAmountCents,
          }
        );

        const derived = derivePaymentRequirement({
          paymentMode: tierPricing.paymentMode,
          depositAmountCents: tierPricing.depositAmountCents,
        });
        paymentRequired = derived.paymentRequired;
        amountCents = derived.amountCents;
        currency = policy.currency;

        const [createdPolicyVersion] = await tx
          .insert(policyVersions)
          .values({
            shopId: input.shopId,
            currency: policy.currency,
            paymentMode: tierPricing.paymentMode,
            depositAmountCents: tierPricing.depositAmountCents,
          })
          .returning();

        if (!createdPolicyVersion) {
          throw new Error("Failed to create policy version");
        }

        policyVersion = createdPolicyVersion;
      }

      const endsAt = computeEndsAt({
        startsAt: input.startsAt,
        timeZone: settings.timezone,
        slotMinutes: settings.slotMinutes,
      });

      const appointmentValues: typeof appointments.$inferInsert = {
        shopId: input.shopId,
        customerId: customer.id,
        startsAt: input.startsAt,
        endsAt,
        status: paymentRequired ? "pending" : "booked",
        policyVersionId: policyVersion?.id ?? null,
        paymentStatus: paymentRequired ? "pending" : "unpaid",
        paymentRequired,
        source: input.source ?? "web",
        sourceSlotOpeningId: input.sourceSlotOpeningId ?? null,
        bookingUrl: bookingUrl ?? null,
      };

      const [appointment] = await tx
        .insert(appointments)
        .values(appointmentValues)
        .returning();

      if (!appointment) {
        throw new Error("Failed to create appointment");
      }

      let payment = null;
      if (paymentRequired) {
        if (!policyVersion) {
          throw new Error("Payment policy version missing");
        }

        const paymentMetadata: Record<string, string> = {
          appointmentId: appointment.id,
          shopId: input.shopId,
          policyVersionId: policyVersion.id,
        };
        if (bookingUrl) {
          paymentMetadata.bookingUrl = bookingUrl;
        }

        const [createdPayment] = await tx
          .insert(payments)
          .values({
            shopId: input.shopId,
            appointmentId: appointment.id,
            provider: "stripe",
            amountCents,
            currency,
            status: "processing",
            metadata: paymentMetadata,
            attempts: 0,
          })
          .returning();

        if (!createdPayment) {
          throw new Error("Failed to create payment");
        }

        payment = createdPayment;
      }

      return {
        appointment,
        customer,
        payment,
        policyVersion,
        amountCents,
        currency,
        paymentRequired,
        bookingUrl,
        shopTimezone: settings.timezone,
      };
    });

    try {
      await updateNoShowScoreAtBooking({
        appointmentId: created.appointment.id,
        customerId: created.customer.id,
        shopId: created.appointment.shopId,
        startsAt: created.appointment.startsAt,
        shopTimezone: created.shopTimezone,
        paymentRequired: created.paymentRequired,
      });
    } catch {}

    if (!created.paymentRequired || !created.payment) {
      return {
        ...created,
        clientSecret: null,
      };
    }

    if (stripeIsMocked()) {
      const mockId = `pi_test_${created.payment.id}`;
      const mockSecret = `pi_test_secret_${created.payment.id}`;
      await db
        .update(payments)
        .set({
          stripePaymentIntentId: mockId,
          status: "requires_payment_method",
          updatedAt: new Date(),
        })
        .where(eq(payments.id, created.payment.id));

      return {
        ...created,
        payment: {
          ...created.payment,
          stripePaymentIntentId: mockId,
          status: "requires_payment_method",
        },
        clientSecret: mockSecret,
      };
    }

    const stripe = getStripeClient();
    let paymentIntent;
    try {
      if (!created.payment) {
        throw new Error("Payment record not found");
      }

      paymentIntent = await stripe.paymentIntents.create({
        amount: created.amountCents,
        currency: created.currency,
        metadata: {
          appointmentId: created.appointment.id,
          shopId: created.appointment.shopId,
          policyVersionId: created.policyVersion?.id ?? "",
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });
    } catch (error) {
      if (created.payment) {
        await db.transaction(async (tx) => {
          await tx
            .update(payments)
            .set({ status: "failed", updatedAt: new Date() })
            .where(eq(payments.id, created.payment!.id));
          await tx
            .update(appointments)
            .set({
              paymentStatus: "failed",
              status: "cancelled",
              updatedAt: new Date(),
            })
            .where(eq(appointments.id, created.appointment.id));
        });
      }

      throw error;
    }

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe client secret missing");
    }

    const mappedStatus = normalizeStripePaymentStatus(paymentIntent.status);
    await db
      .update(payments)
      .set({
        stripePaymentIntentId: paymentIntent.id,
        status: mappedStatus,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, created.payment.id));

    return {
      ...created,
      payment: {
        ...created.payment,
        stripePaymentIntentId: paymentIntent.id,
        status: mappedStatus,
      },
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new SlotTakenError();
    }

    throw error;
  }
};

export const listAppointmentsForShop = async (shopId: string) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      paymentStatus: appointments.paymentStatus,
      paymentRequired: appointments.paymentRequired,
      financialOutcome: appointments.financialOutcome,
      noShowScore: appointments.noShowScore,
      noShowRisk: appointments.noShowRisk,
      noShowComputedAt: appointments.noShowComputedAt,
      resolvedAt: appointments.resolvedAt,
      createdAt: appointments.createdAt,
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      paymentAmountCents: payments.amountCents,
      paymentCurrency: payments.currency,
      noShowStatsTotalAppointments: customerNoShowStats.totalAppointments,
      noShowStatsNoShows: customerNoShowStats.noShowCount,
      noShowStatsCompleted: customerNoShowStats.completedCount,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(payments, eq(payments.appointmentId, appointments.id))
    .leftJoin(
      customerNoShowStats,
      and(
        eq(customerNoShowStats.customerId, appointments.customerId),
        eq(customerNoShowStats.shopId, appointments.shopId)
      )
    )
    .where(
      and(
        eq(appointments.shopId, shopId),
        gte(appointments.endsAt, sevenDaysAgo),
        inArray(appointments.status, ["booked", "pending", "ended"])
      )
    )
    .orderBy(asc(appointments.startsAt));
};

export const getOutcomeSummaryForShop = async (shopId: string) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      outcome: appointments.financialOutcome,
      count: sql<number>`count(*)`,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.shopId, shopId),
        gte(appointments.endsAt, sevenDaysAgo),
        lt(appointments.endsAt, now)
      )
    )
    .groupBy(appointments.financialOutcome);

  const summary: Record<string, number> = {
    settled: 0,
    voided: 0,
    unresolved: 0,
    refunded: 0,
    disputed: 0,
  };

  for (const row of rows) {
    summary[row.outcome] = Number(row.count);
  }

  return summary;
};

export const listSlotOpeningsForShop = async (shopId: string, limit = 20) => {
  const openings = await db
    .select({
      id: slotOpenings.id,
      startsAt: slotOpenings.startsAt,
      endsAt: slotOpenings.endsAt,
      status: slotOpenings.status,
      createdAt: slotOpenings.createdAt,
      sourceAppointmentId: slotOpenings.sourceAppointmentId,
    })
    .from(slotOpenings)
    .where(eq(slotOpenings.shopId, shopId))
    .orderBy(desc(slotOpenings.createdAt))
    .limit(limit);

  if (openings.length === 0) {
    return [];
  }

  const openingIds = openings.map((opening) => opening.id);
  const recoveredAppointments = await db
    .select({
      id: appointments.id,
      sourceSlotOpeningId: appointments.sourceSlotOpeningId,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.shopId, shopId),
        inArray(appointments.sourceSlotOpeningId, openingIds)
      )
    )
    .orderBy(desc(appointments.createdAt));

  const recoveredBySlot = new Map<string, string>();
  for (const recoveredAppointment of recoveredAppointments) {
    if (!recoveredAppointment.sourceSlotOpeningId) {
      continue;
    }

    if (!recoveredBySlot.has(recoveredAppointment.sourceSlotOpeningId)) {
      recoveredBySlot.set(
        recoveredAppointment.sourceSlotOpeningId,
        recoveredAppointment.id
      );
    }
  }

  return openings.map((opening) => ({
    ...opening,
    recoveredAppointmentId: recoveredBySlot.get(opening.id) ?? null,
  }));
};
