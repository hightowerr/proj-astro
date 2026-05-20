Immutable Policy Snapshots

Allow top tier customers to make recurring bookings IF the business allows that for their shop.

If a customer is new - new mobile and email combination then they get to pick any slot automatically unless business set that new customers get a specific tier by default. Repeat users are tier based.

Allow user to specify soecific days there is no appointments e.g bank holidays

---

## Tech Debt: `/profile` uses client-side auth (inconsistent with `/app/*`)

**Context:** `/profile` (`src/app/profile/page.tsx`) sits outside the `/app/*` layout guard and authenticates via `useSession()` + a `useEffect` redirect to `/` if no session. Every other protected page in the app uses server-side `requireAuth()` via `src/app/app/layout.tsx`.

**Risk:** Client-side auth causes a flash of loading state before redirect, is less robust against session edge cases, and diverges from the team's established pattern.

**Resolution path:** Move the page to `src/app/app/profile/page.tsx` (inside the protected layout). Route changes from `/profile` → `/app/profile`. Update the two nav links in `app-nav.tsx` and the auth flow map in `docs/app-breadboard.md`.

**Priority:** Low — page is informational-only today; no sensitive server data fetched. Promote when profile editing (name, password) is implemented server-side.

---

## Low-Priority: Services editor URL-sync (`?service=<id>`)

**Context:** `/app/settings/services` uses an inline master-detail editor — no `[id]` route exists by design. The only genuine gap is that selecting a service is held in React state, so a page refresh or shared URL loses the selection.

**Enhancement:** Sync the selected service to a URL query param using `router.replace`:
- On row select → `router.replace('/app/settings/services?service=<id>', { scroll: false })`
- On page load → read `searchParams.service`, pass as `initialSelectedId` to `ServicesEditorShell`, call `applyTarget({ kind: 'select', id })` in an init effect

**Scope:** ~20-line change to `ServicesEditorShell`. Zero impact on layout, dirty-state machine, or mobile UX.

**Priority:** Low — single owner has no one to share service edit URLs with; refresh-loss is rare.