---
title: "V3: Mutations — Implementation Plan"
slice: V3
feature: Services Page split-pane
status: pending
---

# V3: Mutations

**Feature:** [Services Page: Split-Pane Service Management](./shaping.md)
**Slice:** V3 of 5 | [Slices overview](./slices.md)

---

## Goal

Save and Create mutations work end-to-end. Validation errors render inline. The `actions.ts` file is fully refactored to the typed `ActionResult` contract.

## Affordances in scope

### UI Affordances

| ID | Name | Place | Description |
|----|------|-------|-------------|
| U9 | Save button | Editor Pane | Submits mutation; pending spinner; disabled during save |
| U11 | Mutation feedback | Editor Pane | Per-field error messages, form-level error banner, brief success indicator |

### Non-UI Affordances

| ID | Name | Place | Description |
|----|------|-------|-------------|
| N5 | updateEventType | Server Actions | Refactored to `ActionResult`; `ServiceEditorValues` typed param |
| N6 | createEventType | Server Actions | Returns `ActionResult<{ id: string }>`; client switches to edit mode with new id |
| N7 | restoreEventType | Server Actions | New action (not yet client-wired); exists ready for V5 |

## Out of scope

- Dirty tracking (V4) — after save, `dirty` will be reset to false in V4 when the flag exists; for now baseline is updated client-side
- Confirmation dialog (V4)
- Restore button client wiring (V5)

---

## Implementation steps

### 1. Define types and helpers in `actions.ts`

**File:** `src/app/app/settings/services/actions.ts`

Add at the top (after `"use server"` and imports). Import `ServiceEditorValues` and `ServiceField` from `./types`:

```ts
import type { ServiceEditorValues, ServiceField } from "./types";

type ActionOk<T = void>   = { ok: true;  data: T };
type ActionFieldError     = { ok: false; fieldErrors: Partial<Record<ServiceField, string>> };
type ActionError          = { ok: false; error: string };
export type ActionResult<T = void> = ActionOk<T> | ActionFieldError | ActionError;
```

Add Zod error mapping helpers:

```ts
const VALID_SERVICE_FIELDS = new Set<string>([
  "name", "description", "durationMinutes", "bufferMinutes",
  "depositAmountCents", "isHidden", "isActive",
]);

function mapZodErrors(issues: z.ZodIssue[]): Partial<Record<ServiceField, string>> {
  const fieldErrors: Partial<Record<ServiceField, string>> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (
      typeof key === "string" &&
      VALID_SERVICE_FIELDS.has(key) &&
      !(key in fieldErrors)
    ) {
      fieldErrors[key as ServiceField] = issue.message;
    }
  }
  return fieldErrors;
}

function validateValues(values: ServiceEditorValues): ActionFieldError | null {
  const result = serviceEditorSchema.safeParse(values);
  if (!result.success) {
    return { ok: false, fieldErrors: mapZodErrors(result.error.issues) };
  }
  return null;
}

async function validateDuration(
  shopId: string,
  durationMinutes: number,
): Promise<ActionFieldError | null> {
  const settings = await getBookingSettingsForShop(shopId);
  const slotMinutes = settings?.slotMinutes ?? 60;
  if (durationMinutes % slotMinutes !== 0) {
    return {
      ok: false,
      fieldErrors: {
        durationMinutes: `Duration must be a multiple of ${slotMinutes} minutes`,
      },
    };
  }
  return null;
}
```

Add a Zod schema for `ServiceEditorValues` (or reuse existing one if it exists):

```ts
const serviceEditorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  durationMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().nullable(),
  depositAmountCents: z.number().int().positive().nullable(),
  isHidden: z.boolean(),
  isActive: z.boolean(),
});
```

### 2. Refactor `createEventType`

Change signature from FormData to typed values, return id on success:

```ts
export async function createEventType(
  values: ServiceEditorValues,
): Promise<ActionResult<{ id: string }>> {
  const { user, session } = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const shop = await getShopForUser(user.id);
  if (!shop) return { ok: false, error: "Shop not found" };

  const fieldError = validateValues(values);
  if (fieldError) return fieldError;

  const durationError = await validateDuration(shop.id, values.durationMinutes);
  if (durationError) return durationError;

  const result = await db
    .insert(eventTypes)
    .values({
      shopId: shop.id,
      name: values.name,
      description: values.description || null,
      durationMinutes: values.durationMinutes,
      bufferMinutes: values.bufferMinutes,
      depositAmountCents: values.depositAmountCents,
      isHidden: values.isHidden,
      isActive: values.isActive,
    })
    .returning({ id: eventTypes.id });

  revalidatePath("/app/settings/services");
  return { ok: true, data: { id: result[0].id } };
}
```

