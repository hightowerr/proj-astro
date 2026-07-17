# Auto-Poll Fallback — Build Order

## Dependency Graph

```
01 (View type)
├── 02 (poll exhaustion transition)  — depends on 01
├── 03 (StillVerifyingView component) — depends on 01
├── 05 (hasAccent border)            — depends on 01
│
04 (render wiring) — depends on 01, 03
```

## Phased Build Order

### Wave 1 — Foundation

| Spec | Title | Parallel? | Depends on | Files |
|------|-------|-----------|------------|-------|
| 01 | Extend `View` type with `"still-verifying"` | — | none | `stripe-connect-card.tsx` |

### Wave 2 — Core (all parallel)

| Spec | Title | Parallel? | Depends on | Files |
|------|-------|-----------|------------|-------|
| 02 | Poll exhaustion → `setView("still-verifying")` + `console.info` | yes | 01 | `stripe-connect-card.tsx` |
| 03 | `StillVerifyingView` component (static dot, muted info box) | yes | 01 | `stripe-connect-card.tsx` |
| 05 | Add `"still-verifying"` to `hasAccent` condition | yes | 01 | `stripe-connect-card.tsx` |

### Wave 3 — Wiring

| Spec | Title | Parallel? | Depends on | Files |
|------|-------|-----------|------------|-------|
| 04 | Render `StillVerifyingView` in JSX switch | — | 01, 03 | `stripe-connect-card.tsx` |

## Critical Path

```
01 (type) → 03 (component) → 04 (render wiring)
```

Longest chain: **3 specs, 3 waves**. Specs 02 and 05 are off the critical path (parallel in wave 2).

## Implementation Note

All 5 specs modify the **same file** (`stripe-connect-card.tsx`). Parallel worktree agents are unnecessary — run waves sequentially in a single agent session. Total scope: ~30 lines changed in 1 file.

---

## Design Brief (for designer mockups)

### Page impacted

- `/app/settings/stripe-connect` — the Stripe Connect settings page (only consumer of `StripeConnectCard`)

### What the designer needs to mock

**One new state: `StillVerifyingView`** — the component shown after 60 seconds of polling with no Stripe verification response.

#### Visual spec

| Element | Value |
|---------|-------|
| Title | "Almost there" (matches existing Pending + Verifying views) |
| Subtitle | "Complete your Stripe verification to start collecting deposits." |
| Progress steps | 3-step indicator at step 2, **static filled navy dot** (no pulsing animation) |
| Info box bg | `--al-surface-container` / `#eeeeec` (darker than VerifyingView's `#f4f4f2`) |
| Info icon | `info` material symbol, `--al-on-surface-variant` / `#43474f` (muted, not navy) |
| Info copy | "Stripe is still reviewing your details. This can take up to a few hours. We'll update your dashboard when it's ready — you can close this page." |
| CTA | None |
| Left border | 4px `--al-primary` accent (same as Verifying) |
| Card bg | `--al-surface-lowest` / `#ffffff` |

#### What to compare against

The designer should mock `StillVerifyingView` **side by side** with `VerifyingView` to show:
1. Pulsing dot → static dot (animation stops)
2. Navy info icon → muted info icon (urgency drops)
3. Lighter info box → slightly darker info box (subtle visual shift)
4. "few minutes" copy → "few hours...you can close this page" (expectation reset)

No other pages are impacted. No new routes, no API changes, no schema changes.

---

## Architecture Context Updates Needed

> Do NOT apply yet — apply during Phase 5 (RETRO) of the feature loop.

### `docs/context/architecture-context.md`

**§6 State Machines — Appointment Status:** No changes.

**§4 Non-Obvious Routes:** No new routes.

**No new invariants** — this is a UI-only fix with no backend changes.

### `docs/context/progress-tracker.md`

After loop completion, add to **Completed** section:

```
- **Auto-Poll Fallback** — 5 specs, 3 waves. UI-only fix for poll exhaustion in `StripeConnectCard`.
  `"still-verifying"` View state added at poll exhaustion (attempt 13). Static progress dot replaces
  pulsing animation. Muted info box tells merchant to close the page. `console.info` telemetry at
  exhaustion. Single file modified: `stripe-connect-card.tsx`.
```

### `docs/context/current-issues.md`

Move "Auto-poll timeout has no fallback state" from **Open > High** to **Resolved** with:

```
- **Auto-poll timeout has no fallback state** — **RESOLVED [date].** Added `"still-verifying"` to
  View type. Poll exhaustion (attempt 13) transitions to StillVerifyingView: static progress dot
  (no animation), muted info box ("you can close this page"), `console.info` telemetry. Single file:
  `stripe-connect-card.tsx`. 5 specs, 3 waves. [X]/[X] PASS.
```

### `docs/context/ui-context.md`

**§6 Component Recipes:** Optionally add `StillVerifyingView` to the ConnectedView recipe section as a new view state variant, documenting the info box token difference (`--al-surface-container` vs `--al-surface-container-low`).
