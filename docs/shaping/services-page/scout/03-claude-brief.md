# Claude Brief

- The repo already has the right primitives. The current services page is split across an inline edit list and a separate create form. The shaped bet should replace both with one client split-pane shell on top of the existing data fetch in [`page.tsx`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/app/settings/services/page.tsx).
- Use a server-rendered route for initial data and a single client editor island for selection, create/edit mode, dirty tracking, and confirmation handling. Do not introduce per-row draft state or client-side data fetching layers.
- Change `createEventType` to return the created id and add a dedicated `restoreEventType(id)` action. `updateEventType` can stay as the committed-save path. `useActionState` is the safest fit for pending and validation feedback in Next.js 16.
- Preserve current semantics exactly: hidden services stay direct-link bookable while inactive services do not. That makes row labels and restore copy materially important, not cosmetic.
- Competitor flow analysis:
  - Square needs a library-style flow with separate “bookable” controls and many optional settings.
  - Calendly uses a right-hand editor, but secret/public state still lives off-card in menus.
  - Cal.com starts with a modal and then expands into a much larger settings surface.
  - We can beat all three by keeping “select row or click Add New -> edit in same pane -> save/restore in place” to 2 clicks for the common path.

## Specific patterns to consider

- `EditorState`: `empty | edit | create`
- `PendingTarget`: `select | create | restore | empty`
- Native `beforeunload` only when dirty
- Local baseline-vs-draft comparison for dirty state
- Disable navigation controls while save or restore is pending

## Open questions only business or Claude can answer

- Should `Copy link` live in the left row, the right pane, or both?
- Should hidden-only services be labeled `Hidden` or `Direct-link only` to better reflect actual behavior?
- On mobile, do we accept a stacked list-then-editor flow, or must the split-pane behavior survive as a two-panel interaction?
- Is a custom discard modal required, or is native confirm acceptable for the first iteration?