### 3. Refactor `updateEventType`

```ts
export async function updateEventType(
  id: string,
  values: ServiceEditorValues,
): Promise<ActionResult> {
  const { user, session } = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const shop = await getShopForUser(user.id);
  if (!shop) return { ok: false, error: "Shop not found" };

  const existing = await db.query.eventTypes.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, id), eq(t.shopId, shop.id)),
  });
  if (!existing) return { ok: false, error: "Service not found" };

  if (existing.isDefault && !values.isActive) {
    return {
      ok: false,
      fieldErrors: { isActive: "Cannot deactivate the default service" },
    };
  }

  const fieldError = validateValues(values);
  if (fieldError) return fieldError;

  const durationError = await validateDuration(shop.id, values.durationMinutes);
  if (durationError) return durationError;

  await db
    .update(eventTypes)
    .set({
      name: values.name,
      description: values.description || null,
      durationMinutes: values.durationMinutes,
      bufferMinutes: values.bufferMinutes,
      depositAmountCents: values.depositAmountCents,
      isHidden: values.isHidden,
      isActive: values.isActive,
    })
    .where(eq(eventTypes.id, id));

  revalidatePath("/app/settings/services");
  return { ok: true, data: undefined };
}
```

### 4. Add `restoreEventType`

```ts
export async function restoreEventType(id: string): Promise<ActionResult> {
  const { user, session } = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const shop = await getShopForUser(user.id);
  if (!shop) return { ok: false, error: "Shop not found" };

  const existing = await db.query.eventTypes.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, id), eq(t.shopId, shop.id)),
  });
  if (!existing) return { ok: false, error: "Service not found" };

  await db
    .update(eventTypes)
    .set({ isHidden: false, isActive: true })
    .where(eq(eventTypes.id, id));

  revalidatePath("/app/settings/services");
  return { ok: true, data: undefined };
}
```

### 5. Add mutation state to the shell

**File:** `src/app/app/settings/services/services-editor-shell.tsx`

```ts
const [savePending, setSavePending] = useState(false);
const [fieldErrors, setFieldErrors] = useState<Partial<Record<ServiceField, string>>>({});
const [formError, setFormError] = useState<string | null>(null);
const [saveSuccess, setSaveSuccess] = useState(false);
```

### 6. Implement Save handler in the shell

```ts
async function handleSave() {
  if (!draft) return;
  setSavePending(true);
  setFieldErrors({});
  setFormError(null);
  setSaveSuccess(false);

  const result =
    mode === "edit" && selectedId
      ? await updateEventType(selectedId, draft)
      : await createEventType(draft);

  setSavePending(false);

  if (!result.ok) {
    if ("fieldErrors" in result) {
      setFieldErrors(result.fieldErrors);
    } else {
      setFormError(result.error);
    }
    return;
  }

  // Success
  setBaseline(draft);
  setSaveSuccess(true);
  setTimeout(() => setSaveSuccess(false), 2000);

  if (mode === "create" && "data" in result && result.data) {
    setSelectedId(result.data.id);
    setMode("edit");
  }
}
```

### 7. Wire Save button and mutation feedback in the form

Pass `savePending`, `fieldErrors`, `formError`, `saveSuccess` to `ServiceEditorForm` and display:

- **Form-level error banner** at the top of the form: `--al-error` text on `--al-error-container` background
- **Per-field error** below each field: small text in `--al-error`; field background shifts to `--al-error-container`
- **Save button pending** state: spinner inline, button disabled
- **Success indicator**: brief "Saved" text or checkmark that auto-clears after 2 seconds

Enable the Save button (`onSave={handleSave}`) and remove the `disabled` stub from V2.

---

## Acceptance

- [ ] Edit a service field and click Save — list updates immediately (revalidation), baseline is updated, success indicator appears briefly
- [ ] Create a new service — it appears in the list, editor switches to edit mode for the new service
- [ ] Empty name triggers field error "Name is required" rendered inline below the name field; pane stays open; draft preserved
- [ ] Duration that is not a multiple of `slotMinutes` triggers a field error on durationMinutes
- [ ] Server error (e.g., simulated auth failure) renders as a banner at the top of the form
- [ ] Save button shows a spinner and is disabled while the action is in-flight
- [ ] `restoreEventType` exists in `actions.ts` and is exported (no client wiring yet)
- [ ] `pnpm lint && pnpm typecheck` passes
