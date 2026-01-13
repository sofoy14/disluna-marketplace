"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2, UserCheck, AlertCircle, ArrowRight, Shield } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/browser-client"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
}

export default function InvitePage() {
    const router = useRouter()
    const { token } = useParams()
    const [loading, setLoading] = useState(true)
    const [accepting, setAccepting] = useState(false)
    const [invitation, setInvitation] = useState<any>(null)
    const [workspace, setWorkspace] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        checkUserAndInvitation()
    }, [token])

    const checkUserAndInvitation = async () => {
        try {
            setLoading(true)

            // Get current user
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user || null)

            // Fetch invitation details via a new internal API or direct DB check if allowed
            // For now, let's try to fetch it via the hash if we can, 
            // but normally we'd have a public endpoint to verify a token without role/perms

            const response = await fetch(`/api/invite/verify?token=${token}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Invitación inválida o expirada")
            }

            setInvitation(data.invitation)
            setWorkspace(data.workspace)

        } catch (err: any) {
            console.error("Error verifying invitation:", err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleAccept = async () => {
        if (!user) {
            // Store target in session storage to redirect back after login
            sessionStorage.setItem("post_login_redirect", window.location.pathname)
            router.push("/login?message=Inicia sesión para aceptar la invitación")
            return
        }

        try {
            setAccepting(true)

            const response = await fetch("/api/invite/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Error al aceptar la invitación")
            }

            toast.success("¡Bienvenido al equipo!")
            router.push(`/${workspace.id}/chat`)

        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setAccepting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#030305] flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                <p className="text-gray-400 animate-pulse">Verificando invitación...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#030305] flex items-center justify-center p-4">
                <GlassCard className="max-w-md w-full p-8 text-center border-red-500/20">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Invitación no válida</h1>
                    <p className="text-gray-400 mb-8">{error}</p>
                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => router.push("/")}
                    >
                        Ir al inicio
                    </Button>
                </GlassCard>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#030305] relative overflow-hidden flex items-center justify-center p-4">
            {/* Background effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />

            <motion.div
                {...fadeIn}
                className="max-w-lg w-full z-10"
            >
                <GlassCard className="p-8 border-purple-500/20">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/20">
                            <Shield className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Únete al equipo</h1>
                        <p className="text-gray-400 italic">Te han invitado a colaborar en:</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-center">
                        <h2 className="text-2xl font-bold text-white mb-1">{workspace?.name}</h2>
                        <div className="flex justify-center gap-2 mt-3">
                            <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20 px-3 py-1">
                                Rol: {invitation?.role}
                            </Badge>
                        </div>
                    </div>

                    {!user && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-8 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                            <p className="text-sm text-blue-300">
                                Debes tener una cuenta en Asistente Legal Inteligente para aceptar esta invitación. Si no tienes una, podrás crearla al iniciar sesión.
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <Button
                            className="w-full h-12 text-lg bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/25 transition-all duration-300"
                            onClick={handleAccept}
                            disabled={accepting}
                        >
                            {accepting ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    {user ? "Aceptar e Ingresar" : "Iniciar Sesión para Aceptar"}
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            className="w-full text-gray-500 hover:text-white"
                            onClick={() => router.push("/")}
                            disabled={accepting}
                        >
                            Ignorar invitación
                        </Button>
                    </div>
                </GlassCard>

                <p className="text-center mt-8 text-sm text-gray-600">
                    Esta invitación fue enviada a <span className="text-gray-400">{invitation?.email}</span>
                </p>
            </motion.div>
        </div>
    )
}
