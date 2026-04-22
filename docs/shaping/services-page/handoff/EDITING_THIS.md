# Editing This Codebase

A quick-reference for the three most common change types, written for developers who are new to this repo.

---

## "I need to change the text / copy"

All application copy lives in source files — there is no CMS.

**Services settings page** — text lives in these files:

| What to change | File |
|---------------|------|
| Page title, subtitle, breadcrumb | `src/app/app/settings/services/page.tsx` |
| Empty state title and body | `src/app/app/settings/services/empty-pane.tsx` |
| Editor heading ("Edit Service" / "New Service") | `src/app/app/settings/services/services-editor-shell.tsx` — search for `"Edit Service"` |
| Toggle helper text (what Hidden/Inactive means) | `src/app/app/settings/services/service-editor-form.tsx` — `description=` props on `<ToggleField>` |
| Confirmation dialog copy | `src/app/app/settings/services/discard-confirmation-dialog.tsx` |
| Validation error messages | `src/app/app/settings/services/actions.ts` — Zod schema messages and field error strings |
| SMS message templates | `src/lib/messages.ts` |
| Email templates | `src/lib/email.ts` |

After editing, run `pnpm check` to confirm no type errors were introduced, then redeploy.

---

## "I need to change the visual design"

The services page UI was built from a Stitch-generated reference. The workflow for visual changes:

### 1. Capture the current state
Take a screenshot of `/app/settings/services` from a running instance. This is your before-state for comparison and your input to Stitch.

### 2. Prompt Stitch with your changes
Open Stitch and describe the specific visual change while anchoring to the existing structure:

```
[Describe the specific change — e.g., "Make service row cards use a warmer background
and increase the corner radius to 2rem"].
Keep the existing layout: split-pane, left list of service cards, right sticky editor card.
Preserve the split content/footer structure inside the right pane.
Reference: [attach screenshot]
```

### 3. Update design tokens if needed
If Stitch changes color, spacing, or typography values, update them in:
- `docs/design-system/design-system.md` — the token source-of-truth
- `src/app/globals.css` — `:root { --al-* }` block and `@theme inline` aliases

### 4. Apply to component files
The services page visual surface maps to these files:

| Visual area | File |
|-------------|------|
| Page header (title, breadcrumb, subtitle) | `src/app/app/settings/services/page.tsx` |
| Split-pane layout, left/right columns, pane chrome | `src/app/app/settings/services/services-editor-shell.tsx` |
| Service list row (card, badges, meta icons, actions) | `src/app/app/settings/services/service-list-row.tsx` |
| Editor form (labels, inputs, buffer chips, toggles, buttons) | `src/app/app/settings/services/service-editor-form.tsx` |
| Empty state (icon, title, stat cards) | `src/app/app/settings/services/empty-pane.tsx` |
| Discard confirmation modal | `src/app/app/settings/services/discard-confirmation-dialog.tsx` |
| Toggle switch CSS | `src/app/globals.css` — `.al-toggle-track` / `.al-toggle-thumb` |

### 5. Validate
```bash
pnpm check       # lint + typecheck
pnpm test        # unit tests — behavioral logic must not be broken by visual changes
```

The behavioral shell (`services-editor-shell.tsx`) handles dirty tracking, navigation gates, and mutations. Visual changes to `service-list-row.tsx` and `service-editor-form.tsx` should not touch the shell's state logic.

### Design constraints to preserve

- **No solid 1px dividers** — use background color shifts or `outline-variant` at ≤20% opacity
- **No pure black text** — `--al-primary` (`#001e40`) for titles; `--al-on-surface` (`#1a1c1b`) for body
- **Shadow spec** — `rgba(26, 28, 27, 0.06)` tinted, never pure black
- Full system rules: `docs/shaping/services-page/stitch_reminder_system_prd (10)/DESIGN.md`

---

## "I need to add a new page"

Follow the settings page pattern. All settings pages share the same structure:

```
src/app/app/settings/{feature}/
  page.tsx            # Server Component: requireAuth(), parallel data fetch, pass to shell
  {feature}-shell.tsx # "use client": selectedId, mode, baseline, draft, dirty state
  actions.ts          # "use server": ActionResult<T>, revalidatePath
  types.ts            # Shared types (ServiceRow, ShopContext, EditorValues, etc.)
  constants.ts        # Shared constants (MAX_*, DEFAULT_*)
```

**Minimum viable `page.tsx`:**
```tsx
import { requireAuth } from "@/lib/session";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { MyFeatureShell } from "./my-feature-shell";

export default async function MyFeaturePage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);
  if (!shop) return <div>Create your shop first.</div>;

  const data = await loadMyData(shop.id);
  return <MyFeatureShell data={data} />;
}
```

**ActionResult envelope (required for all Server Actions):**
```ts
type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: Partial<Record<FieldName, string>> }
  | { ok: false; error: string };
```

**After adding, register the route in navigation** — check `src/components/layout/route-chrome.tsx` or the settings layout for the nav link list.

---

## Stitch Prompt History

| Date | Prompt summary | Output |
|------|---------------|--------|
| 2026-04 | Initial Atelier Light system generation · seed `#003366` · Manrope · spacing generous | `docs/design-system/design-system.md` |
| 2026-04 | Services page split-pane polish — service row cards, editor form fields, buffer chips, toggle switches, action buttons, right-pane sticky card, page header | `docs/shaping/services-page/polish-slice.md` |

Stitch project ID: `18022274387003063612`
Stitch asset ID: `449beb1e286a415881985419132b73bd`
