import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-card/70 border-border/60 text-foreground",
        subtle: "bg-muted/40 border-border/50 text-muted-foreground",
        metric: "bg-muted/30 border-border/60 text-foreground",
        suggestion:
          "bg-card/50 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/5",
        success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
        warning: "bg-amber-500/10 border-amber-500/30 text-amber-300",
        danger: "bg-red-500/10 border-red-500/30 text-red-300",
        info: "bg-blue-500/10 border-blue-500/30 text-blue-300"
      },
      size: {
        sm: "text-[11px] px-2.5 py-0.5",
        md: "text-xs px-3 py-1"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
)

export interface ChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chipVariants> {}

const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(chipVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Chip.displayName = "Chip"

export { Chip, chipVariants }
