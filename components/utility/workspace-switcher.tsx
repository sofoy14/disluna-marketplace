"use client"

import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { ALIContext } from "@/context/context"
import { createWorkspaceWithPlanCheck } from "@/db/workspaces"
import useHotkey from "@/lib/hooks/use-hotkey"
import { useProfilePlan } from "@/lib/hooks/use-profile-plan"
import { IconBuilding, IconHome, IconPlus, IconSettings, IconLock, IconEdit } from "@tabler/icons-react"
import { ChevronsUpDown } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { FC, useContext, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { WithTooltip } from "../ui/with-tooltip"
import { toast } from "sonner"

interface WorkspaceSwitcherProps {
  showSettingsButton?: boolean
}

export const WorkspaceSwitcher: FC<WorkspaceSwitcherProps> = ({
  showSettingsButton = true
}) => {
  useHotkey(";", () => setOpen(prevState => !prevState))

  const {
    workspaces,
    workspaceImages,
    selectedWorkspace,
    setSelectedWorkspace,
    setWorkspaces
  } = useContext(ALIContext)

  const { handleNewChat } = useChatHandler()

  // Plan access control for workspaces - simplified using profile
  const { canShowWorkspaceSwitcher } = useProfilePlan()

  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!selectedWorkspace) return

    setValue(selectedWorkspace.id)
  }, [selectedWorkspace])

  const handleCreateWorkspace = async () => {
    if (!selectedWorkspace) return

    // Check if user can create more workspaces
    if (!canShowWorkspaceSwitcher) {
      // Student plan - cannot create additional workspaces
      return
    }

    try {
      const result = await createWorkspaceWithPlanCheck({
        user_id: selectedWorkspace.user_id,
        default_context_length: selectedWorkspace.default_context_length,
        default_model: selectedWorkspace.default_model,
        default_prompt: selectedWorkspace.default_prompt,
        default_temperature: selectedWorkspace.default_temperature,
        description: "",
        embeddings_provider: "openrouter",
        include_profile_context: selectedWorkspace.include_profile_context,
        include_workspace_instructions:
          selectedWorkspace.include_workspace_instructions,
        instructions: selectedWorkspace.instructions,
        is_home: false,
        name: "Nuevo Espacio de Trabajo"
      })

      if (result.success && result.workspace) {
        setWorkspaces([...workspaces, result.workspace])
        setSelectedWorkspace(result.workspace)
        setOpen(false)

        toast.success(`Espacio "${result.workspace.name}" creado exitosamente`)
        return router.push(`/${result.workspace.id}/settings`)
      } else if (result.needsUpgrade) {
        toast.error("Límite alcanzado", {
          description: "Actualiza tu plan para crear más workspaces"
        })
      } else {
        toast.error(result.error || "Error al crear el espacio de trabajo")
      }
    } catch (error: any) {
      console.error("Error creating workspace:", error)
      toast.error(error.message || "Error al crear el espacio de trabajo")
    }
  }

  const getWorkspaceName = (workspaceId: string) => {
    const workspace = workspaces.find(workspace => workspace.id === workspaceId)

    if (!workspace) return

    return workspace.name
  }

  const handleSelect = (workspaceId: string) => {
    const workspace = workspaces.find(workspace => workspace.id === workspaceId)

    if (!workspace) return

    setSelectedWorkspace(workspace)
    setOpen(false)

    return router.push(`/${workspace.id}/chat`)
  }

  const workspaceImage = useMemo(
    () =>
      workspaceImages.find(image => image.workspaceId === selectedWorkspace?.id),
    [workspaceImages, selectedWorkspace?.id]
  )
  const imageSrc = workspaceImage ? workspaceImage.url : ""

  const IconComponent = selectedWorkspace?.is_home ? IconHome : IconBuilding

  // Variantes de animación para los items de workspace
  const workspaceItemVariants = {
    hidden: { opacity: 0, x: -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring' as const, stiffness: 400, damping: 30 }
    }
  }

  // Componente para renderizar cada workspace item
  const WorkspaceItem = ({
    workspace,
    index
  }: {
    workspace: typeof workspaces[0],
    index: number
  }) => {
    const [showActions, setShowActions] = useState(false)
    const isActive = selectedWorkspace?.id === workspace.id
    const image = workspaceImages.find(
      image => image.workspaceId === workspace.id
    )
    const IconComponent = workspace.is_home ? IconHome : IconBuilding

    return (
      <motion.div
        variants={workspaceItemVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: index * 0.05 }}
        whileHover={{
          scale: 1.01,
          transition: { type: 'spring', stiffness: 400, damping: 25 }
        }}
        whileTap={{ scale: 0.99 }}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200",
          "border border-transparent",
          isActive
            ? "bg-primary/10 border-primary/20 shadow-sm shadow-primary/5"
            : "hover:bg-foreground/5 hover:border-border/50"
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={() => handleSelect(workspace.id)}
      >
        {/* Indicador activo */}
        {isActive && (
          <motion.div
            layoutId="workspaceActiveIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}

        {/* Icono/Imagen del workspace */}
        {image ? (
          <div className="relative flex-shrink-0">
            <Image
              className="rounded-lg object-cover"
              src={image.url || ""}
              alt={workspace.name}
              width={40}
              height={40}
            />
          </div>
        ) : (
          <div className={cn(
            "relative flex-shrink-0 rounded-lg p-1.5 transition-colors duration-200",
            isActive
              ? "bg-primary/15"
              : "bg-foreground/5 group-hover:bg-foreground/10"
          )}>
            <IconComponent
              className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
        )}

        {/* Nombre del workspace */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate transition-colors",
            isActive ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
          )}>
            {workspace.name}
          </p>
        </div>

        {/* Botón de edición */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showActions || isActive ? 1 : 0 }}
          className="flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-foreground/10"
            type="button"
            title="Configuración"
            onClick={() => router.push(`/${workspace.id}/settings`)}
          >
            <IconSettings size={14} />
          </Button>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "border-input flex h-[36px] w-full cursor-pointer items-center justify-between",
          "rounded-md border border-border bg-background/50 px-2 py-1",
          "hover:bg-accent hover:text-accent-foreground",
          "transition-colors duration-200"
        )}
      >
        <div className="flex items-center truncate">
          {selectedWorkspace && (
            <div className="flex items-center">
              {workspaceImage ? (
                <Image
                  style={{ width: "22px", height: "22px" }}
                  className="mr-2 rounded"
                  src={imageSrc}
                  width={22}
                  height={22}
                  alt={selectedWorkspace.name}
                />
              ) : (
                <IconComponent className="mb-0.5 mr-2" size={22} />
              )}
            </div>
          )}

          {getWorkspaceName(value) || "Seleccionar espacio..."}
        </div>

        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>

      <PopoverContent className="p-2 w-[320px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {canShowWorkspaceSwitcher ? (
              <Button
                className="flex items-center space-x-2"
                size="sm"
                onClick={handleCreateWorkspace}
              >
                <IconPlus size={16} />
                <span>Nuevo espacio</span>
              </Button>
            ) : (
              <WithTooltip
                display={
                  <div className="max-w-xs">
                    <p className="font-medium">Función exclusiva del Plan Profesional</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Actualiza tu plan para crear múltiples espacios de trabajo
                    </p>
                  </div>
                }
                trigger={
                  <Button
                    className="flex items-center space-x-2 opacity-60 cursor-not-allowed"
                    size="sm"
                    variant="outline"
                    disabled
                  >
                    <IconLock size={16} />
                    <span>Nuevo espacio</span>
                  </Button>
                }
              />
            )}

            {showSettingsButton && selectedWorkspace && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  setOpen(false)
                  router.push(`/${selectedWorkspace.id}/settings`)
                }}
              >
                <IconSettings size={18} />
              </Button>
            )}
          </div>

          <Input
            placeholder="Buscar espacios..."
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9"
          />

          <div className="flex flex-col space-y-1 max-h-[400px] overflow-y-auto">
            <AnimatePresence>
              {workspaces
                .filter(workspace => workspace.is_home)
                .map((workspace, index) => (
                  <WorkspaceItem
                    key={workspace.id}
                    workspace={workspace}
                    index={index}
                  />
                ))}

              {workspaces
                .filter(
                  workspace =>
                    !workspace.is_home &&
                    workspace.name.toLowerCase().includes(search.toLowerCase())
                )
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((workspace, index) => (
                  <WorkspaceItem
                    key={workspace.id}
                    workspace={workspace}
                    index={workspaces.filter(w => w.is_home).length + index}
                  />
                ))}
            </AnimatePresence>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
