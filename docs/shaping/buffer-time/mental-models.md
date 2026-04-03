# Mental Models — Buffer Time

---

## The Visible Cost Trap

**The problem:** When comparing Option X (snapshot on appointment) vs Option Y (live join), the instinct was that X costs more because it has a migration. Y appeared cheaper because it has no schema change.

This instinct is wrong, and it's wrong in a predictable way.

### Why it happens

Migration cost is **visible**. It shows up in a PR diff. It requires a migration file, a db:generate, a db:migrate. It feels like work being done. It has a moment of risk — the migration runs, the deployment pauses, someone watches the logs.

Query complexity is **invisible**. There's no PR that says "we added a JOIN to every availability check." It accrues silently inside a function that already had logic. It doesn't announce itself at deployment. Nobody watches logs for it.

The same cognitive pattern applies broadly:

| Visible cost | Invisible cost |
|--------------|----------------|
| Schema migration | Query complexity on every read |
| New file created | Logic added to an existing function |
| New dependency added | Maintenance burden distributed across future changes |
| Upfront refactor | Accumulated technical debt |

### The inversion

The correct frame is **total cost over the life of the feature**, not **cost at time of shipping**.

- Option X: one-time migration cost + simple reads forever
- Option Y: no migration cost + JOIN complexity on every availability page load + harder creation guard + more complex future extensions

In Postgres, `ALTER TABLE ADD COLUMN ... DEFAULT 0` on a table with a constant default is a **metadata-only operation** — no row rewrite, no index rebuild. The "expensive migration" is, in practice, milliseconds.

The JOIN, by contrast, runs every time a customer loads the booking page.

### The rule

**When a one-time write cost and a recurring read cost are in competition, favour the one-time write cost.** Reads happen far more often than schema migrations.

More generally: **don't let the visibility of a cost substitute for an assessment of its magnitude.**

---

## Application to This Feature

This trap will reappear when deciding whether to snapshot other per-booking settings (e.g., `bufferBefore` when it ships, or any future policy-adjacent values). The temptation each time will be to avoid the migration and "just join" to the current settings table.

The right question to ask each time:
> "How often does this read run, and how often does the schema change?"

If reads >> migrations (which is almost always true for a booking system), snapshot the value at write time.
