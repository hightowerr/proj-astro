# Spike A3: Existing Cron Job Pattern

## Context

Shape A part A3.1 requires implementing a nightly recompute-scores job as a Vercel Cron. We need to understand the existing cron job pattern to maintain consistency with the codebase.

## Goal

Understand the existing cron job implementation pattern so we can:
1. Follow the same authentication, locking, and error handling patterns
2. Configure the job in `vercel.json` correctly
3. Make the job idempotent and safe for concurrent execution
4. Return consistent response formats

## Questions

| # | Question |
|---|----------|
| **A3-Q1** | How are cron jobs authenticated and secured? |
| **A3-Q2** | How is concurrent execution prevented (locking)? |
| **A3-Q3** | What's the standard error handling and response format? |
| **A3-Q4** | How are cron jobs configured in Vercel? |
| **A3-Q5** | What environment variables are required? |

## Investigation

### A3-Q1: Authentication and Security

**Answer:** All cron jobs use the same authentication pattern via `CRON_SECRET` header.

**Pattern** (resolve-outcomes/route.ts:61-72):
```typescript
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  return Response.json(
    { error: "CRON_SECRET not configured" },
    { status: 500 }
  );
}

const provided = req.headers.get("x-cron-secret");
if (!provided || provided !== cronSecret) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Key points:**
- Header name: `x-cron-secret` (constant: `CRON_HEADER`)
- Environment variable: `CRON_SECRET`
- Returns 500 if not configured (deployment issue)
- Returns 401 if header missing or doesn't match (unauthorized access)

**Alternative pattern:** Internal API jobs use `x-internal-secret` header with `INTERNAL_SECRET` env var (offer-loop/route.ts:8, 40-51). This is for job-to-job communication, not external cron triggers.

### A3-Q2: Concurrent Execution Prevention

**Answer:** PostgreSQL advisory locks prevent overlapping executions.

**Pattern** (resolve-outcomes/route.ts:77-84):
```typescript
const lockId = parseLockId(req); // Default: 482173

const lockResult = await db.execute(
  sql`select pg_try_advisory_lock(${lockId}) as locked`
);
const locked = lockResult[0]?.locked === true;

if (!locked) {
  return Response.json({ skipped: true, reason: "locked" });
}
```

**Lock release** (resolve-outcomes/route.ts:283-285):
```typescript
} finally {
  await db.execute(sql`select pg_advisory_unlock(${lockId})`);
}
```

**Key points:**
- Uses `pg_try_advisory_lock()` — non-blocking, returns immediately
- Each job has a unique lock ID (482173 for resolve-outcomes, 482174 for expire-offers)
- Lock released in `finally` block (guaranteed cleanup)
- Skips execution if already locked (returns `{ skipped: true, reason: "locked" }`)
- Lock is session-scoped (automatic cleanup if connection dies)

**Lock ID assignment:**
- resolve-outcomes: 482173 (route.ts:16)
- expire-offers: 482174 (expire-offers/route.ts:8)
- **recompute-scores should use: 482175** (next available)

**Configurable lock ID** (for tests):
```typescript
const parseLockId = (req: Request) => {
  const queryLockId = url.searchParams.get("lockId");
  const envLockId = process.env.RESOLVE_OUTCOMES_LOCK_ID;

  // Allow query override only outside production
  const raw = process.env.NODE_ENV === "production"
    ? envLockId
    : queryLockId ?? envLockId;

  return raw ? parseInt(raw) : DEFAULT_LOCK_ID;
};
```

This allows test isolation by using different lock IDs per test.

### A3-Q3: Error Handling and Response Format

**Answer:** Standardized response format with counters and error array.

**Pattern** (resolve-outcomes/route.ts:111-114, 276-282):
```typescript
let resolved = 0;
let skipped = 0;
let backfilled = 0;
const errors: string[] = [];

// Process items...
for (const item of items) {
  try {
    // ... do work ...
    resolved += 1;
  } catch (error) {
    errors.push(
      `Failed to process ${item.id}: ${(error as Error).message ?? "Unknown error"}`
    );
  }
}

