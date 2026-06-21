# Booking Page — Feature Spec Build Order

Dependency graph and phased build order for the booking page design specs.

## Dependency Graph

```
01-navigation-header ──────────────────────────────── (none)
02-page-header ─────────────────────────────────────── (none)
03-service-card ────────────────────────────────────── (none)
04-date-picker ─────────────────────────────────────── (none)
05-time-slot-grid ──────────────────────────────────── 04-date-picker
06-contact-form ────────────────────────────────────── (none)
07-communication-preferences ───────────────────────── (none)
08-confirm-booking-cta ─────────────────────────────── 05-time-slot-grid, 06-contact-form
09-footer ──────────────────────────────────────────── (none)
```

## Phased Build Order

### Phase 1 — Shell & Independent Sections

No dependencies. All can run in parallel.

| Spec | Description | Depends on | Status |
|------|-------------|------------|--------|
| `01-navigation-header` | Top nav bar, brand, links, CTA | — | ✅ Implemented |
| `02-page-header` | Eyebrow + heading + service subtitle | — | ✅ Implemented |
| `03-service-card` | Selected service display + badge | — | ✅ Implemented |
| `04-date-picker` | Date input field | — | ✅ Implemented |
| `06-contact-form` | Name, phone, email fields | — | ✅ Implemented |
| `07-communication-preferences` | SMS + email opt-in checkboxes | — | ✅ Implemented |
| `09-footer` | Brand attribution footer | — | Pending |

### Phase 2 — Date-Dependent

Needs Phase 1 for date picker.

| Spec | Description | Depends on |
|------|-------------|------------|
| `05-time-slot-grid` | Available slot buttons for chosen date | `04-date-picker` | ✅ Implemented |

### Phase 3 — Form-Complete Gate

Needs Phase 1 fields + Phase 2 slots.

| Spec | Description | Depends on |
|------|-------------|------------|
| `08-confirm-booking-cta` | Submit button (disabled until form valid + slot selected) | `05-time-slot-grid`, `06-contact-form` |

## Critical Path

```
04-date-picker → 05-time-slot-grid → 08-confirm-booking-cta
```

3 phases, 3 specs deep. Everything else is Phase 1 parallelizable work.
