'use client'

import { UserSettingsLayout } from "@/components/settings/UserSettingsLayout"

export default function AccountPage() {
  return (
    <UserSettingsLayout>
      <div className="max-w-xl w-full space-y-4 text-center">
        <h1 className="text-xl md:text-2xl font-semibold">¿Cómo puedo ayudarte hoy?</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium">Consultas</p>
            <p className="text-sm text-muted-foreground">
              Realiza consultas legales y obtén respuestas especializadas sobre jurisprudencia y normativa.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium">Mis procesos</p>
            <p className="text-sm text-muted-foreground">
              Gestiona y consulta tus procesos legales con contexto
            </p>
          </div>
        </div>
      </div>
    </UserSettingsLayout>
  )
}


