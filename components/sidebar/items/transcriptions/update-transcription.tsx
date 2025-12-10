import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { updateTranscription } from "@/db/transcriptions"
import { Tables } from "@/supabase/types"
import { IconMicrophone, IconClock, IconLanguage } from "@tabler/icons-react"
import { FC, ReactNode, useState } from "react"
import { SidebarUpdateItem } from "../all/sidebar-update-item"

interface UpdateTranscriptionProps {
  transcription: Tables<"transcriptions">
  children: ReactNode
}

export const UpdateTranscription: FC<UpdateTranscriptionProps> = ({
  transcription,
  children
}) => {
  const [name, setName] = useState(transcription.name)
  const [description, setDescription] = useState(transcription.description || "")

  // Formatear duración
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Obtener badge de estado
  const getStatusBadge = (status: string) => {
    const badges = {
      pending: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
      processing: "bg-primary/20 text-primary",
      completed: "bg-green-500/20 text-green-600 dark:text-green-400",
      failed: "bg-red-500/20 text-red-600 dark:text-red-400"
    }
    
    const labels = {
      pending: "Pendiente",
      processing: "Procesando",
      completed: "Completado",
      failed: "Error"
    }

    return (
      <Badge className={badges[status as keyof typeof badges]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    )
  }

  return (
    <SidebarUpdateItem
      item={transcription}
      isTyping={false}
      contentType="transcriptions"
      updateState={{
        name,
        description
      }}
      renderInputs={() => (
        <>
          <div className="flex items-center gap-2 mb-2">
            {getStatusBadge(transcription.status)}
            {transcription.language && (
              <Badge variant="outline" className="flex items-center gap-1">
                <IconLanguage className="w-3 h-3" />
                {transcription.language.toUpperCase()}
              </Badge>
            )}
          </div>

          {transcription.status === "completed" && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconClock className="w-4 h-4" />
                <span>Duración: {formatDuration(transcription.duration)}</span>
              </div>
              {transcription.tokens && (
                <div className="text-sm text-muted-foreground">
                  Tokens: {transcription.tokens.toLocaleString()}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input
              placeholder="Nombre de la transcripción..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="space-y-1">
            <Label>Descripción</Label>
            <Input
              placeholder="Descripción de la transcripción..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={1000}
            />
          </div>
        </>
      )}
    >
      {children}
    </SidebarUpdateItem>
  )
}


