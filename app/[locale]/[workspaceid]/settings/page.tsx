"use client"

import { useEffect, useState, useContext } from "react"
import { useParams, useRouter } from "next/navigation"
import { ALIContext } from "@/context/context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { IconLoader2, IconHome, IconAlertTriangle } from "@tabler/icons-react"
import ImagePicker from "@/components/ui/image-picker"
import { getWorkspaceImageFromStorage, uploadWorkspaceImage } from "@/db/storage/workspace-images"
import {
  MemberCard,
  InvitationCard,
  InviteSection,
  AccessSummary,
  LinkExpiration,
  LinkMaxUses
} from "@/components/workspace/workspace-members-ui"
import {
  AssistantPolicies,
  AssistantPoliciesState,
  instructionsToPolicies,
  policiesToInstructions
} from "@/components/workspace/assistant-policies"
import { DangerZone } from "@/components/workspace/danger-zone"
import { DeleteWorkspace } from "@/components/workspace/delete-workspace"

import { AnimatePresence } from "framer-motion"

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

export default function WorkspaceSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useContext(ALIContext)
  const workspaceId = params.workspaceid as string

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [workspace, setWorkspace] = useState<any>(null)

  // Profile tab
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [imageLink, setImageLink] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  // Members/Invitations
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("VIEWER")
  const [inviteLinkLabel, setInviteLinkLabel] = useState("")
  const [sendingInvite, setSendingInvite] = useState(false)
  const [creatingInviteLink, setCreatingInviteLink] = useState(false)
  const [linkExpiration, setLinkExpiration] = useState<LinkExpiration>("7")
  const [linkMaxUses, setLinkMaxUses] = useState<LinkMaxUses>("1")

  // Policies
  const [assistantPolicies, setAssistantPolicies] = useState<AssistantPoliciesState>({
    tone: "formal",
    citations: "when_applicable",
    askBeforeAssuming: true,
    includeSummary: true,
    additionalInstructions: ""
  })
  const [savingPolicies, setSavingPolicies] = useState(false)



  useEffect(() => {
    checkAccessAndLoad()
  }, [workspaceId])

  const checkAccessAndLoad = async () => {
    try {
      setLoading(true)

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
        throw new Error("Espacio no encontrado")
      }

      setWorkspace(workspaceData)
      setName(workspaceData.name || "")
      setDescription(workspaceData.description || "")
      setAssistantPolicies(instructionsToPolicies(workspaceData.instructions || ""))



      // Check if user is admin
      const adminCheckResponse = await fetch(`/api/workspace/${workspaceId}/admin-check`)
      if (adminCheckResponse.ok) {
        const adminData = await adminCheckResponse.json()
        setIsAdmin(adminData.isAdmin || false)
      }

      // Load workspace image
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

      // Load members and invitations if admin
      if (adminCheckResponse.ok) {
        loadMembers()
        loadInvitations()
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
      console.error("Error loading members:", error)
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
      console.error("Error loading invitations:", error)
    } finally {
      setLoadingInvitations(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)

      let imagePath: string | undefined = undefined

      if (selectedImage && workspace) {
        imagePath = await uploadWorkspaceImage(workspace, selectedImage)
      } else if (workspace?.image_path) {
        imagePath = workspace.image_path
      }

      const updatePayload: any = { name, description }
      if (imagePath !== undefined) {
        updatePayload.image_path = imagePath
      }

      const response = await fetch(`/api/workspace/${workspaceId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar")
      }

      const data = await response.json()
      setWorkspace(data.workspace)

      if (imagePath && imagePath !== workspace?.image_path) {
        const imageUrl = await getWorkspaceImageFromStorage(imagePath)
        if (imageUrl) {
          setImageLink(imageUrl)
        }
      }

      setSelectedImage(null)
      toast.success("Perfil guardado exitosamente")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSavePolicies = async () => {
    try {
      setSavingPolicies(true)

      const response = await fetch(`/api/workspace/${workspaceId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: JSON.stringify({
            instructions: policiesToInstructions(assistantPolicies)
          })
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar")
      }

      const data = await response.json()
      setWorkspace(data.workspace)
      toast.success("Políticas guardadas exitosamente")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingPolicies(false)
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

      toast.success("Rol actualizado")
      await loadMembers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("¿Estás seguro de que deseas remover este miembro?")) return

    try {
      const response = await fetch(`/api/workspace/${workspaceId}/members?userId=${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al remover miembro")
      }

      toast.success("Miembro removido")
      await loadMembers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      return false
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

      const data = await response.json()
      toast.success("Invitación enviada")
      setInviteEmail("")

      if (data.token) {
        const inviteUrl = `${window.location.origin}/invite/${data.token}`
        const copied = await copyToClipboard(inviteUrl)
        if (copied) toast.success("Enlace copiado")
      }

      await loadInvitations()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSendingInvite(false)
    }
  }

  const handleCreateInviteLink = async () => {
    try {
      setCreatingInviteLink(true)
      const response = await fetch(`/api/workspace/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "link",
          role: inviteRole,
          label: inviteLinkLabel || undefined,
          expirationDays: parseInt(linkExpiration),
          maxUses: linkMaxUses === "unlimited" ? null : parseInt(linkMaxUses)
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Error al crear enlace")
      }

      if (data.token) {
        const inviteUrl = `${window.location.origin}/invite/${data.token}`
        const copied = await copyToClipboard(inviteUrl)
        toast.success(copied ? "Enlace copiado" : "Enlace creado")
      }

      setInviteLinkLabel("")
      await loadInvitations()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCreatingInviteLink(false)
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
        throw new Error(error.error || "Error al revocar")
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

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Error al reenviar")
      }

      if (data.token) {
        const inviteUrl = `${window.location.origin}/invite/${data.token}`
        const copied = await copyToClipboard(inviteUrl)
        toast.success(copied ? "Enlace copiado" : "Invitación reenviada")
      } else {
        toast.success("Invitación reenviada")
      }

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
  const showAccessTab = isAdmin && !isPersonal
  const pendingInvitations = invitations.filter(i => i.status === "PENDING")

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Configuración del Espacio</h1>
          {isPersonal && <IconHome className="text-primary" size={24} />}
        </div>
        <p className="text-muted-foreground mt-2">
          {isPersonal
            ? "Espacio personal. Solo tú tienes acceso."
            : "Espacio compartido. Cambios visibles para miembros."}
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className={`grid w-full ${showAccessTab ? "grid-cols-3" : "grid-cols-2"} bg-muted/50 rounded-lg p-1`}>
          <TabsTrigger
            value="profile"
            className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Perfil
          </TabsTrigger>

          {showAccessTab && (
            <TabsTrigger
              value="access"
              className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
              onClick={() => {
                loadMembers()
                loadInvitations()
              }}
            >
              Acceso
            </TabsTrigger>
          )}

          <TabsTrigger
            value="policies"
            className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Políticas
          </TabsTrigger>
        </TabsList>

        {/* Perfil del Espacio */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nombre del Espacio</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del espacio"
                maxLength={100}
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Descripción</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción breve del espacio (opcional)"
                className="rounded-lg"
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
                  width={80}
                  height={80}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <>
                  <IconLoader2 className="animate-spin mr-2" size={16} />
                  Guardando...
                </>
              ) : (
                "Guardar perfil"
              )}
            </Button>
          </div>

          {/* Danger Zone */}
          {!isPersonal && workspace && (
            <DangerZone
              title="Zona de Peligro"
              description="Las acciones en esta sección son permanentes e irreversibles."
            >
              <DeleteWorkspace
                workspace={workspace}
                onDelete={() => router.push("/")}
              />
            </DangerZone>
          )}
        </TabsContent>

        {/* Acceso */}
        {showAccessTab && (
          <TabsContent value="access" className="mt-6 space-y-6">
            {/* Access Summary */}
            <AccessSummary
              memberCount={members.length}
              pendingInviteCount={pendingInvitations.length}
            />

            {/* Invite Section */}
            <InviteSection
              inviteEmail={inviteEmail}
              setInviteEmail={setInviteEmail}
              inviteRole={inviteRole}
              setInviteRole={setInviteRole}
              inviteLinkLabel={inviteLinkLabel}
              setInviteLinkLabel={setInviteLinkLabel}
              onSendInvitation={handleSendInvitation}
              onCreateInviteLink={handleCreateInviteLink}
              sendingInvite={sendingInvite}
              creatingInviteLink={creatingInviteLink}
              linkExpiration={linkExpiration}
              setLinkExpiration={setLinkExpiration}
              linkMaxUses={linkMaxUses}
              setLinkMaxUses={setLinkMaxUses}
            />

            {/* Members Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Miembros</h3>
                <Button variant="ghost" size="sm" onClick={loadMembers} className="text-xs">
                  Actualizar
                </Button>
              </div>

              {loadingMembers ? (
                <div className="p-8 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
                  Cargando miembros...
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Current User Card */}
                  {profile && (
                    <MemberCard
                      member={{
                        id: "current-user",
                        workspace_id: workspaceId,
                        user_id: profile.user_id,
                        role: isAdmin ? "ADMIN" : "LAWYER", // Fallback role if logic differs
                        created_at: new Date().toISOString(),
                        user: {
                          id: profile.user_id,
                          email: "Tú (Propietario)"
                        }
                      }}
                      isOwner={true} // Visually distinct
                      canManage={false} // Can't remove yourself here
                    />
                  )}

                  {/* Other Members */}
                  <AnimatePresence mode="popLayout">
                    {members.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        isOwner={workspace?.user_id === member.user_id}
                        canManage={isAdmin}
                        onUpdateRole={(userId, role) => handleUpdateMemberRole(userId, role)}
                        onRemove={(userId) => handleRemoveMember(userId)}
                      />
                    ))}
                  </AnimatePresence>

                  {members.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No hay otros miembros en este espacio.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Invitations Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Invitaciones pendientes</h3>

              {loadingInvitations ? (
                <div className="p-8 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
                  Cargando invitaciones...
                </div>
              ) : pendingInvitations.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
                  No hay invitaciones pendientes.
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {pendingInvitations.map((invite) => (
                      <InvitationCard
                        key={invite.id}
                        invitation={invite}
                        onRevoke={(id) => handleRevokeInvitation(id)}
                        onResend={(id) => handleResendInvitation(id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* Políticas del Asistente */}
        <TabsContent value="policies" className="mt-6 space-y-6">
          {/* Assistant Policies */}
          <AssistantPolicies
            policies={assistantPolicies}
            onChange={setAssistantPolicies}
          />

          {/* Chat Defaults removed as per requirement */}

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSavePolicies} disabled={savingPolicies}>
              {savingPolicies ? (
                <>
                  <IconLoader2 className="animate-spin mr-2" size={16} />
                  Guardando...
                </>
              ) : (
                "Guardar políticas"
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
