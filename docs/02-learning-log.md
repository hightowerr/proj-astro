# Learning Log: /src Code Patterns for PM → Developer

**Audience:** PM learning to code (knows Python, learning JavaScript/TypeScript)
**Date:** 2026-03-19
**Codebase:** Astro Booking System (Next.js 16, TypeScript, PostgreSQL)

---

## 1. Three Patterns to Memorize for Next Time

### Pattern 1: Input Validation at API Boundaries (The Zod Guard)

**Where I saw it:** `src/app/api/bookings/create/route.ts:20-30`

**What it does:**
```typescript
const createBookingSchema = z.object({
  shop: z.string().min(1),
  startsAt: z.string().datetime(),
  customer: z.object({
    fullName: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(1),
    email: z.string().trim().email(),
  }),
});

const parsed = createBookingSchema.safeParse(body);
if (!parsed.success) {
  return Response.json({ error: "Invalid request" }, { status: 400 });
}
```

**Python equivalent:**
```python
from pydantic import BaseModel, EmailStr, validator

class CreateBookingRequest(BaseModel):
    shop: str
    startsAt: datetime
    customer: CustomerData

    @validator('shop')
    def shop_not_empty(cls, v):
        if not v or len(v) == 0:
            raise ValueError('shop cannot be empty')
        return v
```

**Why it matters:**
- **Never trust user input** - this is the #1 security rule
- Validation happens FIRST, before any database calls
- Returns early with clear error messages
- Type safety: After validation passes, TypeScript knows exactly what types you have

**When to use:**
- **Always** at API route handlers (`POST`, `PUT`, `PATCH` endpoints)
- Before processing external data (webhooks, form submissions)
- At system boundaries (user input → your code)

**PM Takeaway:**
> Think of Zod schemas as **"contracts at the gate"**. Just like airport security checks your passport BEFORE you board, Zod checks data BEFORE it enters your system. In Python you'd use Pydantic for the same pattern.

---

### Pattern 2: Message/Template Versioning System (The Time Machine)

**Where I saw it:** `src/lib/messages.ts:14-80`, `src/lib/schema.ts:150-170`

**What it does:**
```typescript
// 1. Templates are versioned and stored in the database
export const getOrCreateTemplate = async (
  key: string,
  channel: MessageChannel,  // "sms" | "email"
  version: number,
  seed: { bodyTemplate: string }
) => {
  // Look for existing template
  const existing = await db.query.messageTemplates.findFirst({
    where: (table, { and, eq }) =>
      and(
        eq(table.key, key),
        eq(table.channel, channel),
        eq(table.version, version)
      ),
  });

  if (existing) return existing;

  // Create new version if not found
  return await db.insert(messageTemplates).values({
    key,
    channel,
    version,
    bodyTemplate: seed.bodyTemplate,
  });
};

// 2. Templates use mustache-style variables
export const renderTemplate = (
  template: string,
  data: Record<string, string>
) => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] ?? `{{${key}}}`;  // Preserve missing vars
  });
};

// 3. Deduplication prevents duplicate sends
const hash = createHash("sha256").update(renderedBody).digest("hex");
await db.insert(messageDedup).values({
  appointmentId,
  purpose,
  channel,
  bodyHash: hash,
});
```

**Python equivalent:**
```python
from jinja2 import Template
import hashlib

# Template versioning
def get_or_create_template(key: str, channel: str, version: int):
    existing = db.query(MessageTemplate).filter_by(
        key=key, channel=channel, version=version
    ).first()
    if existing:
        return existing
    return MessageTemplate(key=key, channel=channel, version=version)

# Rendering
template = Template("Hi {{name}}, your appointment is at {{time}}")
rendered = template.render(name="Alice", time="3pm")

# Deduplication
body_hash = hashlib.sha256(rendered.encode()).hexdigest()
```

**Why it matters:**
- **Versioning** = can change templates without breaking old appointments
- **Deduplication** = prevents sending duplicate SMS (saves money, better UX)
- **Variables** = reusable templates for different customers/appointments
- **Audit trail** = every message is logged with timestamp, status, hash

**When to use:**
- Sending notifications (SMS, email, push)
- Any user-facing text that might change over time
- Systems where you need to prove "we sent this exact message at this time"

