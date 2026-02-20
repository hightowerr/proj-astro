# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router pages and API routes (for example, `src/app/api/jobs/*`).
- `src/components/`: Reusable UI and feature components.
- `src/lib/`: Core domain logic, integrations, DB access, and unit tests under `src/lib/__tests__/`.
- `drizzle/`: SQL migrations and Drizzle metadata snapshots.
- `tests/`: Playwright tests (`tests/**/*.spec.ts`) and shared setup (`tests/setup.ts`).
- `docs/`: Requirements, shaping plans, and technical notes.
- `public/`: Static assets.

## Build, Test, and Development Commands
- `pnpm dev`: Start local Next.js dev server.
- `pnpm build` / `pnpm start`: Build and run production build.
- `pnpm lint`: Run ESLint.
- `pnpm typecheck`: Run TypeScript checks (`tsc --noEmit`).
- `pnpm test`: Run Vitest unit/integration tests in `src/**`.
- `pnpm test:e2e`: Run Playwright specs in `tests/**`.
- `pnpm db:migrate`: Apply Drizzle migrations.
- `pnpm db:studio`: Open Drizzle Studio for local DB inspection.

## Coding Style & Naming Conventions
- TypeScript-first; use path alias `@/` for imports from `src`.
- Prettier is canonical formatting (`2` spaces, double quotes, semicolons, `printWidth: 100`).
- ESLint extends `next/core-web-vitals`; keep import order stable and avoid `console.log` (warn-level).
- Components/utilities use kebab-case file names (for example, `manage-booking-view.tsx`).
- Test files use `*.test.ts` (Vitest) and `*.spec.ts` (Playwright and some in-source specs).

## Testing Guidelines
- Frameworks: Vitest (unit/integration) and Playwright (E2E).
- Keep unit tests close to source (`src/**/__tests__` or `src/**/*.test.ts`).
- Put browser/E2E flows in `tests/e2e/*.spec.ts`.
- Prefer deterministic tests with explicit fixtures and cleanup.
- Before opening a PR, run: `pnpm lint && pnpm typecheck && pnpm test`.

## Commit & Pull Request Guidelines
- Follow conventional-style prefixes seen in history: `feat:`, `chore:`, `fix:` (imperative, concise scope).
- Keep commits focused; avoid mixing schema, API, and UI changes without clear reason.
- PRs should include what changed and why, linked issue/requirement context, and test evidence.
- Include screenshots/GIFs for UI changes.

## Security & Configuration Tips
- Never commit secrets. Use `.env`; keep `.env.example` updated with safe placeholders.
- Important envs for scheduled/internal jobs: `CRON_SECRET`, `INTERNAL_SECRET`, `APP_URL`.
- For local E2E, ensure DB and required provider/test-mode env variables are configured.

## Critical Rules

### 1. ALWAYS Run Code Quality Checks
After ANY code change:
```bash
pnpm lint && pnpm typecheck
```

### 2. NEVER Start Dev Server
If you need dev server output, ask the user to provide it.

### 3. Database Schema Changes
```bash
pnpm db:generate  # Generate migration
# Review generated SQL in drizzle/
pnpm db:migrate   # Run migration
```
Never use `db:push` in production. Use migrations.

### 4. Resolver Safety (CRITICAL)
The resolver job MUST:
1. Filter by `status='booked'` in WHERE clause
2. Never overwrite cancelled appointments
3. Be idempotent (use conditional WHERE in UPDATE)

See: `docs/shaping/slice-5-v5-implementation-plan.md`

### 5. Next.js 16 Proxy Convention (CRITICAL)
- Do not create `src/middleware.ts`.
- Route protection must use `src/proxy.ts` only.
- Next.js 16 treats middleware as deprecated and will error if both files exist.

### 6. Next.js 16 Dynamic Import Convention (CRITICAL)
- Do not use `dynamic(..., { ssr: false })` directly in App Router server entry files (`page.tsx`, `layout.tsx`, etc.).
- If `ssr: false` is required, place it in a client wrapper component (for example `src/components/landing/hero-section-client.tsx`).
- Keep server entry files importing the client wrapper instead (for example `src/app/page.tsx` imports `HeroSectionClient`).

## Documentation

- **Shaping docs:** `docs/shaping/` - Implementation plans with breadboards
- **Requirements:** `docs/requirements/` - Vertical slice pitches
- **README.md:** Setup, API keys, deployment, service configuration
