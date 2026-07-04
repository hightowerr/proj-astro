# Slice 1b: Transfer Held Schema Migration

**Spec**: 02 | **Priority**: Foundation | **Files**: `src/lib/schema.ts`, `drizzle/0039_transfer_held.sql`

## Work

### 1. Add column to schema.ts
- **Where**: Appointments table definition, after `paymentStatus` column (~line 566)
- **Code**: `transferHeld: boolean("transfer_held").default(false).notNull(),`
- **Pattern**: Same as `excludeRiskFromOffers`, `topDepositWaived` — boolean with default false

### 2. Create migration file
- **File**: `drizzle/0039_transfer_held.sql`
- **SQL**: `ALTER TABLE "appointments" ADD COLUMN "transfer_held" boolean DEFAULT false NOT NULL;`
- **No backfill needed** — no existing appointments have this condition

### 3. Run migration
- Generate drizzle migration or manually create the SQL file per project convention
- Verify schema syncs cleanly

## Acceptance criteria
- [ ] `transfer_held` column exists on appointments table in schema.ts
- [ ] Migration file `0039_transfer_held.sql` created
- [ ] Column is `boolean`, default `false`, not null
- [ ] No enum changes to paymentStatus or financialOutcome
- [ ] lint + type-check pass
- [ ] Drizzle generates correct types (appointmentInsert/Select includes transferHeld)

## Dependencies
- None — additive schema change