return Response.json({
  total: candidates.length,
  resolved,
  skipped,
  backfilled,
  errors,
});
```

**Key patterns:**
- ✅ **Partial success is OK** — One failure doesn't stop the batch
- ✅ **Track all outcomes** — counters for each result type
- ✅ **Collect errors** — array of error messages with context (item ID)
- ✅ **Return structured JSON** — always valid JSON, never throw
- ✅ **Process in batches** — limit parameter (default 200, max 1000)

**Response codes:**
- `200` — Job completed (even with partial failures, check `errors` array)
- `401` — Unauthorized (bad secret)
- `500` — Configuration error (missing env vars)

### A3-Q4: Vercel Cron Configuration

**Answer:** Jobs are configured in `vercel.json` with cron syntax.

**Pattern** (vercel.json:2-11):
```json
{
  "crons": [
    {
      "path": "/api/jobs/resolve-outcomes",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/jobs/expire-offers",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Schedule formats:**
- `"0 0 * * *"` — Daily at midnight UTC (resolve-outcomes)
- `"*/5 * * * *"` — Every 5 minutes (expire-offers)
- Standard cron syntax: `minute hour day month dayofweek`

**For recompute-scores:**
```json
{
  "path": "/api/jobs/recompute-scores",
  "schedule": "0 2 * * *"  // 2 AM UTC daily (after resolve-outcomes)
}
```

**Vercel-specific notes:**
- Vercel automatically adds `x-vercel-cron` header to cron requests
- Cron requests come from Vercel infrastructure, not external IPs
- `CRON_SECRET` provides additional security layer

### A3-Q5: Environment Variables

**Answer:** Two secrets are required for scheduled/internal jobs.

**From env.example:22-23:**
```bash
# Scheduled jobs
CRON_SECRET=change_me
INTERNAL_SECRET=change_me_to_random_string
```

**Usage:**
- `CRON_SECRET` — For external Vercel Cron triggers (header: `x-cron-secret`)
- `INTERNAL_SECRET` — For job-to-job API calls (header: `x-internal-secret`)

**For recompute-scores:** Only needs `CRON_SECRET` (external trigger, no internal job calls).

**Optional environment variable pattern:**
- Lock ID override: `RECOMPUTE_SCORES_LOCK_ID` (for tests)
- Job-specific config: e.g., `RECOMPUTE_SCORES_WINDOW_DAYS` (default 180)

## Findings

### Standard Cron Job Template

Based on existing patterns, a new cron job should follow this structure:

```typescript
// /api/jobs/recompute-scores/route.ts

export const runtime = "nodejs";

const CRON_HEADER = "x-cron-secret";
const DEFAULT_LOCK_ID = 482175;  // Next available
const BATCH_SIZE = 50;           // Process per execution

export async function POST(req: Request) {
  // 1. Authentication
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const provided = req.headers.get(CRON_HEADER);
  if (!provided || provided !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Acquire lock
  const lockResult = await db.execute(
    sql`select pg_try_advisory_lock(${DEFAULT_LOCK_ID}) as locked`
  );
  const locked = lockResult[0]?.locked === true;

  if (!locked) {
    return Response.json({ skipped: true, reason: "locked" });
  }

  try {
    // 3. Process work
    let processed = 0;
    const errors: string[] = [];

    // ... do work ...

    // 4. Return structured response
    return Response.json({
      processed,
      errors,
    });
  } finally {
    // 5. Release lock
    await db.execute(sql`select pg_advisory_unlock(${DEFAULT_LOCK_ID})`);
  }
}
```

### Key Patterns to Follow

1. **Authentication:** Always check `CRON_SECRET` header first
2. **Locking:** Use advisory locks to prevent overlaps
3. **Idempotency:** Design so re-running is safe (upsert, conditional WHERE)
4. **Error handling:** Collect errors, don't fail the whole batch
5. **Response format:** Structured JSON with counters and error array
6. **Cleanup:** Always release locks in `finally` block

### Batch Processing Strategy

**resolve-outcomes** processes up to 200 appointments per execution:
- Query candidates with `.limit(200)`
- Process each in a loop with error handling
- Return counts of resolved/skipped/errors

**For recompute-scores:**
- Could process all customers (shop by shop)
- OR batch by shop (process one shop per execution, rotate)
- OR limit to first N customers per execution (pagination)

**Recommendation:** Process all active customers for a single shop per execution, using shop rotation or "all shops" approach. Since scoring is just aggregation + upsert, it should be fast enough to run for all customers nightly.

### Manual Testing

Following existing pattern (CLAUDE.md:49-52):
```bash
curl -X POST http://localhost:3000/api/jobs/recompute-scores \
  -H "x-cron-secret: $CRON_SECRET"
```

Add query parameters for testing:
- `?lockId=999999` — Use different lock ID (non-prod only)
- `?shopId=xxx` — Process only one shop (optional parameter)

## Acceptance

✅ **Complete** — We can describe:
- The authentication pattern (CRON_SECRET header)
- The locking mechanism (PostgreSQL advisory locks)
- The error handling pattern (partial success, error array)
- The Vercel configuration (vercel.json cron schedule)
- The environment variables required (CRON_SECRET)
- The response format (structured JSON with counters)
- The code structure template for new cron jobs
