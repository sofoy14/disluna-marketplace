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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../ui/table"
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

type WorkspaceRole = "ADMIN" | "LAWYER" | "ASSISTANT" | "VIEWER"
type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"

interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  created_at: string
  user?: {
    id: string
    email: string
  }
}

interface WorkspaceInvitation {
  id: string
  workspace_id: string
  email: string
  role: WorkspaceRole
  status: InvitationStatus
  created_at: string
  expires_at: string
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

  const [canManageWorkspace, setCanManageWorkspace] = useState(false)
  const [loadingAccess, setLoadingAccess] = useState(false)

  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("VIEWER")
  const [inviteLinkLabel, setInviteLinkLabel] = useState("")
  const [sendingInvite, setSendingInvite] = useState(false)
  const [creatingInviteLink, setCreatingInviteLink] = useState(false)

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

  const copyToClipboard = async (value: string) => {
    if (typeof navigator === "undefined") return false

    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      try {
        const el = document.createElement("textarea")
        el.value = value
        el.setAttribute("readonly", "true")
        el.style.position = "absolute"
        el.style.left = "-9999px"
        document.body.appendChild(el)
        el.select()
        document.execCommand("copy")
        document.body.removeChild(el)
        return true
      } catch {
        return false
      }
    }
  }

  const loadMembers = async (workspaceId: string) => {
    try {
      setLoadingMembers(true)
      const res = await fetch(`/api/workspace/${workspaceId}/members`)
      if (!res.ok) {
        throw new Error("No se pudieron cargar los miembros")
      }
      const data = (await res.json()) as { members?: WorkspaceMember[] }
      setMembers(data.members || [])
    } finally {
      setLoadingMembers(false)
    }
  }

  const loadInvitations = async (workspaceId: string) => {
    try {
      setLoadingInvitations(true)
      const res = await fetch(`/api/workspace/${workspaceId}/invitations`)
      if (!res.ok) {
        throw new Error("No se pudieron cargar las invitaciones")
      }
      const data = (await res.json()) as { invitations?: WorkspaceInvitation[] }
      setInvitations(data.invitations || [])
    } finally {
      setLoadingInvitations(false)
    }
  }

  const ensureAccessLoaded = async () => {
    const workspaceId = workspace?.id
    if (!workspaceId) return

    if (workspace?.is_home) {
      setCanManageWorkspace(true)
      setMembers([])
      setInvitations([])
      return
    }

    try {
      setLoadingAccess(true)

      const res = await fetch(`/api/workspace/${workspaceId}/members`)
      if (!res.ok) {
        setCanManageWorkspace(false)
        setMembers([])
        setInvitations([])
        return
      }

      setCanManageWorkspace(true)
      const data = (await res.json()) as { members?: WorkspaceMember[] }
      setMembers(data.members || [])

      await loadInvitations(workspaceId)
    } finally {
      setLoadingAccess(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    void ensureAccessLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workspace?.id])

  const handleUpdateMemberRole = async (userId: string, role: WorkspaceRole) => {
    if (!workspace) return

    try {
      const res = await fetch(`/api/workspace/${workspace.id}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role })
      })

      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error(data?.error || "Error al actualizar rol")
      }

      toast.success("Rol actualizado")
      await loadMembers(workspace.id)
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar rol")
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!workspace) return
    if (!confirm("Remover este miembro del workspace?")) return

    try {
      const res = await fetch(
        `/api/workspace/${workspace.id}/members?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      )

      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error(data?.error || "Error al remover miembro")
      }

      toast.success("Miembro removido")
      await loadMembers(workspace.id)
    } catch (error: any) {
      toast.error(error.message || "Error al remover miembro")
    }
  }

  const handleSendInvitation = async () => {
    if (!workspace) return
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Email invalido")
      return
    }

    try {
      setSendingInvite(true)
      const res = await fetch(`/api/workspace/${workspace.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      })

      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error(data?.error || "Error al enviar invitacion")
      }

      setInviteEmail("")
      toast.success("Invitacion creada")

      const token = data?.token as string | undefined
      if (token && typeof window !== "undefined") {
        const inviteUrl = `${window.location.origin}/invite/${token}`
        const copied = await copyToClipboard(inviteUrl)
        toast.success(copied ? "Enlace copiado" : "Invitacion lista")
      }

      await loadInvitations(workspace.id)
    } catch (error: any) {
      toast.error(error.message || "Error al enviar invitacion")
    } finally {
      setSendingInvite(false)
    }
  }

  const handleCreateInviteLink = async () => {
    if (!workspace) return

    try {
      setCreatingInviteLink(true)
      const res = await fetch(`/api/workspace/${workspace.id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "link",
          role: inviteRole,
          label: inviteLinkLabel.trim() || undefined
        })
      })

      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error(data?.error || "Error al crear enlace")
      }

      setInviteLinkLabel("")

      const token = data?.token as string | undefined
      if (!token) throw new Error("Invitacion creada sin token")

      const inviteUrl = `${window.location.origin}/invite/${token}`
      const copied = await copyToClipboard(inviteUrl)
      toast.success(copied ? "Enlace copiado" : "Enlace creado")

      await loadInvitations(workspace.id)
    } catch (error: any) {
      toast.error(error.message || "Error al crear enlace")
    } finally {
      setCreatingInviteLink(false)
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!workspace) return

    try {
      const res = await fetch(`/api/workspace/${workspace.id}/invitations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action: "revoke" })
      })

      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error(data?.error || "Error al revocar invitacion")
      }

      toast.success("Invitacion revocada")
      await loadInvitations(workspace.id)
    } catch (error: any) {
      toast.error(error.message || "Error al revocar invitacion")
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    if (!workspace) return

    try {
      const res = await fetch(`/api/workspace/${workspace.id}/invitations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action: "resend" })
      })

      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        throw new Error(data?.error || "Error al reenviar invitacion")
      }

      toast.success("Invitacion reenviada")

      const token = data?.token as string | undefined
      if (token && typeof window !== "undefined") {
        const inviteUrl = `${window.location.origin}/invite/${token}`
        const copied = await copyToClipboard(inviteUrl)
        toast.success(copied ? "Enlace copiado" : "Enlace generado")
      }

      await loadInvitations(workspace.id)
    } catch (error: any) {
      toast.error(error.message || "Error al reenviar invitacion")
    }
  }

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

  const showAccessTab = !workspaceToUse.is_home && canManageWorkspace

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
            <TabsList
              className={`grid w-full ${showAccessTab ? "grid-cols-3" : "grid-cols-2"} bg-muted/50 rounded-lg p-1`}
            >
              <TabsTrigger 
                value="main"
                className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Principal
              </TabsTrigger>

              {showAccessTab && (
                <TabsTrigger
                  value="access"
                  className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  Acceso
                </TabsTrigger>
              )}

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

            {showAccessTab && (
              <TabsContent className="mt-6 space-y-6" value="access">
                <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 border border-border/50">
                  Admin: gestiona miembros, roles e invitaciones del workspace.
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
                  <div className="text-sm font-medium text-foreground/90">Roles (referencia)</div>
                  <div>ADMIN: puede gestionar miembros e invitaciones.</div>
                  <div>LAWYER / ASSISTANT: acceso operativo al workspace.</div>
                  <div>VIEWER: acceso limitado (solo lectura, segun reglas del workspace).</div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">Invitaciones</div>
                    <Button variant="ghost" size="sm" onClick={() => void ensureAccessLoaded()}>
                      Actualizar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Rol</Label>
                    <Select value={inviteRole} onValueChange={v => setInviteRole(v as WorkspaceRole)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                        <SelectItem value="ASSISTANT">Assistant</SelectItem>
                        <SelectItem value="LAWYER">Lawyer</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Invitar por email</Label>
                      <div className="flex gap-2">
                        <Input
                          value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className="rounded-lg border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
                        />
                        <Button onClick={handleSendInvitation} disabled={sendingInvite}>
                          {sendingInvite ? "Enviando..." : "Invitar"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Enlace de invitacion</Label>
                      <div className="flex gap-2">
                        <Input
                          value={inviteLinkLabel}
                          onChange={e => setInviteLinkLabel(e.target.value)}
                          placeholder="Etiqueta (opcional)"
                          className="rounded-lg border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
                        />
                        <Button
                          variant="outline"
                          onClick={handleCreateInviteLink}
                          disabled={creatingInviteLink}
                        >
                          {creatingInviteLink ? "Creando..." : "Crear"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Miembros</div>
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    {loadingAccess || loadingMembers ? (
                      <div className="p-4 text-sm text-muted-foreground">Cargando miembros...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">
                                No hay miembros listados.
                              </TableCell>
                            </TableRow>
                          ) : (
                            members.map(member => (
                              <TableRow key={member.id}>
                                <TableCell className="font-mono text-xs">
                                  {member.user?.email || member.user_id}
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={member.role}
                                    onValueChange={v => handleUpdateMemberRole(member.user_id, v as WorkspaceRole)}
                                  >
                                    <SelectTrigger className="w-[180px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="VIEWER">Viewer</SelectItem>
                                      <SelectItem value="ASSISTANT">Assistant</SelectItem>
                                      <SelectItem value="LAWYER">Lawyer</SelectItem>
                                      <SelectItem value="ADMIN">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMember(member.user_id)}
                                  >
                                    Remover
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Invitaciones existentes</div>
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    {loadingAccess || loadingInvitations ? (
                      <div className="p-4 text-sm text-muted-foreground">Cargando invitaciones...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Contacto</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invitations.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No hay invitaciones.
                              </TableCell>
                            </TableRow>
                          ) : (
                            invitations.map(invite => (
                              <TableRow key={invite.id}>
                                <TableCell className="font-mono text-xs">
                                  {invite.email?.startsWith("link:")
                                    ? `link (${invite.email.slice("link:".length)})`
                                    : invite.email}
                                </TableCell>
                                <TableCell>{invite.role}</TableCell>
                                <TableCell>{invite.status}</TableCell>
                                <TableCell className="text-right">
                                  {invite.status === "PENDING" ? (
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => void handleResendInvitation(invite.id)}
                                      >
                                        Reenviar
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => void handleRevokeInvitation(invite.id)}
                                      >
                                        Revocar
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </TabsContent>
            )}

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