**PM Takeaway:**
> This is like **"track changes" for messages**. Version 1 of your SMS might say "Your appointment is tomorrow" but Version 2 adds "Reply STOP to cancel". Old appointments still use Version 1, new ones use Version 2. The hash prevents sending the same message twice (like how Git uses hashes to detect duplicate commits).

---

### Pattern 3: Database Transactions for Multi-Step Operations (The All-or-Nothing Promise)

**Where I saw it:** `src/lib/queries/appointments.ts:630-850`

**What it does:**
```typescript
export async function createAppointment(input: CreateAppointmentInput) {
  // Start transaction - either ALL steps succeed or NONE do
  return await db.transaction(async (tx) => {

    // Step 1: Find or create customer
    const customer = await upsertCustomer(tx, {
      shopId: input.shopId,
      fullName: input.customer.fullName,
      phone: input.customer.phone,
      email: input.customer.email,
    });

    // Step 2: Create immutable policy snapshot
    const [policyVersion] = await tx.insert(policyVersions).values({
      shopId: input.shopId,
      currency: policy.currency,
      depositAmountCents: policy.depositAmountCents,
    }).returning();

    // Step 3: Create appointment
    const [appointment] = await tx.insert(appointments).values({
      shopId: input.shopId,
      customerId: customer.id,
      policyVersionId: policyVersion.id,
      startsAt: input.startsAt,
    }).returning();

    // Step 4: Create payment record
    const [payment] = await tx.insert(payments).values({
      appointmentId: appointment.id,
      amountCents: 2000,
      status: "pending",
    }).returning();

    // If ANY step fails, ALL changes are rolled back
    return { appointment, customer, payment };
  });
}
```

**Python equivalent:**
```python
from sqlalchemy.orm import Session

def create_appointment(db: Session, input: CreateAppointmentInput):
    try:
        # Step 1: Customer
        customer = upsert_customer(db, input.customer)

        # Step 2: Policy snapshot
        policy_version = PolicyVersion(
            shop_id=input.shop_id,
            currency=policy.currency,
            deposit_amount_cents=policy.deposit_amount_cents
        )
        db.add(policy_version)
        db.flush()  # Get ID without committing

        # Step 3: Appointment
        appointment = Appointment(
            shop_id=input.shop_id,
            customer_id=customer.id,
            policy_version_id=policy_version.id,
            starts_at=input.starts_at
        )
        db.add(appointment)
        db.flush()

        # Step 4: Payment
        payment = Payment(
            appointment_id=appointment.id,
            amount_cents=2000,
            status="pending"
        )
        db.add(payment)

        # All succeed together
        db.commit()
        return appointment, customer, payment

    except Exception as e:
        # Any failure rolls back ALL changes
        db.rollback()
        raise
```

**Why it matters:**
- **Atomicity** = either all steps succeed or none do (no half-created bookings)
- **Data integrity** = appointment always has a customer, policy, and payment
- **Error recovery** = if payment creation fails, customer/appointment are rolled back
- **Consistency** = database never in invalid state (e.g., appointment without customer)

**When to use:**
- Creating records across multiple tables that depend on each other
- Money operations (charge card + create order + update inventory)
- Any workflow where partial completion would be broken

**Real-world example from our code:**
If Stripe payment creation fails, we don't want a zombie appointment in the database. The transaction ensures: **No payment = No appointment**.

**PM Takeaway:**
> Transactions are like **"undo if anything goes wrong"** for databases. Imagine filling out a 5-step form online. If step 4 fails, you don't want steps 1-3 permanently saved with step 4 missing. Transactions guarantee: either you complete ALL 5 steps, or NONE of them stick. In Python this is `db.commit()` vs `db.rollback()`.

---

## 2. One Anti-Pattern We Used (That I Should Avoid)

### Anti-Pattern: The "God Function" (Functions That Do Too Much)

**Where I saw it:** `src/lib/queries/appointments.ts` - `createAppointment()` function

