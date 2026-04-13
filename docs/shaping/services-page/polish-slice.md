# Polish Slice: Services Settings — Stitch Fidelity Rewrite

**Goal:** Realign the services settings UI (`/app/settings/services`) to near-exact visual fidelity with the Stitch reference at `docs/shaping/services-page/stitch_reminder_system_prd (10)/code.html`. All behavioral boundaries (V1–V5 slice logic, dirty-state, restore, copy-link, confirmation dialog) stay intact. This slice changes _presentation only_.

---

## 0. Token-to-Tailwind Mapping

### Current state

CSS variables (`--al-*`) are defined in `globals.css` `:root` and used via inline `style={{ ... }}` props throughout the services components. The `@theme inline` block in `globals.css` does **not** expose them as Tailwind utility classes (`bg-al-*`, `text-al-*`), so class-based usage isn't available yet.

### Action: extend `@theme inline` in `globals.css`

Add the following inside the existing `@theme inline { … }` block. This enables Tailwind utility classes like `bg-al-primary`, `text-al-on-surface-variant`, etc.

```css
/* ── Atelier Light color aliases (enables bg-al-* / text-al-* classes) ── */
--color-al-primary:              var(--al-primary);
--color-al-primary-container:    var(--al-primary-container);
--color-al-primary-fixed:        var(--al-primary-fixed);
--color-al-primary-fixed-dim:    var(--al-primary-fixed-dim);
--color-al-on-primary:           var(--al-on-primary);
--color-al-on-primary-fixed-variant: var(--al-on-primary-fixed-variant);

--color-al-secondary:            var(--al-secondary);
--color-al-secondary-container:  var(--al-secondary-container);
--color-al-secondary-fixed:      var(--al-secondary-fixed);
--color-al-on-secondary-fixed:   var(--al-on-secondary-fixed);

--color-al-surface:              var(--al-surface);
--color-al-surface-lowest:       var(--al-surface-container-lowest);
--color-al-surface-low:          var(--al-surface-container-low);
--color-al-surface-container:    var(--al-surface-container);
--color-al-surface-high:         var(--al-surface-container-high);
--color-al-surface-highest:      var(--al-surface-container-highest);
--color-al-surface-dim:          var(--al-surface-dim);

--color-al-on-surface:           var(--al-on-surface);
--color-al-on-surface-variant:   var(--al-on-surface-variant);
--color-al-outline:              var(--al-outline);
--color-al-outline-variant:      var(--al-outline-variant);

--color-al-error:                var(--al-error);
--color-al-error-container:      var(--al-error-container);
--color-al-on-error-container:   var(--al-on-error-container);
```

### Quick-reference: Stitch token → Tailwind class

| Stitch HTML class | Resolved value | Tailwind utility (after above) |
|---|---|---|
| `text-primary` | `#001e40` | `text-al-primary` |
| `text-on-surface` | `#1a1c1b` | `text-al-on-surface` |
| `text-on-surface-variant` | `#43474f` | `text-al-on-surface-variant` |
| `bg-white` | `#ffffff` | `bg-al-surface-lowest` |
| `bg-background` | `#f9f9f7` | `bg-[var(--al-background)]` (no alias needed, `bg-background` already works via shadcn) |
| `bg-surface-container-low` | `#f4f4f2` | `bg-al-surface-low` |
| `bg-surface-container` | `#eeeeec` | `bg-al-surface-container` |
| `bg-surface-container-high` | `#e8e8e6` | `bg-al-surface-high` |
| `bg-primary` | `#001e40` | `bg-al-primary` |
| `bg-primary-fixed/30` | `#d5e3ff` @ 30% | `bg-al-primary-fixed/30` |
| `text-primary-fixed-dim` | `#a7c8ff` (used as variant text) | `text-al-on-primary-fixed-variant` |
| `bg-secondary-fixed` | `#ffdbcf` | `bg-al-secondary-fixed` |
| `text-on-secondary-fixed` | `#2a170f` | `text-al-on-secondary-fixed` |
| `text-outline-variant` | `#c3c6d1` | `text-al-outline-variant` |
| `border-primary` | `#001e40` | `border-al-primary` |
| `border-stone-100` | `#f5f5f4` | `border-al-outline-variant/30` (closest warm neutral) |
| `bg-stone-50` | `#fafaf9` | `bg-al-surface-low` |
| `bg-stone-50/50` | ditto @ 50% | `bg-al-surface-low/50` |
| `shadow-primary/20` | navy @ 20% | `shadow-al-primary/20` (needs `--shadow-al-primary` custom prop) |

