# Mental Models Analysis — Dashboard UI Design-to-Implementation Gap

**Date:** 2026-04-14  
**Problem source:** `docs/shaping/dashboard-ui/problem-statement.md`  
**Problem in one line:** The proposed dashboard design cannot be implemented as shown because ~half its features have no locked product contract, two controls imply non-existent workflows, and two existing metrics already contain factual errors.

---

## 1. Diagnosis — What Kind of Problem Is This?

Before selecting mental models, the problem type must be correctly identified.

### Presented vs. Discovered Problem

This is a **discovered problem**, not a presented one.

The *presented* problem is: "The dashboard needs to be improved to match the proposed design."  
The *discovered* problem is: "The design was built from a visual mock before any product contract existed for its metrics and controls, and the gap between what the design implies and what the system can back is now blocking implementation."

The distinction matters because:
- A *presented* problem implies you need to build what the design shows.
- A *discovered* problem implies you need to resolve the upstream definition gap first, or you will build the wrong thing confidently.

Acting on the presented problem without acknowledging the discovered one produces misleading software.

---

## 2. Iceberg Model — Four Levels of the Problem

### Level 1 — The Event (visible)
- Seven features in the proposed design have no backing product contract.
- Two controls (notification bell, new-appointment CTA) imply workflows the system cannot complete.
- Two existing metrics carry factual errors (hardcoded USD currency; appointment-count card labelled as "customers").

### Level 2 — The Pattern (recurring)
- The same gap appears across all seven undefined features: each was designed as a visual element before anyone asked "what query backs this?" or "what is the unit of measure?"
- The pattern is: design decisions were made at the *label level* without being matched to the *data contract level*.

### Level 3 — The Structure (what produces the pattern)
- There is no definition-of-done gate between design and implementation that requires a locked product contract for each metric and control before handoff.
- The design workflow treats visual completeness as implementation readiness.
- No one explicitly owns the question: "Does the data model support this card as drawn?"

### Level 4 — The Mental Model (the assumption driving the structure)
- **Assumption:** "If the design looks right, the system can back it."
- This assumption is false in a domain where every KPI has a denominator, a window, a currency, and an entity type — all of which must be independently defined and verified against the schema.

The real intervention is at **Level 3 and 4** — not patching the seven features one by one.

---

## 3. Solution-First Dynamic — The Root Pattern

The dashboard redesign is a textbook **Solution-First Dynamic**:

1. A visual mock was produced (the solution).
2. The mock was treated as the specification.
3. Implementation was expected to begin from the mock.
4. The product problems each feature is meant to solve were never locked.

Evidence from the problem statement:
- The `Monthly Retention %` card looks precise but "can look precise while actually mixing unrelated concepts" (spike-6).
- The `Expires in 48h` line has three plausible clocks with different applicability rules — the design picked the most intuitive label without picking a clock.
- The `High-Risk Customers` label names an entity the query never returns.

The coaching question this model demands: **"What problem is each card on this dashboard meant to solve for the shop owner?"** That question was not answered before the design was drawn.

---

## 4. Five Whys — Root Cause Drill

**Problem statement:** The proposed dashboard design cannot be implemented without first resolving 7 knowledge gaps and removing 2 controls that require non-existent workflows.

| Why | Answer |
|-----|--------|
| **Why** can't implementation start on the undefined features? | Because there is no locked definition of what each metric counts, which window it uses, what currency it shows, or what denominator it divides by. |
| **Why** are those definitions missing? | Because the design was produced from a visual mock rather than from a product contract that specified each metric's source, scope, and unit of measure. |
| **Why** was the design produced that way? | Because the design workflow has no explicit gate requiring metric definitions to be validated against the data model before visual design begins. |
| **Why** does that gate not exist? | Because the team operates on the assumption that visual design and product definition can proceed in parallel, when in this system they must be sequential — the schema constrains what is truthfully displayable. |
| **Root cause** | The design process does not enforce a *data contract first* discipline before visual composition. Visual completeness is being treated as a proxy for product readiness, which it is not in a system where every KPI is schema-constrained. |

---

## 5. Garbage In, Garbage Out — The Metric Quality Problem

The dashboard has two confirmed cases of GIGO already in production:

**Case 1 — Currency hardcoding (Type mismatch)**  
The deposits-at-risk card sums `payments.amountCents` across all currencies then formats the result as USD. This is a *type problem*: the wrong unit applied to valid data. A shop that switches from USD to GBP will see its deposits-at-risk figure display a mathematically nonsensical number without any warning.

