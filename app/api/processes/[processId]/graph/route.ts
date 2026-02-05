export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { ragBackendService } from "@/lib/services/rag-backend"

interface GraphNode {
    id: string
    label: string
    type: string
    properties?: Record<string, any>
}

interface GraphEdge {
    id: string
    source: string
    target: string
    label: string
    properties?: Record<string, any>
}

interface GraphResponse {
    nodes: GraphNode[]
    edges: GraphEdge[]
    meta?: {
        nodeCount: number
        edgeCount: number
        appliedFilters: Record<string, string>
    }
}

// GET /api/processes/[processId]/graph - Get knowledge graph for a process
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ processId: string }> }
) {
    try {
        const { processId } = await params
        const { searchParams } = new URL(request.url)

        const status = searchParams.get("status") || "active"
        const limit = parseInt(searchParams.get("limit") || "100")
        const maxDepth = parseInt(searchParams.get("maxDepth") || "3")

        if (!processId) {
            return NextResponse.json(
                { error: "Process ID is required" },
                { status: 400 }
            )
        }

        // Validate user is authenticated
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            )
        }

        // Verify user owns this process (BOLA protection)
        const { data: process, error: fetchError } = await supabase
            .from("processes")
            .select("id, user_id, workspace_id")
            .eq("id", processId)
            .single()

        if (fetchError || !process) {
            return NextResponse.json(
                { error: "Proceso no encontrado" },
                { status: 404 }
            )
        }

        if (process.user_id !== user.id) {
            return NextResponse.json(
                { error: "No tienes acceso a este proceso" },
                { status: 403 }
            )
        }

        if (!ragBackendService.isConfigured()) {
            return NextResponse.json(
                { error: "RAG backend no configurado (Falta RAG_BACKEND_URL)" },
                { status: 503 }
            )
        }

        // Call RAG backend service (handles SSL automatically)
        const graphData = await ragBackendService.getGraph(
            process.workspace_id || "",
            processId,
            status,
            limit,
            maxDepth
        )

        // Add meta information
        const response: GraphResponse = {
            nodes: graphData.nodes || [],
            edges: graphData.edges || [],
            meta: {
                nodeCount: graphData.nodes?.length || 0,
                edgeCount: graphData.edges?.length || 0,
                appliedFilters: {
                    status,
                    limit: limit.toString(),
                    maxDepth: maxDepth.toString()
                }
            }
        }

        return NextResponse.json(response)
    } catch (error: any) {
        console.error("Error fetching graph:", error)
        return NextResponse.json(
            { error: error.message || "Error al obtener el grafo" },
            { status: 500 }
        )
    }
}