### Action: add `al-toggle-switch` CSS class to `globals.css`

The Stitch reference uses a peer-based Tailwind toggle switch pattern that requires these styles. Add this to the utility classes section:

```css
/* Atelier Light toggle switch */
.al-toggle-track {
  width: 2.75rem;   /* w-11 */
  height: 1.5rem;   /* h-6 */
  border-radius: 9999px;
  background-color: var(--al-outline-variant);
  position: relative;
  transition: background-color 150ms ease;
  flex-shrink: 0;
}
.al-toggle-track[data-checked="true"] {
  background-color: var(--al-primary);
}
.al-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.25rem;   /* w-5 */
  height: 1.25rem;  /* h-5 */
  background: white;
  border-radius: 9999px;
  transition: transform 150ms ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.al-toggle-track[data-checked="true"] .al-toggle-thumb {
  transform: translateX(1.25rem);
}
```

### Action: add Material Symbols import

Material Symbols Outlined is used throughout the Stitch reference for icons (`schedule`, `payments`, `chevron_right`, `add`, `inventory_2`, `hourglass_empty`). Add to the root layout `<head>` (or `globals.css` via `@import`):

**File:** `src/app/layout.tsx` — add inside `<head>`:
```tsx
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
/>
```

Add global CSS for the icon class:
```css
/* globals.css */
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  font-size: 1.25rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  user-select: none;
}
```

---

## 1. Page Shell — `page.tsx`

### What Stitch shows

```
Settings  ›  Service Catalog          ← breadcrumb, tiny, uppercase, muted
Services Management                   ← text-5xl font-extrabold tracking-tight
Define your craft. Configure...       ← subtitle, max-w-2xl, text-on-surface-variant
```

### Current state

- Breadcrumb: plain `Settings / Service Catalog` text with no icon, no tracking
- H1: `"Services"` — `text-4xl font-semibold` (not extrabold, not tracking-tight)
- Subtitle copy is present but differently worded

### Changes to `src/app/app/settings/services/page.tsx`

**Breadcrumb** — replace the `<p>` with:
```tsx
<div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest opacity-60"
     style={{ color: "var(--al-on-surface-variant)" }}>
  <span>Settings</span>
  <span className="material-symbols-outlined" style={{ fontSize: "10px" }}>chevron_right</span>
  <span style={{ color: "var(--al-primary)", opacity: 1 }}>Service Catalog</span>
</div>
```

**H1** — change class to:
```tsx
className="font-[family-name:var(--al-font-headline)] text-3xl sm:text-5xl font-extrabold tracking-tight text-balance"
// text: "Services Management"
```

**Subtitle** — change to:
```tsx
className="max-w-2xl text-base font-medium text-pretty leading-relaxed"
// text: "Define your craft. Configure service durations, buffers, and bespoke deposit requirements."
```

**Section wrapper** — the `<section>` containing `ServicesEditorShell` currently has `bg-[var(--al-surface-container-low)]`. Remove this background — the rows themselves carry their own white card backgrounds per the reference.
```tsx
// Change: background: "var(--al-surface-container-low)"
// To: no background style (transparent, inherits page bg)
<section className="rounded-[28px] p-3 sm:p-4">
```

---

## 2. Layout Shell — `services-editor-shell.tsx`

### What Stitch shows

```
flex flex-col xl:flex-row gap-8 items-start
├── Left: w-full xl:w-1/2
│   ├── heading row: "Your Services" (uppercase muted) + "Add New" (text link + icon)
│   └── service card list (no section background, cards are white)
└── Right: w-full xl:w-1/2 sticky top-24
    └── white card: rounded-3xl border shadow-xl overflow-hidden
        ├── content area: p-8 space-y-6
        └── footer area: bg-stone-50/50 border-t p-8
```

