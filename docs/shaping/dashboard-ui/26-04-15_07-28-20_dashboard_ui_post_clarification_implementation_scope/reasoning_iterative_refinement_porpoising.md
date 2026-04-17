# Reasoning — Iterative Refinement (Porpoising)

**Model:** Iterative Refinement / Porpoising (`Mental_Models/Mental_Model_General/m66_iterative_refinement_porpoising.md`)
**Applied to:** Dashboard UI: Post-Clarification Implementation Scope

---

## Core Statement (Applied)

Porpoising is the practice of diving into analysis or implementation, then deliberately surfacing to re-examine whether the problem definition still holds. Each surface produces a refined problem statement and a more precise solution hypothesis. The model warns explicitly against locking scope too early and then discovering mid-implementation that the problem was not correctly framed.

Applied here: the journey from design mock → problem statement → 7 spikes → MoSCoW → implementation IS a porpoising cycle. Understanding that cycle structure tells us when to dive and when to surface in the upcoming implementation.

---

## Mapping the Full Porpoise Cycle

### Dive 1 — Initial Design
**What happened:** A visual mock was produced for the dashboard redesign.
**Surface:** The design was presented to the development team. On surfacing, the team discovered 7 undefined feature contracts, 2 impossible controls, and 2 existing metric errors.
**Refined problem statement:** "The design cannot be implemented as shown — undefined contracts must be resolved first."

---

### Dive 2 — Problem Statement + Requirements Audit
**What happened:** A structured problem statement was written; a requirements audit was run against the codebase.
**Surface:** The problem statement produced 7 clarifying questions and a MoSCoW classification. On surfacing, the team had a prioritized, partially defined scope.
**Refined problem statement:** "7 specific questions must be answered before implementation can begin. 9 Must-Have items can proceed now."

---

### Dive 3 — 7 Spike Investigations
**What happened:** Each clarifying question was investigated as a bounded spike against the live codebase and schema.
**Surface:** All 7 questions answered. Product contracts locked. No-gos explicit. Rabbit holes documented.
**Refined problem statement:** "Implementation is now unblocked. The challenge is to build in the correct sequence without introducing new errors."

**This is the current position.** The team has surfaced from Dive 3. The question is: what does Dive 4 look like, and when do we surface from it?

---

### Dive 4 — Implementation (Current)

**What to dive into:** The 4 Shape Up bets, in sequence. Correctness first, then new features.

**The wrong dive:** Attempting to implement all 13 Must Have + Should Have items across all components simultaneously before surfacing. This is the pattern that produced the original problem — implementing ahead of validation.

**The right dive:**
- **Depth of dive:** Bet 1 (correctness fixes) + Bet 2 (high-risk customer KPI) only
- **Surface trigger:** Both bets are deployed and visible in a review environment (or production). The owner (or proxy) looks at the actual rendered output.

**Surface questions for Dive 4:**
- Does the deposits-at-risk card now show the correct currency? (If the shop has only USD bookings, this must be verified with a test scenario for multi-currency.)
- Does the high-risk customer count change correctly when the period selector changes?
- Does deduplication work — one customer with 2 appointments in window shows as 1?
- Does the service name column now populate correctly?
- Does `pnpm lint && pnpm typecheck` pass with zero errors after the `customerId` and `serviceName` type drift is resolved?

**What to re-examine on surfacing:**
- Did the currency-aware fix reveal any edge case in the formatting layer that changes the approach for Bets 3 or 4?
- Did implementing the `customerId` join expose any performance concern (does the query time change measurably)?
- Does the current `DashboardData` type now correctly reflect what the query returns, or does the type drift have further downstream effects in `AttentionRequiredTable` or other consumers?

**Refined problem statement after Dive 4 surface:** TBD — will be informed by what the implementation reveals.

---

### Dive 5 — Global Search (Bet 3) and Daily Log (Bet 4)

**Entry condition:** Dive 4 surface confirms correctness bets are working. No new type drift or query issues surfaced.

**What to dive into:** Bet 3 (search route + UI) and Bet 4 (daily log tab), potentially in parallel if two tracks are available.

**Surface trigger for search:** The search route is live, authenticated, tested. A query for a known customer name returns the correct result in under 200ms for a typical shop-sized dataset. A query below the minimum length returns no DB call (verify in query logging).

**Surface trigger for daily log:** The tab renders with correct items from all 3 sources. A test scenario with a recent cancellation, a reminder, and a booking shows all three item types correctly. No payment lifecycle items appear.

**Surface questions for Dive 5:**
- Did the daily log index (`appointment_events(shop_id, occurred_at desc)`) get applied? Is it reflected in the migration?
- Did the search route's `shopId`-from-session enforcement hold under testing? (Attempt a request with a spoofed shopId — verify rejection.)
- Did any item type in the daily log require data that wasn't available in the merge query, revealing a missing join?

---

## The Anti-Porpoising Pattern to Avoid

The model warns against analysis paralysis — iterating indefinitely without locking scope. The resolved clarifying questions represent a completed lock. The porpoising discipline at this stage is about **implementation** refinement, not further **definition** refinement.

**Specific anti-pattern to avoid:** Re-opening any of the 7 answered questions during implementation. If an edge case emerges that seems to challenge an answer (e.g., a discovery that some shops have more than 2 currencies in a single window), the right move is to surface that finding and make a rapid decision — not to restart the spike.

**Trigger for escalation (surface immediately, don't dive deeper):**
- Any implementation discovery that reveals a sufficient condition was wrong or missing
- Any query that returns unexpected shape (e.g., the `customerId` join produces duplicate rows due to an unexpected cardinality)
- Any type error that indicates more downstream drift than the two known fields

---

## The Porpoise Rhythm for This Sprint

```
NOW:        Diving — Bet 1 + Bet 2 implementation
SURFACE 1:  Correctness verified in review environment
            → Re-examine: any new drift? Any perf issue?
DIVE 2:     Bet 3 (search) + Bet 4 (daily log)
SURFACE 2:  Both features working end-to-end
            → Re-examine: anything learned that affects Could Have items?
DIVE 3:     Could Have items (if appetite remains: deposit retention rate %, new clients count)
SURFACE 3:  Sprint retrospective — what did the full cycle teach us?
            → Produce refined problem statement for next design iteration
```

**The key discipline:** Surface 1 must happen before Bet 3 begins. The temptation will be to start Bet 3 while Bet 1 is in review. Resist it — Bet 3 depends on the query contract fixed in Bet 1 (service name join, `customerId` select). Starting Bet 3 on the unfixed query creates merge conflicts and integration errors.

---

## Key Finding

The problem-statement → spikes → MoSCoW → implementation journey is a three-dive porpoising cycle. The team is now entering Dive 4. The porpoising discipline demands: dive only as deep as Bet 1 + Bet 2, surface to validate correctness, then dive into Bets 3 and 4 with refined understanding. Diving all the way to implementation completion without surfacing is the pattern that produced the original design-before-contract error — replicated now at the implementation level instead of the design level.
