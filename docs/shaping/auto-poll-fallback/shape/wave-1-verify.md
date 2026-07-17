# Wave 1 Verification Report

**Date:** 2026-07-16
**Verifier:** Independent agent (did not implement)
**Method:** Code review + Playwright browser testing (localhost:3000)
**File under test:** `src/components/settings/stripe-connect-card.tsx`

## Summary

**All 5 specs PASS.** One non-blocking lint note on `console.info`.

---

## Spec 01 — Extend View type with `"still-verifying"`

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `View` type includes `"still-verifying"` as a valid discriminant | **PASS** | Line 8: `type View = "start" \| "redirect" \| "pending" \| "verifying" \| "still-verifying" \| "connected" \| "suspended"` |
| 2 | `pnpm check` passes with zero new errors | **PASS** | 0 errors, 1 warning (console.info — see note below). Exit 0. |
| 3 | No runtime behavior changes — type-only | **PASS** | Only the type union was extended. No logic touched. |

---

## Spec 02 — Transition to `"still-verifying"` on poll exhaustion

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | After 12 polls (60s), view transitions from `"verifying"` to `"still-verifying"` | **PASS** | Lines 677-681: `pollCountRef.current > 12` triggers `setView("still-verifying")`. Counter increments before check — 12 actual fetch calls (counts 1-12), transition fires at count 13. 12 x 5s = 60s. |
| 2 | `console.info` emits at poll exhaustion | **PASS** | Line 679: `console.info("[stripe-connect] Poll exhausted after 12 attempts — transitioning to still-verifying")`. Message matches spec exactly. |
| 3 | Polling stops — no further fetches after transition | **PASS** | Line 678: `clearInterval(pollTimerRef.current)` fires before `setView`, followed by `return`. No further iterations. |
| 4 | `pnpm check` passes | **PASS** | 0 errors. Exit 0. |

**Note:** `console.info` triggers lint warning `no-console` (only `warn`/`error` allowed). This is a warning, not an error — `pnpm check` still passes. The spec explicitly mandates `console.info`. If the team wants to suppress this, add `// eslint-disable-next-line no-console` above line 679, or switch to `console.warn`.

---

## Spec 03 — `StillVerifyingView` component

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Renders title "Almost there" | **PASS** | Line 278: `Almost there`. Confirmed in Playwright snapshot: `heading "Almost there" [level=2]`. |
| 2 | `ProgressSteps` at `activeStep={1}` WITHOUT pulsing | **PASS** | Line 293: `<ProgressSteps activeStep={1} />` — no `pulsing` prop. Playwright computed styles: zero elements with `animationName !== "none"` inside progressbar. Screenshot confirms static filled navy dot. |
| 3 | Info box uses `--al-surface-container` background | **PASS** | Line 298: `background: "var(--al-surface-container)"`. Computed: `rgb(238, 238, 236)`. Differs from VerifyingView's `--al-surface-container-low` (`rgb(244, 244, 242)`). |
| 4 | Info box inline styles: `borderRadius: 12px`, `padding: "14px 16px"`, `marginTop: 28px` | **PASS** | Lines 299-301. Playwright computed: `borderRadius: "12px"`, `padding: "14px 16px"`, `marginTop: "28px"`. |
| 5 | Info icon: `20px`, `--al-on-surface-variant`, `flex: none` | **PASS** | Lines 308-310: `fontSize: "20px"`, `color: "var(--al-on-surface-variant)"`. Class includes `shrink-0` (matches spec reference code). Playwright computed: `fontSize: "20px"`, `color: "rgb(67, 71, 79)"`, `flexShrink: "0"`. |
| 6 | Info text: `13.5px`, `line-height: 1.55`, `--al-on-surface-variant` | **PASS** | Lines 318-320. Playwright computed: `fontSize: "13.5px"`, `lineHeight: "20.925px"` (13.5 x 1.55 = 20.925), `color: "rgb(67, 71, 79)"`. |
| 7 | Copy includes "you can close this page" | **PASS** | Lines 324-327. Playwright snapshot: `"...you can close this page."` |
| 8 | No CTA button present | **PASS** | No `<Button>` in StillVerifyingView. Playwright: `buttonCount: 0` inside card. |
| 9 | `pnpm check` passes | **PASS** | 0 errors. Exit 0. |

---

## Spec 04 — Wire `StillVerifyingView` into render switch

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | When `view` is `"still-verifying"`, `StillVerifyingView` renders | **PASS** | Line 777: `{view === "still-verifying" && <StillVerifyingView />}`. Playwright: forced `setView("still-verifying")` via React fiber dispatch — component rendered correctly with all expected content. |
| 2 | No other view renders simultaneously | **PASS** | All render branches use `{view === "X" && <Component />}` pattern (lines 773-792). Only one can match at a time. Playwright snapshot confirmed only StillVerifyingView content visible. |
| 3 | `pnpm check` passes | **PASS** | 0 errors. Exit 0. |

---

## Spec 05 — Add `"still-verifying"` to `hasAccent` condition

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `"still-verifying"` shows 4px navy left border | **PASS** | Line 748: `hasAccent` includes `view === "still-verifying"`. Playwright computed: `borderLeftWidth: "4px"`, `borderLeftColor: "rgb(0, 30, 64)"`. |
| 2 | Border color remains `--al-primary` | **PASS** | Lines 749-753: `accentColor` only differs for `connected` and `suspended`. `"still-verifying"` falls through to `"var(--al-primary)"`. Computed: `rgb(0, 30, 64)`. |
| 3 | No visual jump from `"verifying"` to `"still-verifying"` | **PASS** | Tested both views via fiber dispatch. Verifying: `borderLeftWidth: "4px"`, `borderLeftColor: "rgb(0, 30, 64)"`. Still-verifying: identical. Same `hasAccent = true`, same `accentColor`. |
| 4 | `pnpm check` passes | **PASS** | 0 errors. Exit 0. |

---

## Visual Comparison (Playwright-verified)

| Element | VerifyingView | StillVerifyingView | Matches Spec? |
|---------|--------------|-------------------|---------------|
| Title | "Almost there" | "Almost there" | Yes |
| Progress dot | `al-ring` + `al-pulsedot` animations | No animation (static filled dot) | Yes |
| Info box bg | `rgb(244, 244, 242)` (`--al-surface-container-low`) | `rgb(238, 238, 236)` (`--al-surface-container`) | Yes |
| Info icon color | `rgb(0, 30, 64)` (`--al-primary`) | `rgb(67, 71, 79)` (`--al-on-surface-variant`) | Yes |
| Info icon size | `text-lg` (~18px) | `20px` | Yes |
| Info text size | `text-sm` (14px) | `13.5px` | Yes |
| Info copy | "...usually takes a few minutes" | "...can take up to a few hours...you can close this page" | Yes |
| Border | 4px navy | 4px navy | Yes (no jump) |
| CTA | None | None | Yes |

---

## Final Verdict

**ALL PASS** — 0 failures, 0 blocked.

No entries needed in `current-issues.md`. Implementation is ready to ship.

### Non-blocking observation

`console.info` on line 679 triggers an eslint `no-console` warning. The spec mandates `console.info` for telemetry. Consider either adding an inline disable comment or updating the `no-console` rule to allow `info` alongside `warn`/`error`.
