# Maintenance Guide — Auth Redesign

This guide is for future developers maintaining the **Auth Redesign** implementation.

## Content & Media Updates
- **Copy**: Editorial copy is passed as props to the `<AuthShell>` in the respective `page.tsx` files in `src/app/(auth)/`.
- **Media**: The hero image (Unsplash) is defined in `src/components/auth/auth-shell.tsx`. Update the `src` and `alt` props of the Next.js `<Image>` component to change it.
- **Workflow**: All content changes must be reviewed via PR and validated with `pnpm check` before merging to main.

## Design Updates (via Stitch)
The authentication UI is based on "Atelier Light" tokens provided by the Stitch design agent.
1.  **Capture Screenshot**: Before making major visual changes, capture the current `/login` or `/register` UI to provide context to Stitch.
2.  **Prompt Stitch**: Use the Stitch agent with the existing design system context to iterate on the "Atelier Light" tokens.
3.  **Export Tokens**: When Stitch generates a new `code.html` or updated `DESIGN.md`, ensure any new hex values are updated in `src/app/globals.css` under the `@theme inline` block.
4.  **Validate**: After applying new design tokens, run the regression tests: `pnpm check`.

## Extension Patterns
### Adding a New Auth Page (e.g., `/verify-email`)
1.  **Create Route**: Create `src/app/(auth)/verify-email/page.tsx`.
2.  **Import Shell**: Import and wrap your form logic in the `<AuthShell>` component.
    ```tsx
    import { AuthShell } from "@/components/auth/auth-shell";

    export default function VerifyEmailPage() {
      return (
        <AuthShell
          heroHeadline="Confirm Your Identity"
          heroBody="..."
          formTitle="Check Your Inbox"
          formSubtitle="..."
        >
          {/* Your form logic here */}
        </AuthShell>
      );
    }
    ```
3.  **Follow Design Tokens**: Ensure all new inputs and buttons use the `al-` prefixed Tailwind classes or follow the [Design System Reference](../docs/shaping/auth-redesign/auth-redesign-shaping.md#design-system-reference).

## Design History
- **Source**: Stitch design export `449beb1e286a415881985419132b73bd`.
- **Reference**: `docs/design-system/design-system.md`
- **Last Sync**: 2026-04-10