### Current state

```
grid min-h-[38rem] gap-3 lg:grid-cols-[22rem_minmax(0,1fr)]
├── Left: rounded-[24px] p-3 bg-[al-surface-container]  ← has a container bg
└── Right: rounded-[24px] p-4 bg-[al-surface-container-lowest]
```

### Changes to `services-editor-shell.tsx`

**A. Outer wrapper** — change from CSS grid to flex:
```tsx
// Before:
<div className="grid min-h-[38rem] gap-3 lg:grid-cols-[22rem_minmax(0,1fr)]">

// After:
<div className="flex flex-col xl:flex-row gap-8 items-start">
```

**B. Left section** — remove background, keep scroll:
```tsx
// Before:
<section
  className="flex min-h-0 flex-col rounded-[24px] p-3"
  style={{ background: "var(--al-surface-container)" }}
>

// After:
<section className="w-full xl:w-1/2 flex flex-col gap-4">
```

**C. Left section header** — change h2 and Add New button:
```tsx
// Before: h2 text-lg font-semibold; button = filled pill
// After:
<div className="flex items-center justify-between">
  <h2
    className="text-xs font-bold uppercase tracking-widest opacity-60"
    style={{ color: "var(--al-on-surface-variant)" }}
  >
    Your Services
  </h2>
  <button
    type="button"
    onClick={handleAddNew}
    disabled={savePending || restorePendingId !== null}
    className="flex items-center gap-1.5 text-sm font-bold hover:underline underline-offset-4 disabled:opacity-60"
    style={{ color: "var(--al-primary)" }}
  >
    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
    Add New
  </button>
</div>
```

**D. Left section list** — no changes to scroll/layout, just remove the `px-1 pb-1` wrapper padding (cards now carry their own shadow/border).

**E. Right section** — add sticky, card treatment, split content/footer:
```tsx
// Before:
<section
  className="min-h-[24rem] rounded-[24px] p-4 sm:p-6"
  style={{ background: "var(--al-surface-container-lowest)" }}
>

// After:
<section
  className="w-full xl:w-1/2 xl:sticky xl:top-24 rounded-3xl border overflow-hidden flex flex-col"
  style={{
    background: "var(--al-surface-container-lowest)",
    borderColor: "rgba(195, 198, 209, 0.30)",
    boxShadow: "0 8px 32px rgba(26, 28, 27, 0.08)",
  }}
>
```

**F. Right section — edit/create mode** — split into content + footer regions:
```tsx
// Wrap the heading + ServiceEditorForm in two sub-regions:
<div className="p-8 space-y-6 flex-1">
  {/* heading */}
  <div>
    <h3 className="text-2xl font-extrabold" style={{ color: "var(--al-primary)" }}>
      {mode === "create" ? "New Service" : "Edit Service"}
    </h3>
    <p className="text-sm mt-1" style={{ color: "var(--al-on-surface-variant)" }}>
      {mode === "create"
        ? "Set up the draft values for a new service before saving it."
        : `Updating: ${selectedService?.name ?? "this service"}`}
    </p>
  </div>
  <ServiceEditorForm
    {/* pass split prop to hide toggles + buttons from form — see Phase 4 */}
    ...
  />
</div>
{/* Footer rendered by the shell, not the form — see Phase 4 */}
<ServiceEditorFooter ... />
```

> **Note:** The cleanest approach is to lift the toggles and action buttons out of `ServiceEditorForm` into a `ServiceEditorFooter` sub-component rendered by the shell. This avoids prop-drilling a layout flag. However, a simpler alternative is to pass `footerSplit={true}` and render the footer region inside the shell using `onSave`/`onCancel` directly. Either is valid; the plan prefers lifting.

---

## 3. Service List Row — `service-list-row.tsx`

### What Stitch shows

Three row states, each with `bg-white rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm`:

| State | Border | Opacity | Extra |
|---|---|---|---|
| Selected | `border-2 border-primary` | 100% | — |
| Unselected (active) | `border border-stone-100 hover:border-primary/30` | 100% | `cursor-pointer transition-all` |
| Inactive / hidden | `border border-stone-100 bg-stone-50` | 60% | no chevron |

**Row interior:**
```
left col (flex-1 min-w-0):
  ├── name + Default badge (flex items-center gap-2 mb-1)
  │   ├── <h3 class="font-bold text-primary truncate">
  │   └── <span class="px-2 py-0.5 rounded-full bg-primary-fixed/30 text-[8px] font-bold uppercase tracking-widest">Default</span>
  ├── meta row (flex gap-3 text-xs text-on-surface-variant):
  │   ├── <schedule icon> 60m
  │   └── <payments icon> $50  (or <hourglass_empty icon> Shop Default for buffer)
  └── Hidden badge: text-[8px] font-bold uppercase opacity-60
right col:
  └── <chevron_right icon> (primary if selected, opacity-30 if not)
```

Below the main button area (inline, same row):
- "Copy link" — `text-xs font-bold text-primary underline` (active services)
- "Restore" — `text-xs font-bold text-primary underline` (inactive/hidden)

### Changes to `service-list-row.tsx`

**A. `<article>` → card container:**
```tsx
// Derive state classes:
const rowClasses = cn(
  "rounded-2xl p-5 flex items-center justify-between gap-4 transition-all shadow-sm cursor-pointer",
  !showRestore && !isSelected && "bg-white border border-[rgba(195,198,209,0.35)] hover:border-[rgba(0,30,64,0.30)]",
  isSelected && "bg-white border-2 border-[var(--al-primary)]",
  showRestore && "border border-[rgba(195,198,209,0.35)] opacity-60",
  showRestore && "bg-[var(--al-surface-container-low)]",
)
```

**B. Left column — name row:**
```tsx
<div className="flex items-center gap-2 mb-1">
  <h3 className="font-bold truncate" style={{ color: "var(--al-primary)" }}>
    {service.name}
  </h3>
  {service.isDefault && (
    <span
      className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest"
      style={{
        background: "rgba(213, 227, 255, 0.35)",   // al-primary-fixed at 35%
        color: "var(--al-on-primary-fixed-variant)", // #1f477b
      }}
    >
      Default
    </span>
  )}
</div>
```

**C. Left column — meta row (replace text-only duration/deposit):**
```tsx
<div className="flex gap-3 text-xs" style={{ color: "var(--al-on-surface-variant)" }}>
  <span className="flex items-center gap-1">
    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>schedule</span>
    {service.durationMinutes}m
  </span>
  <span className="flex items-center gap-1">
    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>payments</span>
    {depositLabel}
  </span>
</div>
```

**D. Hidden / Inactive badges** — move inline with name (not below):
```tsx
// Change from StateBadge components below the name to inline text badges:
{service.isHidden && (
  <span className="text-[8px] font-bold uppercase tracking-wider opacity-60"
        style={{ color: "var(--al-on-surface-variant)" }}>
    Hidden
  </span>
)}
{!service.isActive && (
  <span className="text-[8px] font-bold uppercase tracking-wider opacity-60"
        style={{ color: "var(--al-on-surface-variant)" }}>
    Inactive
  </span>
)}
```

**E. Right column — chevron icon:**
```tsx
<span
  className="material-symbols-outlined flex-shrink-0"
  style={{
    color: isSelected ? "var(--al-primary)" : "var(--al-on-surface-variant)",
    opacity: isSelected ? 1 : 0.3,
  }}
>
  chevron_right
</span>
```

**F. Copy link / Restore** — restyle to match Stitch:
```tsx
// Copy link:
className="text-xs font-bold underline underline-offset-2"
style={{ color: "var(--al-primary)" }}

// Restore:
className="text-xs font-bold underline underline-offset-2"
style={{ color: "var(--al-primary)" }}
```

---

## 4. Editor Form — `service-editor-form.tsx`

### What Stitch shows

Form structure inside the right pane:

