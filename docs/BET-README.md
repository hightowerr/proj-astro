# Bet: Astro — The Autonomous Appointment System

## Overview
**Astro** is a high-performance booking and appointment management system designed specifically for beauty professionals (stylists, barbers, nail techs). This "bet" represents the core product cycle (Slices 0-8) that transforms a standard calendar into an autonomous revenue-protection engine.

## The Problem
Beauty professionals lose thousands annually to:
1. **No-shows:** Last-minute absences with no recourse.
2. **Wasted Capacity:** Cancelled slots that stay empty because manual recovery is too slow.
3. **Risk Clients:** Problematic customers who repeatedly cancel or no-show.

## The Solution (The Bet)
We bet that by combining **upfront deposits**, **automated slot recovery**, and **reliability scoring**, we can eliminate no-show losses and keep calendars full without manual intervention.

### Core Pillars
- **💸 Deposit-as-Proof**: Every booking requires a policy-driven deposit via Stripe.
- **♻️ Slot Recovery (Autopilot)**: When a booking is cancelled, Astro automatically offers the slot to eligible customers via SMS in a sequential loop.
- **🎯 Reliability Scoring**: Customers are scored (0-100) based on their 180-day history. Tiers (`top`, `neutral`, `risk`) drive deposit amounts and slot recovery priority.
- **🛡️ Policy Snapshots**: Legal protection via versioned policy snapshots captured at the moment of booking.

## Technical Architecture
- **Next.js 16 (App Router)**: High-performance frontend with React 19.
- **Drizzle ORM + PostgreSQL**: Type-safe database management with migration-based schema evolution.
- **Twilio SMS**: Sequential offer loops and confirmation messaging.
- **Stripe**: Idempotent payments and refunds.
- **Upstash Redis**: Distributed locking to prevent double-booking during concurrent "YES" replies.

## Outcomes & Success Criteria
- [x] **Zero No-Show Loss**: Deposits collected and retained automatically.
- [x] **Autonomous Recovery**: Slots filled without business owner involvement.
- [x] **Smart Tiering**: High-value clients get first access to openings.
- [x] **Legal Compliance**: Clear policy trails for every financial transaction.

## Vertical Slices Delivered
1. **Slice 0-1**: Basic shop skeleton and booking UI.
2. **Slice 2**: Stripe deposit integration.
3. **Slice 3-4**: SMS trail and automated outcome resolution.
4. **Slice 5**: Cancellation and refund policy engine.
5. **Slice 6**: The "Autopilot" slot recovery loop.
6. **Slice 7-8**: Scoring infra and no-show prediction.

---
*This bet was executed as a focused 6-week cycle following Shape Up principles.*
