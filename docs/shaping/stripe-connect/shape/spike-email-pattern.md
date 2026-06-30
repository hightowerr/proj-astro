# Spike: Email Template & Cron Pattern

## Context
Spec 16 requires a re-engagement email + cron job. Need to understand existing patterns.

## Findings

### S2-Q1: Existing email templates
Templates use **mustache-style `{{variable}}` interpolation** — raw HTML strings stored in the `message_templates` DB table (`src/lib/schema.ts:861`). Columns: `id`, `key`, `version`, `channel` (enum: sms/email), `subject_template`, `body_template`. Keyed by `(key, channel, version)` with unique index.

Default templates are hardcoded as fallbacks in `src/lib/messages.ts:22-35` and `src/app/app/settings/reminders/template-constants.ts`.

A seed script exists: `scripts/seed-email-template.ts` — calls `getOrCreateTemplate()` with full inline-styled HTML.

### S2-Q2: Template rendering pattern
`renderTemplate()` in `src/lib/messages.ts:55` does regex replacement of `{{key}}` tokens against a `Record<string, string>` data dict. Options for collapsing whitespace and handling missing values.

**No React Email components.** Templates are raw HTML.

`sendEmail()` in `src/lib/email.ts` — instantiates Resend per-call, accepts `{to, subject, html}`, returns `{success, messageId?, error?}`. `from` from env.

### S2-Q3: Cron job pattern
`src/app/api/jobs/send-email-reminders/route.ts` follows:
1. Auth: `x-cron-secret` header check
2. Advisory lock: `pg_try_advisory_lock(LOCK_ID)` — skip if locked
3. Query: `findAppointmentsForEmailReminder()`
4. Send loop: iterate, call send function, track sent/skipped/errors
5. Response: JSON summary `{total, sent, skipped, errors, durationMs}`
6. Finally: `pg_advisory_unlock()`

Dedup: `messageDedup` table with unique key per message.

## Steps to implement spec 16
1. Pick a new advisory lock ID (e.g. `482181`)
2. Create `src/app/api/jobs/connect-reengagement/route.ts` following the cron pattern
3. Query: shops where `stripeOnboardingStatus = 'pending'` AND `stripeAccountCreatedAt` between 24-48h ago AND not already sent
4. Add `connectReengagementSentAt` column to `shops` (or use `messageDedup`)
5. Use `sendEmail()` directly with inline HTML (no DB template needed — this is a one-off transactional email, not user-editable)
6. Register in Vercel Cron (`vercel.json`) with a schedule (daily, e.g. 05:00 UTC)
