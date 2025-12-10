"use client"

import { FC } from "react"
import { useRouter } from "next/navigation"
import { ProcessStatusBadge } from "./process-status-badge"
import { FileText, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ProcessCardProps {
  process: {
    id: string
    name: string
    description?: string
    indexing_status?: "pending" | "processing" | "ready" | "error"
    created_at: string
    updated_at?: string
    document_count?: number
  }
  className?: string
}

export const ProcessCard: FC<ProcessCardProps> = ({ process, className }) => {
  const router = useRouter()

  const handleClick = () => {
    const workspaceId = window.location.pathname.split("/")[2]
    router.push(`/${workspaceId}/processes/${process.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative rounded-lg border bg-card p-4 transition-all",
        "hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10",
        "cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <h3 className="font-semibold text-lg truncate group-hover:text-purple-300 transition-colors">
              {process.name}
            </h3>
          </div>
          
          {process.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {process.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {process.document_count !== undefined && (
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{process.document_count} documento(s)</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {format(new Date(process.created_at), "d MMM yyyy", { locale: es })}
              </span>
            </div>
          </div>
        </div>

        {process.indexing_status && (
          <ProcessStatusBadge status={process.indexing_status} />
        )}
      </div>
    </div>
  )
}


