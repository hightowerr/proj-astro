# 05 — Codebase-wide businessType Integration Audit

## Summary
Systematic audit for other locations where the scope expansion from 1 to 6 business types was not properly integrated. Documents findings and creates follow-up items.

## Prerequisites
- Depends on: none (independent research task)

## Scope

Search for code paths that consume `shop` data but:
- Don't read `businessType`, OR
- Hardcode assumptions about beauty/hair/barbershop context

### Audit checklist

| Area | What to check | Status |
|------|--------------|--------|
| **MCC assignment** | `create-account/route.ts:50` | Fixed by specs 01-02 |
| **Email templates** | Do any templates reference "salon", "barbershop", or hair-specific language? | Check `connect-reengagement/route.ts`, any future email templates |
| **Booking page SEO** | Does `book/[slug]/page.tsx` metadata hardcode a vertical assumption? | Check `generateMetadata()` |
| **Landing page copy** | Does the marketing page assume a single vertical? | Check `src/app/page.tsx` |
| **Analytics/reporting** | Can dashboard stats segment by businessType? | Check `getMonthlyFinancialStats()`, appointment queries |
| **SMS templates** | Do confirmation/reminder SMS reference a specific vertical? | Check `messages.ts` templates |
| **Stripe statement descriptors** | Does the PaymentIntent set a descriptor that assumes a vertical? | Check `appointments.ts` PaymentIntent creation |
| **Service defaults** | Are default services/categories vertical-aware? | Check onboarding service step |

### Known findings from codebase search

1. **`create-account/route.ts:50`** — MCC hardcoded. Fixed by this feature.
2. **`spec 05-api-create-connect-account.md:32`** — Spec documents the hardcoded value. Update spec to reference `getMccForBusinessType()`.
3. **No other hardcoded vertical assumptions found** — Email templates, SMS templates, and booking page metadata are generic (no "salon"/"barbershop" language). The landing page marketing copy references "service businesses" generically.

### Conclusion
The MCC hardcoding is the **only functional integration gap** found. Other systems (UI, SMS, email, booking pages) are already vertical-agnostic because they reference `shop.name` and generic service language, not vertical-specific terminology. The original concern about "scope expansion without integration audit" is valid as a pattern to watch, but the blast radius is limited to MCC in this instance.

## Acceptance
- Audit checklist completed with findings documented
- Any new gaps discovered are filed as issues in `current-issues.md` or roadmap items
- This spec is a documentation deliverable, not a code change
