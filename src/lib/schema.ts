import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uuid,
  pgEnum,
  uniqueIndex,
  integer,
  time,
  check,
  jsonb,
} from "drizzle-orm/pg-core";

// IMPORTANT! ID fields should ALWAYS use UUID types, EXCEPT the BetterAuth tables.


export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("user_email_idx").on(table.email)]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_token_idx").on(table.token),
  ]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    index("account_provider_account_idx").on(table.providerId, table.accountId),
  ]
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const shopStatusEnum = pgEnum("shop_status", [
  "draft",
  "active",
  "paused",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "booked",
  "cancelled",
  "ended",
]);

export const paymentModeEnum = pgEnum("payment_mode", [
  "deposit",
  "full_prepay",
  "none",
]);

export const tierEnum = pgEnum("tier", ["top", "neutral", "risk"]);
export const noShowRiskEnum = pgEnum("no_show_risk", ["low", "medium", "high"]);

export const appointmentPaymentStatusEnum = pgEnum(
  "appointment_payment_status",
  ["unpaid", "pending", "paid", "failed"]
);

export const paymentStatusEnum = pgEnum("payment_status", [
  "requires_payment_method",
  "requires_action",
  "processing",
  "succeeded",
  "failed",
  "canceled",
]);

export const appointmentFinancialOutcomeEnum = pgEnum(
  "appointment_financial_outcome",
  ["unresolved", "settled", "voided", "refunded", "disputed"]
);

export const appointmentEventTypeEnum = pgEnum("appointment_event_type", [
  "created",
  "payment_succeeded",
  "payment_failed",
  "outcome_resolved",
  "cancelled",
  "refund_issued",
  "refund_failed",
  "dispute_opened",
]);

export const messageChannelEnum = pgEnum("message_channel", ["sms", "email"]);

export const messagePurposeEnum = pgEnum("message_purpose", [
  "booking_confirmation",
  "cancellation_confirmation",
  "slot_recovery_offer",
  "appointment_reminder_24h",
  "appointment_confirmation_request",
  "appointment_reminder_10m",
  "appointment_reminder_1h",
  "appointment_reminder_2h",
  "appointment_reminder_4h",
  "appointment_reminder_48h",
  "appointment_reminder_1w",
]);

export const appointmentConfirmationStatusEnum = pgEnum(
  "appointment_confirmation_status",
  ["none", "pending", "confirmed", "expired"]
);

export const messageStatusEnum = pgEnum("message_status", [
  "queued",
  "sent",
  "failed",
]);

export const shops = pgTable(
  "shops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    businessType: text("business_type"),
    status: shopStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("shops_owner_user_id_unique").on(table.ownerUserId),
    uniqueIndex("shops_slug_unique").on(table.slug),
    index("shops_status_idx").on(table.status),
  ]
);

export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    calendarId: text("calendar_id").notNull(),
    calendarName: text("calendar_name").notNull(),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    encryptionKeyId: text("encryption_key_id").notNull().default("default"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("calendar_connections_one_active_per_shop")
      .on(table.shopId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_calendar_connections_shop_id")
      .on(table.shopId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_calendar_connections_deleted")
      .on(table.deletedAt)
      .where(sql`${table.deletedAt} IS NOT NULL`),
  ]
);

export const shopHours = pgTable(
  "shop_hours",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    openTime: time("open_time").notNull(),
    closeTime: time("close_time").notNull(),
  },
  (table) => [
    uniqueIndex("shop_hours_shop_day_unique").on(
      table.shopId,
      table.dayOfWeek
    ),
    index("shop_hours_shop_id_idx").on(table.shopId),
    check(
      "shop_hours_open_before_close",
      sql`${table.openTime} < ${table.closeTime}`
    ),
  ]
);

export const bookingSettings = pgTable(
  "booking_settings",
  {
    shopId: uuid("shop_id")
      .primaryKey()
      .references(() => shops.id, { onDelete: "cascade" }),
    slotMinutes: integer("slot_minutes").notNull(),
    timezone: text("timezone").notNull(),
    reminderTimings: text("reminder_timings")
      .array()
      .notNull()
      .default(sql`ARRAY['24h']::text[]`),
  },
  (table) => [
    check(
      "booking_settings_slot_minutes_valid",
      sql`${table.slotMinutes} in (15, 30, 45, 60, 90, 120)`
    ),
    check(
      "booking_settings_reminder_timings_max",
      sql`cardinality(${table.reminderTimings}) <= 3`
    ),
    check(
      "booking_settings_reminder_timings_min",
      sql`cardinality(${table.reminderTimings}) >= 1`
    ),
    check(
      "booking_settings_reminder_timings_valid",
      sql`${table.reminderTimings} <@ ARRAY['10m','1h','2h','4h','24h','48h','1w']::text[]`
    ),
  ]
);

