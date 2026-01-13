"use client"

import { FC, MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { ProcessStatusBadge } from "./process-status-badge"
import { FileText, Calendar, MoreVertical, FolderOpen, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

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

  const handleCardClick = () => {
    const workspaceId = window.location.pathname.split("/")[2]
    router.push(`/${workspaceId}/processes/${process.id}`)
  }

  const handleAction = (e: MouseEvent, action: string) => {
    e.stopPropagation()
    // Implement specific actions here
    console.log(`Action: ${action} on process ${process.id}`)
  }

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card p-6 transition-all duration-200",
        "hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5",
        "cursor-pointer",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center border border-primary/10 group-hover:bg-primary/10 transition-colors">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-semibold text-lg leading-none tracking-tight group-hover:text-primary transition-colors">
              {process.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              ID: {process.id.slice(0, 8)}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={(e) => handleAction(e, "edit")}>
              Editar detalles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleAction(e, "archive")}>
              Archivar proceso
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => handleAction(e, "delete")}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Body */}
      <div className="flex-1 mb-6">
        {process.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {process.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/50 italic">
            Sin descripción disponible
          </p>
        )}
      </div>

      {/* Footer / Meta */}
      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5" title="Documentos">
            <FileText className="w-3.5 h-3.5" />
            <span>{process.document_count || 0} docs</span>
          </div>
          <div className="flex items-center gap-1.5" title="Fecha de creación">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {format(new Date(process.created_at), "d MMM, yyyy", { locale: es })}
            </span>
          </div>
        </div>

        {process.indexing_status && (
          <ProcessStatusBadge status={process.indexing_status} />
        )}
      </div>

      {/* Decorative gradient line on hover */}
      <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary/50 transition-all duration-300 group-hover:w-full rounded-b-xl" />
    </div>
  )
}
