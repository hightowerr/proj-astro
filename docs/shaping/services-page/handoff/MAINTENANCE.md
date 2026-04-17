# Maintenance Guide — Developer Reference

---

## Content Updates

There is no CMS. All content changes go through source code or the application's own settings UI.

**Shop-owner-managed content** (services, policies, schedules) is edited through `/app/settings/*` routes directly by the owner — no developer involvement required. See `CONTENT_GUIDE.md`.

**Application copy** (page headings, button labels, error messages, email templates) lives in the source files. Edit them directly and redeploy. Key locations:

| Content type | Location |
|-------------|----------|
| Services page headings/subtitle | `src/app/app/settings/services/page.tsx` |
| Empty pane messaging | `src/app/app/settings/services/empty-pane.tsx` |
| Toggle helper text (state semantics) | `src/app/app/settings/services/service-editor-form.tsx` |
| Confirmation dialog copy | `src/app/app/settings/services/discard-confirmation-dialog.tsx` |
| Email templates | `src/lib/email.ts` and email template files |
| SMS message templates | `src/lib/messages.ts` |

---

## Database Changes

1. Modify `src/lib/schema.ts`
2. Run `pnpm db:generate` — creates a new migration file in `drizzle/`
3. Review the generated SQL in `drizzle/NNNN_*.sql`
4. Run `pnpm db:migrate` — applies the migration

**Never** use `pnpm db:push` in production — it bypasses migrations and can cause schema drift.

---

## Design Updates (Stitch Workflow)

The visual design for the Services page was generated with [Stitch](https://stitch.withgoogle.com) and then integrated into the codebase. The design token source is at `docs/design-system/design-system.md` (Atelier Light theme).

### To make visual changes to the Services page

1. **Capture the current UI** — take a screenshot of `/app/settings/services` in the running app. Keep it for before/after comparison.

2. **Prompt Stitch with your changes** while preserving layout structure:
   ```
   [Describe specific visual changes].
   Keep the existing split-pane layout structure (flex col → xl:flex-row).
   Preserve the left-panel service list card pattern and right-panel sticky card.
   Reference design: [attach screenshot]
   ```

3. **Export the updated `DESIGN.md`** from Stitch and save it to:
   ```
   docs/shaping/services-page/stitch_reminder_system_prd (10)/DESIGN.md
   ```

4. **Update design tokens** if color/spacing/typography changed — edit the `--al-*` variables in `src/app/globals.css` `:root` and the `@theme inline` block to match new token values from `docs/design-system/design-system.md`.

5. **Apply visual changes** to the component files:
   - `src/app/app/settings/services/service-list-row.tsx` — row card styling
   - `src/app/app/settings/services/service-editor-form.tsx` — form field and button styling
   - `src/app/app/settings/services/services-editor-shell.tsx` — layout and pane chrome
   - `src/app/app/settings/services/empty-pane.tsx` — empty state
   - `src/app/app/settings/services/page.tsx` — page header

6. **Validate functionality** — run `pnpm check && pnpm test`. The behavioral logic (dirty guard, restore, mutations) is in `services-editor-shell.tsx` and `actions.ts` — visual changes to form/row components should not touch these.

### Design system constraint summary

- **No solid 1px dividers** — use background shifts or `outline-variant` at ≤20% opacity
- **No pure black text** — use `--al-primary` for titles, `--al-on-surface` for body
- **Ghost border fallback** — `border-on-surface-variant/10` or `border-primary/10` only
- **Shadow spec** — `0px 20px 40px rgba(26, 28, 27, 0.06)` (tinted, never black)
- Full rules: `docs/shaping/services-page/stitch_reminder_system_prd (10)/DESIGN.md`

---

## Extension Patterns

### Adding a new settings page

Follow the Services page pattern:

```
src/app/app/settings/{feature}/
  page.tsx          # Server Component — requireAuth(), load data, pass to shell
  {feature}-shell.tsx  # "use client" — owns selectedId, mode, draft, dirty state
  actions.ts        # "use server" — ActionResult<T> envelope, revalidatePath
  types.ts          # Shared types between shell and form
```

Key conventions:
- `page.tsx` uses `requireAuth()` and `Promise.all` for parallel data fetching
- Server Actions return `ActionResult<T>` (`{ ok: true, data } | { ok: false, fieldErrors } | { ok: false, error }`)
- No client-side data fetching; mutations go through Server Actions + `revalidatePath`
- One active draft at a time; dirty tracking compares draft vs baseline field-by-field
- `pnpm lint && pnpm typecheck` must pass before committing

### Adding a new service field

1. Add the column to `src/lib/schema.ts` → `eventTypes` table
2. Run `pnpm db:generate && pnpm db:migrate`
3. Add the field to `ServiceEditorValues` in `src/app/app/settings/services/types.ts`
4. Update `serviceEditorSchema` in `actions.ts` (Zod validation)
5. Add the field to `rowToValues` and `valuesToRow` in `services-editor-shell.tsx`
6. Add UI input in `service-editor-form.tsx` (basic fields) or `AdvancedOptionsSection` (advanced/toggle fields)
7. Update `isDirtyValues` in `services-editor-shell.tsx` to include the new field

---

## Design History

| Date | Activity | Source |
|------|----------|--------|
| 2026-04 | Atelier Light design system generated | Stitch · asset `449beb1e286a415881985419132b73bd` · Project `18022274387003063612` |
| 2026-04 | Services page polish (Stitch fidelity rewrite) | `docs/shaping/services-page/polish-slice.md` |
| 2026-04 | Services page V1–V5 shipped | `docs/shaping/services-page/ship-report.md` |

Stitch project ID: `18022274387003063612`
Stitch asset ID: `449beb1e286a415881985419132b73bd`
Theme: Atelier Light · seed color `#003366` · Manrope