export const eventTypes = pgTable(
  "event_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferMinutes: integer("buffer_minutes").notNull().default(0),
    depositAmountCents: integer("deposit_amount_cents"),
    isHidden: boolean("is_hidden").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("event_types_shop_id_idx").on(table.shopId),
    uniqueIndex("event_types_one_default_per_shop_idx")
      .on(table.shopId)
      .where(sql`${table.isDefault} = true`),
    check(
      "event_types_buffer_minutes_valid",
      sql`${table.bufferMinutes} in (0, 5, 10)`
    ),
    check(
      "event_types_duration_minutes_positive",
      sql`${table.durationMinutes} > 0`
    ),
  ]
);

export const shopPolicies = pgTable(
  "shop_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    currency: text("currency").notNull(),
    paymentMode: paymentModeEnum("payment_mode").notNull(),
    depositAmountCents: integer("deposit_amount_cents"),
    riskPaymentMode: paymentModeEnum("risk_payment_mode"),
    riskDepositAmountCents: integer("risk_deposit_amount_cents"),
    topDepositWaived: boolean("top_deposit_waived").default(false).notNull(),
    topDepositAmountCents: integer("top_deposit_amount_cents"),
    excludeRiskFromOffers: boolean("exclude_risk_from_offers")
      .default(false)
      .notNull(),
    excludeHighNoShowFromOffers: boolean("exclude_high_no_show_from_offers")
      .default(false)
      .notNull(),
    resolutionGraceMinutes: integer("resolution_grace_minutes")
      .default(30)
      .notNull(),
    cancelCutoffMinutes: integer("cancel_cutoff_minutes")
      .default(1440)
      .notNull(),
    refundBeforeCutoff: boolean("refund_before_cutoff")
      .default(true)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("shop_policies_shop_id_unique").on(table.shopId)]
);

export const policyVersions = pgTable(
  "policy_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    currency: text("currency").notNull(),
    paymentMode: paymentModeEnum("payment_mode").notNull(),
    depositAmountCents: integer("deposit_amount_cents"),
    cancelCutoffMinutes: integer("cancel_cutoff_minutes")
      .notNull()
      .default(1440),
    refundBeforeCutoff: boolean("refund_before_cutoff")
      .notNull()
      .default(true),
    resolutionGraceMinutes: integer("resolution_grace_minutes")
      .default(30)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("policy_versions_shop_id_idx").on(table.shopId)]
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("customers_shop_phone_unique").on(table.shopId, table.phone),
    uniqueIndex("customers_shop_email_unique").on(table.shopId, table.email),
    index("customers_shop_id_idx").on(table.shopId),
  ]
);

export const customerScores = pgTable(
  "customer_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    tier: tierEnum("tier").notNull(),
    windowDays: integer("window_days").notNull().default(180),
    stats: jsonb("stats")
      .notNull()
      .$type<{
        settled: number;
        voided: number;
        refunded: number;
        lateCancels: number;
        lastActivityAt: string | null;
        voidedLast90Days: number;
      }>(),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("customer_scores_customer_shop_idx").on(
      table.customerId,
      table.shopId
    ),
  ]
);

export const customerNoShowStats = pgTable(
  "customer_no_show_stats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    totalAppointments: integer("total_appointments").default(0).notNull(),
    noShowCount: integer("no_show_count").default(0).notNull(),
    lateCancelCount: integer("late_cancel_count").default(0).notNull(),
    onTimeCancelCount: integer("on_time_cancel_count").default(0).notNull(),
    completedCount: integer("completed_count").default(0).notNull(),
    lastNoShowAt: timestamp("last_no_show_at", { withTimezone: true }),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("customer_no_show_stats_customer_shop_idx").on(
      table.customerId,
      table.shopId
    ),
    index("customer_no_show_stats_shop_id_idx").on(table.shopId),
    index("customer_no_show_stats_customer_id_idx").on(table.customerId),
  ]
);

