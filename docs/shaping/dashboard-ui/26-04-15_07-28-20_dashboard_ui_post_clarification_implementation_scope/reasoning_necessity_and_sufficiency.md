# Reasoning — Necessity and Sufficiency

**Model:** Necessity and Sufficiency (`Mental_Models/Mental_Model_General/m16_necessity_and_sufficiency.md`)
**Applied to:** Dashboard UI: Post-Clarification Implementation Scope

---

## Core Statement (Applied)

For each dashboard feature, there is a gap between **necessary conditions** (what must be true for the feature to exist at all) and **sufficient conditions** (what must be true for the feature to be *correct*). The prior analysis showed that the dashboard has already shipped features with necessary conditions satisfied but sufficient conditions missing — the deposits-at-risk card exists (necessary: a number appears), but its currency is wrong (insufficient: the number is not always truthful).

Now that all 7 clarifying questions are answered, each feature has a known sufficient condition set. This model maps those conditions explicitly so that implementation can verify completeness rather than just presence.

---

## Feature-by-Feature Analysis

---

### Feature 1: Deposits at Risk (currently shipped, partially wrong)

**Desired outcome:** Owner sees the true captured deposit exposure on high-risk booked appointments in the selected window, in the correct currency.

**Necessary conditions (already met):**
- A number appears on the card ✓
- The number is derived from `payments.amountCents` ✓
- The card is scoped to the attention window ✓

**Sufficient conditions (not yet met):**
- [ ] The query groups by `payments.currency`, returning a currency-keyed map
- [ ] The formatter uses the currency from that map, not a hardcoded `"USD"`
- [ ] When multiple currencies are present, the card renders a per-currency breakdown (or a neutral "Multiple currencies" state) rather than summing across currencies
- [ ] The card has no expiry sublabel (expiry line is undefined; its absence is a correctness condition, not a missing feature)

**Gap:** The necessary condition (a number) was shipped. The sufficient conditions (truthful currency, mixed-currency guard) were not. This is the live correctness deficit.

**Definition of done for this feature:** All four sufficient conditions are met and verified with a shop that has bookings in a non-USD currency.

---

### Feature 2: High-Risk Customers KPI (to be implemented)

**Desired outcome:** Owner sees the count of unique customers with at least one booked high-risk appointment in the selected attention window.

**Necessary conditions:**
- A count appears on a card
- The count uses the high-risk threshold (tier `risk`, score `< 40`, or `voidedLast90Days >= 2`)

**Sufficient conditions:**
- [ ] Count is deduplicated by `customerId` — one customer with 3 appointments counts as 1
- [ ] Count is scoped to the selected attention window (changes when the period selector changes)
- [ ] Count excludes `cancelled` and `pending` appointments
- [ ] Count excludes risk-tier customers who have no booked appointment in the current window
- [ ] The card label reads `High-Risk Customers` (not `High-Risk Appointments`)
- [ ] A scope sublabel clarifies the window dependency (e.g., `In selected window`)
- [ ] `customerId` is present in the query select (currently missing — type drift fix required first)

**Gap:** The necessary conditions (some count on a card) existed with the old appointment-count implementation. None of the sufficient conditions were met. The old implementation satisfied necessary but not sufficient.

**Definition of done:** All 7 sufficient conditions are met. The count changes correctly when the period selector changes. A customer with 2 appointments in window appears once. A customer with 0 appointments in window does not appear.

---

### Feature 3: Global Search (to be implemented)

**Desired outcome:** Owner types a query, sees grouped customer + appointment results, selects one, and navigates to its detail page.

**Necessary conditions:**
- A search input is visible
- Submitting it returns some results

**Sufficient conditions:**
- [ ] Route is authenticated (`requireAuth()`) and derives `shopId` from session — never from client query params
- [ ] Customer search matches `fullName`, `email`, `phone` with case-insensitive partial match
- [ ] Phone search normalizes query digits before matching stored normalized numbers
- [ ] Appointment search matches customer fields and service name
- [ ] Appointment results are bounded to operationally relevant window (`booked/pending/ended`, `endsAt >= now() - 7 days`)
- [ ] Minimum input guards reject queries below threshold (≥ 2 chars for text, ≥ 4 digits for phone) without hitting DB
- [ ] Results capped at 5 per group
- [ ] Results navigate to existing routes (`/app/customers/[id]`, `/app/appointments/[id]`)
- [ ] Empty result state handled without error
- [ ] No `shopId` accepted from client

**Gap:** Feature does not yet exist. The necessary condition set (input + results) is straightforward to satisfy. The sufficient conditions (security, validation, correct matching, window bounds) are where implementation risk lives.

**Definition of done:** All 10 sufficient conditions are met. A search for a customer by the last 4 digits of their phone finds them. A search below 2 characters makes no DB call. A signed-out request returns 401.

---

### Feature 4: Daily Log Tab (to be implemented)

**Desired outcome:** Owner sees a reverse-chronological operational feed of recent activity, grouped by day, linking to appointment details.

**Necessary conditions:**
- A tab or view switch is present
- Some items appear in chronological order

**Sufficient conditions:**
- [ ] Feed merges exactly 3 sources: `appointments.createdAt`, emitted `appointment_events` (`cancelled` + `outcome_resolved` only), `message_log`
- [ ] No payment lifecycle items appear (even if `appointment_events` enum includes `payment_succeeded`)
- [ ] No slot recovery items appear
- [ ] No confirmation-reply items appear (no event row exists for them yet)
- [ ] Feed is bounded: last 7 days, max 50 items
- [ ] Items are sorted descending by `occurredAt`
- [ ] Items are grouped by calendar day in the UI
- [ ] Each item with an `appointmentId` links to `/app/appointments/[id]`
- [ ] No PII (raw phone numbers) rendered in item labels — use customer name
- [ ] No unread state, no resolution state, no row-level actions
- [ ] `appointment_events` query uses shop-scoped filter (not appointment-scoped) — requires the new index

**Necessary but not sufficient:** Having items appear in a list satisfies necessary. All 11 sufficient conditions must hold for the feed to be trustworthy as an operational surface.

**Definition of done:** All 11 conditions met. A test shop with recent cancellations, reminders, and bookings shows appropriate items and no items from excluded categories.

---

## The Sufficiency Pattern

Across all four features, the same pattern appears:

> **The necessary condition is easy to satisfy and creates the illusion of completion. The sufficient conditions are where correctness lives.**

The shop owner will not know that a card lacks a sufficient condition — they will see a number, trust it, and act on it. This is the Goodhart failure mode identified in the prior analysis: the metric becomes a management target before it meets its sufficient conditions.

**Practical rule for implementation:** Before marking any feature done, verify the sufficient condition list explicitly — not just that the feature visually exists. Code review should check the sufficient condition set, not just the presence of the feature.

---

## Completeness Check: Are the Sufficient Conditions Themselves Sufficient?

Asking the model's deeper question: could all the sufficient conditions be met and the feature still fail?

**For Deposits at Risk:** Yes — if the per-currency rendering has a rendering bug that silently shows one currency total when two should appear. The sufficient condition "mixed-currency guard" must include a test with actual multi-currency data, not just a unit test of the guard logic.

**For High-Risk Customers:** Yes — if the attention-window scoping logic has an off-by-one on the time boundary (e.g., an appointment at exactly `now + periodHours` is included or excluded inconsistently). The sufficient condition "scoped to selected window" requires an integration test, not just a function test.

**Key implication:** For each feature, add one end-to-end test that exercises the most dangerous edge case — not just unit tests of the individual sufficient conditions.
