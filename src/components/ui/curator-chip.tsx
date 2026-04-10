import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * CuratorChip — Atelier Light signature component.
 * Used for categories, filters, and labels.
 * Pill-shaped (full radius) to contrast against the architectural 8px radius of containers.
 */
const curatorChipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        /** Default: warm peach — secondary_fixed */
        default:
          "[background:#ffdbcf] [color:#2a170f] hover:[background:#e2bfb3]",
        /** Primary: deep navy */
        primary:
          "[background:#001e40] [color:#ffffff] hover:[background:#003366]",
        /** Outlined: ghost with outline-variant border */
        outline:
          "border [border-color:#c3c6d1] [color:#43474f] hover:[background:#f4f4f2]",
        /** Muted: surface-container background */
        muted:
          "[background:#eeeeec] [color:#43474f] hover:[background:#e8e8e6]",
        /** Tertiary: sienna */
        tertiary:
          "[background:#ffdbcf] [color:#380d01] hover:[background:#ffb59c]",
      },
      size: {
        sm: "px-2.5 py-0.5 text-[0.6875rem]",
        md: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface CuratorChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof curatorChipVariants> {
  /** Optional leading dot indicator */
  dot?: boolean
  /** Dot color (CSS color value) */
  dotColor?: string
}

function CuratorChip({
  className,
  variant,
  size,
  dot,
  dotColor,
  children,
  ...props
}: CuratorChipProps) {
  return (
    <span
      className={cn(curatorChipVariants({ variant, size }), className)}
      {...props}
    >
      {dot && (
        <span
          className="inline-block size-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColor ?? "currentColor" }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

export { CuratorChip, curatorChipVariants }
