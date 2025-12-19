"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Loader2, Mail, RefreshCw, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ShaderCanvas } from "@/components/shader-canvas"

type MessageType = "success" | "error" | "info"

function GlassCard({
  children,
  className = "",
  highlighted = false,
  hoverEffect = true
}: {
  children: React.ReactNode
  className?: string
  highlighted?: boolean
  hoverEffect?: boolean
}) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-3xl
        ${
          highlighted
            ? "bg-violet-950/40 border border-violet-500/30"
            : "bg-white/[0.03] border border-white/[0.08]"
        }
        backdrop-blur-xl shadow-2xl
        ${
          hoverEffect
            ? "transition-all duration-500 hover:border-violet-500/40 hover:bg-white/[0.05] hover:shadow-violet-500/10 hover:-translate-y-1"
            : ""
        }
        ${className}
      `}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {highlighted && (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />
      )}
      {children}
    </div>
  )
}

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: MessageType; text: string } | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialMessage = params.get("message")
    if (initialMessage) {
      setMessage({ type: "info", text: initialMessage })
    }

    checkVerificationStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkVerificationStatus = async () => {
    try {
      const response = await fetch("/api/auth/verification-status")
      const data = await response.json()

      if (!response.ok) {
        router.push("/login")
        return
      }

      if (data?.data?.is_verified) {
        router.push("/onboarding")
        return
      }

      setEmail(data?.data?.email || "")
    } catch (error) {
      console.error("Error checking verification status:", error)
      router.push("/login")
    }
  }

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })

      const data = await response.json().catch(() => ({} as any))

      if (data?.success) {
        setMessage({
          type: "success",
          text: "Correo de verificación enviado. Revisa tu bandeja de entrada."
        })
      } else {
        setMessage({
          type: "error",
          text: data?.error || "Error enviando el correo de verificación"
        })
      }
    } catch {
      setMessage({
        type: "error",
        text: "Error de conexión. Intenta nuevamente."
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyEmail = async () => {
    setIsVerifying(true)

    try {
      const response = await fetch("/api/auth/verification-status")
      const data = await response.json()

      if (!response.ok) {
        throw new Error("No user session")
      }

      if (data?.data?.is_verified) {
        const supabase = createClient()
        await supabase
          .from("profiles")
          .update({ email_verified: true, onboarding_step: "profile_setup" })
          .eq("user_id", data.data.user_id)

        setMessage({
          type: "success",
          text: "Email verificado exitosamente. Redirigiendo..."
        })

        setTimeout(() => {
          router.push("/onboarding")
        }, 1600)
      } else {
        setMessage({
          type: "info",
          text: "Aún no aparece verificado. Abre el enlace del correo y vuelve a intentar."
        })
      }
    } catch {
      setMessage({
        type: "error",
        text: "Error verificando el email. Intenta nuevamente."
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const getMessageIcon = () => {
    switch (message?.type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-emerald-400" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />
      case "info":
        return <Mail className="h-4 w-4 text-violet-300" />
      default:
        return null
    }
  }

  const getMessageClasses = () => {
    switch (message?.type) {
      case "success":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      case "error":
        return "border-red-500/30 bg-red-500/10 text-red-300"
      case "info":
        return "border-violet-500/30 bg-violet-500/10 text-violet-200"
      default:
        return "border-white/10 bg-white/[0.03] text-white/70"
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-violet-950/10" />
      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key="verify-email"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="w-full max-w-xl"
          >
            <div className="text-center mb-8">
              <motion.div
                className="flex justify-center mb-6"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="relative">
                  <ShaderCanvas size={140} shaderId={2} />
                  <div className="absolute inset-0 bg-violet-500/25 blur-3xl rounded-full -z-10" />
                </div>
              </motion.div>
              <h1 className="mt-5 text-3xl sm:text-4xl font-semibold text-white tracking-tight">
                Verifica tu correo
              </h1>
              <p className="mt-2 text-white/60 font-light">
                Confirma tu cuenta para continuar con el onboarding.
              </p>
            </div>

            {message && (
              <Alert className={`mb-6 border ${getMessageClasses()}`}>
                <div className="flex items-center gap-2">
                  {getMessageIcon()}
                  <AlertDescription>{message.text}</AlertDescription>
                </div>
              </Alert>
            )}

            <GlassCard className="p-8" hoverEffect={false} highlighted>
              <form onSubmit={handleSendVerification} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="text-violet-200/70 text-sm font-light">
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@ejemplo.com"
                    required
                    className="mt-2 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-violet-300/30 focus:border-violet-500/50 focus:ring-violet-500/20 rounded-xl h-12"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    className="flex-1 h-12 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Reenviar correo
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border-white/10 bg-transparent text-white/70 hover:bg-white/5 hover:border-white/20"
                    onClick={handleVerifyEmail}
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Ya verifiqué
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center text-sm text-white/50">
                  ¿No lo ves? Revisa spam/promociones.{" "}
                  <button
                    type="button"
                    onClick={() => setMessage(null)}
                    className="text-violet-300/80 hover:text-violet-200 underline underline-offset-4"
                  >
                    Limpiar mensaje
                  </button>
                </div>
              </form>
            </GlassCard>

            <div className="text-center mt-8">
              <Button
                variant="ghost"
                onClick={() => router.push("/login")}
                className="text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-xl"
              >
                Volver a iniciar sesión
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