**The problem:**
```typescript
export async function createAppointment(input) {
  return await db.transaction(async (tx) => {
    // Lines 630-850 = 220 lines in ONE function doing:

    // 1. Load shop settings (20 lines)
    const settings = await getBookingSettingsForShop(tx, input.shopId);

    // 2. Load shop policy (30 lines)
    const policy = await tx.query.shopPolicies.findFirst(...);

    // 3. Upsert customer (50 lines)
    const customer = await upsertCustomer(tx, ...);

    // 4. Load customer score/tier (40 lines)
    const scoreData = await loadCustomerScoreTx(tx, ...);

    // 5. Calculate tier pricing (30 lines)
    const tierPricing = applyTierPricingOverride(...);

    // 6. Create policy snapshot (20 lines)
    const policyVersion = await tx.insert(policyVersions).values(...);

    // 7. Create appointment (30 lines)
    const appointment = await tx.insert(appointments).values(...);

    // 8. Create Stripe payment intent (40 lines)
    const paymentIntent = await stripe.paymentIntents.create(...);

    // 9. Create payment record (20 lines)
    const payment = await tx.insert(payments).values(...);

    // 10. Create manage token (15 lines)
    const token = await createManageToken(...);

    // 11. Update booking URL (10 lines)
    await tx.update(appointments).set({ bookingUrl: ... });

    // 12. Create contact preferences (15 lines)
    await tx.insert(customerContactPrefs).values(...);

    // RESULT: 220 lines, 12 responsibilities, impossible to test individually
  });
}
```

**Why it's bad:**
1. **Hard to test** - can't test "policy snapshot creation" without also testing "Stripe payment" and "customer upsert"
2. **Hard to debug** - when it breaks, which of the 12 steps failed?
3. **Hard to reuse** - what if I want to create an appointment WITHOUT Stripe payment?
4. **Hard to understand** - takes 10 minutes to read and comprehend
5. **Violates Single Responsibility Principle** - one function should do ONE thing well

**Better approach:**
```typescript
// GOOD: Break into smaller, focused functions

async function createAppointment(input) {
  return await db.transaction(async (tx) => {
    // Each helper does ONE thing and can be tested independently
    const customer = await resolveCustomer(tx, input);
    const pricing = await resolvePricing(tx, input.shopId, customer);
    const policySnapshot = await createPolicySnapshot(tx, pricing);
    const appointment = await createAppointmentRecord(tx, {
      customer,
      policySnapshot,
      startsAt: input.startsAt,
    });
    const payment = await createPaymentIfRequired(tx, appointment, pricing);
    const manageLink = await createManageLink(tx, appointment);

    return { appointment, customer, payment, manageLink };
  });
}

// Each helper is 20-40 lines, testable, reusable
async function resolveCustomer(tx, input) { /* ... */ }
async function resolvePricing(tx, shopId, customer) { /* ... */ }
async function createPolicySnapshot(tx, pricing) { /* ... */ }
async function createAppointmentRecord(tx, data) { /* ... */ }
async function createPaymentIfRequired(tx, appointment, pricing) { /* ... */ }
async function createManageLink(tx, appointment) { /* ... */ }
```

**Python equivalent:**
```python
# BAD: 200-line function
def create_appointment(input):
    # ... 200 lines doing 12 things ...
    pass

# GOOD: Orchestrator + focused helpers
def create_appointment(input):
    with db.transaction():
        customer = resolve_customer(input)
        pricing = resolve_pricing(customer)
        policy_snapshot = create_policy_snapshot(pricing)
        appointment = create_appointment_record(customer, policy_snapshot)
        payment = create_payment_if_required(appointment, pricing)
        return appointment, customer, payment

# Each helper is 20-40 lines
def resolve_customer(input): pass
def resolve_pricing(customer): pass
def create_policy_snapshot(pricing): pass
```

**How to avoid:**
- **Rule of thumb:** If a function is >100 lines, it's probably doing too much
- **Single Responsibility Principle:** Each function should do ONE thing
- **Extract 'til you drop:** Keep extracting helpers until each function is obvious
- **Test as you go:** If it's hard to test, it's too big

**PM Takeaway:**
> A "God Function" is like a 50-page meeting agenda. By the time you get to item #12, you've forgotten what item #1 was about. Better approach: **Break big meetings into focused 30-minute sessions**. Same with code: break big functions into focused helpers. Each helper should be explainable in one sentence.

---

## 3. Most Complex Technical Decision: Policy Snapshots

### The Problem (Explained for PMs)

**Scenario:**
1. January 1st: Shop owner sets deposit policy = $20
2. Customer books appointment for February 1st and pays $20 deposit
3. January 15th: Shop owner changes policy to $50 deposit
4. February 1st: Customer no-shows

**Question:** Do you keep $20 (the policy when they booked) or $50 (current policy)?

**Legal answer:** $20 (the policy they agreed to when booking)

