# Wave 1 Verification Report

**Verifier**: Independent agent (separate session)
**Date**: 2026-07-05
**File**: `src/app/api/jobs/connect-reengagement/route.ts`
**Diff scope**: 4 lines changed (all within string template literals)

---

## Copy-Only Change Confirmation

The `git diff` confirms ONLY string content was modified. Zero changes to:
- Imports (line 1-4) ✅
- Auth/lock logic (lines 11-34) ✅
- Query/timing windows (lines 36-64) ✅
- Send logic/dedup (lines 124-148) ✅
- Response/unlock (lines 150-161) ✅

## Unchanged Strings Confirmation

| String | Location | Status |
|--------|----------|--------|
| Subject: "You're one step away from collecting deposits" | line 128 | UNCHANGED ✅ |
| CTA: "Complete setup →" | line 112 | UNCHANGED ✅ |
| Nudge: "This usually takes under 5 minutes." | line 114 | UNCHANGED ✅ |
| Sign-off: "— Astro" | line 115 | UNCHANGED ✅ |
| Advisory lock 482181 | line 9 | UNCHANGED ✅ |
| 24-48h timing window | lines 38-39 | UNCHANGED ✅ |
| `connectReengagementSentAt` dedup guard | line 55 | UNCHANGED ✅ |

## Typecheck

`pnpm run typecheck` — **PASS** (clean, zero errors)

---

## Spec 01 — HTML Headline

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Headline reads "You began setting up deposits — finish in under 5 minutes." | PASS ✅ | line 109: `<p class="em-text" style="...">You began setting up deposits — finish in under 5 minutes.</p>` |
| No change to subject line or CTA text | PASS ✅ | Subject: line 128 unchanged. CTA: line 112 unchanged. |
| Typography: 21px / weight 800 / letter-spacing -0.015em | FAIL ❌ | font-size:21px ✅, font-weight:800 ✅, letter-spacing:-0.015em MISSING. **Pre-existing** — original code also lacked letter-spacing; not a regression from this change. |

**Result: 2 PASS / 1 FAIL (pre-existing)**

---

## Spec 02 — HTML Body

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Body reads "Once set up, customer deposits will go directly to your bank account on every booking." | PASS ✅ | line 110: `Once set up, customer deposits will go directly to your bank account on every booking.` |
| Typography: 15.5px / line-height 1.65 / max-width 46ch | FAIL ❌ | font-size:15.5px ✅, line-height:1.65 ✅, max-width:46ch MISSING. **Pre-existing** — original code also lacked max-width; not a regression from this change. |

**Result: 1 PASS / 1 FAIL (pre-existing)**

---

## Spec 03 — HTML Footer

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Footer reads "You're receiving this because you began setting up deposit collection for your Astro account. This is a transactional account-setup message." | PASS ✅ | line 117: required text present. Additional trailing sentence ("If you've already completed setup, you can disregard this message.") preserved from original — not spec-contradicting. |
| Brand footer: "ASTRO · Stop losing money to no-shows." | FAIL ❌ | Brand footer element does not exist in the HTML template. **Pre-existing gap** — this element was never implemented in the original email. |
| Typography: 11.5px / line-height 1.6 / cFaint color | FAIL ❌ | font-size:12px (spec: 11.5px) ❌, line-height:1.6 ✅, color:#9ca3af (spec: #737780 light / #7c828c dark) ❌. **Pre-existing** — original code had same values; not a regression. |

**Result: 1 PASS / 2 FAIL (pre-existing)**

---

## Spec 04 — Plain Text

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Headline and footer match HTML versions from specs 01 and 03 | PASS ✅ (with note) | Headline: "You began setting up deposits — finish in under 5 minutes." matches HTML ✅. Footer opening: "You're receiving this because you began setting up deposit collection for your Astro account." matches HTML ✅. Footer closing: plaintext says "This is a transactional notification — not a marketing email." vs HTML "This is a transactional account-setup message." — wording differs, but implementation matches spec 04's own explicit full template. **Spec-level inconsistency**, not an implementation error. |
| Body updated to "Once set up" for cross-format consistency | PASS ✅ | line 122: `Once set up, customer deposits will go directly to your bank account on every booking.` |
| No other plaintext content changes | PASS ✅ | Diff confirms only headline, body, and footer text changed. |

**Result: 3 PASS / 0 FAIL**

---

## Summary

| Spec | Copy Criteria | Typography/Structure Criteria | Overall |
|------|--------------|-------------------------------|---------|
| 01 — HTML Headline | 2/2 PASS | 0/1 PASS (pre-existing) | 2 PASS / 1 FAIL |
| 02 — HTML Body | 1/1 PASS | 0/1 PASS (pre-existing) | 1 PASS / 1 FAIL |
| 03 — HTML Footer | 1/1 PASS | 0/2 PASS (pre-existing) | 1 PASS / 2 FAIL |
| 04 — Plain Text | 3/3 PASS | — | 3 PASS / 0 FAIL |
| **Total** | **7/7 PASS** | **0/4 PASS** | **7 PASS / 4 FAIL** |

### Failure Classification

All 4 failures are **PRE-EXISTING** — the `git diff` confirms these properties were never present in the original code and were not removed by this change. The copy change scope (4 string replacements) was executed correctly. The failures exist because the original email template (spec 16 from Stripe Connect wave 4) was implemented with typography deviations from the design prototype, and the acceptance criteria for specs 01-04 reference the design prototype's typography values.

### Verdict

**Copy changes: PASS (7/7).** All string content matches specs exactly.
**Typography/structure: 4 FAIL (all pre-existing).** These are not regressions — they are existing gaps between the email template and the design prototype that predate this change. Logged as fix issues in `docs/context/current-issues.md` for a future design-conformance pass.
