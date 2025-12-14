"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { toast } from "sonner"
import { IconLoader2, IconTrash, IconSend, IconX, IconHome } from "@tabler/icons-react"
import ImagePicker from "@/components/ui/image-picker"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"
import { LimitDisplay } from "@/components/ui/limit-display"
import { WORKSPACE_INSTRUCTIONS_MAX, WORKSPACE_DESCRIPTION_MAX } from "@/db/limits"
import { getWorkspaceImageFromStorage, uploadWorkspaceImage } from "@/db/storage/workspace-images"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import { WithTooltip } from "@/components/ui/with-tooltip"

// Types
type WorkspaceRole = 'ADMIN' | 'LAWYER' | 'ASSISTANT' | 'VIEWER'
type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'

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

interface AuditLog {
  id: string
  action_type: string
  resource_type: string
  details: Record<string, any>
  created_at: string
  actor?: {
    id: string
    email: string
  }
}

// Presets para instrucciones del asistente
const ASSISTANT_PRESETS = [
  {
    label: "Formal",
    text: "Responde de manera formal y profesional, usando lenguaje jurídico apropiado."
  },
  {
    label: "Con citas",
    text: "Incluye citas y referencias legales cuando sea relevante para respaldar tus respuestas."
  },
  {
    label: "Resumen al final",
    text: "Proporciona un resumen ejecutivo al final de cada respuesta extensa."
  },
  {
    label: "Preguntar antes de asumir",
    text: "Si hay ambigüedad en la consulta, pregunta al usuario antes de hacer suposiciones."
  }
]

