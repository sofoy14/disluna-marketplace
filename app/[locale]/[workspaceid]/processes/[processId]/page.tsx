"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Edit, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProcessChat } from "@/components/processes/process-chat"
import { ProcessDocuments } from "@/components/processes/process-documents"
import { ProcessStatusBadge } from "@/components/processes/process-status-badge"
import { getProcessById } from "@/db/processes"
import { getProcessDocumentsByProcessId } from "@/db/process-documents"
import { toast } from "sonner"

export default function ProcessDetailPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceid as string
  const processId = params.processId as string

  const [process, setProcess] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("chat")

  useEffect(() => {
    loadProcess()
  }, [processId])

  const loadProcess = async () => {
    try {
      setLoading(true)
      const processData = await getProcessById(processId)
      setProcess(processData)

      const documentsData = await getProcessDocumentsByProcessId(processId)
      setDocuments(documentsData)

      // If process is not ready, show documents tab
      if (processData.indexing_status !== "ready") {
        setActiveTab("documents")
      }
    } catch (error) {
      console.error("Error loading process:", error)
      toast.error("Error al cargar el proceso")
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push(`/${workspaceId}/processes`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!process) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Proceso no encontrado</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-1">{process.name}</h1>
            {process.description && (
              <p className="text-sm text-muted-foreground">{process.description}</p>
            )}
          </div>
          <ProcessStatusBadge status={process.indexing_status || "pending"} />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveTab("documents")}>
            <Upload className="w-4 h-4 mr-2" />
            Subir documentos
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 overflow-hidden m-0">
          <ProcessChat
            processId={processId}
            processName={process.name}
            indexingStatus={process.indexing_status || "pending"}
            chatId={`process-${processId}`}
          />
        </TabsContent>

        <TabsContent value="documents" className="flex-1 overflow-y-auto p-6 m-0">
          <ProcessDocuments
            processId={processId}
            documents={documents}
            onDocumentsChange={loadProcess}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}



