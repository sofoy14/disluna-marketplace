import { ALIContext } from "@/context/context"
import { getAssistantCollectionsByAssistantId } from "@/db/assistant-collections"
import { getAssistantFilesByAssistantId } from "@/db/assistant-files"
import { getAssistantToolsByAssistantId } from "@/db/assistant-tools"
import { getCollectionFilesByCollectionId } from "@/db/collection-files"
import { Tables } from "@/supabase/types"
import { LLMID } from "@/types"
import { useContext, useCallback } from "react"

// Regex patterns compilados una sola vez para mejor rendimiento
const COMMAND_PATTERNS = {
  at: /@([^ ]*)$/,
  slash: /\/([^ ]*)$/,
  hashtag: /#([^ ]*)$/,
  tool: /!([^ ]*)$/
}

export const usePromptAndCommand = () => {
  const {
    chatFiles,
    setNewMessageFiles,
    userInput,
    setUserInput,
    setShowFilesDisplay,
    setIsPromptPickerOpen,
    setIsFilePickerOpen,
    setSlashCommand,
    setHashtagCommand,
    setUseRetrieval,
    setToolCommand,
    setIsToolPickerOpen,
    setSelectedTools,
    setAtCommand,
    setIsAssistantPickerOpen,
    setChatSettings,
    setChatFiles
  } = useContext(ALIContext)

  /**
   * Maneja los cambios en el input de chat
   * Detecta comandos especiales (@, /, #, !) y abre los pickers correspondientes
   */
  const handleInputChange = useCallback((value: string) => {
    // Detectar comandos
    const atMatch = value.match(COMMAND_PATTERNS.at)
    const slashMatch = value.match(COMMAND_PATTERNS.slash)
    const hashtagMatch = value.match(COMMAND_PATTERNS.hashtag)
    const toolMatch = value.match(COMMAND_PATTERNS.tool)

    // Manejar comandos en orden de prioridad
    if (atMatch) {
      setIsAssistantPickerOpen(true)
      setAtCommand(atMatch[1])
      // Cerrar otros pickers
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setIsToolPickerOpen(false)
    } else if (slashMatch) {
      setIsPromptPickerOpen(true)
      setSlashCommand(slashMatch[1])
      // Cerrar otros pickers
      setIsFilePickerOpen(false)
      setIsToolPickerOpen(false)
      setIsAssistantPickerOpen(false)
    } else if (hashtagMatch) {
      setIsFilePickerOpen(true)
      setHashtagCommand(hashtagMatch[1])
      // Cerrar otros pickers
      setIsPromptPickerOpen(false)
      setIsToolPickerOpen(false)
      setIsAssistantPickerOpen(false)
    } else if (toolMatch) {
      setIsToolPickerOpen(true)
      setToolCommand(toolMatch[1])
      // Cerrar otros pickers
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setIsAssistantPickerOpen(false)
    } else {
      // Cerrar todos los pickers si no hay comandos
      setIsPromptPickerOpen(false)
      setIsFilePickerOpen(false)
      setIsToolPickerOpen(false)
      setIsAssistantPickerOpen(false)
      // Limpiar comandos
      setSlashCommand("")
      setHashtagCommand("")
      setToolCommand("")
      setAtCommand("")
    }

    // Actualizar el input del usuario
    setUserInput(value)
  }, [
    setIsAssistantPickerOpen,
    setAtCommand,
    setIsPromptPickerOpen,
    setSlashCommand,
    setIsFilePickerOpen,
    setHashtagCommand,
    setIsToolPickerOpen,
    setToolCommand,
    setUserInput
  ])

  /**
   * Selecciona un prompt y lo inserta en el input
   */
  const handleSelectPrompt = useCallback((prompt: Tables<"prompts">) => {
    setIsPromptPickerOpen(false)
    setUserInput(prev => prev.replace(/\/[^ ]*$/, "") + prompt.content)
  }, [setIsPromptPickerOpen, setUserInput])

  /**
   * Selecciona un archivo para adjuntar al mensaje
   */
  const handleSelectUserFile = useCallback(async (file: Tables<"files">) => {
    setShowFilesDisplay(true)
    setIsFilePickerOpen(false)
    setUseRetrieval(true)

    setNewMessageFiles(prev => {
      const fileAlreadySelected =
        prev.some(prevFile => prevFile.id === file.id) ||
        chatFiles.some(chatFile => chatFile.id === file.id)

      if (!fileAlreadySelected) {
        return [
          ...prev,
          {
            id: file.id,
            name: file.name,
            type: file.type,
            file: null
          }
        ]
      }
      return prev
    })

    setUserInput(prev => prev.replace(/#[^ ]*$/, ""))
  }, [chatFiles, setChatFiles, setIsFilePickerOpen, setNewMessageFiles, setShowFilesDisplay, setUseRetrieval, setUserInput])

  /**
   * Selecciona una colección/proceso y adjunta todos sus archivos
   */
  const handleSelectUserCollection = useCallback(async (
    collection: Tables<"processes">
  ) => {
    setShowFilesDisplay(true)
    setIsFilePickerOpen(false)
    setUseRetrieval(true)

    const collectionFiles = await getCollectionFilesByCollectionId(
      collection.id
    )

    setNewMessageFiles(prev => {
      const newFiles = collectionFiles.files
        .filter(
          file =>
            !prev.some(prevFile => prevFile.id === file.id) &&
            !chatFiles.some(chatFile => chatFile.id === file.id)
        )
        .map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          file: null
        }))

      return [...prev, ...newFiles]
    })

    setUserInput(prev => prev.replace(/#[^ ]*$/, ""))
  }, [chatFiles, setIsFilePickerOpen, setNewMessageFiles, setShowFilesDisplay, setUseRetrieval, setUserInput])

  /**
   * Selecciona una herramienta para usar en el chat
   */
  const handleSelectTool = useCallback((tool: Tables<"tools">) => {
    setIsToolPickerOpen(false)
    setUserInput(prev => prev.replace(/![^ ]*$/, ""))
    setSelectedTools(prev => [...prev, tool])
  }, [setIsToolPickerOpen, setSelectedTools, setUserInput])

  /**
   * Selecciona un asistente para el chat
   */
  const handleSelectAssistant = useCallback(async (assistant: Tables<"assistants">) => {
    setIsAssistantPickerOpen(false)
    setUserInput(prev => prev.replace(/@[^ ]*$/, ""))
    setSelectedAssistant(assistant)

    setChatSettings({
      model: assistant.model as LLMID,
      prompt: assistant.prompt,
      temperature: assistant.temperature,
      contextLength: assistant.context_length,
      includeProfileContext: assistant.include_profile_context,
      includeWorkspaceInstructions: assistant.include_workspace_instructions,
      embeddingsProvider: assistant.embeddings_provider as "openai" | "local"
    })

    let allFiles = []

    const assistantFiles = (await getAssistantFilesByAssistantId(assistant.id))
      .files
    allFiles = [...assistantFiles]
    const assistantCollections = (
      await getAssistantCollectionsByAssistantId(assistant.id)
    ).collections
    for (const collection of assistantCollections) {
      const collectionFiles = (
        await getCollectionFilesByCollectionId(collection.id)
      ).files
      allFiles = [...allFiles, ...collectionFiles]
    }
    const assistantTools = (await getAssistantToolsByAssistantId(assistant.id))
      .tools

    setSelectedTools(assistantTools)
    setChatFiles(
      allFiles.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        file: null
      }))
    )

    if (allFiles.length > 0) setShowFilesDisplay(true)
  }, [setIsAssistantPickerOpen, setSelectedTools, setChatFiles, setChatSettings, setShowFilesDisplay, setUserInput])

  return {
    handleInputChange,
    handleSelectPrompt,
    handleSelectUserFile,
    handleSelectUserCollection,
    handleSelectTool,
    handleSelectAssistant
  }
}
