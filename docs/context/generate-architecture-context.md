# Prompt: Generate Architecture Context Document

You are auditing an existing codebase. Read every route handler, schema definition, config file, middleware, and `package.json` dependency. Check test files if they exist. Then produce a single markdown document with the following sections.

Be direct and specific — no filler, no aspirational language. Describe what the code **actually does**, not what it should do.

---

## 1. One-Line Summary

One sentence: what this application is, who it's for, and its primary runtime behavior.

> Example: "A multi-tenant SaaS API with Postgres and Redis" or "A static marketing site with one server-side contact form."

## 2. Stack

Table format. One row per layer.

| Column | Content |
|--------|---------|
| Layer | e.g. Framework, Styling, Data, Auth, Hosting, External Services |
| Technology | Name and version |
| Role | What it does in this system |

Include explicit exclusions and why (e.g., "No CMS — content changes are infrequent and developer-managed").

## 3. System Boundary

ASCII diagram showing the data flow from input to output. Cover:

- How code reaches production (deploy pipeline)
- How users interact with the system
- Every external service call

Mark the boundary between static/cached and dynamic/server-side behavior.

## 4. Non-Obvious Routes

List only routes or endpoints with behavior that is **not self-evident from the file path**. This includes:

- Middleware rewrites or redirects
- Conditional rendering strategies
- Auth gates or role-based access
- Proxy routes
- Cron-secured endpoints

| Route/Endpoint | Behavior | Why it's non-obvious | Source file |
|----------------|----------|---------------------|-------------|

Skip routes where the file path tells the full story.

## 5. Content Model

For each distinct content type, describe:

| Column | Content |
|--------|---------|
| Content type | e.g. Appointment, Customer, Policy |
| Source of truth | DB table, MDX file, hardcoded JSX, CMS |
| Rendering | How it reaches the user |
| Editable without code change? | Yes/No and how |

Call out any content that is intentionally locked to code changes and why.

## 6. State Machines & Lifecycles

For any entity with a status field:

- Document the **valid state transitions** as a diagram or table
- What **triggers** each transition (user action, cron job, system event)
- What **side effects** occur on each transition (emails sent, records updated, external API calls)

Example format:

```
booked → cancelled  (trigger: customer self-service link | side effects: refund check, slot released)
booked → completed  (trigger: appointment end time passes | side effects: outcome resolver runs)
completed → resolved (trigger: cron job | side effects: tier score recomputed)
```

## 7. Key Flows

For each non-trivial user interaction (form submission, auth flow, payment, data mutation), write a numbered step sequence from user action to final system state.

Note:
- Where validation happens (client, server, both)
- What data is persisted where
- What external services are called

## 8. Authorization Model

For each write operation:

| Column | Content |
|--------|---------|
| Operation | e.g. "Create booking", "Cancel appointment" |
| Who can perform it | Owner, customer, cron, system |
| How authorization is enforced | Middleware, DB check, token, header secret |
| Enforcement location | File path and function name |

## 9. Environment & Config

List environment variables, secrets, and external accounts the app depends on.

| Variable | Purpose | Required for | Build or Runtime |
|----------|---------|-------------|-----------------|

Do **not** include secret values — only names and purposes.

## 10. Invariants

Numbered list of rules that must always hold true. These are constraints a contributor could accidentally break.

Examples:
- "Auth token is validated server-side on every API route"
- "The outcomes resolver MUST filter by status='booked'"
- "All cron jobs require x-cron-secret header"

Each invariant must reference the specific file and line where it's enforced.

## 11. Codebase Quality Assessment

Score each dimension 1–5 using these anchors:
- **1** = Actively broken or dangerous
- **2** = Works but fragile, known gaps
- **3** = Functional with room for improvement
- **4** = Solid, minor issues only
- **5** = Production-hardened, no known issues

Provide a one-sentence justification per score referencing specific files.

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Separation of concerns | | Are boundaries clean between data, logic, and presentation? |
| Dependency hygiene | | Are deps minimal, up-to-date, and justified? Any unused or duplicated? |
| Error handling | | Are failure modes handled at system boundaries? Or silently swallowed / over-caught? |
| Security posture | | Input validation, secrets management, auth enforcement, OWASP basics. |
| Testability | | Are there tests? Can the code be tested without heavy mocking? |
| Naming & readability | | Can a new contributor navigate without a guide? Are names honest? |
| Configuration | | Is config centralized or scattered? Magic strings? Hardcoded env assumptions? |
| Build & deploy | | Is the pipeline reproducible? Any manual steps or tribal knowledge? |

**Top 3 risks:** Things that will bite the next developer or break in production.

**Top 3 strengths:** Things worth preserving or extending.

---

## Output Rules

- Every claim must reference a specific file path, function, or config key.
- If something is ambiguous in the code, say so — don't guess.
- Prefer tables and lists over paragraphs.
- Target 150–250 lines. Cut anything that doesn't help a new contributor ship safely on day one.
- Do not repeat information already documented in other `docs/context/*.md` files — reference them instead.
