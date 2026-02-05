import { AlertTriangle, Layers, Timer } from "lucide-react"

import { es } from "@/lib/i18n/es"
import { cn } from "@/lib/utils"

interface ProcessStatsStripProps {
  total: number
  highRisk: number
  pending: number
  className?: string
}

export function ProcessStatsStrip({ total, highRisk, pending, className }: ProcessStatsStripProps) {
  return (
    <div className={cn("flex items-center gap-6 text-sm", className)}>
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground/60" />
        <span className="text-muted-foreground">{es.processes.stats.total}</span>
        <span className="font-semibold text-foreground">{total}</span>
      </div>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500/70" />
        <span className="text-muted-foreground">{es.processes.stats.highRisk}</span>
        <span className={cn("font-semibold", highRisk > 0 ? "text-amber-600" : "text-foreground")}>
          {highRisk}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-muted-foreground/60" />
        <span className="text-muted-foreground">{es.processes.stats.pending}</span>
        <span className="font-semibold text-foreground">{pending}</span>
      </div>
    </div>
  )
}
