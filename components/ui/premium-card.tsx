import * as React from "react"

import { cn } from "@/lib/utils"

const PremiumCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "premium-card rounded-2xl border border-border/60 bg-card/80 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm",
      className
    )}
    {...props}
  />
))
PremiumCard.displayName = "PremiumCard"

export { PremiumCard }
