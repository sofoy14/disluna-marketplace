"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Crown,
    Scale,
    Briefcase,
    Eye,
    MoreVertical,
    Trash2,
    ChevronDown,
    UserCircle,
    Mail,
    Clock,
    Copy,
    RefreshCw,
    XCircle,
    Check,
    Link as LinkIcon
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"

// Types
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

// Role configuration
const roleConfig: Record<WorkspaceRole, { icon: any; label: string; description: string; color: string; bg: string }> = {
    ADMIN: {
        icon: Crown,
        label: "Admin",
        description: "Gestiona miembros e invitaciones",
        color: "text-amber-400",
        bg: "bg-amber-500/20 border-amber-500/30"
    },
    LAWYER: {
        icon: Scale,
        label: "Abogado",
        description: "Acceso operativo completo",
        color: "text-purple-400",
        bg: "bg-purple-500/20 border-purple-500/30"
    },
    ASSISTANT: {
        icon: Briefcase,
        label: "Asistente",
        description: "Acceso operativo al workspace",
        color: "text-blue-400",
        bg: "bg-blue-500/20 border-blue-500/30"
    },
    VIEWER: {
        icon: Eye,
        label: "Visor",
        description: "Solo lectura",
        color: "text-gray-400",
        bg: "bg-gray-500/20 border-gray-500/30"
    }
}