export default function WorkspaceSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceid as string

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [workspace, setWorkspace] = useState<any>(null)

  // General tab
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imageLink, setImageLink] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  // Assistant tab
  const [instructions, setInstructions] = useState("")
  const [savingInstructions, setSavingInstructions] = useState(false)

  // Members tab
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Invitations tab
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("VIEWER")
  const [sendingInvite, setSendingInvite] = useState(false)

  // Audit tab
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loadingAudit, setLoadingAudit] = useState(false)

  useEffect(() => {
    checkAccessAndLoad()
  }, [workspaceId])

  const checkAccessAndLoad = async () => {
    try {
      setLoading(true)

      // Get current user and workspace
      const settingsResponse = await fetch(`/api/workspace/${workspaceId}/settings`)
      if (!settingsResponse.ok) {
        if (settingsResponse.status === 401 || settingsResponse.status === 403) {
          toast.error("No tienes permisos para acceder a esta configuración")
          router.push(`/${workspaceId}/chat`)
          return
        }
        throw new Error("Error al verificar acceso")
      }

      const settingsData = await settingsResponse.json()
      const workspaceData = settingsData.workspace

      if (!workspaceData) {
        throw new Error("Workspace no encontrado")
      }

      setWorkspace(workspaceData)
      setName(workspaceData.name || "")
      setDescription(workspaceData.description || "")
      setInstructions(workspaceData.instructions || "")

      // Check if user is admin
      const adminCheckResponse = await fetch(`/api/workspace/${workspaceId}/admin-check`)
      if (adminCheckResponse.ok) {
        const adminData = await adminCheckResponse.json()
        setIsAdmin(adminData.isAdmin || false)
      }

      // Load workspace image if exists
      if (workspaceData.image_path) {
        try {
          const imageUrl = await getWorkspaceImageFromStorage(workspaceData.image_path)
          if (imageUrl) {
            setImageLink(imageUrl)
          }
        } catch (error) {
          console.error("Error loading workspace image:", error)
        }
      }
    } catch (error: any) {
      console.error("Error loading settings:", error)
      toast.error(error.message || "Error al cargar configuración")
      router.push(`/${workspaceId}/chat`)
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    try {
      setLoadingMembers(true)
      const response = await fetch(`/api/workspace/${workspaceId}/members`)
      if (!response.ok) throw new Error("Error al cargar miembros")
      const data = await response.json()
      setMembers(data.members || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoadingMembers(false)
    }
  }

  const loadInvitations = async () => {
    try {
      setLoadingInvitations(true)
      const response = await fetch(`/api/workspace/${workspaceId}/invitations`)
      if (!response.ok) throw new Error("Error al cargar invitaciones")
      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoadingInvitations(false)
    }
  }

  const loadAuditLogs = async () => {
    try {
      setLoadingAudit(true)
      const response = await fetch(`/api/workspace/${workspaceId}/audit-logs?limit=50`)
      if (!response.ok) throw new Error("Error al cargar auditoría")
      const data = await response.json()
      setAuditLogs(data.logs || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoadingAudit(false)
    }
  }

  const handleSaveGeneral = async () => {
    try {
      setSaving(true)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/[locale]/[workspaceid]/settings/page.tsx:227',message:'handleSaveGeneral entry',data:{workspaceId,name,description,hasSelectedImage:!!selectedImage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      let imagePath: string | undefined = undefined
      
      // Upload image if selected
      if (selectedImage && workspace) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/[locale]/[workspaceid]/settings/page.tsx:234',message:'Before uploadWorkspaceImage',data:{workspaceId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        imagePath = await uploadWorkspaceImage(workspace, selectedImage)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/[locale]/[workspaceid]/settings/page.tsx:236',message:'After uploadWorkspaceImage',data:{workspaceId,imagePath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      } else if (workspace?.image_path) {
        // Keep existing image path if no new image selected
        imagePath = workspace.image_path
      }

      const updatePayload: any = { 
        name, 
        description
      }
      
      // Only include image_path if it's defined
      if (imagePath !== undefined) {
        updatePayload.image_path = imagePath
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/[locale]/[workspaceid]/settings/page.tsx:250',message:'Before fetch PATCH',data:{workspaceId,updatePayload},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const response = await fetch(`/api/workspace/${workspaceId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/[locale]/[workspaceid]/settings/page.tsx:257',message:'After fetch PATCH',data:{workspaceId,status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        const error = await response.json()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/[locale]/[workspaceid]/settings/page.tsx:262',message:'PATCH response error',data:{workspaceId,status:response.status,error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        throw new Error(error.error || "Error al guardar")
      }

      const data = await response.json()
      setWorkspace(data.workspace)
      
      // Update image link if uploaded
      if (imagePath && imagePath !== workspace?.image_path && imagePath !== "") {
        const imageUrl = await getWorkspaceImageFromStorage(imagePath)
        if (imageUrl) {
          setImageLink(imageUrl)
        }
      }
      
      setSelectedImage(null)
      toast.success("Configuración guardada exitosamente")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveInstructions = async () => {
    try {
      setSavingInstructions(true)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/[locale]/[workspaceid]/settings/page.tsx:273',message:'handleSaveInstructions entry',data:{workspaceId,instructionsLength:instructions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const response = await fetch(`/api/workspace/${workspaceId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions })
      })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/[locale]/[workspaceid]/settings/page.tsx:280',message:'After fetch PATCH instructions',data:{workspaceId,status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        const error = await response.json()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b658f2bd-0f91-497b-b1d0-7a2ee8de0eea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/[locale]/[workspaceid]/settings/page.tsx:285',message:'PATCH instructions response error',data:{workspaceId,status:response.status,error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        throw new Error(error.error || "Error al guardar")
      }

      const data = await response.json()
      setWorkspace(data.workspace)
      toast.success("Instrucciones guardadas exitosamente")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingInstructions(false)
    }
  }

  const handlePresetClick = (presetText: string) => {
    if (instructions.trim()) {
      setInstructions(prev => prev ? `${prev}\n\n${presetText}` : presetText)
    } else {
      setInstructions(presetText)
    }
  }

  const handleUpdateMemberRole = async (userId: string, newRole: WorkspaceRole) => {
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al actualizar rol")
      }

      toast.success("Rol actualizado exitosamente")
      await loadMembers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("¿Estás seguro de que deseas remover este miembro?")) {
      return
    }

    try {
      const response = await fetch(`/api/workspace/${workspaceId}/members?userId=${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al remover miembro")
      }

      toast.success("Miembro removido exitosamente")
      await loadMembers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleSendInvitation = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast.error("Email inválido")
      return
    }

    try {
      setSendingInvite(true)
      const response = await fetch(`/api/workspace/${workspaceId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al enviar invitación")
      }

      toast.success("Invitación enviada exitosamente")
      setInviteEmail("")
      setInviteRole("VIEWER")
      await loadInvitations()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSendingInvite(false)
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/invitations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, action: 'revoke' })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al revocar invitación")
      }

      toast.success("Invitación revocada")
      await loadInvitations()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/invitations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, action: 'resend' })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al reenviar invitación")
      }

      toast.success("Invitación reenviada")
      await loadInvitations()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <IconLoader2 className="animate-spin" size={32} />
      </div>
    )
  }

  if (!workspace) {
    return null
  }

  const isPersonal = workspace.is_home
  const showAdminTabs = isAdmin

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Configuración del Espacio</h1>
          {isPersonal && <IconHome className="text-primary" size={24} />}
        </div>
        <p className="text-muted-foreground mt-2">
          {isPersonal 
            ? "Espacio personal. Solo tú tienes acceso."
            : "Workspace compartido. Cambios visibles para miembros."}
        </p>
      </div>

      <Tabs defaultValue={showAdminTabs ? "general" : "assistant"} className="w-full">
        <TabsList className={showAdminTabs ? "grid w-full grid-cols-5" : "grid w-full grid-cols-1"}>
          {showAdminTabs && (
            <>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="members">Miembros</TabsTrigger>
              <TabsTrigger value="invitations">Invitaciones</TabsTrigger>
              <TabsTrigger value="audit">Auditoría</TabsTrigger>
            </>
          )}
          <TabsTrigger value="assistant">Asistente</TabsTrigger>
        </TabsList>

        {/* General Tab - Solo ADMIN */}
        {showAdminTabs && (
          <TabsContent value="general" className="mt-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Workspace</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre del workspace"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <TextareaAutosize
                  value={description}
                  onValueChange={setDescription}
                  placeholder="Descripción del workspace (opcional)"
                  minRows={3}
                  maxRows={6}
                  maxLength={WORKSPACE_DESCRIPTION_MAX}
                />
                {description.length > 0 && (
                  <LimitDisplay
                    used={description.length}
                    limit={WORKSPACE_DESCRIPTION_MAX}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Imagen/Avatar del Workspace</Label>
                <div className="rounded-lg border border-border/60 p-4 bg-muted/30">
                  <ImagePicker
                    src={imageLink}
                    image={selectedImage}
                    onSrcChange={setImageLink}
                    onImageChange={setSelectedImage}
                    width={80}
                    height={80}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSaveGeneral} disabled={saving}>
                {saving ? (
                  <>
                    <IconLoader2 className="animate-spin mr-2" size={16} />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
              <WithTooltip
                display={<div>Funcionalidad próximamente disponible</div>}
                trigger={
                  <Button variant="outline" disabled>
                    Eliminar workspace
                  </Button>
                }
              />
            </div>
          </TabsContent>
        )}

        {/* Members Tab - Solo ADMIN */}
        {showAdminTabs && (
          <TabsContent value="members" className="mt-6">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <IconLoader2 className="animate-spin" size={24} />
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          {member.user?.email?.split('@')[0] || 'Usuario'}
                        </TableCell>
                        <TableCell>{member.user?.email || 'N/A'}</TableCell>
                        <TableCell>
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              handleUpdateMemberRole(member.user_id, value as WorkspaceRole)
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="LAWYER">Abogado</SelectItem>
                              <SelectItem value="ASSISTANT">Asistente</SelectItem>
                              <SelectItem value="VIEWER">Visualizador</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.user_id)}
                          >
                            <IconTrash size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}

        {/* Invitations Tab - Solo ADMIN */}
        {showAdminTabs && (
          <TabsContent value="invitations" className="mt-6 space-y-6">
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Invitar miembro</h3>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as WorkspaceRole)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">Visualizador</SelectItem>
                    <SelectItem value="ASSISTANT">Asistente</SelectItem>
                    <SelectItem value="LAWYER">Abogado</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSendInvitation} disabled={sendingInvite}>
                  {sendingInvite ? (
                    <IconLoader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      <IconSend size={16} className="mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {loadingInvitations ? (
              <div className="flex items-center justify-center py-8">
                <IconLoader2 className="animate-spin" size={24} />
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold">Invitaciones pendientes</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No hay invitaciones
                        </TableCell>
                      </TableRow>
                    ) : (
                      invitations.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell>{invitation.email}</TableCell>
                          <TableCell>{invitation.role}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                invitation.status === 'PENDING'
                                  ? 'bg-yellow-500/20 text-yellow-600'
                                  : invitation.status === 'ACCEPTED'
                                  ? 'bg-green-500/20 text-green-600'
                                  : 'bg-gray-500/20 text-gray-600'
                              }`}
                            >
                              {invitation.status === 'PENDING' ? 'Pendiente' :
                               invitation.status === 'ACCEPTED' ? 'Aceptada' :
                               invitation.status === 'EXPIRED' ? 'Expirada' : 'Revocada'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(invitation.expires_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {(invitation.status === 'PENDING' || invitation.status === 'EXPIRED') && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleResendInvitation(invitation.id)}
                                  >
                                    <IconSend size={16} />
                                  </Button>
                                  {invitation.status === 'PENDING' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRevokeInvitation(invitation.id)}
                                    >
                                      <IconX size={16} />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}

        {/* Audit Tab - Solo ADMIN */}
        {showAdminTabs && (
          <TabsContent value="audit" className="mt-6">
            {loadingAudit ? (
              <div className="flex items-center justify-center py-8">
                <IconLoader2 className="animate-spin" size={24} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No hay registros de auditoría
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{log.actor?.email || 'Sistema'}</TableCell>
                        <TableCell>{log.action_type}</TableCell>
                        <TableCell>
                          <pre className="text-xs max-w-md overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        )}

        {/* Assistant Tab - Visible para todos */}
        <TabsContent value="assistant" className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>
              ¿Cómo te gustaría que el asistente responda en este workspace?
            </Label>
            <p className="text-sm text-muted-foreground">
              Se aplica a los chats de este workspace.
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
              <TextareaAutosize
                value={instructions}
                onValueChange={setInstructions}
                placeholder="Instrucciones para el asistente... (opcional)"
                minRows={5}
                maxRows={10}
                maxLength={WORKSPACE_INSTRUCTIONS_MAX}
                className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm"
              />
              {(instructions.length > 0 || instructions.length > WORKSPACE_INSTRUCTIONS_MAX * 0.9) && (
                <LimitDisplay
                  used={instructions.length}
                  limit={WORKSPACE_INSTRUCTIONS_MAX}
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Presets rápidos</Label>
            <div className="flex flex-wrap gap-2">
              {ASSISTANT_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(preset.text)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSaveInstructions} disabled={savingInstructions}>
              {savingInstructions ? (
                <>
                  <IconLoader2 className="animate-spin mr-2" size={16} />
                  Guardando...
                </>
              ) : (
                "Guardar instrucciones"
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