**Technical challenge:** How do you remember "what the policy WAS on January 1st" when it's now February?

---

### The Solution: Immutable Policy Snapshots

**Core idea:** When someone books, we **freeze a copy** of the policy and attach it to their appointment.

**Database schema:**
```typescript
// TABLE 1: Current policies (changeable)
export const shopPolicies = pgTable("shop_policies", {
  id: uuid("id").primaryKey(),
  shopId: uuid("shop_id").notNull(),
  depositAmountCents: integer("deposit_amount_cents"),  // Can be updated
  cancelCutoffMinutes: integer("cancel_cutoff_minutes"), // Can be updated
  // ... other fields
});

// TABLE 2: Frozen snapshots (immutable)
export const policyVersions = pgTable("policy_versions", {
  id: uuid("id").primaryKey(),
  shopId: uuid("shop_id").notNull(),
  depositAmountCents: integer("deposit_amount_cents"),  // FROZEN at booking time
  cancelCutoffMinutes: integer("cancel_cutoff_minutes"), // FROZEN at booking time
  createdAt: timestamp("created_at").notNull(),          // When snapshot was taken
  // ... same fields as shopPolicies but READ-ONLY
});

// TABLE 3: Appointments reference the snapshot
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey(),
  customerId: uuid("customer_id").notNull(),
  policyVersionId: uuid("policy_version_id").references(
    () => policyVersions.id  // Points to FROZEN snapshot, not current policy
  ),
  startsAt: timestamp("starts_at").notNull(),
  // ... other fields
});
```

**How it works:**
```typescript
// When customer books appointment (January 1st)
async function createAppointment(input) {
  return await db.transaction(async (tx) => {

    // Step 1: Load CURRENT policy from shopPolicies table
    const currentPolicy = await tx.query.shopPolicies.findFirst({
      where: eq(shopPolicies.shopId, input.shopId)
    });
    // currentPolicy = { depositAmountCents: 2000 }  // $20

    // Step 2: Create FROZEN COPY in policyVersions table
    const [snapshot] = await tx.insert(policyVersions).values({
      shopId: input.shopId,
      depositAmountCents: currentPolicy.depositAmountCents,  // 2000
      cancelCutoffMinutes: currentPolicy.cancelCutoffMinutes, // 1440
      createdAt: new Date(),  // January 1st
    }).returning();
    // snapshot.id = "abc-123"

    // Step 3: Link appointment to the SNAPSHOT (not current policy)
    const [appointment] = await tx.insert(appointments).values({
      customerId: customer.id,
      policyVersionId: snapshot.id,  // "abc-123" (frozen version)
      startsAt: input.startsAt,
    }).returning();

    return appointment;
  });
}

// When shop owner changes policy (January 15th)
async function updateShopPolicy(shopId, newDeposit) {
  await db.update(shopPolicies)
    .set({ depositAmountCents: 5000 })  // Change to $50
    .where(eq(shopPolicies.shopId, shopId));

  // OLD appointments still reference policyVersions.id="abc-123" (still shows $20)
  // NEW appointments will get a NEW snapshot with $50
}

// When resolving appointment outcome (February 1st)
async function resolveOutcome(appointmentId) {
  // CRITICAL: Join to policyVersions, NOT shopPolicies
  const appointment = await db.query.appointments.findFirst({
    where: eq(appointments.id, appointmentId),
    with: {
      policyVersion: true,  // Load the FROZEN snapshot
    }
  });

  const depositToKeep = appointment.policyVersion.depositAmountCents;
  // depositToKeep = 2000 ($20) - the policy when they booked
  // NOT 5000 ($50) - the current policy
}
```

**Python equivalent concept:**
```python
from datetime import datetime
from copy import deepcopy

# Current mutable policy
class ShopPolicy:
    def __init__(self):
        self.deposit_cents = 2000

    def update_deposit(self, new_amount):
        self.deposit_cents = new_amount  # Can change

# Frozen immutable snapshot
class PolicySnapshot:
    def __init__(self, policy: ShopPolicy):
        # Deep copy = freeze current state
        self.deposit_cents = policy.deposit_cents
        self.created_at = datetime.now()
        self._frozen = True  # Mark as immutable

    def __setattr__(self, name, value):
        if hasattr(self, '_frozen') and self._frozen:
            raise AttributeError("PolicySnapshot is immutable")
        super().__setattr__(name, value)

# Usage
shop_policy = ShopPolicy()  # deposit = $20

# Customer books (Jan 1)
snapshot = PolicySnapshot(shop_policy)  # Freeze copy at $20
appointment.policy_snapshot = snapshot

# Shop changes policy (Jan 15)
shop_policy.update_deposit(5000)  # Now $50

# Resolve appointment (Feb 1)
refund_amount = appointment.policy_snapshot.deposit_cents  # Still $20!
```

