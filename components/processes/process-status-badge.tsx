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
      variant: "outline" as const,
      className: "bg-muted text-muted-foreground border-border"
    },
    processing: {
      label: "Procesando",
      variant: "secondary" as const,
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900"
    },
    ready: {
      label: "Activo",
      variant: "outline" as const,
      className: "bg-green-500/5 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50"
    },
    error: {
      label: "Requiere atención",
      variant: "outline" as const,
      className: "bg-red-500/5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50"
    }
  }

  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "font-normal tracking-wide",
        config.className,
        className
      )}
    >
      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full",
        status === 'ready' ? "bg-green-500" :
          status === 'processing' ? "bg-blue-500 animate-pulse" :
            status === 'error' ? "bg-red-500" :
              "bg-gray-400"
      )} />
      {config.label}
    </Badge>
  )
}





