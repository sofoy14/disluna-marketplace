"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ProcessStatusBadgeProps {
  status: "pending" | "processing" | "ready" | "error"
  className?: string
}

export function ProcessStatusBadge({ status, className }: ProcessStatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: "Pendiente",
      variant: "secondary" as const,
      className: "bg-gray-500/20 text-gray-300 border-gray-500/30"
    },
    processing: {
      label: "Procesando",
      variant: "default" as const,
      className: "bg-blue-500/20 text-blue-300 border-blue-500/30"
    },
    ready: {
      label: "Listo",
      variant: "default" as const,
      className: "bg-green-500/20 text-green-300 border-green-500/30"
    },
    error: {
      label: "Error",
      variant: "destructive" as const,
      className: "bg-red-500/20 text-red-300 border-red-500/30"
    }
  }

  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "border",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  )
}





