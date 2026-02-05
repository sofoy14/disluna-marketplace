"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Plus, Search, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProcessCard } from "@/features/processes/components/ProcessCard"
import { ProcessStatsStrip } from "@/features/processes/components/ProcessStatsStrip"
import { ProcessEmptyState } from "@/features/processes/components/ProcessEmptyState"
import { getProcessWorkspacesByWorkspaceId } from "@/db/processes"
import { getProcessDocumentsByProcessId } from "@/db/process-documents"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getProcessInsights, hasInsightValues } from "@/features/processes/utils/insights"
import { es } from "@/lib/i18n/es"
import type { Process } from "@/lib/types"

export default function ProcessesPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceid as string

  const [processes, setProcesses] = useState<Process[]>([])
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

  const filteredProcesses = useMemo(() => {
    return processes.filter((process) => {
      const matchesSearch =
        process.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (process.description || "").toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || process.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [processes, searchQuery, statusFilter])

  const stats = useMemo(() => {
    const insights = processes.map((process) => getProcessInsights(process))
    const highRisk = insights.filter((item) => item.riskLevel === "high").length
    const pending = processes.filter((process, index) => {
      const isReady = process.indexing_status === "ready"
      return !isReady || !hasInsightValues(insights[index])
    }).length

    return {
      total: processes.length,
      highRisk,
      pending
    }
  }, [processes])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">{es.processes.loading}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{es.processes.title}</h1>
          </div>
          <Button onClick={handleNewProcess} className="w-full lg:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {es.processes.actions.new}
          </Button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <ProcessStatsStrip
            total={stats.total}
            highRisk={stats.highRisk}
            pending={stats.pending}
          />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={es.processes.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder={es.processes.filterPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{es.processes.filters.all}</SelectItem>
              <SelectItem value="activo">{es.processes.filters.active}</SelectItem>
              <SelectItem value="archivado">{es.processes.filters.archived}</SelectItem>
              <SelectItem value="cerrado">{es.processes.filters.closed}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {filteredProcesses.length === 0 ? (
          processes.length === 0 ? (
            <div className="max-w-2xl mx-auto">
              <ProcessEmptyState onCreate={handleNewProcess} />
            </div>
          ) : (
            <div className="premium-card max-w-2xl mx-auto flex flex-col items-center text-center px-8 py-12 animate-in fade-in">
              <h2 className="text-xl font-semibold mb-2">{es.processes.emptyFiltered.title}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {es.processes.emptyFiltered.description}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("all")
                }}
              >
                {es.processes.actions.clearFilters}
              </Button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredProcesses.map((process) => (
              <ProcessCard key={process.id} process={process} onRefresh={loadProcesses} />
            ))}
          </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-6 right-6">
        <Button
          onClick={handleNewProcess}
          size="icon"
          className="rounded-full w-14 h-14 shadow-lg"
          aria-label={es.processes.actions.new}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>
    </div>
  )
}
