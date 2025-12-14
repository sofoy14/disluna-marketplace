import { ALIContext } from "@/context/context"
import { WORKSPACE_INSTRUCTIONS_MAX } from "@/db/limits"
import {
  getWorkspaceImageFromStorage,
  uploadWorkspaceImage
} from "@/db/storage/workspace-images"
import { updateWorkspace } from "@/db/workspaces"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { LLMID } from "@/types"
import { Tables } from "@/supabase/types"
import { IconHome, IconSettings } from "@tabler/icons-react"
import { FC, ReactNode, useContext, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { ChatSettingsForm } from "../ui/chat-settings-form"
import ImagePicker from "../ui/image-picker"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { LimitDisplay } from "../ui/limit-display"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "../ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { WithTooltip } from "../ui/with-tooltip"
import { DeleteWorkspace } from "./delete-workspace"

interface WorkspaceSettingsProps {
  trigger?: ReactNode
  workspace?: Tables<"workspaces">
}

export const WorkspaceSettings: FC<WorkspaceSettingsProps> = ({ 
  trigger,
  workspace: workspaceProp 
}) => {
  const {
    profile,
    selectedWorkspace,
    setSelectedWorkspace,
    setWorkspaces,
    setChatSettings,
    workspaceImages,
    setWorkspaceImages
  } = useContext(ALIContext)

  // Usar el workspace prop si se proporciona, sino usar el selectedWorkspace
  const workspace = workspaceProp || selectedWorkspace

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)

  const [name, setName] = useState(workspace?.name || "")
  const [imageLink, setImageLink] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [description, setDescription] = useState(
    workspace?.description || ""
  )
  const [instructions, setInstructions] = useState(
    workspace?.instructions || ""
  )

  const [defaultChatSettings, setDefaultChatSettings] = useState({
    model: workspace?.default_model,
    prompt: workspace?.default_prompt,
    temperature: workspace?.default_temperature,
    contextLength: workspace?.default_context_length,
    includeProfileContext: workspace?.include_profile_context,
    includeWorkspaceInstructions:
      workspace?.include_workspace_instructions,
    embeddingsProvider: workspace?.embeddings_provider
  })

  // Actualizar estados cuando cambie el workspace
  useEffect(() => {
    if (workspace) {
      setName(workspace.name || "")
      setDescription(workspace.description || "")
      setInstructions(workspace.instructions || "")
      setDefaultChatSettings({
        model: workspace.default_model,
        prompt: workspace.default_prompt,
        temperature: workspace.default_temperature,
        contextLength: workspace.default_context_length,
        includeProfileContext: workspace.include_profile_context,
        includeWorkspaceInstructions: workspace.include_workspace_instructions,
        embeddingsProvider: workspace.embeddings_provider
      })
    }
  }, [workspace])

  useEffect(() => {
    const workspaceImage =
      workspaceImages.find(
        image => image.path === workspace?.image_path
      )?.base64 || ""

    setImageLink(workspaceImage)
  }, [workspaceImages, workspace])

  const handleSave = async () => {
    if (!workspace) return

    try {
      let imagePath = ""

      if (selectedImage) {
        imagePath = await uploadWorkspaceImage(workspace, selectedImage)

        const url = (await getWorkspaceImageFromStorage(imagePath)) || ""

        if (url) {
          const response = await fetch(url)
          const blob = await response.blob()
          const base64 = await convertBlobToBase64(blob)

          setWorkspaceImages(prev => [
            ...prev,
            {
              workspaceId: workspace.id,
              path: imagePath,
              base64,
              url
            }
          ])
        }
      }

      const updatedWorkspace = await updateWorkspace(workspace.id, {
        ...workspace,
        name,
        description,
        image_path: imagePath,
        instructions,
        default_model: defaultChatSettings.model,
        default_prompt: defaultChatSettings.prompt,
        default_temperature: defaultChatSettings.temperature,
        default_context_length: defaultChatSettings.contextLength,
        embeddings_provider: defaultChatSettings.embeddingsProvider,
        include_profile_context: defaultChatSettings.includeProfileContext,
        include_workspace_instructions:
          defaultChatSettings.includeWorkspaceInstructions
      })

    // Solo actualizar chat settings si es el workspace seleccionado
    if (
      workspace.id === selectedWorkspace?.id &&
      defaultChatSettings.model &&
      defaultChatSettings.prompt &&
      defaultChatSettings.temperature &&
      defaultChatSettings.contextLength &&
      defaultChatSettings.includeProfileContext &&
      defaultChatSettings.includeWorkspaceInstructions &&
      defaultChatSettings.embeddingsProvider
    ) {
      setChatSettings({
        model: defaultChatSettings.model as LLMID,
        prompt: defaultChatSettings.prompt,
        temperature: defaultChatSettings.temperature,
        contextLength: defaultChatSettings.contextLength,
        includeProfileContext: defaultChatSettings.includeProfileContext,
        includeWorkspaceInstructions:
          defaultChatSettings.includeWorkspaceInstructions,
        embeddingsProvider: defaultChatSettings.embeddingsProvider as
          | "openai"
          | "local"
      })
    }

      setIsOpen(false)
      
      // Si es el workspace seleccionado, actualizarlo
      if (workspace.id === selectedWorkspace?.id) {
        setSelectedWorkspace(updatedWorkspace)
      }
      
      setWorkspaces(workspaces => {
        return workspaces.map(w => {
          if (w.id === workspace.id) {
            return updatedWorkspace
          }
          return w
        })
      })

      toast.success("Espacio de trabajo actualizado!")
    } catch (error: any) {
      console.error("Error updating workspace:", error)
      toast.error(error.message || "Error al actualizar el espacio de trabajo")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      buttonRef.current?.click()
    }
  }

  // Si se pasa un workspace prop pero no hay selectedWorkspace, usar el prop
  const workspaceToUse = workspaceProp || selectedWorkspace

  if (!workspaceToUse || !profile) return null

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <div 
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(true)
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          className="inline-block cursor-pointer"
        >
          {trigger}
        </div>
      ) : (
        <SheetTrigger asChild>
          <WithTooltip
            delayDuration={50}
            display={<div>Configuración del Espacio</div>}
            trigger={
              <IconSettings
                className="ml-3 cursor-pointer pr-[5px] hover:opacity-50"
                size={32}
              />
            }
          />
        </SheetTrigger>
      )}

      <SheetContent
        className="flex flex-col justify-between bg-gradient-to-br from-background via-background to-primary/5"
        side="left"
        onKeyDown={handleKeyDown}
      >
        <div className="grow overflow-auto">
          <SheetHeader className="border-b border-border/50 pb-4 mb-4">
            <SheetTitle className="flex items-center justify-between text-xl font-semibold">
              <span className="flex items-center gap-2">
                Configuración del Espacio
                {workspaceToUse?.is_home && <IconHome className="text-primary" size={20} />}
              </span>
            </SheetTitle>

            {workspaceToUse?.is_home && (
              <div className="text-sm text-muted-foreground mt-2">
                Este es tu espacio personal de trabajo.
              </div>
            )}
          </SheetHeader>

          <Tabs defaultValue="main" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-lg p-1">
              <TabsTrigger 
                value="main"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Principal
              </TabsTrigger>
              <TabsTrigger 
                value="defaults"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Predeterminados
              </TabsTrigger>
            </TabsList>

            <TabsContent className="mt-6 space-y-6" value="main">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Nombre del Espacio</Label>
                  <Input
                    placeholder="Nombre..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="rounded-lg border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Imagen del Espacio</Label>
                  <div className="rounded-lg border border-border/60 p-4 bg-muted/30">
                    <ImagePicker
                      src={imageLink}
                      image={selectedImage}
                      onSrcChange={setImageLink}
                      onImageChange={setSelectedImage}
                      width={50}
                      height={50}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-border/50">
                <Label className="text-sm font-medium">
                  ¿Cómo te gustaría que el asistente responda en este espacio?
                </Label>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <TextareaAutosize
                    placeholder="Instrucciones... (opcional)"
                    value={instructions}
                    onValueChange={setInstructions}
                    minRows={5}
                    maxRows={10}
                    maxLength={1500}
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm"
                  />
                  <LimitDisplay
                    used={instructions.length}
                    limit={WORKSPACE_INSTRUCTIONS_MAX}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent className="mt-6" value="defaults">
              <div className="mb-6 text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 border border-border/50">
                Esta es la configuración con la que inicia tu espacio cuando es seleccionado.
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <ChatSettingsForm
                  chatSettings={defaultChatSettings as any}
                  onChangeChatSettings={setDefaultChatSettings}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center">
          <div>
            {!workspaceToUse.is_home && (
              <DeleteWorkspace
                workspace={workspaceToUse}
                onDelete={() => setIsOpen(false)}
              />
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setIsOpen(false)}
              className="rounded-lg hover:bg-muted/50 transition-colors"
            >
              Cancelar
            </Button>

            <Button 
              ref={buttonRef} 
              onClick={handleSave}
              className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all"
            >
              Guardar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
