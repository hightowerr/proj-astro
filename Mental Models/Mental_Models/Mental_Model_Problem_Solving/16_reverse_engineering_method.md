# m01_reverse_engineering_method.md

**Category:** Systems Thinking

**Description:**
The Reverse Engineering Method evaluates strategic options by starting from a proposed “winning” choice and working backward to list the conditions that must be true for it to succeed. Instead of debating which option is best in the abstract, the group makes each option *testable* by turning it into a set of necessary assumptions (“must be true” conditions), then prioritising validation of the least likely or highest-impact assumptions first. The intended effect is to shift conversation from advocacy (“my option”) to diagnosis (“what would make this work or fail”), and to allocate learning effort where it reduces uncertainty fastest.

- **When to Avoid (or Use with Caution):**
  - When decisions are reversible and cheap: the overhead of condition-mapping and testing can be slower than trying-and-learning.
  - When the environment is highly non-stationary (regulation, platform rules, competitor moves): validated conditions can expire quickly; you may over-trust yesterday’s tests.
  - When the team treats “conditions” as wish lists rather than *necessary* constraints (turning the method into rationalisation).
  - When outcomes are dominated by hard technical constraints that are already knowable via analysis (you may be reinventing standard engineering due diligence).
  - When you can’t run credible tests (no access to customers/data, no budget/time, no ability to instrument); you’ll end up selecting based on opinions anyway.
  - When power dynamics prevent honest surfacing of “least likely” assumptions (the method becomes performative, not truth-seeking).

- **Keywords for Situations:**
  - Strategy offsites, “which direction?” debates, portfolio choices
  - Go-to-market bets, pricing/packaging shifts, new product lines
  - Market entry decisions, partnerships, platform dependency risks
  - “We’re stuck arguing” meetings, high-uncertainty decisions
  - Hypothesis-driven roadmaps, experimentation planning

- **Thinking Steps:**
  1. **Define the decision**: state the choice you must make and by when (avoid vague “strategy refresh”).
  2. **List distinct possibilities**: ensure options differ in where-to-play/how-to-win, not just tactics.
  3. **For each possibility, write the “win story”**: one paragraph describing how it succeeds.
  4. **Convert the win story into necessary conditions**: write 5–15 “must be true” statements (not “nice to have”).
  5. **Classify conditions**:
     - *Falsifiable now* vs *only learnable later*
     - *High impact* vs *low impact*
     - *Independent* vs *coupled* (one condition implies another)
  6. **Identify the barrier assumptions**: pick the least likely and/or most decision-critical conditions.
  7. **Define standards of proof upfront**: what evidence would count as “true enough” to proceed?
  8. **Design cheapest credible tests**:
     - Prefer tests that can *kill* an option fast (disconfirming power).
     - Avoid tests that only measure enthusiasm without commitment (e.g., vague survey positivity).
  9. **Run tests in kill-order**: execute the tests that most quickly invalidate options first.
  10. **Update the option set**: drop options that fail barrier tests; refine survivors and repeat as needed.
  11. **Decide and document**: record which conditions were validated, which remain bets, and what monitoring signals will trigger reconsideration.
  12. **Instrument for drift**: track the key conditions over time; treat strategy as conditional, not permanent.

- **Coaching Questions:**
  - If this option succeeds, what *must* be true that is currently uncertain?
  - Which of these conditions, if false, would immediately kill the option?
  - Are we listing necessities, or smuggling in preferences?
  - What evidence would change our minds—and is it realistically obtainable?
  - What’s the cheapest test that could disconfirm this option within days/weeks?
  - Which assumption is doing the most “work” in our argument without being named?
  - Are any conditions circular (we can only achieve A if we already have A)?
  - What conditions depend on competitor/institution behaviour we don’t control?
  - What would we observe if this option is failing early (leading indicators)?
  - If we can’t test this assumption, should we cap exposure (small bet, staged investment)?
