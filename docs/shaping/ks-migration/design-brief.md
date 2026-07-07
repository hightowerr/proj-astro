# Kicksnare Migration — Design Brief

## Designer action required: NONE

This is a **query-only fix** — no new UI components, no layout changes, no new visual states.

## What changes visually

The fix makes existing, already-designed UI states appear correctly for pre-migration data. No mockups needed.

### Dashboard (`/app`)

| Before (broken) | After (correct) |
|-----------------|-----------------|
| Tier 1 navy card: "deposits aren't enabled yet" | Tier 2 amber card: "You've taken **N** bookings without deposit protection" |
| Count shows **0** | Count shows **10-30** (actual pre-migration bookings) |

The Tier 2 amber card is already fully designed and implemented — see `design/design-02-dashboard-connect-card.md` and `connect-card.tsx`. It was just never triggered because the query returned 0.

### Appointments page (`/app/appointments`)

| Before (broken) | After (correct) |
|-----------------|-----------------|
| No amber inline banner | Amber banner: "N bookings have no deposit. Connect Stripe" |

The amber inline banner is already implemented — it was gated on `unprotectedCount > 0`, which was always 0 for pre-migration data.

## Pages impacted

| Page | Component | Visual change |
|------|-----------|--------------|
| `/app` (dashboard) | `ConnectCard` | Switches from Tier 1 (navy) to Tier 2 (amber) state |
| `/app/appointments` | Inline amber banner | Appears (was hidden) |

## No design work needed because

1. All visual states already exist and are implemented
2. The fix is a backend query correction — the UI correctly renders whatever count it receives
3. No new states, variants, or responsive behaviors are introduced
