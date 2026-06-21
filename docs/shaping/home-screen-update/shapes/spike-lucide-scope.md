# Spike: lucide-react Import Scope

**Question:** Is it safe to remove lucide-react imports from `atelier-dashboard.tsx` without breaking other components?

## Findings

### Files importing from lucide-react
1. `src/components/dashboard/atelier-dashboard.tsx` — 9 icons
2. `src/components/booking/booking-form.tsx` — ChevronLeft, ChevronRight, Clock, CalendarDays, Check, AlertCircle
3. `src/components/onboarding/onboarding-flow.tsx` — Check, ChevronRight, Loader2
4. `src/components/ui/sonner.tsx` — via sonner dependency
5. Multiple shadcn/ui components — ChevronDown, ChevronRight, etc.

### Isolation check
- `atelier-dashboard.tsx` exports only the `AtelierDashboard` component. No icons re-exported.
- Parent (`src/app/app/page.tsx`) passes only data props. No icon props.
- All 9 icons are consumed locally within the component.

## Conclusion

**Safe to remove.** The lucide-react imports in atelier-dashboard.tsx are fully self-contained. The package stays installed for other consumers.
