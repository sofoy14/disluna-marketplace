"use client"

import { FC, useState } from "react"
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  SortAsc
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DocumentUploadZone } from "@/components/processes/document-upload-zone"
import { DeleteConfirmDialog } from "@/components/processes/delete-confirm-dialog"
import { toast } from "sonner"
import { format } from "date-fns"
import { es as dateLocale } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { ProcessDocument } from "@/lib/types"
import { getDocumentBadges } from "@/features/processes/utils/document-badges"
import { Chip } from "@/components/ui/chip"
import { es } from "@/lib/i18n/es"

interface ProcessDocumentsProps {
  processId: string
  workspaceId: string
  documents: ProcessDocument[]
  onDocumentsChange: () => void
}

const STATUS_CONFIG = {
  indexed: {
    label: es.documents.status.indexed,
    icon: CheckCircle2,
    className: "text-emerald-400",
    bgClassName: "bg-emerald-500/10"
  },
  processing: {
    label: es.documents.status.processing,
    icon: Loader2,
    className: "text-blue-400 animate-spin",
    bgClassName: "bg-blue-500/10"
  },
  error: {
    label: es.documents.status.error,
    icon: AlertTriangle,
    className: "text-red-400",
    bgClassName: "bg-red-500/10"
  },
  pending: {
    label: es.documents.status.pending,
    icon: Clock,
    className: "text-muted-foreground",
    bgClassName: "bg-muted/50"
  }
}

export const ProcessDocuments: FC<ProcessDocumentsProps> = ({
  processId,
  workspaceId,
  documents,
  onDocumentsChange
}) => {
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [docToDelete, setDocToDelete] = useState<ProcessDocument | null>(null)

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast.error(es.documents.messages.selectFile)
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      uploadFiles.forEach((file) => {
        formData.append("files", file)
      })

      const response = await fetch(`/api/processes/${processId}/upload`, {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || es.documents.messages.uploadError)
      }

      toast.success(es.documents.messages.uploadSuccess(uploadFiles.length))
      setUploadFiles([])
      setShowUpload(false)
      onDocumentsChange()
    } catch (error: any) {
      console.error("Error uploading documents:", error)
      toast.error(error.message || es.documents.messages.uploadError)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (doc: ProcessDocument) => {
    setDocToDelete(doc)
    setShowDeleteDialog(true)
  }

  const confirmDeleteDocument = async () => {
    if (!docToDelete) return

    setDeletingDocId(docToDelete.id)
    try {
      const response = await fetch(
        `/api/processes/${processId}/documents/${docToDelete.id}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || es.documents.messages.deleteError)
      }

      toast.success(es.documents.messages.deleteSuccess)
      onDocumentsChange()
    } catch (error: any) {
      console.error("Error deleting document:", error)
      toast.error(error.message || es.documents.messages.deleteError)
    } finally {
      setDeletingDocId(null)
      setDocToDelete(null)
    }
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const processingCount = documents.filter(
    (doc) => doc.status === "processing" || doc.status === "pending"
  ).length
  const indexedCount = documents.filter((doc) => doc.status === "indexed").length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <h3 className="text-lg font-semibold">{es.documents.title}</h3>
          <p className="text-sm text-muted-foreground">
            {documents.length === 0
              ? es.documents.summary.empty
              : es.documents.summary.withCounts(documents.length, indexedCount, processingCount)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {documents.length > 0 && (
            <>
              <Button variant="ghost" size="sm" className="text-muted-foreground" disabled>
                <Filter className="w-4 h-4 mr-1" />
                {es.documents.actions.filter}
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" disabled>
                <SortAsc className="w-4 h-4 mr-1" />
                {es.documents.actions.sort}
              </Button>
            </>
          )}

          <Button
            variant={showUpload ? "ghost" : "outline"}
            size="sm"
            onClick={() => setShowUpload(!showUpload)}
          >
            <Upload className="w-4 h-4 mr-2" />
            {showUpload ? es.documents.actions.cancel : es.documents.actions.upload}
          </Button>
        </div>
      </div>

      {showUpload && (
        <div className="border rounded-lg p-4 bg-card">
          <DocumentUploadZone files={uploadFiles} onFilesChange={setUploadFiles} />
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleUpload}
              disabled={uploading || uploadFiles.length === 0}
              size="sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {es.documents.actions.uploading}
                </>
              ) : (
                es.documents.actions.uploadAndIndex
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowUpload(false)
                setUploadFiles([])
              }}
              size="sm"
            >
              {es.documents.actions.cancel}
            </Button>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
            <FileText className="w-8 h-8 opacity-50" />
          </div>
          <p className="font-medium mb-1">{es.documents.emptyTitle}</p>
          <p className="text-sm">{es.documents.emptyDescription}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                    {es.documents.table.document}
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                    {es.documents.table.type}
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                    {es.documents.table.size}
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                    {es.documents.table.status}
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                    {es.documents.table.date}
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground w-16"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const statusConfig = getStatusConfig(doc.status)
                  const StatusIcon = statusConfig.icon
                  const badges = getDocumentBadges(doc)

                  return (
                    <tr key={doc.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium truncate max-w-[220px] block">
                              {doc.file_name}
                            </span>
                            {badges.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {badges.map((badge) => (
                                  <Chip
                                    key={badge.label}
                                    variant={badge.variant}
                                    className={cn("text-[10px] px-2 py-0.5", badge.className)}
                                  >
                                    {badge.label}
                                  </Chip>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {doc.mime_type?.split("/").pop()?.toUpperCase() || es.documents.table.notAvailable}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {formatFileSize(doc.size_bytes)}
                      </td>
                      <td className="p-3">
                        <div
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            statusConfig.bgClassName
                          )}
                        >
                          <StatusIcon className={cn("w-3 h-3", statusConfig.className)} />
                          <span>{statusConfig.label}</span>
                        </div>
                        {doc.status === "error" && doc.error_message && (
                          <p className="text-xs text-red-400 mt-1 max-w-[200px] truncate">
                            {doc.error_message}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {format(new Date(doc.created_at), "d MMM yyyy", { locale: dateLocale })}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteDocument(doc)}
                          disabled={deletingDocId === doc.id}
                        >
                          {deletingDocId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {documents.map((doc) => {
              const statusConfig = getStatusConfig(doc.status)
              const StatusIcon = statusConfig.icon
              const badges = getDocumentBadges(doc)

              return (
                <div key={doc.id} className="border border-border/50 rounded-xl p-4 bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium block truncate">{doc.file_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(doc.size_bytes)} · {doc.mime_type?.split("/").pop()?.toUpperCase()}
                        </span>
                        {badges.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {badges.map((badge) => (
                              <Chip
                                key={badge.label}
                                variant={badge.variant}
                                className={cn("text-[10px] px-2 py-0.5", badge.className)}
                              >
                                {badge.label}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => handleDeleteDocument(doc)}
                      disabled={deletingDocId === doc.id}
                    >
                      {deletingDocId === doc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        statusConfig.bgClassName
                      )}
                    >
                      <StatusIcon className={cn("w-3 h-3", statusConfig.className)} />
                      <span>{statusConfig.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), "d MMM yyyy", { locale: dateLocale })}
                    </span>
                  </div>

                  {doc.status === "error" && doc.error_message && (
                    <p className="text-xs text-red-400 mt-2">{doc.error_message}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDeleteDocument}
        title={es.documents.delete.title}
        description={es.documents.delete.description}
        itemName={docToDelete?.file_name}
      />
    </div>
  )
}
