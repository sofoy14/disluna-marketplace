"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Edit, Upload, Loader2, Network, Sparkles, Clock, FileText, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from "@/components/ui/resizable"
import { ProcessChat } from "@/components/processes/process-chat"
import { ProcessDocuments } from "@/components/processes/process-documents"
import { ProcessGraph } from "@/components/processes/process-graph"
import { GraphSidePanel } from "@/components/processes/graph-side-panel"
import { ProcessStatusBadge } from "@/components/processes/process-status-badge"
import { EditProcessModal } from "@/components/processes/edit-process-modal"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getProcessById } from "@/db/processes"
import { getProcessDocumentsByProcessId } from "@/db/process-documents"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { ProcessInsights, GraphNode } from "@/lib/types"
import { PROCESS_TYPE_LABELS } from "@/features/processes/utils/labels"

type ViewMode = "integrated" | "full-graph"

export function ProcessDetailPageV2() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceid as string
  const processId = params.processId as string

  const [process, setProcess] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("chat")
  const [showEditModal, setShowEditModal] = useState(false)
  const [graphInsights, setGraphInsights] = useState<Partial<ProcessInsights> | null>(null)

  // New state for integrated view
  const [viewMode, setViewMode] = useState<ViewMode>("integrated")
  const [graphPanelExpanded, setGraphPanelExpanded] = useState(false)

  const [triggeredDocs, setTriggeredDocs] = useState<Set<string>>(new Set())
  const [isPolling, setIsPolling] = useState(false)

  useEffect(() => {
    loadProcess()
  }, [processId])

  // Poll for updates if processing
  useEffect(() => {
    let interval: NodeJS.Timeout

    const shouldPoll = process?.indexing_status !== 'ready' ||
      documents.some(d => d.status === 'pending' || d.status === 'processing')

    if (shouldPoll && !isPolling) {
      interval = setInterval(() => {
        loadProcess(true)
      }, 3000)
    }

    return () => clearInterval(interval)
  }, [process?.indexing_status, documents, isPolling])

  // Trigger ingestion for pending documents
  useEffect(() => {
    const pendingDocs = documents.filter(d => d.status === 'pending' && !triggeredDocs.has(d.id))

    if (pendingDocs.length > 0) {
      const newTriggered = new Set(triggeredDocs)
      pendingDocs.forEach(doc => {
        newTriggered.add(doc.id)
        triggerIngestion(doc.id)
      })
      setTriggeredDocs(newTriggered)
      setTimeout(() => loadProcess(true), 1000)
    }
  }, [documents, triggeredDocs])

  const triggerIngestion = async (docId: string) => {
    try {
      console.log(`Triggering ingestion for doc: ${docId}`)
      await fetch(`/api/processes/${processId}/documents/${docId}/ingest`, { method: 'POST' })
    } catch (error) {
      console.error(`Error triggering ingestion for ${docId}:`, error)
    }
  }

  const loadProcess = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      else setIsPolling(true)

      const processData = await getProcessById(processId)
      setProcess(processData)

      const documentsData = await getProcessDocumentsByProcessId(processId)
      setDocuments(documentsData)

      if (!silent && processData.indexing_status !== "ready") {
        setActiveTab("documents")
      }
    } catch (error) {
      console.error("Error loading process:", error)
      if (!silent) {
        toast.error("Error al cargar el proceso")
        router.back()
      }
    } finally {
      setLoading(false)
      setIsPolling(false)
    }
  }

  const handleBack = () => {
    router.push(`/${workspaceId}/processes`)
  }

  const handleAskAboutNode = (node: GraphNode) => {
    setActiveTab("chat")
    const message = `¿Qué puedes decirme sobre "${node.label}"?`
    window.dispatchEvent(new CustomEvent("process-chat-suggestion", { detail: { text: message } }))
  }

  const handleGraphAskChat = (message: string) => {
    setActiveTab("chat")
    window.dispatchEvent(new CustomEvent("process-chat-suggestion", { detail: { text: message } }))
  }

  const handleGraphViewDocument = (_documentId?: string) => {
    setActiveTab("documents")
  }

  const handleToggleFullGraph = () => {
    if (viewMode === "full-graph") {
      setViewMode("integrated")
    } else {
      setViewMode("full-graph")
    }
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

  const processingDocs = documents.filter(d => d.status === 'processing' || d.status === 'pending').length
  const totalDocs = documents.length
  const progressPercent = totalDocs > 0 ? ((totalDocs - processingDocs) / totalDocs) * 100 : 0

  const processTypeLabel = process.process_type
    ? PROCESS_TYPE_LABELS[process.process_type?.toLowerCase()] || process.process_type
    : "Proceso legal"

  const entityCount = process.entity_count || 0
  const factCount = graphInsights?.facts ?? process.fact_count ?? 0
  const isReady = process.indexing_status === "ready"

  // Full Graph Mode - Show only the graph
  if (viewMode === "full-graph") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="border-b bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("integrated")}
              className="h-8 w-8"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold leading-tight truncate">{process.name}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Network className="w-3 h-3" />
                <span>Grafo de Conocimiento</span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("integrated")}
              className="text-xs"
            >
              Volver al Chat
            </Button>
          </div>
        </div>

        {/* Full Graph */}
        <div className="flex-1 overflow-hidden">
          <ProcessGraph
            processId={processId}
            workspaceId={workspaceId}
            onInsights={setGraphInsights}
            onAskChat={handleGraphAskChat}
            onViewDocument={handleGraphViewDocument}
          />
        </div>
      </div>
    )
  }

  // Integrated Mode - Graph sidebar + Chat/Documents
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - Contextual Intelligence */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold leading-tight truncate">{process.name}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span>{processTypeLabel}</span>
              {process.client_name && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="truncate">{process.client_name}</span>
                </>
              )}
              {process.updated_at && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="flex items-center gap-1 text-muted-foreground/60 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {format(new Date(process.updated_at), "d MMM yyyy", { locale: es })}
                  </span>
                </>
              )}
            </p>
          </div>
          
          {/* Tabs */}
          <div className="ml-auto flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-muted/60 text-muted-foreground inline-flex h-9 items-center justify-center rounded-full p-1 shadow-sm border border-border/60">
                <TabsTrigger
                  value="chat"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs sm:text-sm",
                    activeTab === "chat" && "glow-tab-selected"
                  )}
                >
                  Chat
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs sm:text-sm",
                    activeTab === "documents" && "glow-tab-selected"
                  )}
                >
                  Documentos
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Full Graph Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleFullGraph}
                  className="h-9 w-9"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver grafo completo</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Intelligence Summary - Only show when ready */}
        {isReady && (entityCount > 0 || totalDocs > 0) && (
          <div className="text-xs text-muted-foreground mt-2 ml-11">
            Este proceso contiene{" "}
            <strong>{totalDocs} documentos</strong>
            {entityCount > 0 && (
              <>, <strong>{entityCount} entidades</strong></>
            )}
            {factCount > 0 && (
              <> y <strong>{factCount} hechos</strong></>
            )} identificados.
          </div>
        )}

        {/* Real-time Progress Banner */}
        {(processingDocs > 0 || process.indexing_status === 'processing') && (
          <div className="mt-2 ml-11 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-md px-2.5 py-1.5 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <span className="font-medium">Indexando documentos:</span> {totalDocs - processingDocs} de {totalDocs} completados
              </div>
            </div>
            <div className="w-24 h-1.5 bg-blue-100 dark:bg-blue-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area with Resizable Panels */}
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 overflow-hidden"
      >
        {/* Main Content - LEFT side */}
        <ResizablePanel defaultSize={graphPanelExpanded ? 70 : 100} minSize={40}>
          <div className="h-full overflow-hidden">
            {activeTab === "chat" && (
              <ProcessChat
                processId={processId}
                processName={process.name}
                indexingStatus={process.indexing_status || "pending"}
                chatId={`process-${processId}`}
                insights={graphInsights || undefined}
              />
            )}

            {activeTab === "documents" && (
              <div className="h-full overflow-y-auto p-6">
                <ProcessDocuments
                  processId={processId}
                  workspaceId={workspaceId}
                  documents={documents}
                  onDocumentsChange={() => loadProcess(true)}
                />
              </div>
            )}
          </div>
        </ResizablePanel>

        {graphPanelExpanded && (
          <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/20 transition-colors" />
        )}

        {/* Graph Side Panel - RIGHT side */}
        <ResizablePanel
          defaultSize={graphPanelExpanded ? 30 : 0}
          minSize={graphPanelExpanded ? 20 : 0}
          maxSize={50}
          className={cn(
            "transition-all duration-300",
            !graphPanelExpanded && "hidden"
          )}
        >
          <GraphSidePanel
            processId={processId}
            workspaceId={workspaceId}
            isExpanded={graphPanelExpanded}
            onToggleExpanded={() => setGraphPanelExpanded(!graphPanelExpanded)}
            onFullGraphClick={handleToggleFullGraph}
            onAskAboutNode={handleAskAboutNode}
            className="h-full"
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Floating Graph Toggle Button when collapsed */}
      {!graphPanelExpanded && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setGraphPanelExpanded(true)}
              className="fixed right-4 bottom-24 h-12 w-12 rounded-full bg-card/90 border-primary/30 shadow-lg hover:bg-primary/10 hover:border-primary/50 z-50"
            >
              <Network className="h-5 w-5 text-primary" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Abrir grafo de conocimiento</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Edit Process Modal */}
      <EditProcessModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        process={process}
        onSuccess={() => loadProcess(false)}
      />
    </div>
  )
}

export default ProcessDetailPageV2
