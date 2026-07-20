# Spec 04 — CTA Section: Subhead + Mockup Cleanup

## Priority

P1 — HIGH. Independent. Ship standalone.

## Summary

Four string-level fixes in the CTA section: remove "500+" from the subhead, rename "Autopilot actions" label, remove the vaporware "Upsell prompt ready" pill, and fix the stale "AST" branding ref. All changes in a single file.

## Changes

- **File:** `src/components/landing/cta-section.tsx`

### 1. Subhead (lines 48-51)

**Current:**
```tsx
Join 500+ beauty professionals who have eliminated no-shows and put their slot recovery
on autopilot.
```

**Replace with:**
```tsx
Join beauty professionals who&apos;ve eliminated no-shows with automated slot recovery.
```

### 2. Mockup label (line 104)

**Current:**
```tsx
Autopilot actions
```

**Replace with:**
```tsx
Automated actions
```

### 3. Remove vaporware pill (line 26)

**Current:**
```typescript
const NEXT_ACTIONS = ["Manage booking", "Add note", "Upsell prompt ready"] as const;
```

**Replace with:**
```typescript
const NEXT_ACTIONS = ["Manage booking", "Add note"] as const;
```

"Upsell prompt ready" is not a shipped feature. "Manage booking" and "Add note" are real.

### 4. Fix stale branding ref (line 83)

**Current:**
```tsx
Ref #AST-2194
```

**Replace with:**
```tsx
Ref #SU-2194
```

"AST" was the old "Astro" branding. "SU" aligns with ShowUp (rebrand completed 2026-07-14).

## Design Notes

- No visual or layout changes — string replacements only
- The phone mockup content (booking confirmation, automated actions checklist) remains accurate and unchanged
- The three `AUTOMATION_STEPS` ("SMS confirmation delivered", "24-hour reminder scheduled", "Google Calendar synced") are all real shipped features — no changes needed

### Pages impacted

- `/` — landing page CTA section

## Acceptance Criteria

- [ ] Subhead contains no "500+" user count
- [ ] Subhead uses "automated" not "autopilot"
- [ ] Mockup label reads "Automated actions"
- [ ] "Upsell prompt ready" pill is removed
- [ ] Ref shows "SU-2194" not "AST-2194"
- [ ] `pnpm check` passes

## Prerequisites

None.

## Dependencies

None — fully independent.