```
p-8 space-y-6  (content area)
├── [form error alert]
├── Service Name  (label + input)
├── [Duration col] | [Deposit Override col]  (2-col grid)
├── Description   (label + textarea)
└── Buffer Selection (label + chip button group)

bg-stone-50/50 border-t p-8  (footer area)
├── left: toggles (Active, Hide from Public) — custom CSS switches
└── right: Cancel (text link) + Save Changes (filled primary)
```

**Labels** throughout:
```html
class="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant ml-1 opacity-60"
```

**Inputs:**
```html
class="w-full bg-background border-none rounded-xl px-4 py-3 text-on-surface"
```

**Buffer chips** (not a `<select>`):
```html
<!-- Unselected -->
<button class="px-4 py-2 text-xs font-bold border border-outline-variant/30 rounded-lg hover:bg-white text-on-surface-variant">

<!-- Selected -->
<button class="px-4 py-2 text-xs font-bold bg-primary text-on-primary rounded-lg shadow-md">
```

**Toggle switches:**
```html
<!-- Custom peer-based Tailwind switch -->
<input type="checkbox" class="sr-only peer" />
<div class="w-11 h-6 bg-outline-variant/30 rounded-full peer peer-checked:bg-primary
            after:content-[''] after:absolute after:top-[2px] after:left-[2px]
            after:bg-white after:rounded-full after:h-5 after:w-5
            after:transition-all peer-checked:after:translate-x-full">
</div>
```

**Action buttons:**
```html
<!-- Cancel -->
<button class="px-2 py-2 text-xs font-bold text-on-surface-variant uppercase tracking-widest hover:text-primary border-b-2 border-transparent hover:border-primary/20">

<!-- Save -->
<button class="px-10 py-4 bg-primary text-on-primary rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
```

### Changes to `service-editor-form.tsx`

**A. Label style** — define shared label class:
```tsx
const labelClassName = "block text-[10px] font-extrabold uppercase tracking-widest ml-1 opacity-60";
// color: var(--al-on-surface-variant) via inline style
```

**B. Input / select style** — update `surfaceFieldClassName`:
```tsx
const surfaceFieldClassName = cn(
  "w-full border-none rounded-xl px-4 py-3 text-sm outline-none transition-colors",
  "bg-[var(--al-background)] text-[var(--al-on-surface)]",
  "placeholder:text-[var(--al-outline)]",
  "focus:bg-[var(--al-surface-container-high)]",
  "focus:ring-1 focus:ring-[var(--al-ghost-border)]",
);
```
Apply to `Input`, `Textarea`, and the `<select>` elements.

**C. Buffer — replace `<select>` with chip group:**

Remove the native `<select>` for buffer. Replace with:
```tsx
<div className="flex flex-wrap gap-2">
  {bufferOptions.map((option) => {
    const value = option.value === null ? "default" : option.value;
    const isSelected = (draft.bufferMinutes === null && option.value === null) ||
                       draft.bufferMinutes === option.value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => onFieldChange("bufferMinutes", option.value)}
        className={cn(
          "px-4 py-2 text-xs font-bold rounded-lg transition-all",
          isSelected
            ? "text-[var(--al-on-primary)] shadow-md"
            : "border border-[var(--al-ghost-border)] text-[var(--al-on-surface-variant)] hover:bg-[var(--al-surface-container-lowest)]"
        )}
        style={isSelected ? { background: "var(--al-primary)" } : undefined}
      >
        {option.label}
      </button>
    );
  })}
</div>
```
Buffer option labels become: `"None"`, `"5m"`, `"10m"`, `"Shop Default"` (shorter, matching Stitch).

**D. ToggleField — replace checkbox with CSS toggle switch:**

Replace the current `<input type="checkbox">` + `accent-` styled implementation in `ToggleField` with:
```tsx
function ToggleField({ checked, description, label, name, onChange }: ToggleFieldProps) {
  return (
    <label className="flex items-center justify-between md:justify-start gap-4 cursor-pointer">
      {/* Custom toggle track + thumb */}
      <span
        className="al-toggle-track"
        data-checked={checked ? "true" : "false"}
        aria-hidden="true"
      >
        <span className="al-toggle-thumb" />
      </span>
      <input
        className="sr-only"
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="space-y-0.5">
        <span className="block text-[11px] font-extrabold uppercase tracking-widest"
              style={{ color: checked ? "var(--al-on-surface)" : "var(--al-on-surface-variant)" }}>
          {label}
        </span>
        {description && (
          <span className="block text-xs" style={{ color: "var(--al-on-surface-variant)", opacity: 0.7 }}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
```