**Why this pattern matters:**

1. **Legal Protection:** Proves "customer agreed to THIS policy"
2. **Audit Trail:** Can see exactly what terms applied when booking was made
3. **Prevents Retroactive Changes:** Shop owner can't change past agreements
4. **Historical Accuracy:** Reports show "what the policy was" at any point in time

**Common pitfall (we almost made this mistake):**
```typescript
// WRONG: Joining to current policy
const appointment = await db.query.appointments.findFirst({
  with: {
    shop: {
      with: {
        policy: true  // ❌ This gets CURRENT policy, not booking-time policy
      }
    }
  }
});

// RIGHT: Always join to frozen snapshot
const appointment = await db.query.appointments.findFirst({
  with: {
    policyVersion: true  // ✅ This gets FROZEN snapshot from booking time
  }
});
```

**Real-world analogy:**
> This is like **"price-lock guarantees"** at gyms or phone carriers:
> - You sign up for $20/month plan on January 1st
> - They raise prices to $50/month on January 15th
> - You still pay $20/month (your locked-in rate)
> - New members pay $50/month (current rate)
>
> The "policy snapshot" is your **signed contract** from January 1st that they can't retroactively change.

**Python/Django equivalent:**
- Django's `historical records` library does this automatically
- SQLAlchemy: you'd implement versioning with `created_at` timestamps
- Think of it like Git commits: each appointment "commits" the policy state at that moment

**When to use this pattern:**
- Financial transactions (pricing, fees, tax rates)
- Legal agreements (terms of service, policies, SLAs)
- Regulatory compliance (audit trail requirements)
- Any time you need to prove "what the rules were" at a specific point in time

---

## Summary: PM Cheat Sheet

### Pattern Recognition Framework

When reviewing code, ask:

1. **Input validation** - "Is there a Zod/Pydantic schema guarding this API?"
2. **Versioning** - "Can this text/policy change? Do we need snapshots?"
3. **Transactions** - "Do these operations need to succeed together or fail together?"
4. **Function size** - "Can I explain this function in one sentence? If not, it's too big."

### Red Flags to Watch For

- ❌ API routes that don't validate input
- ❌ Functions longer than 100 lines
- ❌ Database operations without transactions (when creating related records)
- ❌ Joining to "current" policy instead of historical snapshot
- ❌ No message deduplication (sending same SMS twice costs money)

### Quick Wins to Request

- ✅ "Can we add input validation to this endpoint?"
- ✅ "Should we version these email templates?"
- ✅ "Do we need a transaction here? These operations seem related."
- ✅ "This function is really long - can we break it into helpers?"

### Terms to Impress Engineers

- **"Schema validation at the boundary"** (Pattern 1)
- **"Immutable snapshots for audit trail"** (Pattern 2/3)
- **"Atomic transaction for data consistency"** (Pattern 3)
- **"Single Responsibility Principle"** (Anti-Pattern)
- **"Idempotency"** (message deduplication)

---

## Appendix: File Size Analysis

**What I learned about code organization:**

| File | Lines | Assessment |
|------|-------|------------|
| `src/lib/queries/appointments.ts` | 1,268 | ⚠️ Too large - should be split |
| `src/lib/calendar-conflicts.ts` | 445 | ✅ Acceptable (single domain) |
| `src/lib/confirmation.ts` | 409 | ✅ Acceptable (single domain) |
| `src/lib/messages.ts` | 405 | ✅ Acceptable (cohesive helpers) |
| `src/lib/slot-recovery.ts` | 366 | ✅ Acceptable (focused feature) |
| `src/lib/schema.ts` | 733 | ✅ Acceptable (database schema) |

**Rule of thumb:** Files >500 lines need scrutiny. Functions >100 lines need refactoring.

---

**Next time I review code, I'll look for:** Zod schemas, transactions, snapshots, and functions >100 lines.

**End of Learning Log**
