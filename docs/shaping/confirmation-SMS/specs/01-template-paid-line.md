# Spec 01 — Template: replace `Paid {{amount}}` with `{{paid_line}}`

## Summary

Replace the hardcoded `"Paid {{amount}}."` fragment in `DEFAULT_TEMPLATE_BODY` with the interpolation token `"{{paid_line}}"`. Bump `DEFAULT_TEMPLATE_VERSION` from 1 to 2.

## File

`src/lib/messages.ts`

## Changes

1. **Line 15** — change `DEFAULT_TEMPLATE_VERSION = 1` → `DEFAULT_TEMPLATE_VERSION = 2`
2. **Line 16-17** — in `DEFAULT_TEMPLATE_BODY`, replace the fragment `Paid {{amount}}.` with `{{paid_line}}`

### Before

```ts
const DEFAULT_TEMPLATE_VERSION = 1;
const DEFAULT_TEMPLATE_BODY =
  "Booked with {{shop_name}}: {{date}} at {{time}} ({{timezone}}). Paid {{amount}}. Policy: see booking link. {{manage_link}}Reply STOP to opt out.";
```

### After

```ts
const DEFAULT_TEMPLATE_VERSION = 2;
const DEFAULT_TEMPLATE_BODY =
  "Booked with {{shop_name}}: {{date}} at {{time}} ({{timezone}}). {{paid_line}}Policy: see booking link. {{manage_link}}Reply STOP to opt out.";
```

Note: `{{paid_line}}` includes a trailing space when populated (e.g. `"Paid £10.00. "`), so no space is needed before `Policy`.

## Dependencies

None.

## Deployment coupling

**MUST deploy atomically with Spec 02.** Deploying this alone breaks paid bookings — the template expects `{{paid_line}}` but the function still passes `{{amount}}`.

## Acceptance criteria

- `DEFAULT_TEMPLATE_VERSION` is `2`
- `DEFAULT_TEMPLATE_BODY` contains `{{paid_line}}` and does NOT contain `{{amount}}`
- Template still contains all other tokens: `{{shop_name}}`, `{{date}}`, `{{time}}`, `{{timezone}}`, `{{manage_link}}`
- `pnpm check` passes