**Case 2 — Label/unit mismatch (Quality problem)**  
The `High-Risk Appointments` card passes `highRiskAppointments.length` to a card now labelled `High-Risk Customers`. One customer with three high-risk bookings would show a count of `3` next to a label that implies `1`. This is *right kind of input, wrong definition* — the data exists but the label-to-query contract is broken.

The GIGO principle warns: **"Garbage in, gospel out."** Dashboard outputs have high credibility with the owner. A number that appears on a professionally designed card will be trusted and acted upon. Incorrect KPIs presented with visual confidence are operationally dangerous — they will influence real business decisions (who to chase, how much exposure exists, which customers to prioritize).

**Inputs that need validation before the dashboard ships any new metric:**
- What entity type does each count return? (appointments vs. customers vs. payments)
- What currency does each money total use? (per-payment vs. shop-wide default)
- What window does each card follow? (selected attention window vs. always 30 days vs. shop-wide)
- What status filter applies? (booked only vs. all active vs. all-time)

---

## 6. Bottleneck Analysis — Where Flow Is Stuck

The implementation pipeline has one clear constraint:

**The bottleneck is product definition — not code.**

The constraint is not:
- Developer skill
- Schema complexity
- Missing infrastructure (mostly)

The constraint is: **7 features cannot be specified, estimated, or correctly built until someone makes a product decision about what each one means.**

Applying Theory of Constraints logic:

| Step | Application |
|------|-------------|
| **Identify the constraint** | Undefined product contracts for 7 features |
| **Exploit it** | Focus all product/design attention on locking definitions before writing any implementation code for those features |
| **Subordinate everything else** | Do not begin UI work, query work, or testing for undefined features until the contract is locked |
| **Elevate the constraint** | Use the 7 clarifying questions from the problem statement as the forcing function — one decision per question unblocks one feature |
| **Repeat** | Once contracts are locked, the new constraint becomes implementation capacity |

The 9 features that *are* defined (Must Have in MoSCoW) are **not bottlenecked** — they can proceed in parallel with definition work on the 7 undefineds.

---

## 7. Via Negativa — What to Remove First

Before adding any new capability, subtractive thinking identifies what should be eliminated to reduce fragility:

### Remove unconditionally (no product decision needed)

| Item | Why remove |
|------|-----------|
| Notification bell | No notification model exists. Ships as a dead/misleading control. Hardest to remove once owners expect it. |
| Internal "New Appointment" CTA | No owner-side booking flow. If clicked, the flow either breaks or routes to the customer-facing booking page confusingly. |
| `Expires in 48h` sublabel | Three possible clocks, none universally applicable. Conveys false precision. Any value shown will be wrong for some appointments. |
| Upcoming trend delta (v1) | Requires a daily snapshot table that does not exist. Any delta computed from mutable current state will silently produce wrong numbers after cancellations. |
| Hardcoded USD formatter | Already wrong for any non-USD shop. Costs almost nothing to fix; the risk of not fixing it grows as more shops change currency. |

### The Via Negativa principle here:
Removing these five elements produces a more trustworthy dashboard than shipping them incorrectly would. The owner who sees no expiry line trusts the card. The owner who sees a wrong expiry line loses trust in the entire surface.

---

## 8. Inversion — How to Guarantee Dashboard Failure

Asking "what would make this dashboard definitely fail?" surfaces the highest-risk decisions:

| Failure path | Mechanism |
|-------------|-----------|
| Ship `High-Risk Customers` backed by appointment count | Owner acts on a KPI they believe counts people but actually counts bookings. Outreach volume is miscalibrated. |
| Ship hardcoded USD on a GBP shop | Deposits-at-risk shows a nonsensical number. Owner either ignores the card or makes wrong decisions about financial exposure. |
| Ship the notification bell with no model | Owner looks for a notification center that doesn't exist. Trust in the product erodes. |
| Ship `Expires in 48h` with an undefined clock | Expiry messaging is sometimes right, sometimes wrong, with no visible signal to the owner about which case applies. |
| Implement the trend delta from mutable state | Delta flips negative whenever any appointment in the window is cancelled, causing the owner to misread healthy activity as decline. |
| Ship the monthly retention % with a mixed denominator | The percentage looks like it measures something it doesn't. Once someone models business decisions off it, correcting the definition causes whiplash. |

