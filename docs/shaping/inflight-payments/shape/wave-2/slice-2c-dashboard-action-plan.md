# Slice 2c: Dashboard Action Item for Held Transfers

**Spec**: 06 | **Priority**: P2 UI | **Files**: `src/app/app/dashboard/page.tsx`, new `src/components/dashboard/transfer-held-card.tsx`

## Work

### 1. Create TransferHeldCard component
- **File**: `src/components/dashboard/transfer-held-card.tsx` (new)
- **Props**: `count: number` (held transfer count)
- **Template**: Follow `ConnectCard` component structure (`connect-card.tsx`)
- **Rendering**:
  - `count === 0` → return null (no render)
  - `count === 1` → title: "1 payment with held transfer", CTA: "View appointment →"
  - `count > 1` → title: "{count} payments with held transfers", CTA: "View held payments →"
- **Design reference**: Prototype `Dashboard Connect Card.html`

### 2. Visual implementation
- Card: amber background, rounded corners (follow existing card styling)
- Icon: `warning` (Material Symbols, filled triangle), amber
- Body: "Stripe is reviewing your account. Transfers will resume automatically once your account is restored. Contact Stripe support if this persists."
- CTA: text link + `arrow_forward` icon
- Not dismissable

### 3. Wire into dashboard page
- **Where**: `src/app/app/dashboard/page.tsx`, between ConnectCard (line ~150) and SummaryCards (line ~152)
- Query held transfer count: `appointments.count where transferHeld === true AND financialOutcome !== "refunded" AND shopId === currentShop.id`
- Pass count to `TransferHeldCard`

## Visual checklist (from design prototype)
- [ ] Amber warning background (not red/error)
- [ ] `warning` filled triangle icon, amber
- [ ] Title bold with dynamic count + correct pluralisation
- [ ] Body text: normal weight, secondary colour
- [ ] CTA: text link + arrow_forward icon
- [ ] Positioned below ConnectCard, above SummaryCards
- [ ] Hidden when count === 0 (no empty state)

## Acceptance criteria
- [ ] New `TransferHeldCard` component created
- [ ] Renders for count >= 1, hidden for count === 0
- [ ] Singular/plural copy matches prototype exactly
- [ ] CTA: "View appointment →" (1) / "View held payments →" (>1)
- [ ] Wired into dashboard page between ConnectCard and SummaryCards
- [ ] Query counts unrefunded held transfers for current shop
- [ ] lint + type-check pass

## Dependencies
- **Requires**: Slice 1b (transferHeld column to query)