export const customerContactPrefs = pgTable(
  "customer_contact_prefs",
  {
    customerId: uuid("customer_id")
      .primaryKey()
      .references(() => customers.id, { onDelete: "cascade" }),
    smsOptIn: boolean("sms_opt_in").default(false).notNull(),
    emailOptIn: boolean("email_opt_in").default(true).notNull(),
    preferredChannel: text("preferred_channel"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("customer_contact_prefs_sms_opt_in_idx").on(table.smsOptIn)]
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatusEnum("status").default("booked").notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationSource: text("cancellation_source"),
    policyVersionId: uuid("policy_version_id").references(
      () => policyVersions.id,
      { onDelete: "set null" }
    ),
    eventTypeId: uuid("event_type_id").references(() => eventTypes.id, {
      onDelete: "set null",
    }),
    paymentStatus: appointmentPaymentStatusEnum("payment_status")
      .default("unpaid")
      .notNull(),
    paymentRequired: boolean("payment_required").default(false).notNull(),
    financialOutcome: appointmentFinancialOutcomeEnum("financial_outcome")
      .default("unresolved")
      .notNull(),
    noShowScore: integer("no_show_score"),
    noShowRisk: noShowRiskEnum("no_show_risk"),
    noShowComputedAt: timestamp("no_show_computed_at", { withTimezone: true }),
    confirmationStatus: appointmentConfirmationStatusEnum("confirmation_status")
      .default("none")
      .notNull(),
    confirmationSentAt: timestamp("confirmation_sent_at", {
      withTimezone: true,
    }),
    confirmationDeadline: timestamp("confirmation_deadline", {
      withTimezone: true,
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionReason: text("resolution_reason"),
    lastEventId: uuid("last_event_id").references((): any => appointmentEvents.id, {
      onDelete: "set null",
    }),
    source: text("source").$type<"web" | "slot_recovery">(),
    sourceSlotOpeningId: uuid("source_slot_opening_id").references(
      (): any => slotOpenings.id,
      { onDelete: "set null" }
    ),
    bookingUrl: text("booking_url"),
    reminderTimingsSnapshot: text("reminder_timings_snapshot")
      .array()
      .notNull()
      .default(sql`ARRAY['24h']::text[]`),
    calendarEventId: text("calendar_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("appointments_shop_starts_unique")
      .on(table.shopId, table.startsAt)
      .where(sql`${table.status} in ('pending', 'booked')`),
    index("appointments_shop_id_idx").on(table.shopId),
    index("appointments_customer_id_idx").on(table.customerId),
    index("appointments_event_type_id_idx").on(table.eventTypeId),
    index("appointments_shop_ends_idx").on(table.shopId, table.endsAt),
    index("appointments_financial_outcome_idx").on(table.financialOutcome),
    index("appointments_no_show_risk_idx").on(table.noShowRisk),
    index("appointments_confirmation_pending_idx")
      .on(table.confirmationStatus, table.confirmationDeadline)
      .where(sql`${table.confirmationStatus} = 'pending'`),
    index("appointments_confirmation_none_idx")
      .on(table.shopId, table.confirmationStatus, table.startsAt)
      .where(sql`${table.confirmationStatus} = 'none'`),
    index("appointments_source_slot_opening_id_idx").on(
      table.sourceSlotOpeningId
    ),
    index("idx_appointments_calendar_event_id")
      .on(table.calendarEventId)
      .where(sql`${table.calendarEventId} IS NOT NULL`),
    check(
      "appointments_cancellation_source_check",
      sql`${table.cancellationSource} in ('customer', 'system', 'admin')`
    ),
    check(
      "appointments_source_check",
      sql`${table.source} in ('web', 'slot_recovery')`
    ),
  ]
);

export const calendarConflictAlerts = pgTable(
  "calendar_conflict_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    calendarEventId: text("calendar_event_id").notNull(),
    eventSummary: text("event_summary"),
    eventStart: timestamp("event_start", { withTimezone: true }).notNull(),
    eventEnd: timestamp("event_end", { withTimezone: true }).notNull(),
    severity: text("severity")
      .notNull()
      .$type<"full" | "high" | "partial" | "all_day">(),
    status: text("status")
      .notNull()
      .default("pending")
      .$type<
        | "pending"
        | "dismissed"
        | "resolved"
        | "auto_resolved_past"
        | "auto_resolved_cancelled"
      >(),
    detectedAt: timestamp("detected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by").$type<
      "user" | "system_cancelled" | "system_past"
    >(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("calendar_conflict_alerts_appointment_event_unique").on(
      table.appointmentId,
      table.calendarEventId
    ),
    index("idx_conflict_alerts_shop_status")
      .on(table.shopId, table.status)
      .where(sql`${table.status} = 'pending'`),
    index("idx_conflict_alerts_created_at").on(table.createdAt),
    check(
      "calendar_conflict_alerts_severity_check",
      sql`${table.severity} in ('full', 'high', 'partial', 'all_day')`
    ),
    check(
      "calendar_conflict_alerts_status_check",
      sql`${table.status} in ('pending', 'dismissed', 'resolved', 'auto_resolved_past', 'auto_resolved_cancelled')`
    ),
    check(
      "calendar_conflict_alerts_resolved_by_check",
      sql`${table.resolvedBy} is null or ${table.resolvedBy} in ('user', 'system_cancelled', 'system_past')`
    ),
  ]
);

export type CalendarConflictAlert = typeof calendarConflictAlerts.$inferSelect;
export type NewCalendarConflictAlert = typeof calendarConflictAlerts.$inferInsert;

export const appointmentEvents = pgTable(
  "appointment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references((): any => appointments.id, { onDelete: "cascade" }),
    type: appointmentEventTypeEnum("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("appointment_events_appointment_id_idx").on(table.appointmentId),
    index("appointment_events_appointment_occurred_idx").on(
      table.appointmentId,
      table.occurredAt
    ),
    uniqueIndex("appointment_events_type_time_unique").on(
      table.appointmentId,
      table.type,
      table.occurredAt
    ),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    status: paymentStatusEnum("status").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    refundedAmountCents: integer("refunded_amount_cents")
      .notNull()
      .default(0),
    stripeRefundId: text("stripe_refund_id"),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, string>>(),
    attempts: integer("attempts").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("payments_appointment_id_unique").on(table.appointmentId),
    uniqueIndex("payments_stripe_payment_intent_unique").on(
      table.stripePaymentIntentId
    ),
    index("payments_shop_id_idx").on(table.shopId),
  ]
);

export const slotOpenings = pgTable(
  "slot_openings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    sourceAppointmentId: uuid("source_appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    eventTypeId: uuid("event_type_id").references(() => eventTypes.id, {
      onDelete: "set null",
    }),
    status: text("status")
      .$type<"open" | "filled" | "expired">()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("slot_openings_unique_slot").on(table.shopId, table.startsAt),
    index("slot_openings_shop_status_idx").on(table.shopId, table.status),
    index("slot_openings_source_idx").on(table.sourceAppointmentId),
    check(
      "slot_openings_status_check",
      sql`${table.status} in ('open', 'filled', 'expired')`
    ),
  ]
);

export const slotOffers = pgTable(
  "slot_offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slotOpeningId: uuid("slot_opening_id")
      .notNull()
      .references(() => slotOpenings.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    channel: text("channel").$type<"sms">().notNull(),
    status: text("status")
      .$type<"sent" | "accepted" | "expired" | "declined">()
      .notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("slot_offers_unique_customer").on(
      table.slotOpeningId,
      table.customerId
    ),
    index("slot_offers_slot_idx").on(table.slotOpeningId),
    index("slot_offers_customer_idx").on(table.customerId),
    index("slot_offers_expiry_idx")
      .on(table.status, table.expiresAt)
      .where(sql`${table.status} = 'sent'`),
    check("slot_offers_channel_check", sql`${table.channel} in ('sms')`),
    check(
      "slot_offers_status_check",
      sql`${table.status} in ('sent', 'accepted', 'expired', 'declined')`
    ),
  ]
);

export const bookingManageTokens = pgTable(
  "booking_manage_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .unique()
      .references(() => appointments.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("booking_manage_tokens_token_hash_idx").on(table.tokenHash),
  ]
);

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    version: integer("version").notNull(),
    channel: messageChannelEnum("channel").notNull(),
    subjectTemplate: text("subject_template"),
    bodyTemplate: text("body_template").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("message_templates_key_channel_version_unique").on(
      table.key,
      table.channel,
      table.version
    ),
    index("message_templates_key_channel_idx").on(table.key, table.channel),
  ]
);

