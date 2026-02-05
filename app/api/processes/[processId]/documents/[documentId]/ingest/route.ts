
import { NextRequest, NextResponse } from 'next/server'
import { ragBackendService } from '@/lib/services/rag-backend'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env/runtime-env'
import { Database } from '@/supabase/types'

export async function POST(
    req: NextRequest,
    { params }: { params: { processId: string; documentId: string } }
) {
    try {
        const { processId, documentId } = params

        // 1. Auth check
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Admin client for full access (needed for storage download sometimes)
        const supabaseAdmin = createSupabaseClient<Database>(
            env.supabaseUrl(),
            env.supabaseServiceRole()
        )

        // 3. Get document record
        const { data: doc, error: docError } = await supabaseAdmin
            .from('process_documents')
            .select('*')
            .eq('id', documentId)
            .eq('process_id', processId)
            .single()

        if (docError || !doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Determine current status
        // If it's already indexed, we might skip, but let's allow re-indexing if requested?
        // For now, assume this is called on 'pending' docs.

        // 4. Update status to 'processing' to show progress
        await supabaseAdmin
            .from('process_documents')
            .update({ status: 'processing' })
            .eq('id', documentId)

        // Also update process status to 'processing' if needed
        await supabaseAdmin
            .from('processes')
            .update({ indexing_status: 'processing' })
            .eq('id', processId)
            .neq('indexing_status', 'processing') // Only if not already processing

        // 5. Download file from Storage
        const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
            .from('files')
            .download(doc.storage_path)

        if (downloadError || !fileBlob) {
            throw new Error(`Failed to download file from storage: ${downloadError?.message}`)
        }

        // 6. Convert Blob to File (polyfill/mock)
        // RAGBackendService expects a File object (with name and type)
        const file = new File([fileBlob], doc.file_name, { type: doc.mime_type || 'application/octet-stream' })

        // 7. Get Workspace ID (needed for ingestion)
        // We can get it from process record
        const { data: processRecord } = await supabaseAdmin
            .from('processes')
            .select('workspace_id')
            .eq('id', processId)
            .single()

        if (!processRecord) throw new Error('Process not found')

        // 8. Call RAG Ingestion
        console.log(`🚀 Triggering ingestion for doc ${documentId} (Process ${processId})`)

        // Prepare metadata
        const metadata = {
            process_id: processId,
            file_name: doc.file_name,
            mime_type: doc.mime_type,
            user_id: user.id,
            document_id: doc.id,
            ...doc.metadata as any
        }

        await ragBackendService.ingestDocument(
            file,
            processRecord.workspace_id,
            processId,
            metadata
        )

        // 9. Update status to 'indexed'
        await supabaseAdmin
            .from('process_documents')
            .update({
                status: 'indexed',
                metadata: {
                    ...doc.metadata as any,
                    processed_with: 'external_rag',
                    processed_at: new Date().toISOString()
                }
            })
            .eq('id', documentId)

        // Check if all documents are indexed to update process status
        // (Optional optimization: separate cron or check here)
        // Simple check:
        const { count } = await supabaseAdmin
            .from('process_documents')
            .select('*', { count: 'exact', head: true })
            .eq('process_id', processId)
            .neq('status', 'indexed') // Any not indexed?

        if (count === 0) {
            await supabaseAdmin
                .from('processes')
                .update({ indexing_status: 'ready' })
                .eq('id', processId)
        }

        return NextResponse.json({ success: true, message: 'Ingestion completed' })

    } catch (error: any) {
        console.error(`❌ Ingestion trigger failed for doc ${params.documentId}:`, error)

        // Attempt to mark as error
        const supabaseAdmin = createSupabaseClient<Database>(
            env.supabaseUrl(),
            env.supabaseServiceRole()
        )
        await supabaseAdmin
            .from('process_documents')
            .update({
                status: 'error',
                error_message: error.message
            })
            .eq('id', params.documentId)

        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
