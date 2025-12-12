import { ALIContext } from "@/context/context"
import { updateAssistant } from "@/db/assistants"
import { updateChat } from "@/db/chats"
import { updateCollection } from "@/db/collections"
import { updateFile } from "@/db/files"
import { updateModel } from "@/db/models"
import { updatePreset } from "@/db/presets"
import { updatePrompt } from "@/db/prompts"
import { updateTool } from "@/db/tools"
import { updateTranscription } from "@/db/transcriptions"
import { cn } from "@/lib/utils"
import { Tables } from "@/supabase/types"
import { ContentType, DataItemType, DataListType } from "@/types"
import { FC, useContext, useRef, useState } from "react"
import { AssistantItem } from "./items/assistants/assistant-item"
import { ModernChatItem } from "./items/chat/modern-chat-item"
import { CollectionItem } from "./items/collections/collection-item"
import { FileItem } from "./items/files/file-item"
import { ModelItem } from "./items/models/model-item"
import { PresetItem } from "./items/presets/preset-item"
import { PromptItem } from "./items/prompts/prompt-item"
import { ToolItem } from "./items/tools/tool-item"
import { TranscriptionItem } from "./items/transcriptions/transcription-item"
import { IconCalendar, IconCalendarEvent, IconCalendarWeek, IconHistory, IconMicrophone } from "@tabler/icons-react"

interface SidebarDataListProps {
  contentType: ContentType
  data: DataListType
  folders: Tables<"folders">[]
}

const getEmptyStateMessage = (contentType: ContentType): string => {
  const messages: Record<ContentType, string> = {
    chats: "No hay conversaciones.",
    presets: "No hay preajustes.",
    prompts: "No hay instrucciones.",
    files: "No hay archivos.",
    collections: "No hay procesos.",
    assistants: "No hay agentes.",
    tools: "No hay herramientas.",
    models: "No hay modelos.",
    transcriptions: "No hay transcripciones."
  }
  return messages[contentType] || `No hay ${contentType}.`
}

