"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Plus, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProcessCard } from "@/components/processes/process-card"
import { ProcessStatusBadge } from "@/components/processes/process-status-badge"
import { supabase } from "@/lib/supabase/robust-client"
import { getProcessWorkspacesByWorkspaceId } from "@/db/processes"
import { getProcessDocumentsByProcessId } from "@/db/process-documents"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProcessesPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceid as string

  const [processes, setProcesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    loadProcesses()
  }, [workspaceId])

  const loadProcesses = async () => {
    try {
      setLoading(true)
      const processData = await getProcessWorkspacesByWorkspaceId(workspaceId)
      const processesList = processData?.processes || []

      // Load document counts for each process
      const processesWithCounts = await Promise.all(
        processesList.map(async (process: any) => {
          try {
            const documents = await getProcessDocumentsByProcessId(process.id)
            return {
              ...process,
              document_count: documents.length
            }
          } catch (error) {
            return {
              ...process,
              document_count: 0
            }
          }
        })
      )

      setProcesses(processesWithCounts)
    } catch (error) {
      console.error("Error loading processes:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewProcess = () => {
    router.push(`/${workspaceId}/processes/new`)
  }

  const filteredProcesses = processes.filter(process => {
    const matchesSearch =
      process.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (process.description || "").toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      process.indexing_status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Cargando procesos...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Procesos</h1>
            <p className="text-sm text-muted-foreground">
              Organiza tus casos y chatea con la IA sobre sus documentos
            </p>
          </div>
          <Button onClick={handleNewProcess} className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo proceso
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="processing">Procesando</SelectItem>
              <SelectItem value="ready">Listo</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Processes List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredProcesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-muted-foreground mb-4">
              {processes.length === 0 ? (
                <>
                  <p className="text-lg mb-2">No hay procesos aún</p>
                  <p className="text-sm">Crea tu primer proceso para empezar</p>
                </>
              ) : (
                <>
                  <p className="text-lg mb-2">No se encontraron procesos</p>
                  <p className="text-sm">Intenta con otros términos de búsqueda</p>
                </>
              )}
            </div>
            {processes.length === 0 && (
              <Button onClick={handleNewProcess}>
                <Plus className="w-4 h-4 mr-2" />
                Crear primer proceso
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProcesses.map((process) => (
              <ProcessCard key={process.id} process={process} />
            ))}
          </div>
        )}
      </div>

      {/* FAB for mobile */}
      <div className="md:hidden fixed bottom-6 right-6">
        <Button
          onClick={handleNewProcess}
          size="icon"
          className="rounded-full w-14 h-14 shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  )
}





