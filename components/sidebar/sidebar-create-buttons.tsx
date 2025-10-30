import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatbotUIContext } from "@/context/context"
import { createFolder } from "@/db/folders"
import { ContentType } from "@/types"
import { IconFolderPlus, IconPlus } from "@tabler/icons-react"
import { FC, useContext, useState } from "react"
import { Button } from "../ui/button"
import { CreateAssistant } from "./items/assistants/create-assistant"
import { CreateCollection } from "./items/collections/create-collection"
import { CreateFile } from "./items/files/create-file"
import { CreateTool } from "./items/tools/create-tool"
import { CreateProcessModal } from "../modals/CreateProcessModal"
import { CreateFileModal } from "../modals/CreateFileModal"

interface SidebarCreateButtonsProps {
  contentType: ContentType
  hasData: boolean
}

export const SidebarCreateButtons: FC<SidebarCreateButtonsProps> = ({
  contentType,
  hasData
}) => {
  const { profile, selectedWorkspace, folders, setFolders } =
    useContext(ChatbotUIContext)
  const { handleNewChat } = useChatHandler()

  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false)
  const [isCreatingTool, setIsCreatingTool] = useState(false)

  const handleCreateFolder = async () => {
    if (!profile) return
    if (!selectedWorkspace) return

    const createdFolder = await createFolder({
      user_id: profile.user_id,
      workspace_id: selectedWorkspace.id,
      name: "Nueva Carpeta",
      description: "",
      type: contentType
    })
    setFolders([...folders, createdFolder])
  }

  const getCreateButtonLabel = (contentType: ContentType): string => {
    const labels: Record<ContentType, string> = {
      chats: "Conversación",
      presets: "Preajuste",
      prompts: "Instrucción",
      files: "Archivo",
      collections: "Proceso",
      assistants: "Agente",
      tools: "Herramienta",
      models: "Modelo"
    }
    return labels[contentType] || contentType
  }

  const getCreateButtonPrefix = (contentType: ContentType): string => {
    const feminineWords = ['chats', 'tools']
    return feminineWords.includes(contentType) ? 'Nueva' : 'Nuevo'
  }

  const getCreateFunction = () => {
    switch (contentType) {
      case "chats":
        return async () => {
          handleNewChat()
        }

      case "files":
        return async () => {
          setIsCreatingFile(true)
        }

      case "collections":
        return async () => {
          setIsCreatingCollection(true)
        }

      case "assistants":
        return async () => {
          setIsCreatingAssistant(true)
        }

      case "tools":
        return async () => {
          setIsCreatingTool(true)
        }

      default:
        break
    }
  }

  const handleProcessCreated = (process: any) => {
    console.log('Process created:', process);
    // Aquí irías la lógica para agregar el proceso a la lista
  }

  const handleFileCreated = (file: any) => {
    console.log('File created:', file);
    // Aquí irías la lógica para agregar el archivo a la lista
  }

  // Ocultar el botón de crear archivo en el sidebar ya que ahora se hace desde el icono del chat
  if (contentType === "files") {
    return null;
  }

  return (
    <div className="flex w-full space-x-2">
      {/* Botón principal con modal mejorado */}
      {contentType === "collections" ? (
        <CreateProcessModal onProcessCreated={handleProcessCreated}>
          <Button className="flex h-[36px] grow">
            <IconPlus className="mr-1" size={20} />
            {getCreateButtonPrefix(contentType)} {getCreateButtonLabel(contentType)}
          </Button>
        </CreateProcessModal>
      ) : (
        <Button className="flex h-[36px] grow" onClick={getCreateFunction()}>
          <IconPlus className="mr-1" size={20} />
          {getCreateButtonPrefix(contentType)} {getCreateButtonLabel(contentType)}
        </Button>
      )}


      {/* Modales existentes para otros tipos de contenido */}
      {isCreatingFile && (
        <CreateFile isOpen={isCreatingFile} onOpenChange={setIsCreatingFile} />
      )}

      {isCreatingCollection && (
        <CreateCollection
          isOpen={isCreatingCollection}
          onOpenChange={setIsCreatingCollection}
        />
      )}

      {isCreatingAssistant && (
        <CreateAssistant
          isOpen={isCreatingAssistant}
          onOpenChange={setIsCreatingAssistant}
        />
      )}

      {isCreatingTool && (
        <CreateTool isOpen={isCreatingTool} onOpenChange={setIsCreatingTool} />
      )}
    </div>
  )
}
