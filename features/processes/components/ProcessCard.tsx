"use client"

import { FC, MouseEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, ChevronRight, FileText, MoreVertical } from "lucide-react"
import { format } from "date-fns"
import { es as dateLocale } from "date-fns/locale"

import { PremiumCard } from "@/components/ui/premium-card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { ProcessStatusBadge } from "@/components/processes/process-status-badge"
import { DeleteConfirmDialog } from "@/components/processes/delete-confirm-dialog"
import { EditProcessModal } from "@/components/processes/edit-process-modal"
import { PROCESS_TYPE_LABELS } from "@/features/processes/utils/labels"
import { cn } from "@/lib/utils"
import { es } from "@/lib/i18n/es"
import type { Process } from "@/lib/types"
import { toast } from "sonner"

interface ProcessCardProps {
  process: Process
  className?: string
  onRefresh?: () => void
}

export const ProcessCard: FC<ProcessCardProps> = ({ process, className, onRefresh }) => {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const handleCardClick = () => {
    const workspaceId = window.location.pathname.split("/")[2]
    router.push(`/${workspaceId}/processes/${process.id}`)
  }

  const handleEdit = (e: MouseEvent) => {
    e.stopPropagation()
    setShowEditModal(true)
  }

  const handleArchive = async (e: MouseEvent) => {
    e.stopPropagation()
    setIsArchiving(true)

    try {
      const newStatus = process.status === "archivado" ? "activo" : "archivado"
      const response = await fetch(`/api/processes/${process.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || es.processes.notifications.archiveError)
      }

      toast.success(
        newStatus === "archivado"
          ? es.processes.notifications.archived
          : es.processes.notifications.restored
      )
      onRefresh?.()
    } catch (error: any) {
      console.error("Error archiving process:", error)
      toast.error(error.message || es.processes.notifications.archiveError)
    } finally {
      setIsArchiving(false)
    }
  }

  const handleDelete = async () => {
    const response = await fetch(`/api/processes/${process.id}`, {
      method: "DELETE"
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || es.processes.notifications.deleteError)
    }

    toast.success(es.processes.notifications.deleted)
    onRefresh?.()
  }

  const openDeleteDialog = (e: MouseEvent) => {
    e.stopPropagation()
    setShowDeleteDialog(true)
  }

  const isArchived = process.status === "archivado"
  const processTypeLabel = process.process_type
    ? PROCESS_TYPE_LABELS[process.process_type.toLowerCase()] || process.process_type
    : es.processes.labels.defaultProcess

  const activityDate = process.updated_at || process.created_at
  const formattedActivity = activityDate
    ? format(new Date(activityDate), "d MMM yyyy", { locale: dateLocale })
    : "—"

  return (
    <>
      <PremiumCard
        onClick={handleCardClick}
        className={cn(
          "group cursor-pointer relative",
          isArchived && "opacity-70",
          className
        )}
      >
        {/* Header: Title + Status + Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-tight tracking-tight truncate">
              {process.name}
            </h3>
            {process.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {process.description}
              </p>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -mr-2 -mt-1 text-muted-foreground hover:text-foreground shrink-0"
                aria-label={es.processes.actions.optionsLabel}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleEdit}>{es.processes.actions.edit}</DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive} disabled={isArchiving}>
                {isArchived ? es.processes.actions.restore : es.processes.actions.archive}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={openDeleteDialog}
              >
                {es.processes.actions.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Metadata line */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
          {process.indexing_status && (
            <ProcessStatusBadge status={process.indexing_status} size="sm" />
          )}
          <span className="text-muted-foreground/30">·</span>
          <span>{processTypeLabel}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {process.document_count ?? 0}
          </span>
        </div>

        {/* Footer: Date + Arrow */}
        <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground/70">
            {formattedActivity}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </div>

        {/* Archived indicator */}
        {isArchived && (
          <div className="absolute top-3 right-10 flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
            <Archive className="w-3 h-3" />
            <span>{es.processes.labels.archived}</span>
          </div>
        )}
      </PremiumCard>

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title={es.processes.confirmations.deleteTitle}
        description={es.processes.confirmations.deleteDescription}
        itemName={process.name}
      />

      <EditProcessModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        process={process}
        onSuccess={onRefresh}
      />
    </>
  )
}