// Status configuration for invitations
const statusConfig: Record<InvitationStatus, { label: string; color: string; bg: string }> = {
    PENDING: { label: "Pendiente", color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/30" },
    ACCEPTED: { label: "Aceptada", color: "text-green-400", bg: "bg-green-500/20 border-green-500/30" },
    EXPIRED: { label: "Expirada", color: "text-gray-400", bg: "bg-gray-500/20 border-gray-500/30" },
    REVOKED: { label: "Revocada", color: "text-red-400", bg: "bg-red-500/20 border-red-500/30" }
}

// Role Badge Component
export function RoleBadge({ role, size = "default" }: { role: WorkspaceRole; size?: "sm" | "default" }) {
    const config = roleConfig[role]
    const Icon = config.icon

    return (
        <Badge
            variant="outline"
            className={`${config.bg} ${config.color} border ${size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"} flex items-center gap-1`}
        >
            <Icon className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
            {config.label}
        </Badge>
    )
}

// Role Selector Component
export function RoleSelector({
    value,
    onValueChange,
    disabled = false
}: {
    value: WorkspaceRole
    onValueChange: (role: WorkspaceRole) => void
    disabled?: boolean
}) {
    return (
        <Select value={value} onValueChange={(v) => onValueChange(v as WorkspaceRole)} disabled={disabled}>
            <SelectTrigger className="w-[160px] bg-white/5 border-white/10 focus:border-purple-500/50">
                <SelectValue>
                    <div className="flex items-center gap-2">
                        <RoleBadge role={value} size="sm" />
                    </div>
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/10">
                {Object.entries(roleConfig).map(([roleKey, config]) => (
                    <SelectItem key={roleKey} value={roleKey} className="focus:bg-white/10">
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded flex items-center justify-center ${config.bg}`}>
                                <config.icon className={`w-3.5 h-3.5 ${config.color}`} />
                            </div>
                            <div>
                                <div className="font-medium text-sm">{config.label}</div>
                                <div className="text-xs text-gray-500">{config.description}</div>
                            </div>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

// Member Card Component
export function MemberCard({
    member,
    isOwner = false,
    canManage = false,
    onUpdateRole,
    onRemove
}: {
    member: WorkspaceMember
    isOwner?: boolean
    canManage?: boolean
    onUpdateRole?: (userId: string, role: WorkspaceRole) => void
    onRemove?: (userId: string) => void
}) {
    const email = member.user?.email || member.user_id
    const initials = email.slice(0, 2).toUpperCase()

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/15 transition-all"
        >
            {/* Avatar */}
            <Avatar className="w-10 h-10 border-2 border-white/10">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-purple-400 text-white text-sm font-medium">
                    {initials}
                </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{email}</span>
                    {isOwner && (
                        <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400 bg-purple-500/10">
                            Propietario
                        </Badge>
                    )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                    Desde {new Date(member.created_at).toLocaleDateString("es-CO", { month: "short", year: "numeric" })}
                </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-2">
                {canManage && !isOwner && onUpdateRole ? (
                    <RoleSelector
                        value={member.role}
                        onValueChange={(role) => onUpdateRole(member.user_id, role)}
                    />
                ) : (
                    <RoleBadge role={member.role} />
                )}

                {/* Actions */}
                {canManage && !isOwner && onRemove && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-900 border-white/10">
                            <DropdownMenuItem
                                className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                                onClick={() => onRemove(member.user_id)}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remover del workspace
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </motion.div>
    )
}

// Invitation Card Component
export function InvitationCard({
    invitation,
    onRevoke,
    onResend
}: {
    invitation: WorkspaceInvitation
    onRevoke?: (id: string) => void
    onResend?: (id: string) => void
}) {
    const isPending = invitation.status === "PENDING"
    const isLinkInvite = invitation.email?.startsWith("link:")
    const displayEmail = isLinkInvite
        ? `Enlace: ${invitation.email.slice(5)}`
        : invitation.email

    const statusCfg = statusConfig[invitation.status]

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
        >
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPending ? "bg-yellow-500/20" : "bg-gray-500/20"}`}>
                {isLinkInvite ? (
                    <LinkIcon className={`w-5 h-5 ${isPending ? "text-yellow-400" : "text-gray-400"}`} />
                ) : (
                    <Mail className={`w-5 h-5 ${isPending ? "text-yellow-400" : "text-gray-400"}`} />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{displayEmail}</div>
                <div className="flex items-center gap-2 mt-0.5">
                    <RoleBadge role={invitation.role} size="sm" />
                    <span className="text-xs text-gray-500">•</span>
                    <Badge
                        variant="outline"
                        className={`text-[10px] ${statusCfg.bg} ${statusCfg.color} border`}
                    >
                        {statusCfg.label}
                    </Badge>
                    {isPending && (
                        <>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Expira {new Date(invitation.expires_at).toLocaleDateString("es-CO")}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Actions */}
            {isPending && (
                <div className="flex items-center gap-1">
                    {onResend && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onResend(invitation.id)}
                            className="text-xs hover:bg-white/10"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Reenviar
                        </Button>
                    )}
                    {onRevoke && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRevoke(invitation.id)}
                            className="text-xs text-red-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                            Revocar
                        </Button>
                    )}
                </div>
            )}
        </motion.div>
    )
}

// Invite Section Component
export function InviteSection({
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    inviteLinkLabel,
    setInviteLinkLabel,
    onSendInvitation,
    onCreateInviteLink,
    sendingInvite,
    creatingInviteLink
}: {
    inviteEmail: string
    setInviteEmail: (email: string) => void
    inviteRole: WorkspaceRole
    setInviteRole: (role: WorkspaceRole) => void
    inviteLinkLabel: string
    setInviteLinkLabel: (label: string) => void
    onSendInvitation: () => void
    onCreateInviteLink: () => void
    sendingInvite: boolean
    creatingInviteLink: boolean
}) {
    const [mode, setMode] = useState<"email" | "link">("email")

    return (
        <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Invitar personas</h3>
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                    <button
                        onClick={() => setMode("email")}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${mode === "email"
                                ? "bg-purple-500/30 text-purple-300"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <Mail className="w-3.5 h-3.5 inline-block mr-1.5" />
                        Email
                    </button>
                    <button
                        onClick={() => setMode("link")}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${mode === "link"
                                ? "bg-purple-500/30 text-purple-300"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        <LinkIcon className="w-3.5 h-3.5 inline-block mr-1.5" />
                        Enlace
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Label className="text-xs text-gray-400 whitespace-nowrap">Rol:</Label>
                <RoleSelector value={inviteRole} onValueChange={setInviteRole} />
            </div>

            <AnimatePresence mode="wait">
                {mode === "email" ? (
                    <motion.div
                        key="email"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex gap-2"
                    >
                        <Input
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="correo@ejemplo.com"
                            type="email"
                            className="flex-1 bg-white/5 border-white/10 focus:border-purple-500/50"
                        />
                        <Button
                            onClick={onSendInvitation}
                            disabled={sendingInvite || !inviteEmail}
                            className="bg-purple-600 hover:bg-purple-500 whitespace-nowrap"
                        >
                            {sendingInvite ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Invitar
                                </>
                            )}
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="link"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex gap-2"
                    >
                        <Input
                            value={inviteLinkLabel}
                            onChange={(e) => setInviteLinkLabel(e.target.value)}
                            placeholder="Etiqueta (opcional)"
                            className="flex-1 bg-white/5 border-white/10 focus:border-purple-500/50"
                        />
                        <Button
                            onClick={onCreateInviteLink}
                            disabled={creatingInviteLink}
                            className="bg-purple-600 hover:bg-purple-500 whitespace-nowrap"
                        >
                            {creatingInviteLink ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Crear enlace
                                </>
                            )}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
