---
type: drift
classification: EVOLUTION
wave: 4
spec: "#12"
date: 2026-06-22
---

# Drift: BookingHeader component extraction

## What the spec said
Spec #12 suggested: "Consider extracting the repeated header pattern (eyebrow + title + lede)
into a local BookingHeader component to eliminate the 4x duplication."

## What was implemented
A local `BookingHeader` component was created and used across all 4 conditional branches,
eliminating the repeated header pattern entirely.

## Classification: EVOLUTION
The spec explicitly suggested this as an improvement. The extraction reduces duplication
from 4 copies of the header pattern to 1 component with props. No semantic change.
