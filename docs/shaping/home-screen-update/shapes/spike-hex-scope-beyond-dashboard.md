# Spike: Hardcoded Hex Scope Beyond Dashboard

**Question:** Do the 7 hardcoded hex values from Spec #11 appear in files beyond `atelier-dashboard.tsx`?

## Findings

### Hex values confined to dashboard + globals.css only

| Hex | Token | Files |
|-----|-------|-------|
| `#785c53` | `--al-on-secondary-container` | `globals.css`, `atelier-dashboard.tsx` |
| `#74584f` | `--al-secondary` | `globals.css`, `atelier-dashboard.tsx` |
| `#93000a` | `--al-on-error-container` | `globals.css`, `atelier-dashboard.tsx` |
| `#ffdad6` | `--al-error-container` | `globals.css`, `atelier-dashboard.tsx` |

### Hex values that leak into other component files

| Hex | Token | Additional files |
|-----|-------|-----------------|
| `#2a170f` | `--al-on-secondary-fixed` | `attention-required-table.tsx:73`, `payments-table.tsx:308`, `curator-chip.tsx:17` |
| `#ffdbcf` | `--al-secondary-fixed` | `attention-required-table.tsx:73`, `payments-table.tsx:308`, `curator-chip.tsx:17,29` |
| `#fdd8cb` | `--al-secondary-container` | `customers-editorial.tsx:58,831`, `appointments-table.tsx:42` |

### Additional hex values found (not in Spec #11)

`curator-chip.tsx` and `appointments-table.tsx` also use:
- `#e2bfb3` → `--al-secondary-fixed-dim` (hover color)
- `#380d01` / `#572411` → tertiary palette tokens

These are not part of Spec #11's scope.

## Conclusion

**3 of 7 hex values appear in 4 additional component files.** Spec #11 targets only `atelier-dashboard.tsx` per its [now] appetite. The broader cleanup across other files should be tracked as a follow-up issue, not bundled into this spec.

**Out-of-scope files for future cleanup:**

| File | Hardcoded hex values |
|------|---------------------|
| `src/components/dashboard/attention-required-table.tsx` | `#ffdbcf`, `#2a170f` |
| `src/components/billing/payments-table.tsx` | `#ffdbcf`, `#2a170f` |
| `src/components/ui/curator-chip.tsx` | `#ffdbcf`, `#2a170f`, `#e2bfb3`, `#380d01` |
| `src/components/customers/customers-editorial.tsx` | `#fdd8cb`, `#e2bfb3` |
| `src/app/app/appointments/appointments-table.tsx` | `#fdd8cb`, `#e2bfb3`, `#572411` |
