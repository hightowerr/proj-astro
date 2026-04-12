# Bug Report 01: Services Page Functional Review

This report identifies functional bugs and accessibility blockers in the Services Page implementation based on the shaping document `docs/shaping/services-page/shaping.md`.

## Summary Table

| ID | Issue | Severity | Requirement |
|----|-------|----------|-------------|
| B1 | Incomplete State Badges (Hidden + Inactive) | Medium | R2.2 |
| B2 | Incorrect Copy Link Visibility (Hidden + Active) | Medium | R2.3 / R3.2 |
| B3 | $0 Deposit Override Blocked by Validation | Low | R7.1 |
| B4 | List State Divergence (useState vs props) | High | R8.1 / R8.4 |
| B5 | Lack of State Semantics Clarity in Editor | Low | R3.2 |
| B6 | Incomplete Restore State Sync | Medium | R6.3 |
| B7 | Nested Buttons Accessibility Blocker | High | Accessibility |

---

## Detailed Findings

### B1: Incomplete State Badges
- **Symptom**: When a service is both `isHidden=true` AND `isActive=false`, only the "Hidden" badge is displayed in the list row.
- **Requirement**: R2.2 states "hidden+inactive → both".
- **Location**: `src/app/app/settings/services/service-list-row.tsx` (lines 88-100).
- **Impact**: Owners may be confused about the actual state of a service if it is both hidden and inactive.

### B2: Incorrect Copy Link Visibility
- **Symptom**: The "Copy booking link" is hidden for services that are `isHidden=true` but `isActive=true`.
- **Requirement**: R3.2 states "hidden+active = publicly hidden but link-bookable". R2.3 says the copy link should only be hidden for inactive services.
- **Location**: `src/app/app/settings/services/service-list-row.tsx` (lines 135-151).
- **Impact**: Owners cannot copy links for "private" services that are otherwise bookable.

### B3: $0 Deposit Override Blocked by Validation
- **Symptom**: Setting a deposit override to $0 (to waive a policy-level deposit for a specific service) is blocked by backend Zod validation.
- **Requirement**: R7.1 says "depositAmountCents blank or positive". In common usage, waiver of a deposit (0) is a valid "positive-ish" business intent. The current schema uses `.positive()`, which strictly requires `> 0`.
- **Location**: `src/app/app/settings/services/actions.ts` (line 39).
- **Impact**: Owners cannot waive deposits for specific services if a shop-wide policy is active.

### B4: List State Divergence
- **Symptom**: The service list is held in `useState(services)` in `ServicesEditorShell`. When `revalidatePath` executes after a mutation, the `services` prop updates, but the `serviceRows` state does not, causing the list to reflect stale data.
- **Requirement**: R8.1 and R8.4 emphasize server-rendered data and avoiding client-side state caches that bypass the RSC refresh.
- **Location**: `src/app/app/settings/services/services-editor-shell.tsx` (line 46).
- **Impact**: The list can become out of sync with the server after multiple operations or concurrent edits.

### B5: Lack of State Semantics Clarity in Editor
- **Symptom**: The toggle switches in the editor form lack descriptive text explaining the consequences of the "Hidden" and "Inactive" states.
- **Requirement**: R3.2 states "UI makes state meaning explicit: hidden+active = publicly hidden but link-bookable; inactive = unbookable".
- **Location**: `src/app/app/settings/services/service-editor-form.tsx` (lines 200-213).
- **Impact**: Lower clarity for users managing service availability.

### B6: Incomplete Restore State Sync
- **Symptom**: `handleRestore` manually updates `isHidden` and `isActive` in the local state but does not refresh other fields of the service row from the latest server state (if they were changed by the action or another user).
- **Requirement**: R6.3 requires the restored row to show "fresh committed values".
- **Location**: `src/app/app/settings/services/services-editor-shell.tsx` (lines 282-298).
- **Impact**: Stale data may persist in the editor after a restore operation.

### B7: Nested Buttons Accessibility Blocker
- **Symptom**: The `Restore` button is implemented as a `<button>` nested inside a `<motion.button>`.
- **Requirement**: HTML structure must be valid. Nested interactive elements are inaccessible to screen readers and keyboard users (unreachable or confusing focus order).
- **Location**: `src/app/app/settings/services/service-list-row.tsx` (lines 120-132).
- **Impact**: High. Screen readers will fail to interpret the interactive hierarchy correctly.
