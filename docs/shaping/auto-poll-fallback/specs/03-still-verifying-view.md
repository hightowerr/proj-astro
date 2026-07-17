# Spec 03 — `StillVerifyingView` component

## Summary

New sub-component rendered when `view === "still-verifying"`. Communicates that Stripe verification is ongoing but polling has stopped — the merchant can safely close the page.

## Changes

- **File:** `src/components/settings/stripe-connect-card.tsx`
- **New function** `StillVerifyingView` (insert after `VerifyingView`, before `ConnectedView`):
  ```tsx
  function StillVerifyingView() {
    return (
      <>
        <h2
          className="font-manrope font-extrabold"
          style={{
            fontSize: "22px",
            letterSpacing: "-0.01em",
            color: "var(--al-primary)",
          }}
        >
          Almost there
        </h2>

        <p
          style={{
            fontSize: "15px",
            lineHeight: 1.6,
            color: "var(--al-on-surface-variant)",
            maxWidth: "42ch",
            margin: "8px 0 30px",
          }}
        >
          Complete your Stripe verification to start collecting deposits.
        </p>

        <ProgressSteps activeStep={1} />

        <div
          className="flex items-start"
          style={{
            background: "var(--al-surface-container)",
            borderRadius: "12px",
            padding: "14px 16px",
            gap: "11px",
            marginTop: "28px",
          }}
          aria-live="polite"
        >
          <span
            className="material-symbols-outlined shrink-0"
            style={{
              fontSize: "20px",
              color: "var(--al-on-surface-variant)",
            }}
            aria-hidden
          >
            info
          </span>
          <p
            style={{
              fontSize: "13.5px",
              lineHeight: "1.55",
              color: "var(--al-on-surface-variant)",
              margin: 0,
            }}
          >
            Stripe is still reviewing your details. This can take up to a few
            hours. We&apos;ll update your dashboard when it&apos;s ready — you
            can close this page.
          </p>
        </div>
      </>
    );
  }
  ```

## Design Notes (for designer briefing)

> **Prototype alignment** (signal: `design-prototype-as-source-of-truth`).
> Source: `docs/shaping/auto-poll-fallback/Stripe Connect Still Verifying (standalone) (1).html`

- **Title:** "Almost there" — `22px`, weight `800`, tracking `-0.01em`, `--al-primary`. Matches `PendingView` and `VerifyingView` for continuity.
- **Subtitle:** "Complete your Stripe verification..." — `15px`, `line-height: 1.6`, `--al-on-surface-variant`, `max-width: 42ch`, `margin-bottom: 30px`.
- **Progress steps:** `<ProgressSteps activeStep={1} />` — **NO `pulsing` prop**. Static filled navy dot at step 2. This is the key visual difference from `VerifyingView`: the animation stops because active checking has stopped. **Note:** Prototype uses a grid-based progress bar with connecting lines — reuse the existing `ProgressSteps` component (consistent with all other views) rather than building a new layout.
- **Info box:** `--al-surface-container` bg, `border-radius: 12px`, `padding: 14px 16px`, `margin-top: 28px`.
- **Info icon:** `info` material symbol, `20px`, `--al-on-surface-variant`, `flex: none`.
- **Info text:** `13.5px`, `line-height: 1.55`, `--al-on-surface-variant`.
- **Copy:** "Stripe is still reviewing your details. This can take up to a few hours. We'll update your dashboard when it's ready — you can close this page."
- **No CTA button** — nothing the user can do. The webhook handles completion.
- **No "Check again" button** — webhook handles it; manual refresh would provide false agency.

### Visual comparison with VerifyingView

| Element | VerifyingView | StillVerifyingView (prototype) |
|---------|--------------|-------------------|
| Title | "Almost there" | "Almost there" |
| Progress dot | Pulsing animation | Static filled dot |
| Info box bg | `--al-surface-container-low` | `--al-surface-container` |
| Info box radius | `rounded-xl` (12px) | `12px` (match) |
| Info box padding | `p-4` (16px) | `14px 16px` |
| Info box margin-top | `mt-6` (24px) | `28px` |
| Info icon color | `--al-primary` (navy) | `--al-on-surface-variant` (muted) |
| Info icon size | `text-lg` (~18px) | `20px` |
| Info text size | `text-sm` (14px) | `13.5px` |
| Info text line-height | `leading-relaxed` (~1.625) | `1.55` |
| Info copy | "...usually takes a few minutes" | "...can take up to a few hours. You can close this page." |
| CTA | None | None |

### Pages impacted

- `/app/settings/stripe-connect` — only page that renders `StripeConnectCard`

## Acceptance Criteria

- [ ] `StillVerifyingView` renders title "Almost there"
- [ ] `ProgressSteps` renders at `activeStep={1}` WITHOUT pulsing animation
- [ ] Info box uses `--al-surface-container` background (not `--al-surface-container-low`)
- [ ] Info box uses inline styles matching prototype: `borderRadius: 12px`, `padding: "14px 16px"`, `marginTop: 28px`
- [ ] Info icon is `20px`, `--al-on-surface-variant` color, `flex: none`
- [ ] Info text is `13.5px`, `line-height: 1.55`, `--al-on-surface-variant`
- [ ] Copy includes "you can close this page"
- [ ] No CTA button present
- [ ] `pnpm check` passes

## Prerequisites

- Spec 01 (`"still-verifying"` type must exist)

## Dependencies

Depends on: spec 01.
