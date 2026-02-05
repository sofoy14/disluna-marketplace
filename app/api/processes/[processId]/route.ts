"use server"

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

// GET /api/processes/[processId] - Get process by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ processId: string }> }
) {
    try {
        const { processId } = await params

        if (!processId) {
            return NextResponse.json(
                { error: "Process ID is required" },
                { status: 400 }
            )
        }

        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)

        const { data: process, error } = await supabase
            .from("processes")
            .select("*")
            .eq("id", processId)
            .single()

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 404 }
            )
        }

        return NextResponse.json(process)
    } catch (error: any) {
        console.error("Error fetching process:", error)
        return NextResponse.json(
            { error: error.message || "Error al obtener el proceso" },
            { status: 500 }
        )
    }
}

// PATCH /api/processes/[processId] - Update process
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ processId: string }> }
) {
    try {
        const { processId } = await params
        const body = await request.json()

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

        // Verify user owns this process
        const { data: existingProcess, error: fetchError } = await supabase
            .from("processes")
            .select("user_id")
            .eq("id", processId)
            .single()

        if (fetchError || !existingProcess) {
            return NextResponse.json(
                { error: "Proceso no encontrado" },
                { status: 404 }
            )
        }

        if (existingProcess.user_id !== user.id) {
            return NextResponse.json(
                { error: "No tienes permisos para editar este proceso" },
                { status: 403 }
            )
        }

        // Allowed fields to update
        const allowedFields = [
            "name",
            "description",
            "status",
            "process_number",
            "process_type",
            "client_name",
            "start_date",
            "end_date",
            "metadata"
        ]

        const updateData: Record<string, any> = {}
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field]
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No hay campos válidos para actualizar" },
                { status: 400 }
            )
        }

        const { data: updatedProcess, error: updateError } = await supabase
            .from("processes")
            .update(updateData)
            .eq("id", processId)
            .select("*")
            .single()

        if (updateError) {
            throw new Error(updateError.message)
        }

        return NextResponse.json({
            success: true,
            process: updatedProcess
        })
    } catch (error: any) {
        console.error("Error updating process:", error)
        return NextResponse.json(
            { error: error.message || "Error al actualizar el proceso" },
            { status: 500 }
        )
    }
}

// DELETE /api/processes/[processId] - Delete process
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ processId: string }> }
) {
    try {
        const { processId } = await params

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

        // Verify user owns this process
        const { data: existingProcess, error: fetchError } = await supabase
            .from("processes")
            .select("user_id")
            .eq("id", processId)
            .single()

        if (fetchError || !existingProcess) {
            return NextResponse.json(
                { error: "Proceso no encontrado o ya eliminado" },
                { status: 404 }
            )
        }

        if (existingProcess.user_id !== user.id) {
            return NextResponse.json(
                { error: "No tienes permisos para eliminar este proceso" },
                { status: 403 }
            )
        }

        // Delete document sections first (embeddings)
        try {
            await supabase
                .from("process_document_sections")
                .delete()
                .eq("process_id", processId)
        } catch (e) {
            console.log("Error cleaning up document sections (ignoring):", e)
        }

        // Delete the process (cascades to process_documents, process_files, process_workspaces)
        const { error: deleteError } = await supabase
            .from("processes")
            .delete()
            .eq("id", processId)

        if (deleteError) {
            throw new Error(deleteError.message)
        }

        return NextResponse.json({
            success: true,
            message: "Proceso eliminado correctamente"
        })
    } catch (error: any) {
        console.error("Error deleting process:", error)
        return NextResponse.json(
            { error: error.message || "Error al eliminar el proceso" },
            { status: 500 }
        )
    }
}
