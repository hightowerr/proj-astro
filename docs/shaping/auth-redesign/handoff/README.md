# Auth Redesign — Handoff

## Bet Summary
The **Auth Redesign** project transformed the generic, unbranded authentication experience into a premium, split-screen "Atelier Light" identity. This bet replaced four disparate, card-based auth routes with a unified architectural shell (`AuthShell`) that implements a high-impact desktop media panel (editorial image + gradient overlay) and a focused form panel. The primary goal was to ensure the authentication entry point feels like a continuous, premium experience with the main application, moving away from generic shadcn defaults to high-contrast, custom-token-driven UI.

## Stack Snapshot
- **Framework**: Next.js 16 (App Router) — Server-first architecture for the `AuthShell`.
- **Authentication**: Better Auth — IP-based rate limiting, CSRF protection, and session management.
- **Styling**: Tailwind CSS v4 — Inline theme tokens for "Atelier Light" (Cream/Navy/Teal).
- **Icons**: Lucide React — `Eye`/`EyeOff` for password visibility controls.
- **Database**: PostgreSQL with Drizzle ORM — Persistent session and user storage.

## Quick Start
1.  **Install dependencies**:
    ```bash
    pnpm install
    ```
2.  **Environment Setup**:
    Copy `env.example` to `.env` and ensure `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_SECRET` are set.
3.  **Local Development**:
    ```bash
    pnpm dev
    ```
4.  **Verification**:
    Run `pnpm check` to validate linting and type safety across the new components.

## Architecture Context
The technical decisions and implementation details for the shell and form restyling are documented in the shaping folder:
- [Auth Redesign Shaping Doc](../docs/shaping/auth-redesign/auth-redesign-shaping.md)
- [V2 Implementation Plan](../docs/shaping/auth-redesign/auth-redesign-v2-plan.md)
- [Regression Report](../docs/shaping/auth-redesign/regression-report.md)
- [Bug Report 01](../docs/shaping/auth-redesign/bug-report-01.md)