**E. Footer split** — extract footer content from the form into a separate component or region.

Strategy: accept optional `onRenderFooter` render-prop, or split the form into `<ServiceEditorFields>` (just the fields) + let the shell render the footer. The simplest change with minimal refactor:

Add two optional props to `ServiceEditorForm`:
- `hideFooter?: boolean` — when true, form doesn't render the footer (toggles + buttons).
- This lets the shell render the footer div as its own separated section.

Or, cleaner: restructure `ServiceEditorForm` to render the field group and the footer group as separate exported sub-elements. The shell wraps the form in the content area and the footer in the tonal section.

**Recommended:** Keep `ServiceEditorForm` as-is structurally, but visually style the footer section (toggles + action buttons) with the `bg-stone-50/50 border-t` treatment by wrapping the bottom portion in:
```tsx
<div
  className="-mx-8 -mb-8 mt-8 px-8 py-8 border-t"
  style={{
    background: "rgba(244, 244, 242, 0.50)", // al-surface-low at 50%
    borderColor: "rgba(195, 198, 209, 0.30)",
  }}
>
  <div className="flex flex-col md:flex-row items-end justify-between gap-8">
    {/* toggles left */}
    {/* action buttons right */}
  </div>
</div>
```
> Note: The form's outer container in the shell has `p-8`, so negative margin `-mx-8 -mb-8` bleeds the footer to the card edge. This matches Stitch's footer spanning the full card width.

**F. Action buttons:**
```tsx
// Cancel:
<button
  type="button"
  onClick={onCancel}
  className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent hover:border-[var(--al-primary)]/20 transition-colors"
  style={{ color: "var(--al-on-surface-variant)" }}
>
  Cancel
</button>

// Save:
<button
  type="submit"
  disabled={savePending}
  className="flex-1 md:flex-none px-10 py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70"
  style={{
    background: "var(--al-primary)",
    color: "var(--al-on-primary)",
    boxShadow: "0 8px 24px rgba(0, 30, 64, 0.20)",
  }}
>
  {savePending ? (
    <><Spinner size="sm" /><span>{mode === "create" ? "Creating..." : "Saving..."}</span></>
  ) : (
    <span>{mode === "create" ? "Create Service" : "Save Changes"}</span>
  )}
</button>
```

---

## 5. Empty Pane — `empty-pane.tsx`

### Changes

Add a Material Symbol icon above the text for visual anchoring:

```tsx
export function EmptyPane({ hasServices }: EmptyPaneProps) {
  return (
    <div className="flex h-full min-h-[20rem] items-center justify-center p-6 sm:p-10">
      <div className="max-w-md space-y-4 text-center">
        <span
          className="material-symbols-outlined mx-auto block"
          style={{ fontSize: "2.5rem", color: "var(--al-outline-variant)" }}
        >
          inventory_2
        </span>
        <p className="font-[family-name:var(--al-font-headline)] text-2xl font-extrabold text-balance"
           style={{ color: "var(--al-primary)" }}>
          {hasServices ? "Select a service" : "No services yet"}
        </p>
        <p className="text-sm text-pretty sm:text-base"
           style={{ color: "var(--al-on-surface-variant)" }}>
          {hasServices
            ? "Select a service to edit, or click Add New to create one."
            : "You don't have any services yet. Click Add New to create your first."}
        </p>
      </div>
    </div>
  );
}
```

---

## 6. Gaps: What Stitch Missed (Motion.dev + Custom CSS)

The static Stitch HTML covers layout and surface hierarchy but doesn't specify interaction animation. The following are gaps requiring Motion.dev or custom CSS to match a production-quality feel:

### 6.1 Row entrance animation (Motion.dev)

When a new service is created and appended to the list, it should animate in rather than snap in place.