**The inversion insight:** The most dangerous failures are not caused by things that look broken — they are caused by things that look correct but are factually wrong. A dashboard that displays authoritative-looking numbers with hidden definition errors is worse than a dashboard with placeholder states, because the errors will be trusted.

---

## 9. Second-Order Thinking — Downstream Consequences

### If we ship the misleading controls and undefined metrics as-is:

**First-order:** Dashboard looks complete and feature-rich at launch.

**Second-order:**
- Owner makes outreach decisions based on `High-Risk Customers` count that is actually an appointment count. One customer with 3 bookings gets triple the follow-up. Trust in the KPI erodes when inconsistencies surface.
- Owner in a GBP shop sees USD deposits-at-risk. When they spot the discrepancy, they begin questioning all other numbers on the dashboard.
- Owner clicks the notification bell expecting unread alerts; nothing works. "It's broken" — but the problem is architectural, not a bug.

**Third-order:**
- Because KPI trust is damaged, the owner stops using the dashboard for decisions and reverts to manual appointment checking. The feature investment is effectively wasted.
- Once users have expectations about notification behavior, removing the bell generates complaints even though the bell never worked. The path to correct it becomes politically harder over time.

### If we resolve definitions first:

**First-order:** Delayed launch of the 7 undefined features.

**Second-order:** Every shipped metric can be defended to the owner as factually accurate. The 9 defined features ship with full credibility, establishing trust as the baseline.

**Third-order:** When the remaining 7 features ship with locked definitions, they slot into a dashboard whose authority is already established. Owner adoption is higher because the surface has never misled them.

---

## 10. Leverage Points — Where to Intervene

Ranking interventions by leverage (low to high):

| Level | Intervention | Leverage |
|-------|-------------|---------|
| Parameters | Fix hardcoded USD formatter | Low-medium — removes one factual error, does not prevent future ones |
| Parameters | Rename high-risk card label | Low-medium — fixes one mislabelling, does not address the pattern |
| Information flows | Make the 7 clarifying questions explicit decisions required before sprint planning | Medium — blocks undefined work from entering implementation |
| Rules/structure | Add a "data contract gate" to the design-to-development handoff — each metric must have: entity type, window, currency, status filter, and denominator documented before design is approved | High — prevents new undefined metrics from entering the backlog |
| Goals/mindset | Redefine "design complete" as "metric definitions are locked and verified against schema" rather than "the screen looks correct" | Highest — addresses the Level 4 iceberg assumption directly |

**The highest-leverage intervention is not fixing the 7 features — it is changing the definition of what it means for a design to be ready for implementation.**

---

## 11. Leading vs. Lagging Indicators — KPI Taxonomy Problem

The proposed dashboard mixes leading and lagging indicators without labelling them, which contributes to definition ambiguity.

| Card | Type | Issue |
|------|------|-------|
| Attention Required queue | Leading | Correctly positioned — predicts who needs action now |
| Upcoming Appointments count | Leading | Correctly positioned — current forward load |
| Deposits at Risk | Leading | Correctly positioned — forward financial exposure |
| High-Risk Customers | Leading | Correctly positioned — but currently backed by a lagging appointment count |
| Trend delta (upcoming vs last month) | Lagging | Requires historical snapshot — cannot be computed from current state |
| Monthly Retention % | Lagging | Business outcome metric — no actionable input for the owner at the dashboard level |
| Tier distribution | Lagging | Historical scoring outcome — informs understanding, does not drive daily action |

**Insight:** The cards with the most definition problems (`Trend delta`, `Monthly Retention %`) are lagging indicators that require a historical baseline the system does not yet store. The cards that are ready to ship are all leading indicators that can be computed from current state.

This suggests a prioritization rule: **ship leading indicators first; defer lagging indicators until the snapshot infrastructure exists.**

---

## 12. Multiple Working Hypotheses — Root Cause Candidates

Three competing hypotheses for why this gap exists. All three are likely partially true.

**H1 — Design process gap**  
The design workflow does not require metric definitions to be locked before visual composition begins. Visual mockups are treated as specifications rather than as one input to a specification.

*Evidence for:* Seven features have well-drawn visuals and zero product contracts. The gap is systematically at the definition level, not at the visual level.

**H2 — Product ownership gap**  
There is no clear owner of the question "what does this metric mean in the schema?" between design and engineering. Designers make visual decisions. Engineers implement what is shown. No one holds the "data contract" responsibility.

