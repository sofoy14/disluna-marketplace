"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const token = params.token

  const loginUrl = useMemo(() => {
    const redirect = `/invite/${encodeURIComponent(token)}`
    return `/es/login?redirect=${encodeURIComponent(redirect)}`
  }, [token])

  const [status, setStatus] = useState<
    "checking" | "need_login" | "accepting" | "error"
  >("checking")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const supabase = createClient()
      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (!user) {
        setStatus("need_login")
        return
      }

      setStatus("accepting")
      setMessage(null)

      const resp = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token })
      })

      const data = await resp.json().catch(() => ({} as any))
      if (!resp.ok) {
        setStatus("error")
        setMessage(data?.error || "Error al aceptar invitación")
        return
      }

      const workspaceId = data?.workspaceId as string | undefined
      if (!workspaceId) {
        setStatus("error")
        setMessage("Invitación aceptada, pero no se encontró el workspace.")
        return
      }

      router.replace(`/${workspaceId}/chat`)
    }

    run().catch(err => {
      if (cancelled) return
      setStatus("error")
      setMessage(err?.message || "Error al aceptar invitación")
    })

    return () => {
      cancelled = true
    }
  }, [router, token])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-background p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Invitación a workspace</h1>
          <p className="text-sm text-muted-foreground">
            Usa este enlace para unirte al espacio de trabajo.
          </p>
        </div>

        {status === "checking" || status === "accepting" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status === "checking" ? "Verificando sesión..." : "Aceptando invitación..."}
          </div>
        ) : null}

        {status === "need_login" ? (
          <div className="space-y-3">
            <Alert>
              <AlertDescription>
                Debes iniciar sesión para aceptar la invitación.
              </AlertDescription>
            </Alert>
            <Button className="w-full" onClick={() => (window.location.href = loginUrl)}>
              Iniciar sesión
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = "/es/login")}
            >
              Ir a login
            </Button>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertDescription>{message || "Error"}</AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