**Approach:** Wrap the `serviceRows.map(...)` list in `<AnimatePresence>` from `motion/react`, and wrap each `<ServiceListRow>` in `<motion.div>` with:
```tsx
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.96 }}
transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
```
This animates new rows in after `createEventType` resolves. Existing rows skip animation via `layout` prop.

### 6.2 Save success flash (Motion.dev)

The current `"Saved"` text appears/disappears abruptly. Replace with:
```tsx
<AnimatePresence>
  {saveSuccess && (
    <motion.span
      key="saved"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="text-xs font-bold uppercase tracking-widest"
      style={{ color: "var(--color-success)" }}
    >
      ✓ Saved
    </motion.span>
  )}
</AnimatePresence>
```

### 6.3 Form error banner (Motion.dev)

Form errors appear instantly. Add slide-in:
```tsx
<AnimatePresence>
  {formError && (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl p-4 text-sm"
      style={{ background: "var(--al-error-container)", color: "var(--al-on-error-container)" }}
    >
      {formError}
    </motion.div>
  )}
</AnimatePresence>
```

### 6.4 Toggle switch animation (custom CSS)

Covered by the `.al-toggle-track` / `.al-toggle-thumb` CSS classes defined in Phase 0. The `transition: transform 150ms ease` on the thumb provides smooth sliding. No Motion.dev required.

### 6.5 Right pane mode transition (optional Motion.dev)

When switching between `empty` → `edit` / `create`, the right pane content changes. A subtle crossfade:
```tsx
<AnimatePresence mode="wait">
  {mode === "empty" ? (
    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <EmptyPane ... />
    </motion.div>
  ) : (
    <motion.div key="form" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {/* form content */}
    </motion.div>
  )}
</AnimatePresence>
```

### 6.6 Copy-to-clipboard feedback (CSS transition only)

The "Copied" text swap is fine with pure CSS. No Motion.dev needed.

---

## 7. Constraint Checklist

| Constraint | Status |
|---|---|
| All server actions unchanged (`createEventType`, `updateEventType`, `restoreEventType`) | ✅ Preserved |
| Dirty-state detection and `beforeunload` guard | ✅ Preserved |
| Confirmation dialog logic (R5.5 restore-current variant) | ✅ Preserved |
| Copy-to-clipboard with clipboard API | ✅ Preserved |
| `isDefault` service cannot be deactivated (server validation) | ✅ Preserved |
| Buffer chip group fires same `onFieldChange("bufferMinutes", ...)` as select | ✅ Preserved |
| Toggle fires same `onFieldChange("isActive"/"isHidden", ...)` | ✅ Preserved |
| Field error display per field, form error display | ✅ Preserved |
| savePending / restorePendingId disable guards | ✅ Preserved |
| No new database queries, no new server actions | ✅ Confirmed |
| `pnpm lint && pnpm typecheck` must pass after changes | ⚠️ Required after each file |

---

## 8. Execution Order

| # | File | Scope |
|---|---|---|
| 1 | `src/app/globals.css` | Add `@theme inline` color aliases, `al-toggle-*` CSS, Material Symbols utility |
| 2 | `src/app/layout.tsx` | Add Material Symbols Google Fonts `<link>` |
| 3 | `src/app/app/settings/services/empty-pane.tsx` | Add icon, font-extrabold |
| 4 | `src/app/app/settings/services/service-list-row.tsx` | Card treatment, icons, badges, chevron |
| 5 | `src/app/app/settings/services/service-editor-form.tsx` | Labels, inputs, buffer chips, toggle switches, footer split, buttons |
| 6 | `src/app/app/settings/services/services-editor-shell.tsx` | Layout flex, header, Add New link, right pane card treatment |
| 7 | `src/app/app/settings/services/page.tsx` | Breadcrumb, H1 extrabold, subtitle, section wrapper |
| 8 | `src/app/app/settings/services/discard-confirmation-dialog.tsx` | No structural changes (already aligned) |
| 9 | All | Install `motion` package if not present: `pnpm add motion` |
| 10 | Shell / Form | Add `AnimatePresence` wrappers for row entrance, save flash, form error |
