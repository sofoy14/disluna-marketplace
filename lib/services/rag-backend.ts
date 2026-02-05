/**
 * RAG Backend Service
 * Servicio para interactuar con el backend RAG especializado
 * que proporciona búsqueda híbrida (vectorial + grafo de conocimiento)
 */

export type SearchType = 'vector' | 'graph' | 'hybrid'

export interface RAGChatRequest {
    message: string
    search_type?: SearchType
    workspace_id?: string
    process_id?: string
}

export interface RAGChatResponse {
    response: string
    sources?: Array<{
        content: string
        metadata: Record<string, any>
        score?: number
    }>
}

export interface RAGSearchRequest {
    query: string
    search_type?: SearchType
    limit?: number
    workspace_id: string
    process_id?: string
}

export interface RAGSearchResult {
    content: string
    metadata: Record<string, any>
    score: number
}

export interface RAGIngestResponse {
    message: string
    document_id?: string
    status: 'success' | 'error'
    markdown?: string
}

export interface RAGDocument {
    id: string
    filename: string
    workspace_id?: string
    created_at: string
    metadata?: Record<string, any>
}

export interface RAGHealthResponse {
    status: string
    message?: string
    apis?: {
        main?: string
        neo4j?: string
        qdrant?: string
    }
}

class RAGBackendService {
    private baseUrl: string
    private skipSSLVerification: boolean

    constructor() {
        this.baseUrl = process.env.RAG_BACKEND_URL || ''
        // En desarrollo, permitir certificados auto-firmados
        this.skipSSLVerification = process.env.NODE_ENV !== 'production'

        if (!this.baseUrl) {
            console.warn('⚠️ RAG_BACKEND_URL no está configurado')
        }
    }

    /**
     * Opciones de fetch para manejar SSL en desarrollo
     */
    private getFetchOptions(): RequestInit {
        if (this.skipSSLVerification) {
            // En Node.js con undici, usamos esta configuración
            return {
                // @ts-ignore - Soporte para Node.js con certificados auto-firmados
                dispatcher: new (require('undici').Agent)({
                    connect: {
                        rejectUnauthorized: false
                    }
                })
            }
        }
        return {}
    }

    /**
     * Verificar salud del backend RAG
     */
    async getHealth(): Promise<RAGHealthResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                ...this.getFetchOptions()
            })

            if (!response.ok) {
                throw new Error(`Health check failed: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error('❌ RAG Backend health check failed:', error)
            throw new Error('Backend RAG no disponible')
        }
    }

    /**
     * Enviar mensaje de chat al backend RAG
     */
    async chat(request: RAGChatRequest): Promise<RAGChatResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: request.message,
                    search_type: request.search_type || 'hybrid',
                    workspace_id: request.workspace_id,
                    process_id: request.process_id
                }),
                ...this.getFetchOptions()
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `Chat request failed: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error('❌ RAG Backend chat error:', error)
            throw error
        }
    }

    /**
     * Chat con streaming (Server-Sent Events)
     */
    async streamChat(request: RAGChatRequest): Promise<ReadableStream> {
        try {
            const response = await fetch(`${this.baseUrl}/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: request.message,
                    search_type: request.search_type || 'hybrid',
                    workspace_id: request.workspace_id,
                    process_id: request.process_id
                }),
                ...this.getFetchOptions()
            })

            if (!response.ok) {
                throw new Error(`Stream request failed: ${response.status}`)
            }

            if (!response.body) {
                throw new Error('No response body')
            }

            return response.body
        } catch (error) {
            console.error('❌ RAG Backend stream error:', error)
            throw error
        }
    }

    /**
     * Realizar búsqueda en el backend RAG
     */
    async search(request: RAGSearchRequest): Promise<RAGSearchResult[]> {
        const searchType = request.search_type || 'hybrid'

        try {
            const response = await fetch(`${this.baseUrl}/search/${searchType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: request.query,
                    limit: request.limit || 10,
                    workspace_id: request.workspace_id,
                    process_id: request.process_id
                }),
                ...this.getFetchOptions()
            })

            if (!response.ok) {
                throw new Error(`Search request failed: ${response.status}`)
            }

            const data = await response.json()
            return data.results || []
        } catch (error) {
            console.error('❌ RAG Backend search error:', error)
            throw error
        }
    }

    /**
     * Ingestar documento en el backend RAG
     */
    async ingestDocument(
        file: File,
        workspaceId?: string,
        processId?: string,
        metadata?: Record<string, any>
    ): Promise<RAGIngestResponse> {
        try {
            const formData = new FormData()
            formData.append('file', file)
            // Opciones adicionales por defecto para el backend RAG
            formData.append('chunk_size', '1000')
            formData.append('use_semantic', 'true')

            if (workspaceId) {
                formData.append('workspace_id', workspaceId)
            }

            if (processId) {
                formData.append('process_id', processId)
            }

            if (metadata) {
                formData.append('metadata', JSON.stringify(metadata))
            }

            const response = await fetch(`${this.baseUrl}/ingest`, {
                method: 'POST',
                body: formData,
                ...this.getFetchOptions()
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `Ingest failed: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error('❌ RAG Backend ingest error:', error)
            throw error
        }
    }

    /**
     * Listar documentos indexados
     */
    async listDocuments(workspaceId?: string, processId?: string, limit: number = 100): Promise<RAGDocument[]> {
        try {
            const params = new URLSearchParams()
            if (workspaceId) params.append('workspace_id', workspaceId)
            if (processId) params.append('process_id', processId)
            params.append('limit', limit.toString())

            const response = await fetch(`${this.baseUrl}/documents?${params.toString()}`, {
                method: 'GET',
                ...this.getFetchOptions()
            })

            if (!response.ok) {
                throw new Error(`List documents failed: ${response.status}`)
            }

            const data = await response.json()
            return data.documents || []
        } catch (error) {
            console.error('❌ RAG Backend list documents error:', error)
            throw error
        }
    }

    /**
     * Obtener grafo de conocimiento
     */
    async getGraph(
        workspaceId: string,
        processId: string,
        status: string = 'active',
        limit: number = 100,
        maxDepth: number = 3
    ): Promise<any> {
        try {
            const params = new URLSearchParams()
            if (workspaceId) params.append('workspace_id', workspaceId)
            if (processId) params.append('process_id', processId)
            params.append('status', status)
            params.append('limit', limit.toString())
            params.append('max_depth', maxDepth.toString())

            const response = await fetch(`${this.baseUrl}/graph?${params.toString()}`, {
                method: 'GET',
                ...this.getFetchOptions()
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `Graph request failed: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error('❌ RAG Backend graph error:', error)
            throw error
        }
    }

    /**
     * Verificar si el backend está configurado
     */
    isConfigured(): boolean {
        return Boolean(this.baseUrl)
    }
}

// Singleton instance
export const ragBackendService = new RAGBackendService()
