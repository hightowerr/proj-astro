---
title: "Vertical Slice 0: Hello shop skeleton"
type: "shape-up"
status: "pitch"
appetite: "1 day"
owner: "PM/Tech Lead"
tech_stack:
  frontend:
    - "Next.js (App Router) + TypeScript"
    - "Tailwind + shadcn/ui"
  backend:
    - "Next.js Route Handlers"
    - "Postgres"
    - "Drizzle ORM (migrations)"
  infra:
    - "Vercel (deployment)"
  testing:
    - "Vitest"
    - "Playwright (1 E2E)"
success_criteria:
  - "A signed-in user can create a shop and see it on a dashboard."
  - "DB migrations run locally and in CI."
  - "CI runs unit + E2E tests on every PR."
  - "App deploys to Vercel with working DB connection."
---

# Pitch: Vertical Slice 0 — Hello shop skeleton

## Problem
We need a deployable skeleton that proves the full path from UI → API → DB → UI works, with typed data access and automated tests. Without this, every later slice will be blocked by plumbing work (auth, DB wiring, migrations, and CI).

## Appetite
**1 day.** Hard stop. If anything threatens this, we cut scope rather than “finish properly”.

## Solution
Deliver the thinnest end-to-end workflow:

- User signs in
- User creates a shop
- User sees their shop on a dashboard

This validates:
- Next.js app structure (App Router)
- Route Handlers working
- Drizzle schema + migrations
- Postgres connection (local + CI + preview/prod)
- CI test runner
- Deployment path

### Core user journey
1. Visit `/` → redirected to `/login` if not signed in
2. Sign in → redirected to `/app`
3. `/app` shows either:
   - “Create shop” form (no shop yet), or
   - Shop summary card (shop exists)
4. Submit create form → shop created → dashboard updates

### Minimal UI
- `/login`: provided by auth provider (or a minimal placeholder if auth is already chosen elsewhere)
- `/app`: one page:
  - Heading: “Your shop”
  - If none: input `shopName`, button `Create`
  - If exists: show `name`, `createdAt`

No settings, no staff, no services, no slots.

### Minimal backend routes
- `POST /api/shops`
  - Creates a shop for the current user
  - Returns `{ id, name, createdAt }`
- `GET /api/shops/me`
  - Returns the user’s shop (or `null`)

### Data model
Single table: `shops`

- `id` (uuid, pk)
- `ownerUserId` (text, required, unique) — 1 shop per user for now
- `name` (text, required)
- `createdAt` (timestamptz)
- `updatedAt` (timestamptz)

This is intentionally restrictive. Multi-shop can come later.

### Engineering notes
- Keep all domain logic out of React components:
  - `db/schema.ts`
  - `db/queries/shops.ts`
  - `app/api/.../route.ts`
- Use Zod for request validation at the boundary.
- Enforce invariants in the DB (unique owner, not-null name).

## Out of scope (explicit)
- Multi-shop per user
- Roles/permissions
- Invite team members
- Billing
- Any booking flows
- Messaging
- Stripe
- Redis
- Mastra

## Risks and rabbit holes
### 1) Auth choice creep
Risk: losing time wiring auth perfectly.
Mitigation: use a “good enough” approach for Slice 0:
- If auth already exists, use it.
- If not, pick one and keep it minimal (only needs a stable `userId`).

### 2) DB connection across environments
Risk: local works but CI/Vercel fails.
Mitigation: define a single DB connection module and prove it in CI with migrations + a simple query.

### 3) Migrations not repeatable
Risk: schema drift early.
Mitigation: Drizzle migrations are required; no pushing schema manually.

## Definition of Done
### Functional
- ✅ Signed-in user can create a shop
- ✅ Returning user sees existing shop
- ✅ API returns correct data and handles “already exists” cleanly

### Technical
- ✅ Drizzle migrations apply cleanly on a fresh database
- ✅ CI runs:
  - `vitest` (unit)
  - `playwright` (one E2E)
- ✅ Vercel deployment succeeds and can read/write the DB

## QA plan
### Unit test (Vitest)
- `createShop` creates a shop for a user
- `createShop` rejects duplicates (returns existing or throws controlled error)
- `getShopByOwner` returns shop or null

### E2E test (Playwright)
Scenario: create shop + view dashboard
1. Visit `/app`
2. If redirected, complete login (use test auth helper)
3. Fill shop name and submit
4. Assert shop name appears on dashboard
5. Reload page
6. Assert shop still appears

## Cut list (if time runs out)
In order:
1. shadcn styling → plain Tailwind
2. updatedAt field
3. Nice dashboard card layout → plain text
4. Fancy error states → basic inline error

## Milestones (day plan)
- DB schema + migration + DB module
- API routes + Zod validation
- Dashboard page UI + fetch logic
- Vitest unit tests
- Playwright E2E
- Vercel deploy smoke check
