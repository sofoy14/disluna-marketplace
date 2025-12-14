import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { ALIContext } from "@/context/context"
import { Tables } from "@/supabase/types"
import { FC, useContext, useRef, useState } from "react"
import { Input } from "../ui/input"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconCopy, IconCheck, IconAlertTriangle } from "@tabler/icons-react"
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard"
import { cn } from "@/lib/utils"

interface DeleteWorkspaceProps {
  workspace: Tables<"workspaces">
  onDelete: () => void
}

export const DeleteWorkspace: FC<DeleteWorkspaceProps> = ({
  workspace,
  onDelete
}) => {
  const { setWorkspaces, setSelectedWorkspace, selectedWorkspace } = useContext(ALIContext)
  const { handleNewChat } = useChatHandler()
  const router = useRouter()
  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false)

  const [name, setName] = useState("")

  const handleDeleteWorkspace = async () => {
    try {
      const response = await fetch(`/api/workspace/${workspace.id}/delete`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al eliminar workspace")
      }

      setWorkspaces(prevWorkspaces => {
        const filteredWorkspaces = prevWorkspaces.filter(
          w => w.id !== workspace.id
        )

        const defaultWorkspace = filteredWorkspaces[0]

        if (defaultWorkspace) {
          setSelectedWorkspace(defaultWorkspace)
          router.push(`/${defaultWorkspace.id}/chat`)
        }

        return filteredWorkspaces
      })

      setShowWorkspaceDialog(false)
      onDelete()
      toast.success("Workspace eliminado exitosamente")

      if (selectedWorkspace?.id === workspace.id) {
        handleNewChat()
      }
    } catch (error: any) {
      console.error("Error deleting workspace:", error)
      toast.error(error.message || "Error al eliminar workspace")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  const handleCopyName = () => {
    copyToClipboard(workspace.name)
    toast.success("Nombre copiado al portapapeles")
  }

  return (
    <Dialog open={showWorkspaceDialog} onOpenChange={setShowWorkspaceDialog}>
      <DialogTrigger asChild>
        <Button 
          variant="destructive"
          className="rounded-lg hover:bg-destructive/90 transition-colors"
        >
          Eliminar
        </Button>
      </DialogTrigger>

      <DialogContent 
        onKeyDown={handleKeyDown}
        className="sm:rounded-lg border-border/60 bg-gradient-to-br from-background via-background to-destructive/5"
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
              <IconAlertTriangle className="text-destructive" size={20} />
            </div>
            <DialogTitle className="text-xl font-semibold">
              Eliminar {workspace.name}
            </DialogTitle>
          </div>

          <DialogDescription className="text-sm text-muted-foreground space-y-2 pt-2">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="font-medium text-destructive">
                ⚠️ ADVERTENCIA
              </p>
              <p className="mt-1">
                Eliminar un espacio de trabajo eliminará permanentemente todos sus datos, 
                conversaciones y configuraciones. Esta acción no se puede deshacer.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Para confirmar, escribe el nombre del espacio de trabajo:
            </label>
            <div className="relative">
              <Input
                className="rounded-lg border-border/60 focus:border-destructive/50 focus:ring-destructive/20 transition-all pr-10"
                placeholder="Escribe el nombre aquí..."
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md hover:bg-muted/50"
                onClick={handleCopyName}
                title="Copiar nombre del espacio de trabajo"
              >
                {isCopied ? (
                  <IconCheck className="h-4 w-4 text-emerald-500" />
                ) : (
                  <IconCopy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span>Nombre del espacio:</span>
              <span className="font-mono font-medium text-foreground">{workspace.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-xs hover:bg-muted/50 rounded-md"
                onClick={handleCopyName}
              >
                {isCopied ? (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <IconCheck size={12} />
                    Copiado
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <IconCopy size={12} />
                    Copiar
                  </span>
                )}
              </Button>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={() => setShowWorkspaceDialog(false)}
            className="rounded-lg hover:bg-muted/50 transition-colors"
          >
            Cancelar
          </Button>

          <Button
            ref={buttonRef}
            variant="destructive"
            onClick={handleDeleteWorkspace}
            disabled={name !== workspace.name}
            className={cn(
              "rounded-lg transition-all shadow-sm",
              name === workspace.name 
                ? "hover:bg-destructive/90 hover:shadow-md" 
                : "opacity-50 cursor-not-allowed"
            )}
          >
            Eliminar permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
