import { ShieldAlert, ShieldCheck, Shield } from "lucide-react"

import { Chip } from "@/components/ui/chip"
import { cn } from "@/lib/utils"
import { es } from "@/lib/i18n/es"
import type { RiskLevel } from "@/lib/types"

interface RiskBadgeProps {
  level: RiskLevel
  estimated?: boolean
  className?: string
}

const RISK_CONFIG = {
  low: {
    icon: ShieldCheck,
    label: es.processes.card.risk.low,
    variant: "success"
  },
  medium: {
    icon: Shield,
    label: es.processes.card.risk.medium,
    variant: "warning"
  },
  high: {
    icon: ShieldAlert,
    label: es.processes.card.risk.high,
    variant: "danger"
  }
} as const

export function RiskBadge({ level, estimated, className }: RiskBadgeProps) {
  const config = RISK_CONFIG[level]
  const Icon = config.icon

  return (
    <Chip
      variant={config.variant}
      className={cn(
        "text-xs font-semibold",
        estimated && "border-dashed opacity-80",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </Chip>
  )
}
