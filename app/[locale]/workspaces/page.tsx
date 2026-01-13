"use client"

import { useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    Users,
    Settings,
    Plus,
    Home,
    Crown,
    ChevronRight,
    Search,
    MoreVertical,
    Trash2,
    LogOut,
    UserPlus,
    Shield,
    Eye,
    Briefcase,
    Scale,
    Loader2
} from "lucide-react"

import { supabase } from "@/lib/supabase/browser-client"

import { ALIContext } from "@/context/context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

import { createWorkspaceWithPlanCheck } from "@/db/workspaces"
import { toast } from "sonner"
import { Tables } from "@/supabase/types"

// Animation variants
const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: custom * 0.1, duration: 0.5, ease: [0, 0, 0.2, 1] as const }
    })
}

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
}

// GlassCard component matching landing page style
function GlassCard({
    children,
    className = "",
    hoverEffect = true,
    onClick
}: {
    children: React.ReactNode
    className?: string
    hoverEffect?: boolean
    onClick?: () => void
}) {
    return (
        <div
            onClick={onClick}
            className={`
        relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl
        ${hoverEffect ? "transition-all duration-300 hover:border-white/20 hover:bg-white/5 hover:shadow-2xl hover:-translate-y-1 cursor-pointer" : ""}
        ${className}
      `}
        >
            {/* Top Highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
            {children}
        </div>
    )
}

// Role badge component with colors
function RoleBadge({ role }: { role: string }) {
    const roleConfig: Record<string, { icon: any; color: string; bg: string }> = {
        ADMIN: { icon: Crown, color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/30" },
        LAWYER: { icon: Scale, color: "text-purple-400", bg: "bg-purple-500/20 border-purple-500/30" },
        ASSISTANT: { icon: Briefcase, color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" },
        VIEWER: { icon: Eye, color: "text-gray-400", bg: "bg-gray-500/20 border-gray-500/30" }
    }

    const config = roleConfig[role] || roleConfig.VIEWER
    const Icon = config.icon

    return (
        <Badge
            variant="outline"
            className={`${config.bg} ${config.color} border text-xs flex items-center gap-1 px-2 py-0.5`}
        >
            <Icon className="w-3 h-3" />
            {role}
        </Badge>
    )
}

// Workspace card component
function WorkspaceCard({
    workspace,
    isSelected,
    onSelect,
    onOpenSettings,
    userRole,
    membersCount
}: {
    workspace: Tables<"workspaces">
    isSelected: boolean
    onSelect: () => void
    onOpenSettings: () => void
    userRole?: string
    membersCount?: number
}) {
    return (
        <motion.div variants={fadeIn} custom={0}>
            <GlassCard
                className={`group ${isSelected ? "ring-2 ring-purple-500/50 border-purple-500/30" : ""}`}
                onClick={onSelect}
            >
                <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {/* Workspace Avatar */}
                            <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center
                ${workspace.is_home
                                    ? "bg-gradient-to-br from-purple-600 to-purple-400"
                                    : "bg-gradient-to-br from-gray-700 to-gray-600"
                                }
              `}>
                                {workspace.is_home ? (
                                    <Home className="w-6 h-6 text-white" />
                                ) : (
                                    <span className="text-xl font-bold text-white">
                                        {workspace.name?.charAt(0)?.toUpperCase() || "W"}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    {workspace.name}
                                    {workspace.is_home && (
                                        <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">
                                            Principal
                                        </Badge>
                                    )}
                                </h3>
                                {workspace.description && (
                                    <p className="text-sm text-gray-400 line-clamp-1">
                                        {workspace.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}>
                                    <Settings className="w-4 h-4 mr-2" />
                                    Configuración
                                </DropdownMenuItem>
                                {!workspace.is_home && (
                                    <>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}>
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Invitar miembros
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-red-400 focus:text-red-400"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {userRole === "ADMIN" ? (
                                                <>
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Eliminar
                                                </>
                                            ) : (
                                                <>
                                                    <LogOut className="w-4 h-4 mr-2" />
                                                    Abandonar
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {userRole && <RoleBadge role={userRole} />}
                            {!workspace.is_home && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Users className="w-3 h-3" />
                                    <span>{membersCount || "--"}</span>
                                </div>
                            )}
                        </div>
                        <ChevronRight className={`w-5 h-5 transition-colors ${isSelected ? "text-purple-400" : "text-gray-600"}`} />
                    </div>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                    <motion.div
                        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-purple-400"
                        layoutId="workspace-indicator"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                    />
                )}
            </GlassCard>
        </motion.div>
    )
}

export default function WorkspacesPage() {
    const router = useRouter()
    const {
        profile,
        workspaces,
        setWorkspaces,
        selectedWorkspace,
        setSelectedWorkspace
    } = useContext(ALIContext)

    const [searchQuery, setSearchQuery] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [memberships, setMemberships] = useState<any[]>([])
    const [loadingMemberships, setLoadingMemberships] = useState(true)

    // Load memberships to get roles and member counts
    useEffect(() => {
        if (!profile) return

        const loadData = async () => {
            try {
                setLoadingMemberships(true)
                const { data, error } = await (supabase as any)
                    .from("workspace_members")
                    .select("*, user:user_id(id, email)")

                if (error) throw error
                setMemberships(data || [])
            } catch (error) {
                console.error("Error loading memberships:", error)
            } finally {
                setLoadingMemberships(false)
            }
        }

        loadData()
    }, [profile, workspaces])

    // Get role for a specific workspace
    const getWorkspaceRole = (workspaceId: string) => {
        const membership = memberships.find(m => m.workspace_id === workspaceId && m.user_id === profile?.user_id)
        return membership?.role || (workspaces.find(w => w.id === workspaceId)?.user_id === profile?.user_id ? "ADMIN" : "VIEWER")
    }

    // Get member count for a specific workspace
    const getMemberCount = (workspaceId: string) => {
        return memberships.filter(m => m.workspace_id === workspaceId).length
    }

    // Filter workspaces based on search
    const filteredWorkspaces = workspaces.filter(
        (w) =>
            w.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Separate home workspace from others
    const homeWorkspace = filteredWorkspaces.find((w) => w.is_home)
    const otherWorkspaces = filteredWorkspaces.filter((w) => !w.is_home)

    const handleCreateWorkspace = async () => {
        if (!profile) return

        setIsCreating(true)
        try {
            const result = await createWorkspaceWithPlanCheck({
                user_id: profile.user_id,
                name: "Nuevo Workspace",
                description: "",
                is_home: false,
                default_context_length: 4096,
                default_model: "tongyi-plus",
                default_prompt: "",
                default_temperature: 0.5,
                embeddings_provider: "openai",
                include_profile_context: true,
                include_workspace_instructions: true,
                instructions: "",
                sharing: "private",
                image_path: ""
            })

            if (result.success && result.workspace) {
                setWorkspaces([...workspaces, result.workspace])
                router.push(`/${result.workspace.id}/settings`)
                toast.success("Workspace creado")
            } else if (result.needsUpgrade) {
                toast.error("Límite alcanzado", {
                    description: "Actualiza tu plan para crear más workspaces"
                })
            } else {
                toast.error(result.error || "Error al crear workspace")
            }
        } catch (error: any) {
            toast.error(error.message || "Error al crear workspace")
        } finally {
            setIsCreating(false)
        }
    }

    const handleSelectWorkspace = (workspace: Tables<"workspaces">) => {
        setSelectedWorkspace(workspace)
        router.push(`/${workspace.id}/chat`)
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-muted-foreground">Cargando...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#030305] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] opacity-30" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/15 rounded-full blur-[120px] opacity-25" />

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
                {/* Header */}
                <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                Espacios de Trabajo
                            </h1>
                            <p className="text-gray-400">
                                Gestiona tus workspaces y colabora con tu equipo
                            </p>
                        </div>
                        <Button
                            onClick={handleCreateWorkspace}
                            disabled={isCreating}
                            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/25"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {isCreating ? "Creando..." : "Nuevo Workspace"}
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="mt-6 relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                            placeholder="Buscar workspaces..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-white/5 border-white/10 focus:border-purple-500/50 focus:ring-purple-500/20"
                        />
                    </div>
                </motion.div>

                {/* Home Workspace */}
                {homeWorkspace && (
                    <motion.div
                        className="mb-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                            Espacio Personal
                        </h2>
                        <div className="max-w-xl">
                            <WorkspaceCard
                                workspace={homeWorkspace}
                                isSelected={selectedWorkspace?.id === homeWorkspace.id}
                                onSelect={() => handleSelectWorkspace(homeWorkspace)}
                                onOpenSettings={() => router.push(`/${homeWorkspace.id}/settings`)}
                                userRole={getWorkspaceRole(homeWorkspace.id)}
                            />
                        </div>
                    </motion.div>
                )}

                {/* Other Workspaces */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                            Workspaces ({otherWorkspaces.length})
                        </h2>
                    </div>

                    {otherWorkspaces.length === 0 ? (
                        <GlassCard hoverEffect={false} className="p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                                <Users className="w-8 h-8 text-purple-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                Sin workspaces adicionales
                            </h3>
                            <p className="text-gray-400 mb-6 max-w-md mx-auto">
                                Crea un workspace para colaborar con tu equipo o separar tus proyectos legales.
                            </p>
                            <Button
                                onClick={handleCreateWorkspace}
                                disabled={isCreating}
                                className="bg-purple-600 hover:bg-purple-500"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Crear primer workspace
                            </Button>
                        </GlassCard>
                    ) : (
                        <motion.div
                            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                        >
                            {otherWorkspaces.map((workspace) => (
                                <WorkspaceCard
                                    key={workspace.id}
                                    workspace={workspace}
                                    isSelected={selectedWorkspace?.id === workspace.id}
                                    onSelect={() => handleSelectWorkspace(workspace)}
                                    onOpenSettings={() => router.push(`/${workspace.id}/settings`)}
                                    userRole={getWorkspaceRole(workspace.id)}
                                    membersCount={getMemberCount(workspace.id)}
                                />
                            ))}
                        </motion.div>
                    )}
                </motion.div>
            </div>


        </div>
    )
}
