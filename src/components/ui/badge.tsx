import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        /* ── Atelier Light variants ─────────────────────────────── */
        "al-primary":
          "border-transparent [background:var(--al-primary)] [color:var(--al-on-primary)] hover:[background:var(--al-primary-container)]",
        "al-secondary":
          "border-transparent [background:var(--al-secondary-container)] [color:var(--al-on-secondary-container)] hover:[background:var(--al-secondary-fixed-dim)]",
        "al-curator":
          "border-transparent [background:var(--al-secondary-fixed)] [color:var(--al-on-secondary-fixed)] hover:[background:var(--al-secondary-fixed-dim)]",
        "al-muted":
          "border-transparent [background:var(--al-surface-container)] [color:var(--al-on-surface-variant)] hover:[background:var(--al-surface-container-high)]",
        "al-outline":
          "[border-color:var(--al-outline-variant)] [color:var(--al-on-surface-variant)] hover:[background:var(--al-surface-container-low)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }