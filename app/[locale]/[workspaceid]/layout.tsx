"use client"

import { Dashboard } from "@/components/ui/dashboard"
import { ALIContext } from "@/context/context"
import { getChatsByWorkspaceId } from "@/db/chats"
import { getFileWorkspacesByWorkspaceId } from "@/db/files"
import { getModelWorkspacesByWorkspaceId } from "@/db/models"
import { getPresetWorkspacesByWorkspaceId } from "@/db/presets"
import { getPromptWorkspacesByWorkspaceId } from "@/db/prompts"
import { getProcessWorkspacesByWorkspaceId } from "@/db/processes"
import { getWorkspaceById } from "@/db/workspaces"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { supabase } from "@/lib/supabase/browser-client"
import { LLMID } from "@/types"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ReactNode, useContext, useEffect, useState } from "react"
import Loading from "../loading"
import { DeviceSessionProvider } from "@/components/providers/device-session-provider"

interface WorkspaceLayoutProps {
  children: ReactNode
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const router = useRouter()

  const params = useParams()
  const searchParams = useSearchParams()
  const workspaceId = params.workspaceid as string

  const {
    setChatSettings,
    setChats,
    setCollections,
    setFiles,
    setPresets,
    setPrompts,
    setModels,
    selectedWorkspace,
    setSelectedWorkspace,
    setSelectedChat,
    setChatMessages,
    setUserInput,
    setIsGenerating,
    setFirstTokenReceived,
    setChatFiles,
    setChatImages,
    setNewMessageFiles,
    setNewMessageImages,
    setShowFilesDisplay
  } = useContext(ALIContext)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const session = (await supabase.auth.getSession()).data.session

      if (!session) {
        return router.push("/login")
      } else {
        await fetchWorkspaceData(workspaceId)
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => await fetchWorkspaceData(workspaceId))()

    // Solo limpiar estado de chat cuando realmente cambia el workspace
    setUserInput("")
    setChatMessages([])
    setSelectedChat(null)

    setIsGenerating(false)
    setFirstTokenReceived(false)

    setChatFiles([])
    setChatImages([])
    setNewMessageFiles([])
    setNewMessageImages([])
    setShowFilesDisplay(false)
  }, [workspaceId])

  const fetchWorkspaceData = async (workspaceId: string) => {
    setLoading(true)

    try {
      // Validate that workspaceId is a valid UUID before proceeding
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(workspaceId)) {
        console.error(`Invalid workspace ID format: ${workspaceId}`)
        router.push('/login')
        return
      }

      const workspace = await getWorkspaceById(workspaceId)
      setSelectedWorkspace(workspace)

      const chats = await getChatsByWorkspaceId(workspaceId)
      setChats(chats)

      try {
        const processData =
          await getProcessWorkspacesByWorkspaceId(workspaceId)
        // processData returns { id, name, processes: [...] }
        console.log('Process data loaded:', {
          workspaceId,
          processesCount: processData?.processes?.length || 0,
          processes: processData?.processes
        })
        
        // Mapear procesos a formato collections para compatibilidad
        const collectionsData = (processData?.processes || []).map(process => ({
          id: process.id,
          name: process.name,
          description: process.description,
          user_id: process.user_id,
          workspace_id: process.workspace_id,
          created_at: process.created_at,
          updated_at: process.updated_at,
          sharing: process.sharing || 'private'
        }))
        
        console.log('Collections data mapped:', collectionsData.length)
        setCollections(collectionsData)
      } catch (processError) {
        console.error('Error loading processes (stub tables may not exist yet):', processError)
        setCollections([])
      }

      const fileData = await getFileWorkspacesByWorkspaceId(workspaceId)
      setFiles(fileData.files || [])

      const presetData = await getPresetWorkspacesByWorkspaceId(workspaceId)
      setPresets(presetData.presets || [])

      const promptData = await getPromptWorkspacesByWorkspaceId(workspaceId)
      setPrompts(promptData.prompts || [])

      const modelData = await getModelWorkspacesByWorkspaceId(workspaceId)
      setModels(modelData.models || [])

      setChatSettings({
        model: (searchParams.get("model") ||
          workspace?.default_model ||
          "alibaba/tongyi-deepresearch-30b-a3b") as LLMID,
        prompt:
          workspace?.default_prompt ||
          "You are a friendly, helpful AI assistant.",
        temperature: workspace?.default_temperature || 0.5,
        contextLength: workspace?.default_context_length || 4096,
        includeProfileContext: workspace?.include_profile_context || true,
        includeWorkspaceInstructions:
          workspace?.include_workspace_instructions || true,
        embeddingsProvider:
          (workspace?.embeddings_provider as "openai" | "local") || "openai"
      })

    } catch (error) {
      console.error('Error fetching workspace data:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loading />
  }

  return (
    <DeviceSessionProvider>
      <Dashboard>{children}</Dashboard>
    </DeviceSessionProvider>
  )
}
