# Bet 2 — Research Notes

**Sources:** Design system (`docs/design-system/`), TypeScript docs, Berkeley DAP accessible card patterns
**Scope:** Technical details for A1 (Set deduplication) and A5.3 (sublabel styling/accessibility)

---

## A1 — `new Set(...).size` in strict TypeScript

**No issues.** `Set.prototype.size` returns `number` — never `number | undefined`. `noUncheckedIndexedAccess` only affects array/object index access (`arr[0]`, `obj[key]`). It does not affect `.size`, `.map()`, or the `Set` constructor.

```typescript
// Clean under strict + noUncheckedIndexedAccess — no guard needed
const highRiskCustomerCount = new Set(
  highRiskAppointments.map((a) => a.customerId)
).size;
```

**Null safety:** `appointments.customerId` is a non-null UUID FK in the schema. After Bet 1 V2 selects it as `customerId: appointments.customerId`, the Drizzle-inferred type is `string` (not `string | null`). No null entries can enter the Set.

**Edge case — empty array:** `new Set([]).size === 0`. Safe. Returns 0 when no high-risk appointments exist, which is the correct count.

---

## A5.3 — Sublabel styling

The dashboard is dark-themed using project-specific Tailwind classes (`bg-bg-dark-secondary`, `text-text-light-muted`, `text-red-300`). The design system tokens (Atelier Light) are for the light theme and are not applied to dashboard cards. Match the existing card pattern.

**Existing High-Risk card structure:**

```tsx
<article className="rounded-lg border border-red-500/30 bg-bg-dark-secondary p-5">
  <h3 className="text-xs font-medium uppercase text-red-300">High-Risk Appointments</h3>
  <p className="mt-2 text-3xl font-semibold tabular-nums text-red-200">{highRiskCount}</p>
</article>
```

**Sublabel pattern — match the card's red family, reduced to secondary weight:**

```tsx
<article className="rounded-lg border border-red-500/30 bg-bg-dark-secondary p-5">
  <h3 className="text-xs font-medium uppercase text-red-300">High-Risk Customers</h3>
  <p className="mt-2 text-3xl font-semibold tabular-nums text-red-200">{highRiskCustomerCount}</p>
  <p className="mt-1 text-xs text-red-300/70">In selected window</p>
</article>
```

`text-red-300/70` — same red family as the card label (`text-red-300`) at 70% opacity. This signals secondary/contextual copy without leaving the card's colour family. Consistent with how the design system describes text hierarchy: secondary copy uses reduced opacity within the same tonal family.

**Precedent in the same component:** The "This Month" card uses `text-text-light-muted` for its inner labels (`Retained`, `Refunded`). The High-Risk card should use its own colour family (`red-300`) at reduced opacity rather than switching to the neutral muted class.

---

## A5 — Accessible card structure

**Existing pattern is already correct.** The `<article>` element with an `<h3>` heading is the right semantic structure for a standalone metric card.

```
<article>          ← landmark: self-contained unit
  <h3>             ← accessible name for the card (screen readers announce this)
  <p>              ← metric value
  <p>              ← sublabel / context
```

No `aria-label` or `aria-describedby` needed on top of this — the heading provides the accessible name and the subsequent `<p>` elements are read in DOM order. Screen readers will announce: *"High-Risk Customers. 3. In selected window."*

**Do not** wrap the sublabel in a `<span>` inside the count `<p>` — keep them as separate block elements so the reading order is natural and the count value is not embedded inside a compound sentence.

---

## Confirmation: no design system token conflict

The dashboard cards use custom dark-mode Tailwind classes, not the Atelier Light CSS tokens. No token migration is needed for this change. `text-red-300/70` is a standard Tailwind opacity modifier and requires no new class definition.

---

## Summary table

| Question | Answer |
|----------|--------|
| Is `new Set(...).size` affected by `noUncheckedIndexedAccess`? | No — `.size` is always `number` |
| Can `customerId` be null in the Set? | No — non-null UUID FK; Drizzle infers `string` after Bet 1 V2 |
| What class for the sublabel? | `text-xs text-red-300/70` + `mt-1` |
| Does the accessible structure need ARIA? | No — `<article>` + `<h3>` + `<p>` in DOM order is sufficient |
| Do design system tokens apply to dashboard cards? | No — dashboard is dark-themed with project-specific classes |
