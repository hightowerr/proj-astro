# Dashboard UI Handoff

## Bet Summary
This project segment delivered a functional and visually polished Dashboard for the Studio Management platform. It addresses critical "Correctness First" data bugs (currency-blindness, type drift) and implements three major operational features: a high-risk customer KPI with deduplication logic, a global search "Quick-Find" for navigating between clients and appointments, and a "Daily Log" tab providing a unified operational timeline of recent bookings, cancellations, and messages.

## Stack Snapshot
*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **Database:** PostgreSQL with Drizzle ORM
*   **Auth:** Better Auth
*   **Styling:** Tailwind CSS 4 + Stitch (Design Tokens)
*   **Icons:** Lucide React + Material Symbols (Stitch-provided)
*   **Hosting:** Vercel (Recommended)

## Quick Start
1.  **Installation:**
    ```bash
    pnpm install
    ```
2.  **Local Development:**
    ```bash
    pnpm dev
    ```
3.  **Database Management:**
    ```bash
    pnpm db:studio # To inspect data
    pnpm db:generate && pnpm db:migrate # For schema changes
    ```

## Architecture Context
For deep technical rationale, implementation provenance (what was custom vs. generated), and original shaping requirements, refer to the [Dashboard UI Ship Report](../ship-report.md).