*Evidence for:* The currency hardcoding and label mismatch both exist in production — they are not new problems introduced by the redesign. They were never caught because no role was responsible for auditing metric definitions.

**H3 — Scope creep through visual ambition**  
The proposed design includes features that require product workflows significantly beyond the current system. These were included because they look right on a dashboard, not because the product was ready to back them.

*Evidence for:* The requirements audit explicitly flags two controls as "not feasible now" and four metrics as requiring new infrastructure. The pattern is consistent with a design optimizing for visual completeness rather than product feasibility.

**Most likely root cause:** H1 and H2 compound each other. H3 is a symptom of H1 — when there is no definition gate, the design expands to include everything that could exist on a dashboard, not just what the system can truthfully display today.

---

## 13. Final Report — Synthesis and Recommendations

### What the problem actually is (restated with mental model precision)

> A design was produced using a Solution-First Dynamic, treating visual completeness as product readiness. The design's outputs — seven undefined features, two impossible controls, two inaccurate existing metrics — are Garbage In that will produce Garbage Out if implemented without resolving the upstream definition failures. The bottleneck to implementation is not code; it is seven product decisions that have not been made. The highest-leverage intervention is not in the codebase — it is in the design-to-implementation process.

---

### Three tiers of action

#### Tier 1 — Remove (Via Negativa, no product decisions needed)

| # | Remove | Replacement |
|---|--------|------------|
| 1 | Notification bell | Nothing — defer until notification model exists |
| 2 | Internal "New Appointment" CTA | "Copy booking link" using existing public route |
| 3 | `Expires in 48h` sublabel | Neutral scope text: `Captured deposits in selected window` |
| 4 | Upcoming trend delta | Count-only card until snapshot table exists |
| 5 | Hardcoded USD formatter | Currency-aware grouping per `payments.currency` |

#### Tier 2 — Decide (7 clarifying questions, one session)

| Question | Unblocks |
|----------|---------|
| Q1: Which of the 7 undefined features are required for v1? | Sprint scope |
| Q2: Customers or appointments on high-risk card? | High-risk KPI query + label |
| Q3: Multi-currency display rule for deposits card? | Deposits-at-risk query |
| Q4: Notification bell in or out? | Architecture decision |
| Q5: Which event types in daily log, and is an append-only table acceptable? | Daily log data model |
| Q6: Which expiry clock if expiry line is reinstated? | Expiry sublabel (if reinstated) |
| Q7: Search filters tables or navigates to detail routes? | Search route and UI contract |

#### Tier 3 — Prevent (process change, highest leverage)

Add a **data contract gate** to the design-to-development handoff. Before any metric is included in a design, it must have a completed contract card:

```
Metric contract card
─────────────────────────────────────────
Name:          [label shown on card]
Entity type:   [what is being counted: appointments / customers / payments]
Window/scope:  [e.g., selected attention window / rolling 30d / shop-wide]
Status filter: [e.g., booked only / all active / all-time]
Currency rule: [e.g., per-payment grouping / shop default / N/A]
Denominator:   [e.g., N/A for counts; total booked for %; retained+refunded for retention]
Backing query: [file:line or "needs new query"]
Schema ready:  [yes / needs migration / needs new table]
```

If a contract card cannot be completed, the metric is not ready to design.

---

### Prioritized implementation path

```
Phase 0 (now, no code):
  → Apply Tier 1 removals to the design
  → Answer the 7 Tier 2 questions in one product session

Phase 1 (sprint, defined work):
  → Implement all 9 MoSCoW Must-Haves (fully defined, no blockers)
  → Implement Should-Haves whose Tier 2 answers are locked

Phase 2 (next sprint, infrastructure):
  → Build snapshot table → unlock trend delta and retention %
  → Build unified event model → unlock daily log

Ongoing:
  → Enforce data contract gate on all future dashboard design
```

---

### Risk to watch

If Phase 0 removals are skipped due to stakeholder pressure ("the design looks better with the bell"), the second-order effect is irreversibility: once owners expect the bell to work, removing it costs more than never shipping it. **The window to remove a misleading control is before it ships, not after.**

---

*Mental models applied: Presented vs. Discovered Problems · Iceberg Model · Solution-First Dynamic · Five Whys · Garbage In / Garbage Out · Bottleneck Analysis · Via Negativa · Inversion · Second-Order Thinking · Leverage Points · Leading vs. Lagging Indicators · Multiple Working Hypotheses*
