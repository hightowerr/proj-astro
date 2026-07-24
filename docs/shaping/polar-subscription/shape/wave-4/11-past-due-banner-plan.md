# Wave 4 — Slice 4b: Past Due Banner

## Spec
11-past-due-banner.md

## Files to create/modify
- **Create**: `src/components/past-due-banner.tsx` — banner component
- **Modify**: `src/app/app/layout.tsx` — add conditional banner

## Acceptance Criteria
1. Create `PastDueBanner` component.
2. Banner is inline between page header and dashboard body.
3. CTA: "Update payment method" triggers `authClient.customerPortal()`.
4. Banner is dismissible via X button but returns on next page load.
5. Amber (#c97a2a) accent color on 10% tint background.
6. Add `{isPastDue && <PastDueBanner />}` conditional in app layout.
7. Pass `isPastDue` from `requireShopAuth()` to the layout.
8. Follow the design prototype.
9. `pnpm check` passes with zero new errors.
