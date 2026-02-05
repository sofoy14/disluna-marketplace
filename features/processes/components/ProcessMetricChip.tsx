import { cn } from "@/lib/utils"
import { Chip } from "@/components/ui/chip"

interface ProcessMetricChipProps {
  label: string
  value: number | null
  className?: string
}

export function ProcessMetricChip({ label, value, className }: ProcessMetricChipProps) {
  return (
    <Chip
      className={cn(
        "justify-between gap-2 px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground",
        className
      )}
      variant="metric"
    >
      <span>{label}</span>
      <span className="text-sm font-semibold text-foreground">
        {typeof value === "number" ? value : "—"}
      </span>
    </Chip>
  )
}
