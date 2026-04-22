# Review 01

Status: [REQUEST CHANGES]

## Blocking Findings

### 1. Bet 2 is not actually complete: the High-Risk card sublabel is wrong

- File: `src/components/dashboard/summary-cards.tsx:53`
- Requirement: Bet 2 R3 / A5.3 requires the sublabel to read `In selected window`.
- Actual: the card still renders `Require confirmation`.
- Impact: this misses the explicit acceptance criteria for the bet.
- Fix: change the sublabel text to `In selected window`.

### 2. The Attention Required highlight logic is inverted

- File: `src/components/dashboard/attention-required-table.tsx:80`
- Requirement context: project rules define risk as `score < 40`; Bet 2 also says the table remains appointment-driven and should not be reinterpreted.
- Actual: the avatar highlight uses `(appointment.customerScore ?? 0) >= 60`.
- Impact: genuinely risky customers are not highlighted consistently, while neutral/top scores can be highlighted as if they were risky.
- Fix: either derive the styling from the same risk rule used in `getDashboardData()` or simplify the row styling so all rows in this table use the risk treatment consistently.

### 3. `page.tsx` includes unshaped product work and extra query cost

- File: `src/app/app/dashboard/page.tsx:10`, `src/app/app/dashboard/page.tsx:79`, `src/app/app/dashboard/page.tsx:106`, `src/app/app/dashboard/page.tsx:121`, `src/app/app/dashboard/page.tsx:131`
- Shape boundary:
  - Bet 3 only shaped mounting `<DashboardSearch />` in the header area.
  - Bet 4 only shaped the `?view=` tab switcher and conditional `DailyLogFeed`.
  - No bet shaped a services onboarding banner, personalized hero copy rewrite, or a new `getEventTypesForShop()` dependency.
- Actual: the page now fetches event types and renders a default-service setup banner, plus a broader layout rewrite.
- Impact: this is gold-plating outside the shaped slice, adds a new product decision, and increases review/test surface for no scoped gain.
- Fix: remove the `getEventTypesForShop()` fetch and the default-service banner, and pare `page.tsx` back to the shaped responsibilities only.

### 4. The light-surface restyle regressed action affordance contrast

- Files: `src/components/dashboard/action-buttons.tsx:86`, `src/components/dashboard/action-buttons.tsx:98`, `src/components/dashboard/action-buttons.tsx:111`, `src/components/dashboard/action-buttons.tsx:123`, `src/components/dashboard/action-buttons.tsx:135`, `src/components/dashboard/contact-popover.tsx:116`
- Actual: the table surface is light, but the action controls still force dark-theme text treatments like `text-white`, `text-sky-100`, `text-emerald-100`, `text-rose-100` on very light backgrounds.
- Impact: the controls are hard to read and close to unusable on the new surface.
- Fix: either revert the unshaped light-table restyle, or retokenize these controls for the light surface before shipping.

### 5. Search shipped without proper combobox semantics

- File: `src/components/dashboard/dashboard-search.tsx:127`, `src/components/dashboard/dashboard-search.tsx:138`
- Actual: the input has `aria-label`, and the popup has `role="listbox"`, but the combobox wiring is missing: no `role="combobox"`, no `aria-expanded`, no `aria-controls`, no `aria-haspopup`.
- Impact: keyboard/screen-reader users do not get correct search-result semantics.
- Fix: add standard combobox attributes and connect the input to the results listbox with an id.

## Gemini Audit Triage

1. `Currency-Blind Monthly Stats` — True positive, but outside the shaped bet work. `getMonthlyFinancialStats()` still aggregates by `financialOutcome` only in `src/lib/queries/dashboard.ts:174`.
2. `Hardcoded USD in UI` — True positive, same root area as above. `src/components/dashboard/summary-cards.tsx:75` and `src/components/dashboard/summary-cards.tsx:81` still hardcode `"USD"` for the `This Month` card.
3. `Inverted High-Risk Highlight Logic` — True positive. Confirmed at `src/components/dashboard/attention-required-table.tsx:80`.
4. `High-Risk Customer Sublabel Mismatch` — True positive. Confirmed at `src/components/dashboard/summary-cards.tsx:53`.
5. `Invisible Interactive Elements (Dark on Light)` — True positive. Confirmed by the light table surface in `attention-required-table.tsx` and the forced dark-theme button classes in `action-buttons.tsx`.
6. `Missing Search ARIA Attributes` — True positive. Confirmed in `dashboard-search.tsx`.
7. `Redundant/Misleading Query` — Noise for this review. `getHighRiskCount()` at `src/lib/queries/dashboard.ts:109` is dead code and cleanup-worthy, but it is not causing current behavior.
8. `Hardcoded Locale in Currency Formatter` — Noise / non-blocking. `en-US` in `formatCurrency()` is a UX choice, not a slice failure.

## Appetite Assessment

We are still on track for the 2-week appetite, but only if the next pass is disciplined:

- Fix the Bet 2 acceptance miss (`In selected window`).
- Correct the inverted risk highlight.
- Remove the unshaped banner/query and any related page gold-plating.
- Repair the contrast/accessibility regressions introduced by the restyle.
- Leave the monthly multi-currency issue for a separately-shaped follow-up unless the scope is explicitly reopened.

This is a small cleanup pass, not a re-shape. The schedule risk is coming from boundary drift, not from the core Bets 1–4 implementation.

## Verification Notes

- `pnpm typecheck` passed.
- `pnpm test --run src/lib/queries/__tests__/dashboard.test.ts src/app/api/search/__tests__/route.test.ts` passed: 48 tests.
- `pnpm lint` reported 1 unrelated warning in `tests/e2e/dashboard-screenshots.spec.ts:4` (`import/order`).