export const SidebarDataList: FC<SidebarDataListProps> = ({
  contentType,
  data,
  folders
}) => {
  const {
    setChats,
    setPresets,
    setPrompts,
    setFiles,
    setCollections,
    setAssistants,
    setTools,
    setModels,
    setTranscriptions
  } = useContext(ALIContext)

  const divRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const getDataListComponent = (
    contentType: ContentType,
    item: DataItemType
  ) => {
    switch (contentType) {
      case "chats":
        return <ModernChatItem key={item.id} chat={item as Tables<"chats">} />

      case "presets":
        return <PresetItem key={item.id} preset={item as Tables<"presets">} />

      case "prompts":
        return <PromptItem key={item.id} prompt={item as Tables<"prompts">} />

      case "files":
        return <FileItem key={item.id} file={item as Tables<"files">} />

      case "collections":
        return (
          <CollectionItem
            key={item.id}
            collection={item as Tables<"processes">}
          />
        )

      case "assistants":
        return (
          <AssistantItem
            key={item.id}
            assistant={item as Tables<"assistants">}
          />
        )

      case "tools":
        return <ToolItem key={item.id} tool={item as Tables<"tools">} />

      case "models":
        return <ModelItem key={item.id} model={item as Tables<"models">} />

      case "transcriptions":
        return (
          <TranscriptionItem
            key={item.id}
            transcription={item as Tables<"transcriptions">}
          />
        )

      default:
        return null
    }
  }

  const getSortedData = (
    data: any,
    dateCategory: "Hoy" | "Ayer" | "Semana Anterior" | "Más Antiguo"
  ) => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const oneWeekAgoStart = new Date(todayStart)
    oneWeekAgoStart.setDate(oneWeekAgoStart.getDate() - 7)

    return data
      .filter((item: any) => {
        const itemDate = new Date(item.updated_at || item.created_at)
        switch (dateCategory) {
          case "Hoy":
            return itemDate >= todayStart
          case "Ayer":
            return itemDate >= yesterdayStart && itemDate < todayStart
          case "Semana Anterior":
            return itemDate >= oneWeekAgoStart && itemDate < yesterdayStart
          case "Más Antiguo":
            return itemDate < oneWeekAgoStart
          default:
            return true
        }
      })
      .sort(
        (
          a: { updated_at: string; created_at: string },
          b: { updated_at: string; created_at: string }
        ) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      )
  }

  const updateFunctions = {
    chats: updateChat,
    presets: updatePreset,
    prompts: updatePrompt,
    files: updateFile,
    collections: updateCollection,
    assistants: updateAssistant,
    tools: updateTool,
    models: updateModel,
    transcriptions: updateTranscription
  }

  const stateUpdateFunctions = {
    chats: setChats,
    presets: setPresets,
    prompts: setPrompts,
    files: setFiles,
    collections: setCollections,
    assistants: setAssistants,
    tools: setTools,
    models: setModels,
    transcriptions: setTranscriptions
  }

  const updateFolder = async (itemId: string, folderId: string | null) => {
    const item: any = data.find(item => item.id === itemId)

    if (!item) return null

    const updateFunction = updateFunctions[contentType]
    const setStateFunction = stateUpdateFunctions[contentType]

    if (!updateFunction || !setStateFunction) return

    const updatedItem = await updateFunction(item.id, {
      folder_id: folderId
    })

    setStateFunction((items: any) =>
      items.map((item: any) =>
        item.id === updatedItem.id ? updatedItem : item
      )
    )
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData("text/plain", id)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()

    const target = e.target as Element

    if (!target.closest("#folder")) {
      const itemId = e.dataTransfer.getData("text/plain")
      updateFolder(itemId, null)
    }

    setIsDragOver(false)
  }

  const dataWithFolders = data.filter(item => item.folder_id)
  const dataWithoutFolders = data.filter(item => item.folder_id === null)

  return (
    <>
      <div
        ref={divRef}
        className="flex flex-col"
        onDrop={handleDrop}
      >
        {data.length === 0 && (
          <div className="flex grow flex-col items-center justify-center py-12 px-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                {contentType === "chats" ? (
                  <IconHistory className="w-8 h-8 text-primary/50" />
                ) : contentType === "transcriptions" ? (
                  <IconMicrophone className="w-8 h-8 text-primary/50" />
                ) : (
                  <IconCalendar className="w-8 h-8 text-primary/50" />
                )}
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground/70 font-medium">
              {getEmptyStateMessage(contentType)}
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground/50">
              {contentType === "chats" 
                ? "Inicia una nueva conversación para comenzar" 
                : "Agrega elementos para verlos aquí"}
            </p>
          </div>
        )}

        {data.length > 0 && (
          <div className="w-full space-y-2">
            {contentType === "chats" ? (
              <>
                {(["Hoy", "Ayer", "Semana Anterior", "Más Antiguo"] as const).map(
                  dateCategory => {
                    // Mostrar todos los chats, no solo los que no tienen folder
                    const sortedData = getSortedData(
                      data,
                      dateCategory
                    )

                    const getCategoryIcon = (category: string) => {
                      switch (category) {
                        case "Hoy":
                          return <IconCalendar className="w-3.5 h-3.5" />
                        case "Ayer":
                          return <IconCalendarEvent className="w-3.5 h-3.5" />
                        case "Semana Anterior":
                          return <IconCalendarWeek className="w-3.5 h-3.5" />
                        default:
                          return <IconHistory className="w-3.5 h-3.5" />
                      }
                    }

                    return (
                      sortedData.length > 0 && (
                        <div key={dateCategory} className="pb-3">
                          {/* Encabezado de categoría mejorado */}
                          <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                            <div className="flex items-center gap-1.5 text-muted-foreground/70">
                              {getCategoryIcon(dateCategory)}
                              <span className="text-xs font-semibold uppercase tracking-wider">
                                {dateCategory}
                              </span>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
                            <span className="text-[10px] text-muted-foreground/50 font-medium tabular-nums">
                              {sortedData.length}
                            </span>
                          </div>

                          <div
                            className={cn(
                              "flex grow flex-col gap-1",
                              isDragOver && "bg-accent/50 rounded-xl"
                            )}
                            onDrop={handleDrop}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                          >
                            {sortedData.map((item: any) => (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={e => handleDragStart(e, item.id)}
                              >
                                {getDataListComponent(contentType, item)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )
                  }
                )}
              </>
            ) : (
              <div
                className={cn("flex grow flex-col", isDragOver && "bg-accent")}
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
              >
                {dataWithoutFolders.map(item => {
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item.id)}
                    >
                      {getDataListComponent(contentType, item)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
