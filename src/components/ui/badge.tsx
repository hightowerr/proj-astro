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
          "border-transparent [background:#001e40] text-white hover:[background:#003366]",
        "al-secondary":
          "border-transparent [background:#fdd8cb] [color:#785c53] hover:[background:#e2bfb3]",
        "al-curator":
          "border-transparent [background:#ffdbcf] [color:#2a170f] hover:[background:#e2bfb3]",
        "al-muted":
          "border-transparent [background:#eeeeec] [color:#43474f] hover:[background:#e8e8e6]",
        "al-outline":
          "[border-color:#c3c6d1] [color:#43474f] hover:[background:#f4f4f2]",
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