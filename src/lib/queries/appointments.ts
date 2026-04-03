import { toZonedTime } from "date-fns-tz";
import { and, asc, desc, eq, gte, gt, inArray, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
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
  CalendarEventCreationError,
  createCalendarEvent,
  invalidateCalendarCache,
  NoCalendarConnectionError,
} from "@/lib/google-calendar";
import {
  fetchCalendarEventsWithCache,
  filterSlotsForConflicts,
} from "@/lib/google-calendar-cache";
import {
  assignNoShowRisk,
  calculateNoShowScore,
  countNoShowsLast90Days,
} from "@/lib/no-show-scoring";
import { getNoShowStats, scanAppointmentsByOutcome } from "@/lib/queries/no-show-scoring";
import { loadCustomerScoreTx } from "@/lib/queries/scoring";
import {
  parseReminderInterval,
  REMINDER_INTERVALS,
  shouldSkipReminder,
} from "@/lib/reminders";
import {
  appointments,
  bookingSettings,
  customerContactPrefs,
  customerNoShowStats,
  customers,
  eventTypes,
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

const getErrorConstraint = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const direct = (error as { constraint?: string }).constraint;
  if (direct) return direct;
  const cause = (error as { cause?: unknown }).cause;
  return getErrorConstraint(cause);
};

const isUniqueViolation = (error: unknown): boolean => {
  return getErrorCode(error) === "23505";
};

export type Availability = {
  date: string;
  timezone: string;
  slotMinutes: number;
  durationMinutes: number;
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
  dateStr: string,
  durationMinutes?: number
): Promise<Availability> => {
  const settings = await getBookingSettingsForShop(shopId);
  if (!settings) {
    throw new Error("Booking settings not found");
  }

  const effectiveDuration = durationMinutes ?? settings.slotMinutes;

  const todayStr = formatDateInTimeZone(new Date(), settings.timezone);
  if (dateStr < todayStr) {
    return {
      date: dateStr,
      timezone: settings.timezone,
      slotMinutes: settings.slotMinutes,
      durationMinutes: effectiveDuration,
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
      durationMinutes: effectiveDuration,
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

  const sizedSlots =
    effectiveDuration !== settings.slotMinutes
      ? slots.map((slot) => ({
          startsAt: slot.startsAt,
          endsAt: new Date(
            slot.startsAt.getTime() + effectiveDuration * 60_000
          ),
        }))
      : slots;

  const { start, end } = getDayStartEndUtc(dateStr, settings.timezone);
  const closeBoundaryUtc = new Date(
    start.getTime() + parseTimeToMinutes(hours.closeTime) * 60_000
  );
  // Expand the lower bound by the maximum possible buffer (10 min, schema enforces IN (0,5,10))
  // so that prior-day appointments whose buffer window spills into this day are included.
  const MAX_BUFFER_MS = 10 * 60_000;
  const bookedSlots = await db
    .select({
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      effectiveBufferAfterMinutes: appointments.effectiveBufferAfterMinutes,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.shopId, shopId),
        lt(appointments.startsAt, end),
        gt(appointments.endsAt, new Date(start.getTime() - MAX_BUFFER_MS)),
        inArray(appointments.status, ["booked", "pending"])
      )
    );

  const now = new Date();
  const isToday = dateStr === todayStr;
  let availableSlots = sizedSlots.filter((slot) => {
    if (slot.endsAt.getTime() > closeBoundaryUtc.getTime()) return false;
    const overlaps = bookedSlots.some((booked) => {
      const blockedEnd =
        booked.endsAt.getTime() +
        booked.effectiveBufferAfterMinutes * 60_000;
      return (
        slot.startsAt.getTime() < blockedEnd &&
        slot.endsAt.getTime() > booked.startsAt.getTime()
      );
    });
    if (overlaps) return false;
    if (!isToday) return true;
    return slot.startsAt.getTime() > now.getTime();
  });

  try {
    const calendarEvents = await fetchCalendarEventsWithCache(
      shopId,
      dateStr,
      settings.timezone
    );

    if (calendarEvents.length > 0) {
      availableSlots = filterSlotsForConflicts(availableSlots, calendarEvents);
    }
  } catch (error) {
    console.error("[availability] Calendar filtering failed; returning base availability", {
      shopId,
      date: dateStr,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return {
    date: dateStr,
    timezone: settings.timezone,
    slotMinutes: settings.slotMinutes,
    durationMinutes: effectiveDuration,
    slots: availableSlots,
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
  reminderInterval: string;
};

export type EmailReminderCandidate = {
  appointmentId: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  startsAt: Date;
  endsAt: Date;
  bookingUrl: string | null;
  shopName: string;
  shopTimezone: string;
  reminderInterval: string;
};

/**
 * Finds booked high-risk appointments across all configured reminder windows.
 */
export const findHighRiskAppointments = async (): Promise<
  HighRiskReminderCandidate[]
> => {
  const now = Date.now();
  const results: HighRiskReminderCandidate[] = [];

  for (const interval of REMINDER_INTERVALS) {
    const intervalMinutes = parseReminderInterval(interval);
    if (intervalMinutes === null) {
      continue;
    }

    const windowStart = new Date(now + (intervalMinutes - 60) * 60 * 1000);
    const windowEnd = new Date(now + (intervalMinutes + 60) * 60 * 1000);

    const rows = await db
      .select({
        appointmentId: appointments.id,
        shopId: appointments.shopId,
        customerId: appointments.customerId,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        createdAt: appointments.createdAt,
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
          sql`${interval} = ANY(${appointments.reminderTimingsSnapshot})`,
          eq(customerContactPrefs.smsOptIn, true)
        )
      );

    for (const row of rows) {
      if (shouldSkipReminder(row.startsAt, row.createdAt, interval)) {
        continue;
      }

      results.push({
        appointmentId: row.appointmentId,
        shopId: row.shopId,
        customerId: row.customerId,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        bookingUrl: row.bookingUrl,
        shopName: row.shopName,
        shopTimezone: row.shopTimezone ?? "UTC",
        reminderInterval: interval,
      });
    }
  }

  return results;
};

/**
 * Finds booked appointments across all configured reminder windows
 * where the customer has an email address and has not opted out.
 */
export const findAppointmentsForEmailReminder = async (): Promise<
  EmailReminderCandidate[]
> => {
  const now = Date.now();
  const results: EmailReminderCandidate[] = [];

  for (const interval of REMINDER_INTERVALS) {
    const intervalMinutes = parseReminderInterval(interval);
    if (intervalMinutes === null) {
      continue;
    }

    const windowStart = new Date(now + (intervalMinutes - 60) * 60 * 1000);
    const windowEnd = new Date(now + (intervalMinutes + 60) * 60 * 1000);

    const rows = await db
      .select({
        appointmentId: appointments.id,
        shopId: appointments.shopId,
        customerId: appointments.customerId,
        customerName: customers.fullName,
        customerEmail: customers.email,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        createdAt: appointments.createdAt,
        bookingUrl: appointments.bookingUrl,
        shopName: shops.name,
        shopTimezone: bookingSettings.timezone,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .innerJoin(shops, eq(appointments.shopId, shops.id))
      .leftJoin(
        customerContactPrefs,
        eq(appointments.customerId, customerContactPrefs.customerId)
      )
      .leftJoin(bookingSettings, eq(appointments.shopId, bookingSettings.shopId))
      .where(
        and(
          eq(appointments.status, "booked"),
          isNotNull(customers.email),
          gte(appointments.startsAt, windowStart),
          lte(appointments.startsAt, windowEnd),
          sql`${interval} = ANY(${appointments.reminderTimingsSnapshot})`,
          or(
            eq(customerContactPrefs.emailOptIn, true),
            isNull(customerContactPrefs.customerId)
          )
        )
      )
      .orderBy(asc(appointments.startsAt));

    for (const row of rows) {
      if (shouldSkipReminder(row.startsAt, row.createdAt, interval)) {
        continue;
      }

      results.push({
        appointmentId: row.appointmentId,
        shopId: row.shopId,
        customerId: row.customerId,
        customerName: row.customerName,
        customerEmail: row.customerEmail!,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        bookingUrl: row.bookingUrl,
        shopName: row.shopName,
        shopTimezone: row.shopTimezone ?? "UTC",
        reminderInterval: interval,
      });
    }
  }

  return results;
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
    emailOptIn?: boolean;
  }
) => {
  const updates: Partial<typeof customerContactPrefs.$inferInsert> = {};

  if (typeof input.smsOptIn === "boolean") {
    updates.smsOptIn = input.smsOptIn;
  }

  if (typeof input.emailOptIn === "boolean") {
    updates.emailOptIn = input.emailOptIn;
  }

  if (Object.keys(updates).length === 0) {
    return null;
  }

  const existing = await tx.query.customerContactPrefs.findFirst({
    where: (table, { eq }) => eq(table.customerId, input.customerId),
  });

  if (existing) {
    await tx
      .update(customerContactPrefs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customerContactPrefs.customerId, input.customerId));
    return { ...existing, ...updates };
  }

  const [created] = await tx
    .insert(customerContactPrefs)
    .values({
      customerId: input.customerId,
      ...updates,
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
  durationMinutes?: number;
  customer: {
    fullName: string;
    phone: string;
    email: string;
    smsOptIn?: boolean;
    emailOptIn?: boolean;
  };
  paymentsEnabled?: boolean;
  bookingBaseUrl?: string | null;
  source?: "web" | "slot_recovery";
  sourceSlotOpeningId?: string | null;
  eventTypeId?: string | null;
  eventTypeDepositCents?: number | null;
  eventTypeBufferMinutes?: number | null;
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

      const reminderTimingsSnapshot = settings.reminderTimings ?? ["24h"];
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

      const effectiveDurationMinutes = input.durationMinutes ?? settings.slotMinutes;
      const effectiveBufferAfterMinutes =
        input.eventTypeBufferMinutes ?? settings.defaultBufferMinutes ?? 0;
      if (effectiveDurationMinutes <= 0) {
        throw new InvalidSlotError("Invalid slot length");
      }

      if (
        !isValidSlotStart({
          startsAt: input.startsAt,
          timeZone: settings.timezone,
          slotMinutes: settings.slotMinutes,
          openTime: hours.openTime,
          closeTime: hours.closeTime,
          durationMinutes: effectiveDurationMinutes,
        })
      ) {
        throw new InvalidSlotError();
      }

      const openMinutes = parseTimeToMinutes(hours.openTime);
      const closeMinutes = parseTimeToMinutes(hours.closeTime);
      if (openMinutes >= closeMinutes) {
        throw new InvalidSlotError("Invalid shop hours");
      }

      const startMinutes = localStart.getHours() * 60 + localStart.getMinutes();
      if (startMinutes + effectiveDurationMinutes > closeMinutes) {
        throw new InvalidSlotError();
      }

      const customer = await upsertCustomer(tx, {
        shopId: input.shopId,
        fullName: input.customer.fullName,
        phone: input.customer.phone,
        email: input.customer.email,
      });

      const contactPrefsInput: {
        customerId: string;
        smsOptIn?: boolean;
        emailOptIn?: boolean;
      } = {
        customerId: customer.id,
      };
      if (typeof input.customer.smsOptIn === "boolean") {
        contactPrefsInput.smsOptIn = input.customer.smsOptIn;
      }
      if (typeof input.customer.emailOptIn === "boolean") {
        contactPrefsInput.emailOptIn = input.customer.emailOptIn;
      }
      await upsertCustomerContactPrefs(tx, contactPrefsInput);

      const paymentsEnabled = input.paymentsEnabled ?? true;
      let policyVersion: typeof policyVersions.$inferSelect | null = null;
      let paymentRequired = false;
      let amountCents = 0;
      let currency = "USD";

      if (paymentsEnabled) {
        const policy = await ensureShopPolicy(tx, input.shopId);
        const customerScore = await loadCustomerScoreTx(
          tx,
          customer.id,
          input.shopId
        );
        const tier = customerScore?.tier ?? null;
        const baseDepositCents =
          input.eventTypeDepositCents != null
            ? input.eventTypeDepositCents
            : policy.depositAmountCents;
        const tierPricing = applyTierPricingOverride(
          tier,
          {
            paymentMode: policy.paymentMode,
            depositAmountCents: baseDepositCents,
          },
          {
            riskPaymentMode: policy.riskPaymentMode,
            riskDepositAmountCents: policy.riskDepositAmountCents,
            topDepositWaived: policy.topDepositWaived,
            topDepositAmountCents: policy.topDepositAmountCents,
          }
        );
        const finalDepositCents =
          tier === "risk" &&
          input.eventTypeDepositCents != null &&
          (tierPricing.depositAmountCents ?? 0) < input.eventTypeDepositCents
            ? input.eventTypeDepositCents
            : tierPricing.depositAmountCents;

        const derived = derivePaymentRequirement({
          paymentMode: tierPricing.paymentMode,
          depositAmountCents: finalDepositCents,
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
            depositAmountCents: finalDepositCents,
            cancelCutoffMinutes: policy.cancelCutoffMinutes,
            refundBeforeCutoff: policy.refundBeforeCutoff,
            resolutionGraceMinutes: policy.resolutionGraceMinutes,
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
        durationMinutes: effectiveDurationMinutes,
      });

      const overlapping = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.shopId, input.shopId),
            inArray(appointments.status, ["booked", "pending"]),
            lt(appointments.startsAt, endsAt),
            sql`${appointments.endsAt} + (${appointments.effectiveBufferAfterMinutes} * interval '1 minute') > ${input.startsAt}`
          )
        )
        .limit(1);

      if (overlapping.length > 0) {
        throw new SlotTakenError();
      }

      const appointmentValues: typeof appointments.$inferInsert = {
        shopId: input.shopId,
        customerId: customer.id,
        startsAt: input.startsAt,
        endsAt,
        eventTypeId: input.eventTypeId ?? null,
        effectiveBufferAfterMinutes,
        status: paymentRequired ? "pending" : "booked",
        policyVersionId: policyVersion?.id ?? null,
        paymentStatus: paymentRequired ? "pending" : "unpaid",
        paymentRequired,
        source: input.source ?? "web",
        sourceSlotOpeningId: input.sourceSlotOpeningId ?? null,
        bookingUrl: null,
        reminderTimingsSnapshot,
      };

      const [appointment] = await tx
        .insert(appointments)
        .values(appointmentValues)
        .returning();

      if (!appointment) {
        throw new Error("Failed to create appointment");
      }

      const bookingUrl = input.bookingBaseUrl
        ? `${input.bookingBaseUrl}?appointment=${appointment.id}`
        : null;

      let appointmentWithBookingUrl = appointment;
      if (bookingUrl) {
        const [updatedAppointment] = await tx
          .update(appointments)
          .set({
            bookingUrl,
            updatedAt: new Date(),
          })
          .where(eq(appointments.id, appointment.id))
          .returning();

        if (!updatedAppointment) {
          throw new Error("Failed to persist booking URL");
        }

        appointmentWithBookingUrl = updatedAppointment;
      }

      let calendarEventId: string | null = null;
      if (!paymentRequired) {
        try {
          const shop = await tx.query.shops.findFirst({
            where: (table, { eq }) => eq(table.id, input.shopId),
            columns: { name: true },
          });

          const calendarEventInput: Parameters<typeof createCalendarEvent>[0] = {
            shopId: input.shopId,
            customerName: customer.fullName,
            startsAt: appointmentWithBookingUrl.startsAt,
            endsAt: appointmentWithBookingUrl.endsAt,
            bookingUrl,
          };
          if (shop?.name) {
            calendarEventInput.shopName = shop.name;
          }

          calendarEventId = await createCalendarEvent(calendarEventInput);
        } catch (error) {
          if (error instanceof NoCalendarConnectionError) {
            console.warn("[booking] No active calendar connection, skipping sync", {
              shopId: input.shopId,
            });
          } else {
            console.error("[booking] Calendar sync failed; continuing without calendar event", {
              shopId: input.shopId,
              message: error instanceof Error ? error.message : "Unknown error",
              kind:
                error instanceof CalendarEventCreationError
                  ? "calendar_event_creation"
                  : "unexpected",
            });
          }
        }
      }

      let appointmentWithCalendar = appointmentWithBookingUrl;
      if (calendarEventId) {
        const [updatedAppointment] = await tx
          .update(appointments)
          .set({
            calendarEventId,
            updatedAt: new Date(),
          })
          .where(eq(appointments.id, appointment.id))
          .returning();

        if (!updatedAppointment) {
          throw new Error("Failed to persist calendar event ID");
        }

        appointmentWithCalendar = updatedAppointment;
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
        appointment: appointmentWithCalendar,
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

    if (created.appointment.calendarEventId) {
      const dateStr = formatDateInTimeZone(
        created.appointment.startsAt,
        created.shopTimezone
      );
      await invalidateCalendarCache(input.shopId, dateStr);
    }

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
    if (error instanceof CalendarEventCreationError) {
      throw new Error("Failed to create booking - calendar sync error");
    }

    if (
      isUniqueViolation(error) &&
      getErrorConstraint(error) === "appointments_shop_starts_unique"
    ) {
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
      eventTypeName: eventTypes.name,
      paymentAmountCents: payments.amountCents,
      paymentCurrency: payments.currency,
      noShowStatsTotalAppointments: customerNoShowStats.totalAppointments,
      noShowStatsNoShows: customerNoShowStats.noShowCount,
      noShowStatsCompleted: customerNoShowStats.completedCount,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .leftJoin(payments, eq(payments.appointmentId, appointments.id))
    .leftJoin(eventTypes, eq(eventTypes.id, appointments.eventTypeId))
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

export const syncAppointmentCalendarEvent = async (appointmentId: string) => {
  const appointment = await db.query.appointments.findFirst({
    where: (table, { eq }) => eq(table.id, appointmentId),
    columns: {
      id: true,
      shopId: true,
      customerId: true,
      startsAt: true,
      endsAt: true,
      status: true,
      paymentStatus: true,
      paymentRequired: true,
      bookingUrl: true,
      calendarEventId: true,
    },
  });

  if (!appointment) {
    return false;
  }

  if (appointment.calendarEventId || appointment.status !== "booked") {
    return false;
  }

  if (appointment.paymentRequired && appointment.paymentStatus !== "paid") {
    return false;
  }

  const [shop, customer, settings] = await Promise.all([
    db.query.shops.findFirst({
      where: (table, { eq }) => eq(table.id, appointment.shopId),
      columns: { name: true },
    }),
    db.query.customers.findFirst({
      where: (table, { eq }) => eq(table.id, appointment.customerId),
      columns: { fullName: true },
    }),
    db.query.bookingSettings.findFirst({
      where: (table, { eq }) => eq(table.shopId, appointment.shopId),
      columns: { timezone: true },
    }),
  ]);

  if (!customer) {
    console.warn("[calendar] Skipping sync because customer was not found", {
      appointmentId: appointment.id,
      customerId: appointment.customerId,
    });
    return false;
  }

  let calendarEventId: string;
  try {
    const calendarEventInput: Parameters<typeof createCalendarEvent>[0] = {
      shopId: appointment.shopId,
      customerName: customer.fullName,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      bookingUrl: appointment.bookingUrl ?? null,
    };
    if (shop?.name) {
      calendarEventInput.shopName = shop.name;
    }

    calendarEventId = await createCalendarEvent(calendarEventInput);
  } catch (error) {
    if (error instanceof NoCalendarConnectionError) {
      console.warn("[calendar] No active calendar connection, skipping sync", {
        appointmentId: appointment.id,
        shopId: appointment.shopId,
      });
      return false;
    }

    if (error instanceof CalendarEventCreationError) {
      console.error("[calendar] Failed to sync appointment after payment", {
        appointmentId: appointment.id,
        shopId: appointment.shopId,
        message: error.message,
      });
      return false;
    }

    console.error("[calendar] Unexpected sync error after payment", {
      appointmentId: appointment.id,
      shopId: appointment.shopId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }

  const [updatedAppointment] = await db
    .update(appointments)
    .set({
      calendarEventId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(appointments.id, appointment.id),
        isNull(appointments.calendarEventId),
        eq(appointments.status, "booked"),
        appointment.paymentRequired ? eq(appointments.paymentStatus, "paid") : sql`true`
      )
    )
    .returning({
      id: appointments.id,
      shopId: appointments.shopId,
      startsAt: appointments.startsAt,
    });

  if (!updatedAppointment) {
    return false;
  }

  const dateStr = formatDateInTimeZone(
    updatedAppointment.startsAt,
    settings?.timezone ?? "UTC"
  );
  await invalidateCalendarCache(updatedAppointment.shopId, dateStr);
  return true;
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
