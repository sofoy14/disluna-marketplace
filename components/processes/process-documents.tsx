"use client"

import { FC, useState } from "react"
import { Upload, FileText, Trash2, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DocumentUploadZone } from "./document-upload-zone"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ProcessDocument {
  id: string
  file_name: string
  mime_type?: string
  size_bytes: number
  status: "pending" | "processing" | "indexed" | "error"
  error_message?: string
  created_at: string
}

interface ProcessDocumentsProps {
  processId: string
  documents: ProcessDocument[]
  onDocumentsChange: () => void
}

export const ProcessDocuments: FC<ProcessDocumentsProps> = ({
  processId,
  documents,
  onDocumentsChange
}) => {
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast.error("Selecciona al menos un archivo")
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
        throw new Error(error.error || "Error al subir documentos")
      }

      // Start ingestion
      await fetch(`/api/processes/${processId}/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      })

      toast.success("Documentos subidos. Se están indexando...")
      setUploadFiles([])
      setShowUpload(false)
      onDocumentsChange()

    } catch (error: any) {
      console.error("Error uploading documents:", error)
      toast.error(error.message || "Error al subir documentos")
    } finally {
      setUploading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "indexed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "indexed":
        return "Indexado"
      case "processing":
        return "Procesando"
      case "error":
        return "Error"
      default:
        return "Pendiente"
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const allIndexed = documents.length > 0 && documents.every(doc => doc.status === "indexed")
  const hasErrors = documents.some(doc => doc.status === "error")

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Documentos del Proceso</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUpload(!showUpload)}
        >
          <Upload className="w-4 h-4 mr-2" />
          {showUpload ? "Cancelar" : "Subir documentos"}
        </Button>
      </div>

      {showUpload && (
        <div className="border rounded-lg p-4 bg-card">
          <DocumentUploadZone
            files={uploadFiles}
            onFilesChange={setUploadFiles}
          />
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleUpload}
              disabled={uploading || uploadFiles.length === 0}
              size="sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                "Subir e indexar"
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
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Status Message */}
      {allIndexed && !hasErrors && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-300">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">Todos los documentos están indexados. El proceso está listo para consultar.</p>
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay documentos en este proceso</p>
          <p className="text-sm mt-2">Sube documentos para empezar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-medium">Documento</th>
                  <th className="text-left p-3 text-sm font-medium">Tipo</th>
                  <th className="text-left p-3 text-sm font-medium">Tamaño</th>
                  <th className="text-left p-3 text-sm font-medium">Estado</th>
                  <th className="text-left p-3 text-sm font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-400" />
                        <span className="font-medium">{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {doc.mime_type || "N/A"}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatFileSize(doc.size_bytes)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(doc.status)}
                        <span className="text-sm">{getStatusLabel(doc.status)}</span>
                      </div>
                      {doc.status === "error" && doc.error_message && (
                        <p className="text-xs text-red-400 mt-1">{doc.error_message}</p>
                      )}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {format(new Date(doc.created_at), "d MMM yyyy", { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="font-medium truncate">{doc.file_name}</span>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(doc.status)}
                    <span>{getStatusLabel(doc.status)}</span>
                  </div>
                  <div>{formatFileSize(doc.size_bytes)} • {doc.mime_type || "N/A"}</div>
                  <div>{format(new Date(doc.created_at), "d MMM yyyy", { locale: es })}</div>
                  {doc.status === "error" && doc.error_message && (
                    <p className="text-xs text-red-400 mt-2">{doc.error_message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



