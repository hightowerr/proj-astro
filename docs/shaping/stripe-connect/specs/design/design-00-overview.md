# Design Briefs — Stripe Connect

## Overview

Stripe Connect adds merchant deposit routing to Astro. Shop owners connect their Stripe Express account so customer booking deposits flow directly to their bank, with a 50p platform fee per transaction.

This design work spans **3 new pages/components**, **3 updated pages**, and **1 email template**. Each brief below is a self-contained document for a designer.

## Page/Experience Index

| # | Brief | Type | Priority | Spec refs |
|---|-------|------|----------|-----------|
| 01 | [Settings: Stripe Connect](design-01-settings-stripe-connect.md) | New page | P0 — critical path | 10, 05, 06, 07, 08 |
| 02 | [Dashboard: Connect Card](design-02-dashboard-connect-card.md) | New component on existing page | P0 — primary conversion driver | 15, 17 |
| 03 | [Nav: Payments Link + Indicator](design-03-nav-payments-indicator.md) | Updated component | P1 — wayfinding | 11 |
| 04 | [Booking Page: Deposit States](design-04-booking-deposit-states.md) | Updated page (subtle) | P1 — customer-facing | 14 |
| 05 | [Appointment Detail: Fee Breakdown](design-05-appointment-fee-breakdown.md) | Updated page section | P2 — trust/transparency | 12 |
| 06 | [Email: Abandoned Connect](design-06-email-connect-reengagement.md) | New email template | P2 — re-engagement | 16 |

## User Journey Map

```
Shop owner signs up
        │
        ▼
Sets up services + availability
        │
        ▼
┌───────────────────────────────────┐
│ CONNECT STRIPE PROMPT APPEARS     │ ← Brief 02 (dashboard card)
│ (only after services + avail set) │   Brief 03 (nav indicator)
└───────┬───────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│ SETTINGS: STRIPE CONNECT PAGE     │ ← Brief 01 (main page)
│ State 1: "Get paid directly"      │
│ Click "Connect with Stripe" ──────┤
└───────┬───────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│ Brief transition: "Setting up..." │ ← Brief 01 (State 1b)
└───────┬───────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│ STRIPE HOSTED ONBOARDING          │ (external — not our design)
│ Bank details, identity, etc.      │
└───────┬──────────┬────────────────┘
        │          │
    Completes    Abandons
        │          │
        ▼          ▼
┌──────────┐ ┌──────────────────────┐
│ Return   │ │ 24h later:           │
│ to Astro │ │ Re-engagement email  │ ← Brief 06
└────┬─────┘ └──────────────────────┘
     │
     ▼
┌───────────────────────────────────┐
│ SETTINGS PAGE — VERIFYING         │ ← Brief 01 (State 2b)
│ "Stripe is verifying..."          │
│ Auto-poll → transitions to ───────┤
└───────┬───────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐
│ SETTINGS PAGE — CONNECTED         │ ← Brief 01 (State 3)
│ Celebration + next-step bridge    │
│ "→ Review your deposit policy"    │
└───────┬───────────────────────────┘
        │
        ▼
Deposits now live on booking page    ← Brief 04 (booking page)
Fees visible in appointment detail   ← Brief 05 (fee breakdown)
Dashboard card disappears
Nav indicator disappears
```

## Design System Reference

All components use the existing Atelier (al-*) design token system:

| Token | Usage |
|-------|-------|
| `al-surface-lowest` | Card backgrounds |
| `al-surface-container` | Secondary backgrounds, inactive states |
| `al-primary` | Primary text, active nav |
| `al-on-surface-variant` | Secondary text, metadata |
| `al-status-positive-*` | Success states (green) |
| `al-status-caution-*` | Warning states (amber) |
| `al-status-negative-*` | Error states (red) |
| `bg-[#003366]` | Active nav link (desktop sidebar) |

Cards: `rounded-2xl`, hover states with subtle shadow lift, Material symbols icons (FILL variation).

Typography: `al-page-title` (page headings), `al-lede` (descriptive subtext), `al-eyebrow` (section labels).

## Psychology Principles Applied

Each brief references specific principles from growth.design case studies in the wiki. Key principles across all briefs:

| Principle | Where applied | Evidence |
|-----------|---------------|----------|
| Loss Aversion | Dashboard card (Tier 2) | 6 case studies; strongest motivator for action |
| Goal Gradient | Settings pending state, dashboard card | Blinkist: pre-completed steps accelerate completion |
| Labor Illusion | Settings redirect transition | Wise: +15% perceived value from processing animation |
| Post-Purchase Reassurance | Settings return-from-Stripe state | Audible: no feedback = "bug" anxiety |
| Peak-End Rule | Settings completion celebration | Zapier: confetti post-upgrade shapes memory |
| Successful Transitions | Settings next-step bridge | Audible: no bridge = dead-end after milestone |
| Framing | Settings pending copy | Headspace: positive JTBD framing outperforms negative |
| User-Driven Prompts | Prompt timing gate | Hopper: ask after aha moment, not before |
| Banner Blindness / Habituation | Dashboard card (not a dismissible banner) | Amber Alerts: repeated warnings 8x less effective |
| Zeigarnik Effect | Re-engagement email | Duolingo: +14% Day-7 retention from open loops |
| Feedback Loops | Appointment detail, booking page | Zapier: make consequences visible |