export const messageLog = pgTable(
  "message_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    channel: messageChannelEnum("channel").notNull(),
    purpose: messagePurposeEnum("purpose").notNull(),
    toPhone: text("to_phone").notNull(),
    provider: text("provider").notNull(),
    providerMessageId: text("provider_message_id"),
    status: messageStatusEnum("status").notNull(),
    bodyHash: text("body_hash").notNull(),
    templateId: uuid("template_id").references(() => messageTemplates.id, {
      onDelete: "set null",
    }),
    templateKey: text("template_key").notNull(),
    templateVersion: integer("template_version").notNull(),
    renderedBody: text("rendered_body").notNull(),
    retryCount: integer("retry_count").default(0).notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    index("message_log_shop_id_idx").on(table.shopId),
    index("message_log_appointment_id_idx").on(table.appointmentId),
    index("message_log_customer_id_idx").on(table.customerId),
  ]
);

export const messageDedup = pgTable("message_dedup", {
  dedupKey: text("dedup_key").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const messageOptOuts = pgTable(
  "message_opt_outs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    channel: messageChannelEnum("channel").notNull(),
    optedOutAt: timestamp("opted_out_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    reason: text("reason"),
  },
  (table) => [index("message_opt_outs_customer_id_idx").on(table.customerId)]
);

export const processedStripeEvents = pgTable("processed_stripe_events", {
  id: text("id").primaryKey(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
